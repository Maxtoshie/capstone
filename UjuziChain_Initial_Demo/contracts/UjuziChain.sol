// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract UjuziChain {
    address public admin;
    uint256 public credentialCount;

    struct Institution {
        string name;
        bool approved;
    }

    struct Student {
        string name;
        bool registered;
    }

    struct Credential {
        uint256 id;
        address student;
        address institution;
        string title;
        string metadataURI;
        uint256 issuedAt;
        bool revoked;
    }

    mapping(address => Institution) public institutions;
    mapping(address => Student) public students;
    mapping(uint256 => Credential) public credentials;

    event InstitutionRegistered(address indexed institution, string name);
    event StudentRegistered(address indexed student, string name);
    event CredentialIssued(uint256 indexed credentialId, address indexed student, address indexed institution);
    event CredentialRevoked(uint256 indexed credentialId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyInstitution() {
        require(institutions[msg.sender].approved, "Not an approved institution");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerInstitution(address institution, string calldata name) external onlyAdmin {
        require(institution != address(0), "Invalid address");
        require(bytes(name).length > 0, "Name required");
        institutions[institution] = Institution(name, true);
        emit InstitutionRegistered(institution, name);
    }

    function registerStudent(address student, string calldata name) external onlyInstitution {
        require(student != address(0), "Invalid address");
        require(bytes(name).length > 0, "Name required");
        students[student] = Student(name, true);
        emit StudentRegistered(student, name);
    }

    function issueCredential(
        address student,
        string calldata title,
        string calldata metadataURI
    ) external onlyInstitution returns (uint256) {
        require(students[student].registered, "Student not registered");
        require(bytes(title).length > 0, "Title required");

        credentialCount++;
        credentials[credentialCount] = Credential({
            id: credentialCount,
            student: student,
            institution: msg.sender,
            title: title,
            metadataURI: metadataURI,
            issuedAt: block.timestamp,
            revoked: false
        });

        emit CredentialIssued(credentialCount, student, msg.sender);
        return credentialCount;
    }

    function revokeCredential(uint256 credentialId) external {
        Credential storage credential = credentials[credentialId];
        require(credential.id != 0, "Credential not found");
        require(msg.sender == credential.institution || msg.sender == admin, "Not authorized");
        require(!credential.revoked, "Already revoked");
        credential.revoked = true;
        emit CredentialRevoked(credentialId);
    }

    function verifyCredential(uint256 credentialId)
        external
        view
        returns (Credential memory credential, bool valid)
    {
        credential = credentials[credentialId];
        require(credential.id != 0, "Credential not found");
        valid = !credential.revoked && institutions[credential.institution].approved;
    }
}
