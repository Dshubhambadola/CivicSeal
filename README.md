# CivicSeal 🛡️
**Secure, Decentralized Document Verification & Registry**

CivicSeal is a blockchain-based platform for securely registering, storing, and verifying the integrity of important documents. It leverages **Ethereum Smart Contracts**, **IPFS** (Decentralized Storage), and **PostgreSQL** to create a tamper-proof system for document provenance.

## 🚀 Key Features

*   **Immutable Registry**: Document credentials are stored on the Ethereum blockchain, providing permanent proof of existence.
*   **Decentralized Storage**: Encrypted files are stored on IPFS, removing centralized points of failure.
*   **End-to-End Encryption (E2EE)**: Files are encrypted client-side using **AES-256** before upload. The platform (and us as the admin) can never view the raw content.
*   **Key Recovery Escrow**: A secure fallback mechanism to recover encrypted keys if a user loses their password (optional/mocked in demo).
*   **Tamper-Proof Verification**: Anyone with the original file can verify its authenticity instantly against the blockchain record.

---

## 🛠️ Architecture

1.  **Smart Contracts (Hardhat)**: `DocumentRegistry.sol` manages the immutable ledger of document hashes.
2.  **Backend (Node.js/Express)**: Handles IPFS uploads, Database indexing, and Blockchain interactions via `ethers.js`.
3.  **Frontend (Next.js)**: Modern React UI for Client-Side Encryption, Upload, and Verification.
4.  **Database (PostgreSQL)**: Indexes metadata for fast search and user experience.

---

## 🏎️ How to Run

### Prerequisities
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
*   **Database**: `localhost:5432`

---

## 📋 Workflow

### Registration (Upload)
1.  **Encryption**: User selects a file and password. The Browser encrypts it (AES-256).
2.  **Hashing**: The *Original* File Hash is calculated as the ID.
3.  **Upload**: Encrypted Blob + Original Hash sent to Backend.
4.  **Storage**: Encrypted Blob -> IPFS.
5.  **Seal**: Hash + IPFS CID stored on Blockchain.

### Verification
1.  User selects a file.
2.  Browser calculates hash.
3.  System checks Blockchain for that hash.
4.  **Result**: Authenticity Confirmed or Denied.

---

## 📁 Project Structure

*   `/contracts`: Smart Contracts & Deployment Scripts.
*   `/backend`: express.js API & Services.
*   `/frontend`: Next.js Client Application.
*   `docker-compose.yml`: Container Orchestration.

---

**CivicSeal** - Verifiable Trust for the Digital Age.
