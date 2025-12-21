const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    walletAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    mobile: {
        type: DataTypes.STRING,
        allowNull: true
    },
    passwordHash: { // For Custodial Login
        type: DataTypes.STRING,
        allowNull: true
    },
    encryptedPrivateKey: { // Custodial Wallet Key
        type: DataTypes.TEXT,
        allowNull: true
    },
    nonce: {
        // Keeping this for potential "Export Wallet" or advanced SIWE future use
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: () => Math.floor(Math.random() * 1000000).toString()
    }
});

module.exports = User;
