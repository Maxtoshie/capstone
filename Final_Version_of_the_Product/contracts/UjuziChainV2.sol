// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * UjuziChainV2: the original registry plus an optional, capped verification fee.
 *
 * Reading a credential (verifyCredential) stays free for everyone.
 * A recruiter who wants a permanent on-chain proof that they checked a credential can call
 * certifyVerification and pay a very small fee. The fee goes straight to the platform owner
 * (admin) in the same transaction, so the contract never holds ETH and has nothing to drain.
 *
 * Safeguards for the payer:
 *  - The fee can never be set above MAX_FEE (a constant, so even the owner cannot raise it).
 *  - The caller passes maxFee. If the owner raised the fee after the caller looked, the call reverts.
 *  - msg.value must equal the fee exactly, so nobody overpays by mistake.
 *  - Nothing is charged for a credential that does not exist.
 *  - No approvals, allowances or deposits are used. Plain ETH sent to the contract reverts.
 */
contract UjuziChainV2 {
    uint256 public constant MAX_FEE = 0.0005 ether;

    address public admin;
    address public pendingAdmin;
    uint256 public verificationFee = 0.00005 ether;
    uint256 private _lock = 1;

    struct Credential {
        string studentId;
        string degree;
        bool isValid;
    }

    mapping(address => bool) public approvedInstitutions;
    mapping(bytes32 => Credential) public credentials;
    mapping(bytes32 => bool) public exists;

    event InstitutionRegistered(address indexed institution);
    event InstitutionRemoved(address indexed institution);
    event CredentialIssued(bytes32 indexed credentialId, string studentId);
    event CredentialRevoked(bytes32 indexed credentialId);
    event VerificationCertified(bytes32 indexed credentialId, address indexed verifier, bool isValid, uint256 feePaid);
    event FeeChanged(uint256 oldFee, uint256 newFee);
    event AdminTransferStarted(address indexed current, address indexed proposed);
    event AdminTransferred(address indexed previous, address indexed current);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Caller is not admin");
        _;
    }

    modifier onlyApprovedInstitution() {
        require(approvedInstitutions[msg.sender], "Caller is not an approved institution");
        _;
    }

    modifier nonReentrant() {
        require(_lock == 1, "Reentrant call");
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor() {
        admin = msg.sender;
    }

    // ---------- governance ----------

    function registerInstitution(address institution) external onlyAdmin {
        require(institution != address(0), "Zero address");
        approvedInstitutions[institution] = true;
        emit InstitutionRegistered(institution);
    }

    function removeInstitution(address institution) external onlyAdmin {
        approvedInstitutions[institution] = false;
        emit InstitutionRemoved(institution);
    }

    function setVerificationFee(uint256 newFee) external onlyAdmin {
        require(newFee <= MAX_FEE, "Fee above the hard cap");
        emit FeeChanged(verificationFee, newFee);
        verificationFee = newFee;
    }

    // Two steps, so the owner (who receives the fees) cannot be set to a wrong address by mistake.
    function proposeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero address");
        pendingAdmin = newAdmin;
        emit AdminTransferStarted(admin, newAdmin);
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Not the proposed admin");
        emit AdminTransferred(admin, msg.sender);
        admin = msg.sender;
        pendingAdmin = address(0);
    }

    // ---------- credentials ----------

    function issueCredential(bytes32 credentialId, string memory studentId, string memory degree)
        external
        onlyApprovedInstitution
    {
        require(!exists[credentialId], "Credential already issued");
        exists[credentialId] = true;
        credentials[credentialId] = Credential(studentId, degree, true);
        emit CredentialIssued(credentialId, studentId);
    }

    function revokeCredential(bytes32 credentialId) external onlyApprovedInstitution {
        require(exists[credentialId], "Credential not found");
        require(credentials[credentialId].isValid, "Already revoked");
        credentials[credentialId].isValid = false;
        emit CredentialRevoked(credentialId);
    }

    // Free for everyone: a view call costs the caller no gas.
    function verifyCredential(bytes32 credentialId)
        external
        view
        returns (bool, string memory, string memory)
    {
        Credential memory cred = credentials[credentialId];
        return (cred.isValid, cred.studentId, cred.degree);
    }

    // ---------- optional paid proof for recruiters ----------

    function certifyVerification(bytes32 credentialId, uint256 maxFee) external payable nonReentrant {
        uint256 fee = verificationFee;
        require(fee <= maxFee, "Fee is above your limit");
        require(msg.value == fee, "Send the exact fee");
        require(exists[credentialId], "Credential not found");

        emit VerificationCertified(credentialId, msg.sender, credentials[credentialId].isValid, fee);

        if (fee > 0) {
            (bool ok, ) = payable(admin).call{value: fee}("");
            require(ok, "Fee transfer failed");
        }
    }
}
