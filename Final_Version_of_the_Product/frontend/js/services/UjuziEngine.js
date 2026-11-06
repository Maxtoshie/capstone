/**
 * UjuziChain Core Object-Oriented Service Architecture
 * Demonstrates Abstraction, Encapsulation, and Single Responsibility
 */

// 1. Encapsulated Cryptography Service (Abstraction of Web Crypto API)
export class CryptographyService {
    // Returns the FULL 256-bit digest as 0x + 64 hex chars. Truncate only for display.
    static async computeSHA256(file) {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        return "0x" + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// 2. Job Match & Competency Scoring Algorithm
export class CompetencyAlgorithm {
    static FLOOR = 30;
    static CAP = 95;
    static THRESHOLD = 70;

    static normalize(list) {
        return (list || []).map(s => String(s).trim().toLowerCase()).filter(Boolean);
    }

    // Exact (case/space-insensitive) skill match. Substring matching was removed because
    // "java" would otherwise count as a hit for "javascript".
    static calculateScore(candidateSkills, jobRequirements) {
        const cand = new Set(this.normalize(candidateSkills));
        const reqs = this.normalize(jobRequirements);
        if (cand.size === 0 || reqs.length === 0) return this.FLOOR;
        const hits = reqs.filter(r => cand.has(r)).length;
        const pct = Math.round((hits / reqs.length) * 100);
        return Math.min(this.CAP, Math.max(this.FLOOR, pct));
    }

    static evaluateGate(matchScore, simulationStatus) {
        if (simulationStatus === 'failed') {
            return { state: 'INELIGIBLE', label: 'Ineligible (Simulation Failed)', canApply: false };
        }
        if (matchScore >= this.THRESHOLD) {
            return { state: 'AUTO_APPLY', label: 'Auto Apply Qualified', canApply: true };
        }
        if (simulationStatus === 'passed') {
            return { state: 'SIM_UNLOCKED', label: 'Verified via Simulation', canApply: true };
        }
        return { state: 'SIM_REQUIRED', label: 'Simulation Required (< 70%)', canApply: false };
    }
}

// 3. Sepolia Contract Interface Service (Encapsulated EVM Provider)
export class SepoliaRegistryClient {
    constructor(contractAddress, abi) {
        this.contractAddress = contractAddress;
        this.abi = abi;
    }

    async getReadOnlyContract() {
        const provider = window.ethereum 
            ? new ethers.BrowserProvider(window.ethereum) 
            : ethers.getDefaultProvider("sepolia");
        return new ethers.Contract(this.contractAddress, this.abi, provider);
    }

    async verifyCredential(rawCredentialId) {
        const contract = await this.getReadOnlyContract();
        const raw = rawCredentialId.trim();
        const bytes32Id = /^0x[0-9a-fA-F]{64}$/.test(raw) ? raw
            : (new TextEncoder().encode(raw).length <= 31 ? ethers.encodeBytes32String(raw) : ethers.keccak256(ethers.toUtf8Bytes(raw)));
        return await contract.verifyCredential(bytes32Id);
    }
}
