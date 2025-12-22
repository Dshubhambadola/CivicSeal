const { ethers } = require('ethers');
const { User } = require('../models');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js'); // Using pure JS crypto for AES
const jwt = require('jsonwebtoken');


// 1. Register (Custodial: Email + Password -> New Wallet)
exports.register = async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email/Password required' });

    try {
        // Check if user exists
        let existing = await User.findOne({ where: { email } });
        if (existing) return res.status(400).json({ error: 'User already exists' });

        // Generate Wallet
        const wallet = ethers.Wallet.createRandom();

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Encrypt Private Key (Using Password as secret, or Env Secret. Using Env Secret is better for "Forgot Password" flow)
        // Simple AES encryption of private key using app secret.
        const encryptedPrivateKey = CryptoJS.AES.encrypt(wallet.privateKey, process.env.APP_SECRET || 'fallback_secret').toString();

        // FUNDING STEP (MVP Relayer Logic):
        // Automatically send 1 ETH from Admin to this new User so they can pay for gas.
        try {
            const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://blockchain:8545");
            const adminWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            const tx = await adminWallet.sendTransaction({
                to: wallet.address,
                value: ethers.parseEther("1.0")
            });
            await tx.wait();
            console.log(`Funded new user ${wallet.address} with 1 ETH. Tx: ${tx.hash}`);
        } catch (fundErr) {
            console.error("Funding failed (Blockchain might be down or Admin empty):", fundErr.message);
            // We don't block registration, but user will have 0 ETH.
        }

        const user = await User.create({
            walletAddress: wallet.address,
            email,
            name,
            passwordHash,
            encryptedPrivateKey,
            publicKey: wallet.publicKey, // Store for Sharing
            mobile: req.body.mobile || null
        });

        // Generate Real JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, address: user.walletAddress },
            process.env.APP_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            user: { email: user.email, address: user.walletAddress, name: user.name },
            token: token
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

// 2. Login (Custodial)
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const validPass = await bcrypt.compare(password, user.passwordHash);
        if (!validPass) return res.status(401).json({ error: 'Invalid password' });

        // Generate Real JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, address: user.walletAddress },
            process.env.APP_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            user: {
                email: user.email,
                address: user.walletAddress,
                name: user.name
            },
            token: token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
};

// 3. Faucet (Dev Only - Auto fund on register?)
exports.getFunds = async (req, res) => {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Address required' });

    try {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://blockchain:8545");
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        const tx = await wallet.sendTransaction({
            to: address,
            value: ethers.parseEther("1.0") // Send 1 ETH
        });

        await tx.wait();
        res.json({ success: true, txHash: tx.hash });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Faucet failed', details: err.message });
    }
};
