'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import CryptoJS from 'crypto-js';

export default function DashboardPage() {
    const { token, user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [documents, setDocuments] = useState<any[]>([]); // Changed to match template: "documents"
    const [sharedDocs, setSharedDocs] = useState<any[]>([]); // New state for shared docs
    const [subTab, setSubTab] = useState<'my' | 'shared'>('my');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Share Modal State
    const [shareModal, setShareModal] = useState<{ open: boolean, docHash: string | null }>({ open: false, docHash: null });
    const [recipientEmail, setRecipientEmail] = useState('');
    const [shareStatus, setShareStatus] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    useEffect(() => {
        if (!authLoading && !token) {
            router.push('/login');
        } else if (token) {
            fetchDocuments();
        }
    }, [token, authLoading]);

    const fetchDocuments = async () => {
        try {
            // Fetch My Docs
            const res = await fetch(`${API_URL}/api/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setDocuments(data.documents);
            } else {
                setError(data.error || 'Failed to fetch my documents');
            }

            // Fetch Shared Docs
            const resShared = await fetch(`${API_URL}/api/shared-with-me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataShared = await resShared.json();
            if (resShared.ok) {
                setSharedDocs(dataShared.shares);
            } else {
                setError(dataShared.error || 'Failed to fetch shared documents');
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!shareModal.docHash || !recipientEmail) return;
        setShareStatus('Sharing...');

        try {
            // Custodial Sharing Flow:
            // 1. Send Recipient Email & Doc Hash to Backend
            // 2. Backend handles re-encryption of the key securely.

            const shareRes = await fetch(`${API_URL}/api/share`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    documentHash: shareModal.docHash,
                    recipientEmail
                })
            });

            const shareData = await shareRes.json();
            if (shareData.success) {
                setShareStatus(`✅ Shared with ${recipientEmail}`);
                setTimeout(() => {
                    setShareModal({ open: false, docHash: null });
                    setRecipientEmail('');
                    setShareStatus('');
                }, 1500);
            } else {
                throw new Error(shareData.error);
            }

        } catch (e: any) {
            setShareStatus(`❌ Error: ${e.message}`);
        }
    };

    const handleRevoke = async (hash: string) => {
        if (!confirm("Are you sure? This action is permanent.")) return;

        try {
            const res = await fetch(`${API_URL}/api/revoke`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ hash })
            });

            if (res.ok) {
                alert("Revoked!");
                fetchDocuments();
            } else {
                const d = await res.json();
                alert(`Failed: ${d.error}`);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };

    const handleOpenShared = async (documentHash: string) => {
        try {
            // 1. Get Key and IPFS Hash from Backend
            const res = await fetch(`${API_URL}/api/open-shared`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ documentHash })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to open document");

            const { ipfsHash, fileKey, filename } = data;

            // 2. Fetch Encrypted File from IPFS
            const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
            console.log("Fetching from IPFS:", ipfsUrl);

            const fileRes = await fetch(ipfsUrl);
            if (!fileRes.ok) throw new Error("Failed to fetch file from IPFS");

            const encryptedContent = await fileRes.text(); // Content is Base64 string from Upload logic

            // 3. Decrypt
            // fileKey is the 'password' used in CryptoJS.AES.encrypt(wordArray, password)
            if (!fileKey) throw new Error("No decryption key available");

            const decryptedBytes = CryptoJS.AES.decrypt(encryptedContent, fileKey);

            // Convert to Typed Array
            // Helper to convert WordArray to Uint8Array
            const convertWordArrayToUint8Array = (wordArray: any) => {
                const len = wordArray.sigBytes;
                const u8 = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    u8[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                }
                return u8;
            };

            const u8 = convertWordArrayToUint8Array(decryptedBytes);

            if (u8.length === 0) throw new Error("Decryption failed or file is empty (Check password/key)");

            // 4. Create Blob and Download
            const blob = new Blob([u8], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'downloaded_file';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (e: any) {
            alert("Error opening: " + e.message);
        }
    };

    if (authLoading || loading) return <div className="container">Loading...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2>My Dashboard 🗂️</h2>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #334155' }}>
                <button
                    onClick={() => setSubTab('my')}
                    style={{
                        padding: '0.75rem 1rem',
                        background: 'transparent',
                        color: subTab === 'my' ? '#3b82f6' : '#94a3b8',
                        borderBottom: subTab === 'my' ? '2px solid #3b82f6' : 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                    }}
                >
                    My Uploads
                </button>
                <button
                    onClick={() => setSubTab('shared')}
                    style={{
                        padding: '0.75rem 1rem',
                        background: 'transparent',
                        color: subTab === 'shared' ? '#3b82f6' : '#94a3b8',
                        borderBottom: subTab === 'shared' ? '2px solid #3b82f6' : 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                    }}
                >
                    Shared With Me 📥
                </button>
            </div>

            <div className="card">
                {subTab === 'my' ? (
                    documents.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8' }}>No uploaded documents found.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#334155', color: '#fff' }}>
                                        <th style={{ padding: '10px' }}>Name</th>
                                        <th style={{ padding: '10px' }}>ID (Hash)</th>
                                        <th style={{ padding: '10px' }}>Date</th>
                                        <th style={{ padding: '10px' }}>Status</th>
                                        <th style={{ padding: '10px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((doc, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid #1e293b' }}>
                                            <td style={{ padding: '10px', fontWeight: 'bold' }}>
                                                {doc.originalName ? doc.originalName.replace('.enc', '') : `Doc #${index + 1}`}
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <div style={{ fontSize: '0.85em', color: '#64748b', fontFamily: 'monospace' }} title={doc.hash}>
                                                    {doc.hash.substring(0, 10)}...
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                                                {new Date(doc.timestamp).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                {doc.revoked ? (
                                                    <span style={{ color: '#ef4444' }}>Revoked</span>
                                                ) : (
                                                    <span style={{ color: '#22c55e' }}>Active</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                {!doc.revoked ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            className="btn"
                                                            style={{ fontSize: '0.8rem', padding: '0.5rem', background: '#ef4444', border: 'none' }}
                                                            onClick={() => handleRevoke(doc.hash)}
                                                        >
                                                            Revoke
                                                        </button>
                                                        <button
                                                            className="btn"
                                                            style={{ fontSize: '0.8rem', padding: '0.5rem', background: '#3b82f6', border: 'none' }}
                                                            onClick={() => setShareModal({ open: true, docHash: doc.hash })}
                                                        >
                                                            Share
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#64748b' }}>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    // Shared Docs View
                    sharedDocs.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94a3b8' }}>No documents have been shared with you yet.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#334155', color: '#fff' }}>
                                        <th style={{ padding: '10px' }}>From</th>
                                        <th style={{ padding: '10px' }}>Document Hash</th>
                                        <th style={{ padding: '10px' }}>Date Shared</th>
                                        <th style={{ padding: '10px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sharedDocs.map((share, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid #1e293b' }}>
                                            <td style={{ padding: '10px', color: '#3b82f6' }}>{share.senderEmail}</td>
                                            <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                                {share.documentHash.substring(0, 16)}...
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                {new Date(share.createdAt).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                <button className="btn" style={{ fontSize: '0.8rem', background: '#22c55e' }} onClick={() => handleOpenShared(share.documentHash)}>
                                                    🔓 Open
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* Share Modal */}
            {shareModal.open && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '400px', background: '#1e293b', border: '1px solid #334155' }}>
                        <h3 style={{ marginTop: 0 }}>Share Document 🔐</h3>
                        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                            Grant access to another registered user securely.
                        </p>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Recipient Email:</label>
                            <input
                                type="email"
                                className="input"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                placeholder="bob@example.com"
                                style={{ width: '100%' }}
                            />
                        </div>

                        {shareStatus && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                background: shareStatus.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                color: shareStatus.includes('Error') ? '#ef4444' : '#22c55e',
                                fontSize: '0.9rem'
                            }}>
                                {shareStatus}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn"
                                style={{ background: 'transparent', border: '1px solid #475569' }}
                                onClick={() => {
                                    setShareModal({ open: false, docHash: null });
                                    setRecipientEmail('');
                                    setShareStatus('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn"
                                onClick={handleShare}
                                disabled={!recipientEmail || shareStatus === 'Sharing...'}
                                style={{ background: '#3b82f6' }}
                            >
                                Share Key
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
