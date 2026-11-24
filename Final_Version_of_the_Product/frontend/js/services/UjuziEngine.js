
/**
 * UjuziChain Core Object-Oriented Service Architecture
 *
 * Demonstrates:
 * - Abstraction
 * - Encapsulation
 * - Single Responsibility
 *
 * Core services:
 * 1. CryptographyService
 * 2. CompetencyAlgorithm
 * 3. SepoliaRegistryClient
 */

// ============================================================
// 1. CRYPTOGRAPHY SERVICE
// ============================================================

/**
 * Handles document hashing using the Web Crypto API.
 *
 * Documents are hashed locally in the browser.
 * The original document is never uploaded by this service.
 */
export class CryptographyService {

    /**
     * Generates a full SHA-256 hash of a document.
     *
     * @param {File} file - Document to hash.
     * @returns {Promise<string>} Full SHA-256 hash.
     */
    static async computeSHA256(file) {
        if (!file) {
            throw new Error("No document provided for hashing.");
        }

        const buffer = await file.arrayBuffer();

        const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            buffer
        );

        const hash = Array.from(new Uint8Array(hashBuffer))
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");

        return "0x" + hash;
    }
}


// ============================================================
// 2. JOB MATCHING AND COMPETENCY SCORING ALGORITHM
// ============================================================

/**
 * Calculates candidate-to-job skill compatibility and
 * determines the candidate's application eligibility.
 *
 * Screening rules:
 *
 * 70% or above:
 *     AUTO_APPLY
 *
 * Below 70%:
 *     SIM_REQUIRED
 *
 * Successful simulation:
 *     SIM_UNLOCKED
 *
 * Failed simulation:
 *     INELIGIBLE
 *
 * The score represents actual skill compatibility.
 * It is not artificially increased to a minimum percentage.
 */
export class CompetencyAlgorithm {

    // Maximum displayed match score.
    static CAP = 95;

    // Minimum score required for automatic application.
    static THRESHOLD = 70;


    /**
     * Normalizes skill names before comparison.
     *
     * Removes unnecessary spaces and ignores case differences.
     *
     * Example:
     * " JavaScript " becomes "javascript"
     *
     * @param {Array<string>} list
     * @returns {Array<string>}
     */
    static normalize(list) {
        if (!Array.isArray(list)) {
            return [];
        }

        return list
            .map(skill => String(skill).trim().toLowerCase())
            .filter(Boolean);
    }


    /**
     * Calculates the actual percentage of required skills
     * possessed by a candidate.
     *
     * Formula:
     *
     * Match Score =
     * (Matched Required Skills / Total Required Skills) * 100
     *
     * The result is rounded and capped at 95%.
     *
     * No minimum score is imposed.
     *
     * @param {Array<string>} candidateSkills
     * @param {Array<string>} jobRequirements
     * @returns {number}
     */
    static calculateScore(candidateSkills, jobRequirements) {

        const candidate = new Set(
            this.normalize(candidateSkills)
        );

        const requirements = this.normalize(jobRequirements);

        // No job requirements means a meaningful score
        // cannot be calculated.
        if (requirements.length === 0) {
            return 0;
        }

        // Count the required skills present in the
        // candidate's profile.
        const matchedSkills = requirements.filter(skill =>
            candidate.has(skill)
        );

        const matchedCount = matchedSkills.length;

        // Calculate actual percentage.
        const percentage = Math.round(
            (matchedCount / requirements.length) * 100
        );

        // Apply maximum cap without imposing a minimum.
        return Math.min(this.CAP, percentage);
    }


    /**
     * Determines the candidate's application eligibility.
     *
     * @param {number} matchScore
     * @param {string|null} simulationStatus
     * @returns {Object}
     */
    static evaluateGate(matchScore, simulationStatus = null) {

        // Reject invalid scores.
        if (
            typeof matchScore !== "number" ||
            !Number.isFinite(matchScore) ||
            matchScore < 0
        ) {
            return {
                state: "INVALID_SCORE",
                label: "Unable to Calculate Match Score",
                canApply: false
            };
        }

        // A failed simulation overrides the match score.
        if (simulationStatus === "failed") {
            return {
                state: "INELIGIBLE",
                label: "Ineligible (Simulation Failed)",
                canApply: false
            };
        }

        // Candidates meeting the 70% threshold
        // can apply directly.
        if (matchScore >= this.THRESHOLD) {
            return {
                state: "AUTO_APPLY",
                label: "Auto Apply Qualified",
                canApply: true
            };
        }

        // Candidates below 70% can apply after
        // successfully completing the simulation.
        if (simulationStatus === "passed") {
            return {
                state: "SIM_UNLOCKED",
                label: "Verified via Simulation",
                canApply: true
            };
        }

        // Candidates below 70% must complete
        // the simulation before applying.
        return {
            state: "SIM_REQUIRED",
            label: "Simulation Required (< 70%)",
            canApply: false
        };
    }


    /**
     * Returns a complete screening result.
     *
     * This method combines skill scoring and
     * application eligibility into one result.
     *
     * @param {Array<string>} candidateSkills
     * @param {Array<string>} jobRequirements
     * @param {string|null} simulationStatus
     * @returns {Object}
     */
    static assessCandidate(
        candidateSkills,
        jobRequirements,
        simulationStatus = null
    ) {

        const matchScore = this.calculateScore(
            candidateSkills,
            jobRequirements
        );

        const gate = this.evaluateGate(
            matchScore,
            simulationStatus
        );

        return {
            matchScore,
            threshold: this.THRESHOLD,
            simulationStatus,
            state: gate.state,
            label: gate.label,
            canApply: gate.canApply
        };
    }
}


// ============================================================
// 3. SEPOLIA SMART CONTRACT INTERFACE SERVICE
// ============================================================

/**
 * Handles read-only interactions with the UjuziChain
 * smart contract deployed on Ethereum Sepolia.
 */
export class SepoliaRegistryClient {

    constructor(contractAddress, abi) {
        this.contractAddress = contractAddress;
        this.abi = abi;
    }


    /**
     * Creates a read-only contract instance.
     *
     * Uses MetaMask when available, otherwise falls back
     * to the default Sepolia provider.
     *
     * @returns {Promise<ethers.Contract>}
     */
    async getReadOnlyContract() {

        const provider = window.ethereum
            ? new ethers.BrowserProvider(window.ethereum)
            : ethers.getDefaultProvider("sepolia");

        return new ethers.Contract(
            this.contractAddress,
            this.abi,
            provider
        );
    }


    /**
     * Verifies a credential against the Sepolia registry.
     *
     * Accepts either an existing bytes32 identifier
     * or a string that must be converted into bytes32.
     *
     * @param {string} rawCredentialId
     * @returns {Promise}
     */
    async verifyCredential(rawCredentialId) {

        if (
            typeof rawCredentialId !== "string" ||
            !rawCredentialId.trim()
        ) {
            throw new Error("A valid credential ID is required.");
        }

        const contract = await this.getReadOnlyContract();

        const raw = rawCredentialId.trim();

        const bytes32Id = /^0x[0-9a-fA-F]{64}$/.test(raw)
            ? raw
            : (
                new TextEncoder().encode(raw).length <= 31
                    ? ethers.encodeBytes32String(raw)
                    : ethers.keccak256(ethers.toUtf8Bytes(raw))
            );

        return await contract.verifyCredential(bytes32Id);
    }
}

