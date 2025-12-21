'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

export function ProfileCheck() {
    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();

    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({ name: '', email: '', mobile: '' });

    // Check status on connect
    useEffect(() => {
        async function checkUser() {
            if (isConnected && address) {
                // 1. Get Nonce
                const res = await fetch(`http://localhost:3001/api/auth/nonce?address=${address}`);
                const data = await res.json();

                // In real app, we would verify JWT here too. 
                // For this demo, we can blindly ask user to sign if we want to force login,
                // OR we can check a local "isLoggedIn" state.
                // Let's assume we want to enforce profile check on every session start for now.

                // Ideally: Check if profile is complete. The /nonce endpoint (or a separate /me) should tell us.
                // I will optimistically NOT show modal unless I know they are missing info.
                // But my backend /nonce doesn't return profile info. 
                // Let's trigger the "Sign In" flow to verify and get profile.
                setIsOpen(true);
            }
        }

        // Simple debounce/check to avoid loop
        const hasChecked = sessionStorage.getItem(`checked_${address}`);
        if (isConnected && address && !hasChecked) {
            checkUser();
        }
    }, [isConnected, address]);

    const handleSignAndSave = async () => {
        setLoading(true);
        try {
            // 1. Get Nonce again to be fresh
            const nonRes = await fetch(`http://localhost:3001/api/auth/nonce?address=${address}`);
            const { nonce } = await nonRes.json();

            // 2. Sign
            const message = `Sign this message to verify ownership. Nonce: ${nonce}`;
            const signature = await signMessageAsync({ message });

            // 3. Verify & Save Profile
            const verifyRes = await fetch('http://localhost:3001/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    signature,
                    profile: {
                        name: profile.name,
                        email: profile.email,
                        mobile: profile.mobile
                    } // If these are empty, backend just logs in. If filled, it updates.
                })
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
                // If profile was incomplete but they didn't fill it, we might want to keep pestering, 
                // or just let them in. For now, let's just close.
                sessionStorage.setItem(`checked_${address}`, 'true');
                setIsOpen(false);
                alert(`Welcome back, ${verifyData.user.name || 'User'}!`);
            }

        } catch (error) {
            console.error(error);
            alert('Login Failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <div className="card" style={{ width: '400px', background: 'var(--card-bg)' }}>
                <h3>🔐 Verify Identity</h3>
                <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>
                    Please sign a message to verify you own this wallet.
                    {/* If new, fill details */}
                    Update your profile below:
                </p>

                <div style={{ marginBottom: '1rem' }}>
                    <label>Name</label>
                    <input
                        className="input"
                        value={profile.name}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                        placeholder="John Doe"
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Email</label>
                    <input
                        className="input"
                        value={profile.email}
                        onChange={e => setProfile({ ...profile, email: e.target.value })}
                        placeholder="john@example.com"
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Mobile</label>
                    <input
                        className="input"
                        value={profile.mobile}
                        onChange={e => setProfile({ ...profile, mobile: e.target.value })}
                        placeholder="+1 234 567 890"
                    />
                </div>

                <button className="btn" onClick={handleSignAndSave} disabled={loading}>
                    {loading ? 'Signing...' : 'Sign & Complete Setup'}
                </button>
            </div>
        </div>
    );
}
