const hre = require("hardhat");

async function main() {
  const UjuziChain = await hre.ethers.getContractFactory("UjuziChain");
  const contract = await UjuziChain.deploy();
  await contract.waitForDeployment();
  console.log("UjuziChain deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
