const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const API_URL = 'http://localhost:3001';
const TEST_EMAIL = 'test_public@example.com';
const TEST_PASS = 'password123';

async function runTest() {
    try {
        console.log('1. Registering User...');
        try {
            await axios.post(`${API_URL}/api/auth/register`, {
                email: TEST_EMAIL,
                password: TEST_PASS
            });
        } catch (e) {
            console.log('   User might already exist, logging in...');
        }

        console.log('2. Logging In...');
        const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASS
        });
        const token = loginRes.data.token;
        console.log('   App Token:', token ? 'OK' : 'FAIL');

        console.log('3. Uploading Document...');
        const form = new FormData();
        form.append('document', Buffer.from('Public Verification Test Content'), { filename: 'public_audit.txt' });

        // We're skipping the client-side encryption step for this raw API test 
        // effectively uploading a "plaintext" file as if it were encrypted blob
        const uploadRes = await axios.post(`${API_URL}/api/upload`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        const docHash = uploadRes.data.documentHash;
        console.log('   Document Uploaded. Hash:', docHash);

        console.log('4. Creating Public Link...');
        const linkRes = await axios.post(`${API_URL}/api/public/create`, {
            documentHash: docHash
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const linkId = linkRes.data.linkId;
        const fullUrl = linkRes.data.fullUrl;
        console.log('   Link Created:', fullUrl);

        console.log('5. Verifying Public Link (Anonymous Access)...');
        const verifyRes = await axios.get(`${API_URL}/api/public/${linkId}`);
        const doc = verifyRes.data.document;

        console.log('   Verification Result:');
        console.log('   - Valid Chain:', doc.isChainValid);
        console.log('   - Submitter:', doc.submitter);
        console.log('   - Timestamp:', doc.timestamp);

        if (doc.isChainValid && doc.hash === docHash) {
            console.log('\n✅ SUCCESS: Public Verification Flow Working!');
        } else {
            console.error('\n❌ FAILURE: Verification mismatch');
        }

    } catch (err) {
        console.error('\n❌ ERROR:', err.response ? err.response.data : err.message);
    }
}

runTest();
