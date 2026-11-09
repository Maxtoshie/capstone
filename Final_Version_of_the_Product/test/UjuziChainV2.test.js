import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;
const id = (s) => ethers.encodeBytes32String(s);

describe("UjuziChainV2", () => {
  let c, admin, inst, recruiter, other, fee;

  beforeEach(async () => {
    [admin, inst, recruiter, other] = await ethers.getSigners();
    c = await (await ethers.getContractFactory("UjuziChainV2")).deploy();
    await c.waitForDeployment();
    await c.registerInstitution(inst.address);
    await c.connect(inst).issueCredential(id("UC-1"), "STU-1", "BSc");
    fee = await c.verificationFee();
  });

  it("starts with a small fee under the hard cap", async () => {
    expect(fee).to.equal(ethers.parseEther("0.00005"));
    expect(fee).to.be.lte(await c.MAX_FEE());
  });

  it("sends the fee straight to the owner and keeps nothing in the contract", async () => {
    const before = await ethers.provider.getBalance(admin.address);
    await expect(c.connect(recruiter).certifyVerification(id("UC-1"), fee, { value: fee }))
      .to.emit(c, "VerificationCertified").withArgs(id("UC-1"), recruiter.address, true, fee);
    expect(await ethers.provider.getBalance(admin.address)).to.equal(before + fee);
    expect(await ethers.provider.getBalance(await c.getAddress())).to.equal(0n);
  });

  it("rejects an overpayment or underpayment", async () => {
    await expect(c.connect(recruiter).certifyVerification(id("UC-1"), fee, { value: fee + 1n })).to.be.revertedWith("Send the exact fee");
    await expect(c.connect(recruiter).certifyVerification(id("UC-1"), fee, { value: fee - 1n })).to.be.revertedWith("Send the exact fee");
  });

  it("protects the payer if the owner raises the fee after they looked", async () => {
    await c.setVerificationFee(fee * 5n);
    await expect(c.connect(recruiter).certifyVerification(id("UC-1"), fee, { value: fee * 5n })).to.be.revertedWith("Fee is above your limit");
  });

  it("never charges for a credential that does not exist", async () => {
    await expect(c.connect(recruiter).certifyVerification(id("NOPE"), fee, { value: fee })).to.be.revertedWith("Credential not found");
  });

  it("caps the fee even for the owner", async () => {
    const cap = await c.MAX_FEE();
    await c.setVerificationFee(cap);
    await expect(c.setVerificationFee(cap + 1n)).to.be.revertedWith("Fee above the hard cap");
    await expect(c.connect(other).setVerificationFee(0)).to.be.revertedWith("Caller is not admin");
  });

  it("a zero fee works and moves no money", async () => {
    await c.setVerificationFee(0);
    await expect(c.connect(recruiter).certifyVerification(id("UC-1"), 0, { value: 0 })).to.emit(c, "VerificationCertified");
  });

  it("refuses plain ETH transfers", async () => {
    await expect(recruiter.sendTransaction({ to: await c.getAddress(), value: 1n })).to.be.reverted;
  });

  it("blocks duplicates, unknown revokes and unapproved issuers", async () => {
    await expect(c.connect(inst).issueCredential(id("UC-1"), "X", "Y")).to.be.revertedWith("Credential already issued");
    await expect(c.connect(inst).revokeCredential(id("NOPE"))).to.be.revertedWith("Credential not found");
    await expect(c.connect(other).issueCredential(id("UC-2"), "X", "Y")).to.be.revertedWith("Caller is not an approved institution");
  });

  it("verifyCredential stays free and shows revocation", async () => {
    let r = await c.verifyCredential(id("UC-1"));
    expect(r[0]).to.equal(true);
    await c.connect(inst).revokeCredential(id("UC-1"));
    r = await c.verifyCredential(id("UC-1"));
    expect(r[0]).to.equal(false);
    expect(r[1]).to.equal("STU-1");
  });

  it("moves ownership in two steps", async () => {
    await c.proposeAdmin(other.address);
    expect(await c.admin()).to.equal(admin.address);
    await expect(c.connect(recruiter).acceptAdmin()).to.be.revertedWith("Not the proposed admin");
    await c.connect(other).acceptAdmin();
    expect(await c.admin()).to.equal(other.address);
  });
});
