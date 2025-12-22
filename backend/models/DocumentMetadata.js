const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentMetadata = sequelize.define('DocumentMetadata', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    hash: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    ipfsHash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    submitter: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    encryptedKey: {
        type: DataTypes.TEXT, // Can be long
        allowNull: true,
    },
    originalName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
});

module.exports = DocumentMetadata;
