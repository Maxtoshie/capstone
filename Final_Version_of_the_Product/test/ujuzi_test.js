import assert from 'node:assert';

function calculateMatch(candidateSkills, jobRequirements) {
    if (!candidateSkills || candidateSkills.length === 0) return 40;
    const norm = candidateSkills.map(s => s.toLowerCase());
    let matches = 0;
    jobRequirements.forEach(req => {
        if (norm.some(c => req.toLowerCase().includes(c) || c.includes(req.toLowerCase()))) {
            matches++;
        }
    });
    return Math.min(95, Math.max(30, Math.round((matches / jobRequirements.length) * 100)));
}

function evaluateGate(score, simStatus) {
    if (simStatus === 'failed') return 'INELIGIBLE';
    if (score >= 70) return 'AUTO_APPLY';
    if (simStatus === 'passed') return 'SIM_UNLOCKED';
    return 'SIM_REQUIRED';
}

console.log("==========================================");
console.log("RUNNING UJUZICHAIN AUTOMATED TEST SUITE");
console.log("==========================================\n");

// Test 1: Algorithmic Skill Overlap
console.log("[TEST 1: Algorithmic Skill Overlap]");
const skillsA = ["JavaScript", "Git", "REST APIs", "SQL"];
const reqsA = ["JavaScript", "Git", "REST APIs", "SQL"];
const scoreA = calculateMatch(skillsA, reqsA);
assert.strictEqual(scoreA >= 70, true, "100% overlap must score >= 70%");
console.log("✓ PASS: High-match candidate accurately scored:", scoreA + "%");

// Test 2: Edge Case - Zero Skills Provided
console.log("\n[TEST 2: Edge Case Handling - Empty Skills Profile]");
const scoreEmpty = calculateMatch([], reqsA);
assert.strictEqual(scoreEmpty <= 50, true, "Empty profile must not auto-qualify");
console.log("✓ PASS: Empty skills profile bounded to floor:", scoreEmpty + "%");

// Test 3: Dual Gate 70% Logic
console.log("\n[TEST 3: Competency Gate - Auto Apply vs Simulation]");
assert.strictEqual(evaluateGate(85, 'untested'), 'AUTO_APPLY');
assert.strictEqual(evaluateGate(61, 'untested'), 'SIM_REQUIRED');
assert.strictEqual(evaluateGate(61, 'passed'), 'SIM_UNLOCKED');
assert.strictEqual(evaluateGate(61, 'failed'), 'INELIGIBLE');
console.log("✓ PASS: All 4 gate states (Auto-Apply, Sim-Required, Unlocked, Ineligible) validated.");

console.log("\n==========================================");
console.log("ALL TEST STRATEGIES PASSED (3/3)");
console.log("==========================================");
