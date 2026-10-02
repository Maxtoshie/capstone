# UjuziChain — Initial Software Product Demonstration

## Description
UjuziChain is a credential-verification and job platform. Institutions verify academic or professional credentials, the smart contract records credential status, and candidates can use the verified profile when applying for jobs.

Following supervisor feedback, job access is not restricted by match score. Every registered candidate can browse all available jobs and apply to any role. Match scores are shown as guidance only.

Candidates can also take a role-specific simulation. The resulting score is shown alongside the application as additional practical evidence for the employer.

This repository represents the **initial MVP / software demonstration phase** for the ALU Low Level Track assignment.

## GitHub Repository
Replace this before submission:

https://github.com/Maxtoshie/capstone/tree/main/UjuziChain_Initial_Demo/

## Updated MVP Scope

The prototype currently demonstrates:

- Administrator authorization of institutions
- Student/candidate registration
- Credential issuance, verification and revocation
- Blockchain-backed credential validity state
- Verified candidate profile
- Open browsing of **all** job listings by registered candidates
- 0–100% candidate/job match guidance
- Ability to apply even with a low match score
- Role-specific job simulation as additional practical evidence
- Application status/review flow
- A job-source screen showing how future API, partner-feed and ATS integrations fit into the product
- Hardhat smart-contract testing
- React/Vite demonstration interface

## Job access rule

Verified credentials and match scores help employers assess an application, but they do not prevent a registered candidate from viewing or applying for a job.

## Updated Platform Workflow


## Technology Stack

### Blockchain
- Solidity 0.8.19
- Hardhat
- Ethers.js
- MetaMask-compatible wallet workflow

### Frontend
- React
- Vite
- JavaScript
- HTML/CSS

### Testing
- Mocha
- Chai
- Hardhat

### Planned Opportunity/Data Layer
- Job-listing store/database
- Matching service
- Simulation service
- Approved external job APIs / partner feeds / ATS connectors

> The initial MVP simulates external job synchronization. A production implementation should respect each source platform's API terms and permissions rather than relying on unauthorized scraping.

## Project Structure

```text
contracts/       Solidity smart contracts
test/            Smart contract tests
scripts/         Deployment scripts
frontend/        React/Vite MVP interface
designs/         Original + updated workflow and architecture
screenshots/     Place final evidence screenshots here
demo/            Video demonstration checklist
```

## Core Smart-Contract Functions

- `registerInstitution(address,string)`
- `registerStudent(address,string)`
- `issueCredential(address,string,string)`
- `verifyCredential(uint256)`
- `revokeCredential(uint256)`

The current contract focuses on the credential-verification layer. Job ingestion, matching, applications, and simulations are represented at the UI/architecture level for this initial phase and can be implemented off-chain in later iterations.

## Security Measures

UjuziChain uses:

- Role-based authorization for administrators and institutions
- Wallet-address identity for transaction authorization
- Cryptographic transaction signing through Ethereum-compatible wallets
- Blockchain immutability for credential integrity
- Explicit credential revocation rather than silent deletion
- Smart-contract tests to validate permissions and state transitions
- Separation of sensitive documents from public on-chain records

> Blockchain records are not inherently private. Sensitive source documents should not be stored directly on-chain in production.

## Environment Setup

### Requirements

- Node.js 18+
- npm
- Git
- MetaMask (for browser wallet interaction)

### Install blockchain dependencies

```bash
npm install
```

### Compile the smart contract

```bash
npx hardhat compile
```

### Run tests

```bash
npx hardhat test
```

### Start local blockchain

```bash
npx hardhat node
```

### Deploy locally

In another terminal:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Install and start frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

## Frontend Demonstration

The demo interface includes:

1. **Overview** — a simple candidate dashboard with job, application, simulation and credential counts.
2. **Jobs** — searchable listings with a profile-match percentage. All listings remain accessible.
3. **Applications** — shows applications submitted during the demo session.
4. **Simulations** — a short role-specific assessment flow that produces a demo score.
5. **Credentials** — shows the candidate credential and verification status.
6. **Verify credential** — checks a credential ID and displays its registry details.

The interface intentionally uses a restrained dashboard layout rather than a marketing-style landing page so it looks closer to an early working product.

The included jobs and simulation scores are demo data for this phase.

## Designs

See `designs/`:

- `ujuzichain-platform-workflow-updated.png` — updated supervisor-feedback workflow
- `original-workflow-reference.png` — original workflow image
- `architecture.md` — updated system architecture
- `credential-flow.md` — credential + job discovery + simulation flow

## Deployment Plan

### Current phase
- Smart contract: local Hardhat blockchain
- Frontend: local Vite development server
- Wallet: MetaMask-compatible browser wallet
- Job listings: local/demo data
- Simulation: local/demo workflow

### Later deployment
- Frontend: Vercel or Firebase Hosting
- Smart contract: Ethereum-compatible testnet before production
- Application/job data: conventional backend + database
- External jobs: approved APIs, ATS connectors, partner feeds or permitted integrations
- Sensitive credential metadata: off-chain storage with only verifiable references/hashes on-chain where appropriate

## Demo Video

## Future Development

- Real authentication and role-based dashboards
- Persistent job/application database
- Matching-engine implementation with explainable fit reasons
- Employer application review dashboard
- Real simulation content, scoring and evidence model
- Authorized job-source connectors
- Institution approval workflow
- IPFS/off-chain credential metadata where appropriate
- Testnet deployment and security review
