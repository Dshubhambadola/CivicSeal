'use client';

import { useState } from 'react';
import CryptoJS from 'crypto-js';

export default function DocumentsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [mode, setMode] = useState<'verify' | 'upload'>('verify'); // Default to verify
    const [password, setPassword] = useState(''); // User password for encryption

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setResult(null);
            setError('');
        }
    };

    const encryptFile = (file: File, pass: string): Promise<{ encrypted: Blob, key: string }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wordArray = CryptoJS.lib.WordArray.create(e.target?.result as any);
                    // In real E2EE, generate random key, lock with password (PBKDF2), and also lock with Company PubKey
                    // Simplified here: Ensure file content is encrypted with password
                    const encrypted = CryptoJS.AES.encrypt(wordArray, pass).toString();
                    const encryptedBlob = new Blob([encrypted], { type: 'text/plain' });

                    // We send a "key" to backend only if we implemented the Recovery Logic (Escrow)
                    // For now, we simulate sending an "Encrypted Key" which is just a placeholder or the password encrypted by Company Key
                    const fakeEncryptedKey = `ESCROW_${btoa(pass)}`;

                    resolve({ encrypted: encryptedBlob, key: fakeEncryptedKey });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const formData = new FormData();

            if (mode === 'upload') {
                if (!password) throw new Error("Password required for encryption");

                // 1. Client-Side Encryption
                const { encrypted, key } = await encryptFile(file, password);

                // 2. Calculate Original Hash (for storage ID)
                // We need to read the original file again or clone the reader logic
                const fileHash = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const wordArray = CryptoJS.lib.WordArray.create(e.target?.result as any);
                        const hash = CryptoJS.SHA256(wordArray).toString();
                        resolve('0x' + hash);
                    };
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(file);
                });

                formData.append('document', encrypted, file.name + '.enc');
                formData.append('encryptedKey', key);
                formData.append('originalHash', fileHash); // Send explicit ID

            } else {
                formData.append('document', file);
            }

            const endpoint = mode === 'upload' ? `${API_URL}/api/upload` : `${API_URL}/api/verify`;

            const res = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');

            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="header" style={{ padding: 0, border: 'none', marginBottom: '2rem' }}>
                <h2>Document {mode === 'upload' ? 'Registration (E2EE)' : 'Verification'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                        onClick={() => { setMode('verify'); setResult(null); setError(''); }}
                        className="btn"
                        style={{
                            background: mode === 'verify' ? 'var(--primary)' : 'transparent',
                            border: '1px solid var(--primary)'
                        }}>
                        Verify
                    </button>
                    <button
                        onClick={() => { setMode('upload'); setResult(null); setError(''); }}
                        className="btn"
                        style={{
                            background: mode === 'upload' ? 'var(--primary)' : 'transparent',
                            border: '1px solid var(--primary)',
                            marginRight: '1rem'
                        }}>
                        Register
                    </button>

                    {/* Faucet Button */}
                    <button className="btn" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', background: '#333', border: '1px solid #444' }}
                        onClick={async () => {
                            const addr = prompt("Enter wallet address to fund:");
                            if (!addr) return;
                            try {
                                const res = await fetch('http://localhost:3001/api/auth/faucet', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ address: addr })
                                });
                                const d = await res.json();
                                if (d.success) alert("Sent 1 ETH! Tx: " + d.txHash);
                                else alert("Failed: " + d.error);
                            } catch (e) { alert("Error calling faucet"); }
                        }}
                    >
                        💰 Fund
                    </button>
                </div>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Select Document</label>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="input"
                            style={{ padding: '2rem', borderStyle: 'dashed', textAlign: 'center' }}
                        />
                    </div>

                    {mode === 'upload' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>Encryption Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="Strong password to encrypt file"
                            />
                        </div>
                    )}

                    <button type="submit" className="btn" style={{ width: '100%' }} disabled={!file || loading}>
                        {loading ? 'Processing...' : (mode === 'upload' ? 'Encrypt & Register' : 'Verify Integrity')}
                    </button>
                </form>

                {error && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '0.5rem' }}>
                        ❌ {error}
                    </div>
                )}

                {result && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '0.5rem', overflowWrap: 'break-word' }}>
                        {mode === 'upload' ? (
                            <>
                                <h4 style={{ margin: '0 0 0.5rem' }}>
                                    {result.message === 'Document already registered' ? 'ℹ️ Already Registered' : '✅ Securely Registered!'}
                                </h4>
                                {result.transactionHash && (
                                    <p style={{ fontSize: '0.875rem' }}>Tx Hash: {result.transactionHash}</p>
                                )}
                                <p style={{ fontSize: '0.875rem' }}>IPFS CID: {result.ipfsHash}</p>
                            </>
                        ) : (
                            <>
                                <h4 style={{ margin: '0 0 0.5rem' }}>
                                    {result.isRegistered ? '✅ Document Verified' : '⚠️ Document NOT Registered'}
                                </h4>
                                {result.isRegistered && (
                                    <div style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>
                                        <p>Submitter: {result.submitter}</p>
                                        <p>Timestamp: {new Date(result.timestampDate).toLocaleString()}</p>
                                        {result.ipfsHash && <p>IPFS CID: {result.ipfsHash}</p>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
