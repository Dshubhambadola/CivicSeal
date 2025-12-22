const crypto = require('crypto');
const multer = require('multer');
// Imports needed for User Signing
const { User } = require('../models');
const CryptoJS = require('crypto-js');
const { ethers } = require('ethers');
const { documentRegistry, provider, addresses, DocumentRegistryABI } = require('../services/blockchain');

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
            const { encryptedKey, originalHash } = req.body;
            const fileBuffer = req.file.buffer;

            // 1. Authenticate User (From JWT Middleware)
            // Middleware sets req.user = { id, email, address }
            let signerContract = documentRegistry; // Default to Admin
            let submitterAddress = documentRegistry.runner.address;

            if (req.user && req.user.email) {
                const email = req.user.email;
                const user = await User.findOne({ where: { email } });
                if (!user) return res.status(404).json({ error: 'User record not found' });

                // Decrypt Private Key
                const bytes = CryptoJS.AES.decrypt(user.encryptedPrivateKey, process.env.APP_SECRET || 'fallback_secret');
                const privateKey = bytes.toString(CryptoJS.enc.Utf8);

                if (!privateKey) throw new Error("Failed to decrypt user key");

                // Connect User Wallet
                const userWallet = new ethers.Wallet(privateKey, provider);
                signerContract = new ethers.Contract(addresses.DocumentRegistry, DocumentRegistryABI, userWallet);
                submitterAddress = userWallet.address;
                console.log(`Signing as User: ${email} (${submitterAddress})`);

                // GAS STATION: Check balance and fund if empty
                const balance = await provider.getBalance(submitterAddress);
                if (balance < ethers.parseEther("0.01")) {
                    console.log(`User balance low (${ethers.formatEther(balance)} ETH). Initiating auto-funding...`);
                    try {
                        const adminWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
                        const tx = await adminWallet.sendTransaction({
                            to: submitterAddress,
                            value: ethers.parseEther("0.1") // Send 0.1 ETH
                        });
                        await tx.wait();
                        console.log(`Funded user ${submitterAddress}. Tx: ${tx.hash}`);
                    } catch (fundErr) {
                        console.error("Auto-funding failed:", fundErr.message);
                    }
                }
            } else {
                return res.status(401).json({ error: "Unauthorized: You must be logged in to register a document." });
            }

            // 2. Hash Calculation
            const hash = originalHash || calculateHash(fileBuffer);

            console.log(`Processing file: ${req.file.originalname}`);
            console.log(`ID Hash: ${hash}`);

            // 3. Check Blockchain & Database
            let [exists] = await documentRegistry.verifyHash(hash); // Read-only check is fine with any provider
            const dbExists = await DocumentMetadata.findOne({ where: { hash } });

            if (exists || dbExists) {
                return res.status(200).json({
                    message: 'Document already registered',
                    documentHash: hash,
                    ipfsHash: dbExists ? dbExists.ipfsHash : null
                });
            }

            // 4. Upload to IPFS (Mock)
            const ipfsHash = await uploadToIPFS(fileBuffer);

            // 5. Store on Blockchain (Using User's Contract Instance)
            const tx = await signerContract.storeDocument(hash, ipfsHash, encryptedKey || "NO_KEY");
            console.log(`Transaction sent: ${tx.hash}`);

            const receipt = await tx.wait();
            console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

            // 6. Index in PostgreSQL
            await DocumentMetadata.create({
                hash,
                ipfsHash,
                submitter: submitterAddress,
                encryptedKey: encryptedKey || null,
                originalName: req.file.originalname
            });

            res.json({
                message: 'Document registered securely',
                transactionHash: tx.hash,
                documentHash: hash,
                ipfsHash: ipfsHash,
                blockNumber: receipt.blockNumber,
                signedBy: submitterAddress
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

            // Expected return from verifyHash: [exists, submitter, timestamp, ipfsHash, encryptedKey, revoked]
            const result = await documentRegistry.verifyHash(hash);
            console.log("Raw Verify Result:", result); // DEBUG LOG

            let exists = result[0];
            let submitter = result[1];
            let timestamp = result[2];
            let revoked = result[5]; // Revoked is the 6th return value
            console.log(`Extracted: Exists=${exists}, Revoked=${revoked}`);

            // Fallback: Check Database (Dev Env: Chain resets, DB persists)
            if (!exists) {
                const dbDoc = await DocumentMetadata.findOne({ where: { hash } });
                if (dbDoc) {
                    exists = true;
                    submitter = dbDoc.submitter;
                    timestamp = dbDoc.timestamp || Math.floor(new Date(dbDoc.createdAt).getTime() / 1000);
                    revoked = dbDoc.revoked || false; // We need to add 'revoked' to DB model too
                    console.log("Verified via Database Index (Chain reset detected)");
                }
            }

            res.json({
                documentHash: hash,
                isRegistered: exists,
                isRevoked: revoked,
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

exports.revokeDocument = (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // We need the hash to revoke. Can be sent in body or calculated from file.
        // Let's support file upload to calculate hash.
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        try {
            const hash = calculateHash(req.file.buffer);

            // 1. Authenticate (Must match submitter)
            if (!req.user || !req.user.email) return res.status(401).json({ error: "Unauthorized" });
            const user = await User.findOne({ where: { email: req.user.email } });
            if (!user) return res.status(404).json({ error: "User not found" });

            // Decrypt Key
            const bytes = CryptoJS.AES.decrypt(user.encryptedPrivateKey, process.env.APP_SECRET || 'fallback_secret');
            const privateKey = bytes.toString(CryptoJS.enc.Utf8);
            const userWallet = new ethers.Wallet(privateKey, provider);
            const signerContract = new ethers.Contract(addresses.DocumentRegistry, DocumentRegistryABI, userWallet);

            console.log(`Revoking document ${hash} as ${userWallet.address}`);

            const tx = await signerContract.revokeDocument(hash);
            await tx.wait();

            // Store in DB that it is revoked
            let doc = await DocumentMetadata.findOne({ where: { hash } });
            if (doc) {
                doc.revoked = true;
                await doc.save();
            }

            res.json({ success: true, message: "Document Revoked", txHash: tx.hash });

        } catch (error) {
            console.error(error);
            // Handle specific revers
            if (error.reason) res.status(400).json({ error: error.reason });
            else res.status(500).json({ error: "Revocation failed", details: error.message });
        }
    });
};
