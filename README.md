# CivicSeal 🛡️
**Secure, Decentralized Document Verification & Identity Registry**

CivicSeal is a blockchain-based platform for securely registering, storing, sharing, and verifying the integrity of important documents. It leverages **Ethereum Smart Contracts**, **IPFS** (Decentralized Storage), and **PostgreSQL** to create a tamper-proof system for document provenance, with a focus on seamless user experience through **Account Abstraction**.

## 🚀 Key Features

### 🔐 Identity & Invisible Wallets
*   **Frictionless Onboarding**: Users sign up with just an email and password.
*   **Invisible Wallet**: A secure Ethereum wallet is auto-generated for every user in the background. Private keys are encrypted (AES-256) and stored securely.
*   **Gas Station (Account Abstraction)**: Users never need to buy ETH. The platform automagically sponsors gas fees for all transactions, making blockchain interaction invisible.

### 📄 Document Registry & Verification
*   **Immutable Ledger**: Document hashes are stored on the Ethereum blockchain, providing permanent proof of existence and integrity.
*   **Instant Verification**: Anyone with the original file can instantly verify its authenticity against the blockchain record without needing to log in.
*   **Revocation**: Owners can revoke documents on-chain if they become invalid.

### ☁️ Secure Storage (IPFS)
*   **Decentralized Persistence**: Files are pinned to **IPFS** (via Pinata), ensuring they are never lost to checking server failures.
*   **End-to-End Encryption**: Files are encrypted client-side before upload. The platform only stores the encrypted blob.

### 🤝 Secure Sharing
*   **Custodial Key Exchange**: securely share documents with other registered users via email.
*   **Re-Encryption**: The backend automatically re-encrypts the document key for the specific recipient—enabling secure access without sharing passwords.
*   **Shared Inbox**: Recipients receive documents instantly in their "Shared With Me" dashboard.

---

## 🛠️ Architecture

1.  **Smart Contracts (Hardhat)**: `DocumentRegistry.sol` manages the immutable ledger of document hashes.
2.  **Backend (Node.js/Express)**: 
    *   Handles Auth, Wallet Generation, and Gas Sponsorship.
    *   Manages IPFS uploads (Pinata) and Database indexing.
    *   Performs Custodial Key Re-encryption for sharing.
3.  **Frontend (Next.js)**: Modern React UI for Client-Side Encryption, Dashboard, and Verification.
4.  **Database (PostgreSQL)**: Stores User profiles, Encrypted Keys, and Document Metadata.

---

## 🏎️ How to Run

### Prerequisites
- Docker & Docker Compose

### One-Step Start
The entire stack (Blockchain Node, Database, Backend, Frontend) is dockerized.

```bash
docker-compose up --build
```

Wait ~30 seconds for the backend logs to show **"Contracts DEPLOYED"**.

### Access Points
*   **Frontend**: [http://localhost:3000](http://localhost:3000)
*   **Backend API**: [http://localhost:3001](http://localhost:3001)
*   **Blockchain RPC**: [http://localhost:8545](http://localhost:8545)

---

## 📋 Workflow

### Registration (Upload)
1.  **Encryption**: User selects a file. Browser encrypts it (Client-Side).
2.  **Hashing**: The *Original* File Hash is calculated as the ID.
3.  **Signing**: Backend decrypts User's private key and signs the transaction.
4.  **Storage**: Encrypted Blob -> IPFS.
5.  **Seal**: Hash + IPFS CID stored on Blockchain.

### Secure Sharing
1.  **Request**: Owner enters Recipient Email.
2.  **Re-Encryption**: System unwraps the key and re-encrypts it for the Recipient.
3.  **Visual**: Document appears in Recipient's Dashboard.
4.  **Access**: Recipient clicks "Open" -> Client decrypts file instantly.

---

## 📁 Project Structure

*   `/contracts`: Smart Contracts & Deployment Scripts.
*   `/backend`: express.js API, Controllers & Services.
*   `/frontend`: Next.js Client Application.
*   `docker-compose.yml`: Container Orchestration.

---

**CivicSeal** - Verifiable Trust for the Digital Age.
