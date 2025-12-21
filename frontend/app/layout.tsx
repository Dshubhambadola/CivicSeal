import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'CivicSeal - Blockchain Verification',
  description: 'Document Verification and KYC Registry on Blockchain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="header">
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            CivicSeal 🛡️
          </div>
          <div>
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/documents" className="nav-link">Documents</Link>

          </div>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
