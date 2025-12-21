// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DocumentRegistry {
    struct Document {
        bytes32 hash;
        address submitter;
        uint256 timestamp;
        string ipfsHash;
        string encryptedKey;
        bool exists;
    }

    mapping(bytes32 => Document) public documents;

    event DocumentStored(
        bytes32 indexed hash, 
        address indexed submitter, 
        uint256 timestamp,
        string ipfsHash
    );

    function storeDocument(bytes32 _hash, string memory _ipfsHash, string memory _encryptedKey) external {
        require(!documents[_hash].exists, "Document already registered");

        documents[_hash] = Document({
            hash: _hash,
            submitter: msg.sender,
            timestamp: block.timestamp,
            ipfsHash: _ipfsHash,
            encryptedKey: _encryptedKey,
            exists: true
        });

        emit DocumentStored(_hash, msg.sender, block.timestamp, _ipfsHash);
    }

    function verifyHash(bytes32 _hash) external view returns (bool exists, address submitter, uint256 timestamp, string memory ipfsHash, string memory encryptedKey) {
        Document memory doc = documents[_hash];
        return (doc.exists, doc.submitter, doc.timestamp, doc.ipfsHash, doc.encryptedKey);
    }
}
