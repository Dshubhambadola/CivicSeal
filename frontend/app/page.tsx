import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
      <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Trust, but Verify.
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 3rem' }}>
        Secure document verification and decentralized identity registry on the blockchain.
        Immutable, transparent, and free forever.
      </p>

      <div className="grid" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="card">
          <h3>📄 Document Registry</h3>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            Upload files to store their hash on-chain. Verify integrity anytime without exposing contents.
          </p>
          <Link href="/documents" className="btn">Start Verifying &rarr;</Link>
        </div>


      </div>
    </div>
  );
}
