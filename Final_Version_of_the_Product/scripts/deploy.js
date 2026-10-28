import hre from "hardhat";

async function main() {
  const UjuziChain = await hre.ethers.getContractFactory("UjuziChain");
  const ujuziChain = await UjuziChain.deploy();
  await ujuziChain.waitForDeployment();
  console.log(`UjuziChain deployed to: ${await ujuziChain.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
