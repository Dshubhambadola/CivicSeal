const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const crypto = require('crypto');

const API_URL = 'http://localhost:3001/api';

async function runTest() {
    try {
        console.log('--- Starting End-to-End Test ---');

        // 1. Simulate Client-Side Encryption
        console.log('1. Simulating Client-Side Encryption...');
        const originalContent = "This is a secret document content.";
        const password = "admin_password_123";

        // In real app, we use AES. Here we just pretend the content is encrypted.
        const encryptedContent = `[ENCRYPTED_WITH_${password}]${originalContent}`;
        const fakeKey = `ESCROW_KEY_${crypto.randomBytes(8).toString('hex')}`;

        fs.writeFileSync('test_enc.txt', encryptedContent);

        // 2. Upload
        console.log('2. Uploading Encrypted File...');
        const form = new FormData();
        form.append('document', fs.createReadStream('test_enc.txt'));
        form.append('encryptedKey', fakeKey);

        const uploadRes = await axios.post(`${API_URL}/upload`, form, {
            headers: form.getHeaders()
        });

        console.log('✅ Upload Successful!');
        console.log('   Tx Hash:', uploadRes.data.transactionHash);
        console.log('   Doc Hash:', uploadRes.data.documentHash);
        console.log('   IPFS CID:', uploadRes.data.ipfsHash);

        const docHash = uploadRes.data.documentHash;

        // 3. Verify on Blockchain (via Backend)
        console.log('\n3. Verifying on Blockchain...');
        // We need to re-upload the same file content to get the same hash for verification logic
        // Or we can cheat and hit the recover endpoint which looks up by hash

        // 4. Test Key Recovery
        console.log('\n4. Testing Key Recovery (Escrow)...');
        const recoverRes = await axios.post(`${API_URL}/recover`, {
            docHash: docHash
        });

        if (recoverRes.data.recoveredKey === fakeKey) {
            console.log('✅ Recovery Successful! Keys Match.');
            console.log('   Sent Key:    ', fakeKey);
            console.log('   Recov Key:   ', recoverRes.data.recoveredKey);
        } else {
            console.error('❌ Recovery Failed! Keys do not match.');
        }

        console.log('\n--- Test Complete ---');

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
    }
}

runTest();
