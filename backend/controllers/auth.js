const { ethers } = require('ethers');
const { User } = require('../models');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js'); // Using pure JS crypto for AES


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

        const user = await User.create({
            walletAddress: wallet.address,
            email,
            name,
            passwordHash,
            encryptedPrivateKey,
            mobile: req.body.mobile || null
        });

        res.json({ success: true, user: { email: user.email, address: user.walletAddress, name: user.name } });

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

        // Return user info (In real app, return JWT)
        res.json({
            success: true,
            user: {
                email: user.email,
                address: user.walletAddress,
                name: user.name
            },
            // Hacky way to send Private Key to client IF we wanted Client-Size signing.
            // But we want Server-Side signing. So we just define session.
            token: "mock_jwt_session"
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
