"use client";

import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function Nav() {
    const { user, logout } = useAuth();

    return (
        <nav className="header">
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                CivicSeal 🛡️
            </div>
            <div>
                <Link href="/" className="nav-link">Home</Link>
                <Link href="/documents" className="nav-link">Documents</Link>

                {user ? (
                    <span style={{ marginLeft: '1rem', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        <Link href="/dashboard" className="nav-link" style={{ fontSize: '0.9rem' }}>Dashboard</Link>
                        <span style={{ fontSize: '0.9rem', color: '#a0aec0' }}>{user.name || user.email.split('@')[0]}</span>
                        <button onClick={logout} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                            Logout
                        </button>
                    </span>
                ) : (
                    <Link href="/login" className="btn" style={{ marginLeft: '1rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                        Login
                    </Link>
                )}
            </div>
        </nav>
    );
}
