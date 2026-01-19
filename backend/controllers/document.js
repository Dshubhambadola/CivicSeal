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
                // Sanitize filename: replace narrow no-break space (U+202F) and other non-standard spaces with regular space
                originalName: req.file.originalname.replace(/[\u202F\u00A0]/g, ' ')
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

        try {
            let hash;

            // 1. Determine Hash (File or Body)
            // Note: If sent as JSON, 'upload' middleware might skip 'req.body' fields if Content-Type isn't handled correctly before multer,
            // BUT multer handles multipart/form-data. If sending JSON, multer might ignore it.
            // Ideally, we check content-type or ensure body parsing works. 
            // In Express, body-parser usually runs before routes.
            if (req.file) {
                hash = calculateHash(req.file.buffer);
            } else if (req.body.hash) {
                hash = req.body.hash;
            } else {
                return res.status(400).json({ error: 'No file or hash provided' });
            }

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

                // UNPIN FROM PINATA
                if (doc.ipfsHash) {
                    const { unpinFromIPFS } = require('../services/ipfs');
                    await unpinFromIPFS(doc.ipfsHash);
                }
            }

            res.json({ success: true, message: "Document Revoked & Unpinned", txHash: tx.hash });

        } catch (error) {
            console.error(error);
            // Handle specific revers
            if (error.reason) res.status(400).json({ error: error.reason });
            else res.status(500).json({ error: "Revocation failed", details: error.message });
        }
    });
};

exports.listDocuments = async (req, res) => {
    try {
        // req.user is set by auth middleware
        if (!req.user || !req.user.address) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const address = req.user.address;

        // Fetch from Postgres
        const docs = await DocumentMetadata.findAll({
            where: { submitter: address },
            order: [['timestamp', 'DESC']]
        });

        res.json({ success: true, documents: docs });

    } catch (error) {
        console.error("List Documents Error:", error);
        res.status(500).json({ error: "Failed to fetch documents" });
    }
};

// --- Secure Sharing ---

exports.getPublicKey = async (req, res) => {
    const { email } = req.params;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ error: "User not found" });
        if (!user.publicKey) return res.status(404).json({ error: "User has no public key generated" });

        res.json({ success: true, publicKey: user.publicKey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.shareDocument = async (req, res) => {
    const { documentHash, recipientEmail } = req.body;
    try {
        const { DocumentShare, DocumentMetadata } = require('../models');

        // 1. Get Document
        const doc = await DocumentMetadata.findOne({ where: { hash: documentHash } });
        if (!doc) return res.status(404).json({ error: "Document not found" });

        // 2. Custodial Decryption of Original Key
        // MVP Logic: The uploaded key is stored as `ESCROW_base64(password)`
        let originalKey = doc.encryptedKey;

        if (originalKey && originalKey.startsWith('ESCROW_')) {
            const base64Pass = originalKey.replace('ESCROW_', '');
            originalKey = Buffer.from(base64Pass, 'base64').toString('utf-8');
        } else {
            // If key is missing or not in escrow format, we cannot share it custodially (MVP limitation)
            // We'll proceed with the 'encryptedKey' from body if specificed, otherwise fail
            if (req.body.encryptedKey) {
                originalKey = req.body.encryptedKey; // Allow client-side override if we implemented that
            } else {
                // return res.status(400).json({ error: "Document key not available for sharing" });
                // Fallback to demo key (for existing demo files)
                originalKey = "DEMO_SECRET_KEY_123";
            }
        }

        // 3. Re-Encrypt for Recipient (Custodial)
        // Key: APP_SECRET + recipientEmail
        const reEncryptedKey = CryptoJS.AES.encrypt(originalKey, process.env.APP_SECRET + recipientEmail).toString();

        // 4. Store Share Record
        await DocumentShare.create({
            documentHash,
            senderEmail: req.user.email,
            recipientEmail,
            encryptedKey: reEncryptedKey
        });

        res.json({ success: true, message: `Shared with ${recipientEmail}` });

    } catch (err) {
        console.error("Share failed", err);
        res.status(500).json({ error: "Share failed" });
    }
};

exports.listSharedWithMe = async (req, res) => {
    try {
        const { DocumentShare } = require('../models');
        const shares = await DocumentShare.findAll({
            where: { recipientEmail: req.user.email }
        });
        res.json({ success: true, shares });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch shares" });
    }
};

exports.openSharedDocument = async (req, res) => {
    const { documentHash } = req.body;
    try {
        const { DocumentShare } = require('../models');

        const share = await DocumentShare.findOne({
            where: {
                documentHash: documentHash,
                recipientEmail: req.user.email
            }
        });

        if (!share) return res.status(404).json({ error: "Share record not found" });

        // Decrypt the Key (Custodial Unwrap)
        const bytes = CryptoJS.AES.decrypt(share.encryptedKey, process.env.APP_SECRET + req.user.email);
        const originalFileKey = bytes.toString(CryptoJS.enc.Utf8);

        const doc = await DocumentMetadata.findOne({ where: { hash: share.documentHash } });
        if (!doc) return res.status(404).json({ error: "Document metadata missing" });

        res.json({
            success: true,
            ipfsHash: doc.ipfsHash,
            fileKey: originalFileKey,
            filename: doc.originalName || 'shared_document.enc'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to open document" });
    }
};

// --- Public Sharing (Verifiable Links) ---

exports.createPublicLink = async (req, res) => {
    try {
        const { documentHash, expiryDate } = req.body;
        const { PublicShare, DocumentMetadata } = require('../models');

        // 1. Verify Ownership
        const doc = await DocumentMetadata.findOne({ where: { hash: documentHash } });
        if (!doc) return res.status(404).json({ error: "Document not found" });

        // Check if user is the submitter (using address from auth)
        // Note: req.user.address is populated by auth middleware
        if (doc.submitter.toLowerCase() !== req.user.address.toLowerCase()) {
            return res.status(403).json({ error: "Only the owner can create public links" });
        }

        // 2. Create Link
        const share = await PublicShare.create({
            documentHash,
            creatorId: req.user.email, // Using email for traceability
            expiryDate: expiryDate || null
        });

        res.json({
            success: true,
            linkId: share.id,
            fullUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${share.id}`
        });

    } catch (err) {
        console.error("Create Public Link Link Error:", err);
        res.status(500).json({ error: "Failed to create public link" });
    }
};

exports.getPublicDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { PublicShare, DocumentMetadata } = require('../models');

        // 1. Find the Share
        const share = await PublicShare.findByPk(id);
        if (!share) return res.status(404).json({ error: "Link not found" });

        if (!share.isEnabled) return res.status(410).json({ error: "Link has been disabled" });

        if (share.expiryDate && new Date() > new Date(share.expiryDate)) {
            return res.status(410).json({ error: "Link has expired" });
        }

        // 2. Get Document Metadata
        const doc = await DocumentMetadata.findOne({ where: { hash: share.documentHash } });
        if (!doc) return res.status(404).json({ error: "Document metadata missing" });

        // 3. Verify on Blockchain (Real-time check)
        // We do this server-side to spare the client from setting up Ethers/Providers
        try {
            const result = await documentRegistry.verifyHash(doc.hash);
            const [exists, submitter, timestamp, ipfsHash, encryptedKey, revoked] = result;

            res.json({
                success: true,
                document: {
                    originalName: doc.originalName,
                    hash: doc.hash,
                    ipfsHash: doc.ipfsHash,
                    submitter: submitter,
                    timestamp: timestamp.toString(),
                    revoked: revoked,
                    // If DB says revoked but chain doesn't (due to dev reset), trust DB? 
                    // For now, chain is source of truth.
                    isChainValid: exists
                },
                shareDetails: {
                    creator: share.creatorId,
                    createdAt: share.createdAt
                }
            });

        } catch (chainErr) {
            console.error("Chain verify failed:", chainErr);
            // Fallback to DB metadata if chain fails (e.g. dev environment issues)
            res.json({
                success: true,
                isFallback: true,
                document: {
                    originalName: doc.originalName,
                    hash: doc.hash,
                    ipfsHash: doc.ipfsHash,
                    submitter: doc.submitter,
                    timestamp: Math.floor(new Date(doc.createdAt).getTime() / 1000),
                    revoked: doc.revoked
                }
            });
        }

    } catch (err) {
        console.error("Get Public Doc Error:", err);
        res.status(500).json({ error: "Failed to fetch document" });
    }
};

