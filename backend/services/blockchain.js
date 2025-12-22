const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load Contract Addresses
const addressesPath = path.join(__dirname, '../config/contract-addresses.json');
if (!fs.existsSync(addressesPath)) {
    console.error("Contract addresses not found. Please deploy contracts first.");
    process.exit(1); // Exit if no contracts
}
const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));

// Load Contract ABIs
const docRegistryArtifactPath = path.join(__dirname, '../../contracts/artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json');

const DocumentRegistryABI = JSON.parse(fs.readFileSync(docRegistryArtifactPath, 'utf8')).abi;

// Setup Provider and Wallet
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Create Contract Instances
const documentRegistry = new ethers.Contract(addresses.DocumentRegistry, DocumentRegistryABI, wallet);

module.exports = {
    documentRegistry,
    wallet, // Export wallet if needed specifically
    provider,
    DocumentRegistryABI,
    addresses
};
