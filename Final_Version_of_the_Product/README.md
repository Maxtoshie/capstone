# UjuziChain - Decentralized Credential & Competency Infrastructure

**Live Production URL:** [https://ujuzichain.netlify.app](https://ujuzichain.netlify.app)  
**Ethereum Sepolia Contract:** `0xA40d77d6e31F5044C7151dAd78C8bA6C3313132F`  
**Network:** Ethereum Sepolia Testnet (EVM Paris Hardfork)

---

## 1. Project Overview

UjuziChain is a decentralized academic credential and engineering competency infrastructure built for the East African tech ecosystem (Nairobi, Kigali, Kampala, Dar es Salaam). The platform addresses the systemic trust deficit in junior technical hiring by replacing paper credential fraud with cryptographic verification:

1. **On-Chain Credential Attestation:** University degrees and certifications (e.g., African Leadership University) are immutably signed to an Ethereum Sepolia smart contract.
2. **Self-Sovereign Identity (SSI):** Authentication uses non-custodial wallet signatures (EIP-1193 / MetaMask). No passwords, cookies, or centralized database honeypots are used.
3. **Dual-Gate Competency Verification:** Candidates matching ≥70% of role criteria qualify for 1-click Auto Apply. Candidates scoring <70% can prove readiness via an interactive practical simulation. Failing the assessment marks the applicant ineligible, eliminating unqualified application spam.
4. **Zero-Knowledge Privacy:** Document validation uses client-side SHA-256 hashing (`crypto.subtle`). Raw PDF bytes and personally identifiable information (PII) are never stored off-chain, supporting compliance with the Kenya Data Protection Act (2019) and GDPR.
5. **In-Browser Document Inspector:** Recruiters can inspect authenticated degrees and credentials in an Irembo-style in-browser overlay without downloading local files.

---

## 2. Technical Stack & Environment Versions

- **Blockchain Network:** Ethereum Sepolia Testnet
- **Smart Contract Language:** Solidity `^0.8.19`
- **Development & Compilation:** Hardhat `v2.28.2`
- **Runtime Environment:** Node.js `>= v20.0.0` (ES Modules)
- **Web3 Interface Library:** ethers.js `v6.7.0` (EIP-1193 BrowserProvider)
- **Frontend Architecture:** Semantic HTML5, CSS3 Custom Properties (Btrust Minimalist Design System), Modular ES6 Classes
- **Serverless Compute:** Netlify Serverless Functions (Node.js runtime)
- **Hosting & CI/CD:** Netlify Edge (automated branch deployments from GitHub `main`)

---

## 3. Repository Structure

```text
Final_Version_of_the_Product/
├── contracts/
│   └── UjuziChain.sol           # Smart contract with RBAC and credential verification
├── frontend/
│   ├── index.html               # Landing page with W3C Trust Triad & setup guide
│   ├── login.html               # Wallet auth, registration & terms consent
│   ├── dashboard.html           # Candidate/recruiter portal with Irembo doc viewer
│   ├── verify-request.html      # Institution verification & attestation portal
│   └── js/
│       ├── auth.js              # Wallet connection & email dispatch logic
│       └── services/
│           └── UjuziEngine.js   # OOP service classes (Crypto, Scoring, Contract)
├── netlify/
│   └── functions/
│       └── send-verification.js # Serverless verification email dispatch
├── scripts/                     # Hardhat deployment scripts
├── test/
│   └── ujuzi_test.js            # Automated unit and algorithmic test suite
├── hardhat.config.js            # Hardhat configuration for Sepolia
├── package.json                 # Project configuration and dependencies
└── README.md                    # Primary project documentation
```

---

## 4. Scope Alignment & Feature Validation Table

| Planned Feature | Intended Purpose | Current Status | Evidence / Implementation Reference |
|---|---|---|---|
| On-Chain Credential Registry | Prevent diploma forgery via public, immutable smart contract records. | Completed | `contracts/UjuziChain.sol`, Sepolia contract `0xA40d77d6e31F5044C7151dAd78C8bA6C3313132F`. |
| Non-Custodial Wallet Authentication | Eliminate central database breaches and give candidates sovereign identity ownership. | Completed | `frontend/login.html`, `frontend/js/auth.js` via MetaMask EIP-1193 (secp256k1). |
| Dual-Gate Competency Engine | Provide an objective screening threshold: ≥70% Auto Apply, <70% Practical Simulation. | Completed | `frontend/dashboard.html`, `CompetencyAlgorithm` in `frontend/js/services/UjuziEngine.js`. |
| Zero-Knowledge Document Hashing | Secure sensitive records without storing plaintext files on servers (Kenya Data Protection Act / GDPR). | Completed | `CryptographyService.computeSHA256()` using native `window.crypto.subtle`. |
| Irembo-Style In-Browser Doc Viewer | Allow recruiters to review verified credentials directly in the browser without downloading files. | Completed | Modal overlay in `frontend/dashboard.html` (`launchIremboViewer()`). |
| Live East Africa Job Ingestion | Ingest developer roles across Nairobi, Kigali, Kampala, and Dar es Salaam. | Completed | Asynchronous API integration in `frontend/dashboard.html` via the Remotive public API. |
| W3C Institutional Attestation Loop | Allow universities to receive automated verification requests and attest credentials on-chain. | Completed | `netlify/functions/send-verification.js` and `frontend/verify-request.html`. |
| Automated Testing Suite | Validate algorithmic match calculation and competency gate transitions. | Completed | `test/ujuzi_test.js` (Node.js test suite with 3/3 passing assertions). |

---

## 5. Testing & Validation Strategies

### Strategy 1: Algorithmic Unit Testing

- **Target:** `CompetencyAlgorithm` skill-matching calculation and boundary handling.
- **Execution:** Automated testing with Node.js assertions (`test/ujuzi_test.js`).
- **Results:**
  - A full skill match yields a score ≥70% (PASS).
  - Empty skill profiles default to a baseline score ≤50% without auto-qualifying (PASS).

### Strategy 2: Functional Gate Testing

- **Target:** Dual-gate access control across candidate states.
- **Execution:** State evaluation tests for Auto Apply, Simulation Required, Simulation Passed, and Ineligible states.
- **Results:**
  - Candidates scoring ≥70% transition directly to `AUTO_APPLY`.
  - Candidates scoring <70% require `SIM_REQUIRED`.
  - Passing the assessment unlocks `SIM_UNLOCKED`; failing sets the state to `INELIGIBLE`.

### Strategy 3: Multi-Environment & Browser Compatibility

- **Desktop Browsers:** Google Chrome, Mozilla Firefox, Brave (MetaMask extension integrated).
- **Mobile Environments:** Android Chrome, Firefox Mobile (responsive viewport, zoom locked, horizontal scroll eliminated).
- **Network Performance:** Average static asset load time <800 ms on Netlify Edge CDN.

---

## 6. Submission Deliverables

- **Technical Walkthrough Video:** [Watch the Walkthrough Video](https://drive.google.com/drive/folders/1OGWCHmBCQFR1kfvYRZJgGx97NXxcz9VD?usp=sharing)
- **Technical Report (PDF):** [UjuziChain_Technical_Report.pdf](https://github.com/Maxtoshie/capstone/blob/main/UjuziChain_Technical_Report.pdf)
- **Live Production URL:** [https://ujuzichain.netlify.app](https://ujuzichain.netlify.app)
- **GitHub Repository:** [https://github.com/Maxtoshie/capstone](https://github.com/Maxtoshie/capstone)

---

## 7. Local Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Maxtoshie/capstone.git
   cd capstone/Final_Version_of_the_Product
   ```

2. **Install project dependencies:**

   ```bash
   npm install
   ```

3. **Run the automated test suite:**

   ```bash
   node test/ujuzi_test.js
   ```

4. **Serve the frontend locally:**

   ```bash
   npx serve frontend
   ```

5. Open `http://localhost:3000` in a Web3-compatible browser with MetaMask configured to Ethereum Sepolia.
