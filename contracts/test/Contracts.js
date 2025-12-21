const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CivicSeal Contracts", function () {
    let documentRegistry;
    let kycRegistry;
    let owner, user1, user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
        documentRegistry = await DocumentRegistry.deploy();

        const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
        kycRegistry = await KYCRegistry.deploy();
    });

    describe("DocumentRegistry", function () {
        it("Should store a document hash", async function () {
            const hash = ethers.id("test-document");
            await documentRegistry.connect(user1).storeHash(hash);

            const [exists, submitter, timestamp] = await documentRegistry.verifyHash(hash);
            expect(exists).to.be.true;
            expect(submitter).to.equal(user1.address);
            expect(timestamp).to.be.gt(0);
        });

        it("Should prevent duplicate registration", async function () {
            const hash = ethers.id("duplicate-document");
            await documentRegistry.connect(user1).storeHash(hash);
            await expect(
                documentRegistry.connect(user2).storeHash(hash)
            ).to.be.revertedWith("Document already registered");
        });
    });

});
