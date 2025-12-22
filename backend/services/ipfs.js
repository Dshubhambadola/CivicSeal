const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const stream = require('stream');

const PINATA_JWT = process.env.PINATA_JWT;

exports.uploadToIPFS = async (buffer, filename = 'document') => {
    if (!PINATA_JWT) {
        throw new Error("Missing PINATA_JWT environment variable");
    }

    try {
        const formData = new FormData();
        // Create a stream from the buffer to send to Pinata
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);

        formData.append('file', bufferStream, {
            filename: filename,
            contentType: 'application/octet-stream' // Or detect from filename if passed
        });

        const metadata = JSON.stringify({
            name: filename,
        });
        formData.append('pinataMetadata', metadata);

        const options = JSON.stringify({
            cidVersion: 1, // V1 CIDs are better
        });
        formData.append('pinataOptions', options);

        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
            maxBodyLength: "Infinity",
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`,
                ...formData.getHeaders()
            }
        });

        console.log("Pinata Upload Success:", res.data);
        return res.data.IpfsHash;

    } catch (error) {
        console.error("Pinata Upload Failed:", error.response ? error.response.data : error.message);
        throw new Error("Failed to upload to IPFS (Pinata)");
    }
};

exports.getFromIPFS = async (ipfsHash) => {
    // We can use a public gateway or Pinata gateway
    // Example: https://gateway.pinata.cloud/ipfs/
    const gateway = "https://gateway.pinata.cloud/ipfs/";
    try {
        const res = await axios.get(`${gateway}${ipfsHash}`, {
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (error) {
        throw new Error(`Failed to fetch from IPFS: ${error.message}`);
    }
};

exports.unpinFromIPFS = async (ipfsHash) => {
    if (!PINATA_JWT) return; // Skip if no credentials

    try {
        await axios.delete(`https://api.pinata.cloud/pinning/unpin/${ipfsHash}`, {
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`
            }
        });
        console.log(`Pinata: Unpinned ${ipfsHash}`);
    } catch (error) {
        console.error("Pinata Unpin Failed:", error.response ? error.response.data : error.message);
        // We don't throw here, because revocation should succeed even if unpin fails
    }
};
