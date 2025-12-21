const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // When running in Docker, we might need to specify the provider url if not default
    // Hardhat config handles this via --network localhost, but we need ensure localhost points to 'blockchain' container
    // For simplicity, we assume internal deploy uses hardhat config which we will update
    const DocumentRegistry = await hre.ethers.getContractFactory("DocumentRegistry");
    const documentRegistry = await DocumentRegistry.deploy();
    await documentRegistry.waitForDeployment();
    const docRegAddress = await documentRegistry.getAddress();
    console.log("DocumentRegistry deployed to:", docRegAddress);

    // Save addresses to a file for backend/frontend to use
    const addresses = {
        DocumentRegistry: docRegAddress,
        Network: hre.network.name
    };

    const addressesDir = path.join(__dirname, "../../backend/config");
    if (!fs.existsSync(addressesDir)) {
        fs.mkdirSync(addressesDir, { recursive: true });
    }
    fs.writeFileSync(
        path.join(addressesDir, "contract-addresses.json"),
        JSON.stringify(addresses, null, 2)
    );

    // Also save to frontend
    const frontendConfigDir = path.join(__dirname, "../../frontend/config");
    if (!fs.existsSync(frontendConfigDir)) {
        fs.mkdirSync(frontendConfigDir, { recursive: true });
    }
    fs.writeFileSync(
        path.join(frontendConfigDir, "contract-addresses.json"),
        JSON.stringify(addresses, null, 2)
    );

    console.log("Addresses saved to backend/config and frontend/config");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
