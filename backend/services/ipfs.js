const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// In a real app, use Pinata SDK or ipfs-http-client
// Here we mock IPFS by storing in a local folder with the hash as filename

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

exports.uploadToIPFS = async (buffer) => {
    // Simulate IPFS CID generation (SHA-256)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const ipfsHash = `QmFake${hash.substring(0, 40)}`; // Mock CID format

    const filePath = path.join(UPLOADS_DIR, ipfsHash);
    fs.writeFileSync(filePath, buffer);

    console.log(`Mock IPFS Upload: Stored at ${filePath}`);
    return ipfsHash;
};

exports.getFromIPFS = async (ipfsHash) => {
    const filePath = path.join(UPLOADS_DIR, ipfsHash);
    if (!fs.existsSync(filePath)) {
        throw new Error("File not found on Mock IPFS");
    }
    return fs.readFileSync(filePath);
}
