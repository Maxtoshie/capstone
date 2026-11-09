import hre from "hardhat";

async function main() {
  const Factory = await hre.ethers.getContractFactory("UjuziChainV2");
  const c = await Factory.deploy();
  await c.waitForDeployment();
  const addr = await c.getAddress();
  console.log(`UjuziChainV2 deployed to: ${addr}`);
  console.log(`Owner (receives fees): ${await c.admin()}`);
  console.log(`Fee: ${hre.ethers.formatEther(await c.verificationFee())} ETH, hard cap: ${hre.ethers.formatEther(await c.MAX_FEE())} ETH`);
  console.log("Next: put this address in frontend/js/config.js");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
