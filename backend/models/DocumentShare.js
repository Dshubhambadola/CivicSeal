const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentShare = sequelize.define('DocumentShare', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    documentHash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    senderEmail: {
        type: DataTypes.STRING,
        allowNull: false
    },
    recipientEmail: {
        type: DataTypes.STRING,
        allowNull: false
    },
    encryptedKey: {
        // This is the file key, re-encrypted with Recipient's Public Key
        type: DataTypes.TEXT,
        allowNull: false
    }
});

module.exports = DocumentShare;
