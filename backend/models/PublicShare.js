const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PublicShare = sequelize.define('PublicShare', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    documentHash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    creatorId: {
        type: DataTypes.STRING, // Wallet Address or Email
        allowNull: false
    },
    isEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

module.exports = PublicShare;
