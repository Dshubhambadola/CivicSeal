'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyPage() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    useEffect(() => {
        if (id) {
            fetchDocument();
        }
    }, [id]);

    const fetchDocument = async () => {
        try {
            const res = await fetch(`${API_URL}/api/public/${id}`);
            const json = await res.json();

            if (res.ok) {
                setData(json);
            } else {
                setError(json.error || 'Failed to verify document');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a', color: '#fff' }}>
            <h2>Verifying Seal... 🛡️</h2>
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', color: '#fff' }}>
            <h1>❌ Verification Failed</h1>
            <p style={{ color: '#ef4444', fontSize: '1.2rem' }}>{error}</p>
            <Link href="/" style={{ marginTop: '2rem', color: '#3b82f6' }}>Back to Home</Link>
        </div>
    );

    const { document: doc, shareDetails } = data;

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', padding: '2rem' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
                    <h1 style={{ background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                        CivicSeal Verification
                    </h1>
                    <p style={{ color: '#94a3b8' }}>Secure. Immutable. Trusted.</p>
                </header>

                <div className="card" style={{ background: '#1e293b', border: '1px solid #334155', padding: '2rem', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>

                    {/* Status Badge */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        {doc.revoked ? (
                            <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'inline-block', padding: '0.5rem 1.5rem', borderRadius: '9999px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                ❌ PREVIOUSLY VALID (REVOKED)
                            </div>
                        ) : doc.isChainValid ? (
                            <div style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', display: 'inline-block', padding: '0.5rem 1.5rem', borderRadius: '9999px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                ✅ VALID BLOCKCHAIN SEAL
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', display: 'inline-block', padding: '0.5rem 1.5rem', borderRadius: '9999px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                ⚠️ DATABASE VERIFIED (CHAIN SYNC PENDING)
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div style={{ padding: '1rem', background: '#0f172a', borderRadius: '0.5rem' }}>
                            <label style={{ color: '#64748b', fontSize: '0.875rem' }}>Document Name</label>
                            <div style={{ fontSize: '1.125rem', fontWeight: '500' }}>{doc.originalName}</div>
                        </div>

                        <div style={{ padding: '1rem', background: '#0f172a', borderRadius: '0.5rem' }}>
                            <label style={{ color: '#64748b', fontSize: '0.875rem' }}>Digital Fingerprint (Hash)</label>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all', color: '#94a3b8' }}>{doc.hash}</div>
                        </div>

                        <div style={{ padding: '1rem', background: '#0f172a', borderRadius: '0.5rem' }}>
                            <label style={{ color: '#64748b', fontSize: '0.875rem' }}>IPFS Reference (Storage)</label>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all', color: '#94a3b8' }}>
                                {doc.ipfsHash} <a href={`https://gateway.pinata.cloud/ipfs/${doc.ipfsHash}`} target="_blank" style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>View Encrypted Blob</a>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: '#0f172a', borderRadius: '0.5rem' }}>
                                <label style={{ color: '#64748b', fontSize: '0.875rem' }}>Submitter</label>
                                <div style={{ fontSize: '0.9rem', fontFamily: 'monospace' }} title={doc.submitter}>
                                    {doc.submitter.substring(0, 8)}...{doc.submitter.substring(doc.submitter.length - 6)}
                                </div>
                            </div>
                            <div style={{ padding: '1rem', background: '#0f172a', borderRadius: '0.5rem' }}>
                                <label style={{ color: '#64748b', fontSize: '0.875rem' }}>Timestamp</label>
                                <div style={{ fontSize: '0.9rem' }}>
                                    {new Date(Number(doc.timestamp) * 1000).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', borderTop: '1px solid #334155', paddingTop: '1rem', textAlign: 'center' }}>
                        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                            Shared by {shareDetails.creator} on {new Date(shareDetails.createdAt).toLocaleDateString()}
                        </p>
                    </div>

                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                        Verify another document &rarr;
                    </Link>
                </div>
            </div>
        </div>
    );
}
