// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract UjuziChain {
    address public admin;

    struct Credential {
        string studentId;
        string degree;
        bool isValid;
    }

    mapping(address => bool) public approvedInstitutions;
    mapping(bytes32 => Credential) public credentials;

    event InstitutionRegistered(address indexed institution);
    event CredentialIssued(bytes32 indexed credentialId, string studentId);
    event CredentialRevoked(bytes32 indexed credentialId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Caller is not admin");
        _;
    }

    modifier onlyApprovedInstitution() {
        require(approvedInstitutions[msg.sender], "Caller is not an approved institution");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerInstitution(address institution) external onlyAdmin {
        approvedInstitutions[institution] = true;
        emit InstitutionRegistered(institution);
    }

    function issueCredential(bytes32 credentialId, string memory studentId, string memory degree) external onlyApprovedInstitution {
        credentials[credentialId] = Credential(studentId, degree, true);
        emit CredentialIssued(credentialId, studentId);
    }

    function revokeCredential(bytes32 credentialId) external onlyApprovedInstitution {
        credentials[credentialId].isValid = false;
        emit CredentialRevoked(credentialId);
    }

    function verifyCredential(bytes32 credentialId) external view returns (bool, string memory, string memory) {
        Credential memory cred = credentials[credentialId];
        return (cred.isValid, cred.studentId, cred.degree);
    }
}
