import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import Nav from './components/Nav'; // Extract Nav to separate component

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
        <AuthProvider>
          <Nav />
          <main className="container">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
