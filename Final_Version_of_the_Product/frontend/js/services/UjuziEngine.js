/**
 * UjuziChain Core Object-Oriented Service Architecture
 * Demonstrates Abstraction, Encapsulation, and Single Responsibility
 */

// 1. Encapsulated Cryptography Service (Abstraction of Web Crypto API)
export class CryptographyService {
    static async computeSHA256(file) {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return "0x" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16) + "...";
    }
}

// 2. Job Match & Competency Scoring Algorithm
export class CompetencyAlgorithm {
    static calculateScore(candidateSkills, jobRequirements) {
        if (!candidateSkills || candidateSkills.length === 0) return 40;
        const normalizedCandidate = candidateSkills.map(s => s.toLowerCase().trim());
        let matches = 0;

        jobRequirements.forEach(req => {
            if (normalizedCandidate.some(cs => req.toLowerCase().includes(cs) || cs.includes(req.toLowerCase()))) {
                matches++;
            }
        });

        const matchRatio = matches / (jobRequirements.length || 1);
        return Math.min(95, Math.max(30, Math.round(matchRatio * 100)));
    }

    static evaluateGate(matchScore, simulationStatus) {
        if (simulationStatus === 'failed') {
            return { state: 'INELIGIBLE', label: 'Ineligible (Simulation Failed)', canApply: false };
        }
        if (matchScore >= 70) {
            return { state: 'AUTO_QUALIFIED', label: 'Auto Apply Qualified', canApply: true };
        }
        if (simulationStatus === 'passed') {
            return { state: 'SIM_PASSED', label: 'Verified via Simulation', canApply: true };
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
        let bytes32Id = rawCredentialId.startsWith("0x") && rawCredentialId.length === 66 
            ? rawCredentialId 
            : ethers.encodeBytes32String(rawCredentialId.substring(0, 31));
        return await contract.verifyCredential(bytes32Id);
    }
}
