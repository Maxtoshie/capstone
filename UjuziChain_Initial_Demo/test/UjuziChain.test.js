const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UjuziChain", function () {
  async function deployFixture() {
    const [admin, institution, student, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("UjuziChain");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, admin, institution, student, outsider };
  }

  it("sets deployer as admin", async function () {
    const { contract, admin } = await deployFixture();
    expect(await contract.admin()).to.equal(admin.address);
  });

  it("allows admin to register an institution", async function () {
    const { contract, institution } = await deployFixture();
    await contract.registerInstitution(institution.address, "African Leadership University");
    const record = await contract.institutions(institution.address);
    expect(record.approved).to.equal(true);
  });

  it("blocks non-admin institution registration", async function () {
    const { contract, institution, outsider } = await deployFixture();
    await expect(
      contract.connect(outsider).registerInstitution(institution.address, "ALU")
    ).to.be.revertedWith("Only admin");
  });

  it("allows an approved institution to register a student", async function () {
    const { contract, institution, student } = await deployFixture();
    await contract.registerInstitution(institution.address, "ALU");
    await contract.connect(institution).registerStudent(student.address, "Sample Student");
    const record = await contract.students(student.address);
    expect(record.registered).to.equal(true);
  });

  it("issues, verifies and revokes a credential", async function () {
    const { contract, institution, student } = await deployFixture();
    await contract.registerInstitution(institution.address, "ALU");
    await contract.connect(institution).registerStudent(student.address, "Sample Student");
    await contract.connect(institution).issueCredential(
      student.address,
      "BSc Software Engineering",
      "ipfs://example"
    );

    let verification = await contract.verifyCredential(1);
    expect(verification.valid).to.equal(true);

    await contract.connect(institution).revokeCredential(1);
    verification = await contract.verifyCredential(1);
    expect(verification.valid).to.equal(false);
  });
});
