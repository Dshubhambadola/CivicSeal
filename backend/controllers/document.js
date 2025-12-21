const crypto = require('crypto');
const multer = require('multer');
const { documentRegistry } = require('../services/blockchain');
const { ethers } = require('ethers');

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('document');

const calculateHash = (buffer) => {
    return '0x' + crypto.createHash('sha256').update(buffer).digest('hex');
};

const { uploadToIPFS } = require('../services/ipfs');
const DocumentMetadata = require('../models/DocumentMetadata');

exports.uploadDocument = (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        try {
            const { encryptedKey, originalHash } = req.body; // Expect encrypted key from frontend
            const fileBuffer = req.file.buffer;

            // If originalHash is provided (E2EE mode), use it as the ID. 
            // Otherwise calculate hash of received file (Legacy/Plain mode).
            const hash = originalHash || calculateHash(fileBuffer);

            console.log(`Processing file: ${req.file.originalname}`);
            console.log(`ID Hash: ${hash}`);

            // 1. Check Blockchain & Database
            const [exists] = await documentRegistry.verifyHash(hash);
            const dbExists = await DocumentMetadata.findOne({ where: { hash } });

            if (exists || dbExists) {
                // Idempotency: Return existing record if found in either
                return res.status(200).json({
                    message: 'Document already registered',
                    documentHash: hash,
                    ipfsHash: dbExists ? dbExists.ipfsHash : null
                });
            }

            // 2. Upload to IPFS (Mock)
            const ipfsHash = await uploadToIPFS(fileBuffer);

            // 3. Store on Blockchain
            // storeDocument(hash, ipfsHash, encryptedKey)
            const tx = await documentRegistry.storeDocument(hash, ipfsHash, encryptedKey || "NO_KEY");
            console.log(`Transaction sent: ${tx.hash}`);

            const receipt = await tx.wait();
            console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

            // 4. Index in PostgreSQL
            await DocumentMetadata.create({
                hash,
                ipfsHash,
                submitter: receipt.from, // simplified, ideally from tx receipt logs
                encryptedKey: encryptedKey || null,
                originalName: req.file.originalname
            });

            res.json({
                message: 'Document registered securely',
                transactionHash: tx.hash,
                documentHash: hash,
                ipfsHash: ipfsHash,
                blockNumber: receipt.blockNumber
            });

        } catch (error) {
            console.error(error);
            if (error.reason) return res.status(400).json({ error: error.reason });
            res.status(500).json({ error: 'Registration failed', details: error.message });
        }
    });
};

exports.recoverKey = async (req, res) => {
    const { docHash } = req.body;
    // Mock Auth: In real app, verify JWT or Signature
    console.log(`Recovery Request for: ${docHash}`);

    try {
        const doc = await DocumentMetadata.findOne({ where: { hash: docHash } });
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        // In a real Key Escrow, we would use our Private Key to decrypt 'doc.encryptedKey' 
        // and send it back. Since we just stored a mock string:
        res.json({
            message: 'Key recovered successfully',
            recoveredKey: doc.encryptedKey // Returning the "Escrowed" key
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Recovery failed' });
    }
};

exports.verifyDocument = (req, res) => {

    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        try {
            const hash = calculateHash(req.file.buffer);
            let [exists, submitter, timestamp] = await documentRegistry.verifyHash(hash);

            // Fallback: Check Database (Dev Env: Chain resets, DB persists)
            if (!exists) {
                const dbDoc = await DocumentMetadata.findOne({ where: { hash } });
                if (dbDoc) {
                    exists = true;
                    submitter = dbDoc.submitter;
                    timestamp = dbDoc.timestamp || Math.floor(new Date(dbDoc.createdAt).getTime() / 1000);
                    console.log("Verified via Database Index (Chain reset detected)");
                }
            }

            res.json({
                documentHash: hash,
                isRegistered: exists,
                submitter: exists ? submitter : null,
                timestamp: exists ? Number(timestamp) : null, // Convert BigInt to Number
                timestampDate: exists ? new Date(Number(timestamp) * 1000).toISOString() : null
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Verification failed', details: error.message });
        }
    });
};
