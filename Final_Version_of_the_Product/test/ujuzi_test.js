import assert from 'node:assert';
import { CompetencyAlgorithm as C } from '../frontend/js/services/UjuziEngine.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log("✓ PASS:", name); };

console.log("RUNNING UJUZICHAIN TEST SUITE (imports the real engine)\n");
const reqs = ["JavaScript", "Git", "REST APIs", "SQL"];

test("100% overlap scores >= 70 and is capped at 95", () => {
    const s = C.calculateScore(reqs, reqs);
    assert.strictEqual(s, 95);
});
test("empty candidate skills fall to the floor and never auto-qualify", () => {
    assert.strictEqual(C.calculateScore([], reqs), 30);
    assert.strictEqual(C.evaluateGate(C.calculateScore([], reqs), 'untested').state, 'SIM_REQUIRED');
});
test("empty job requirements fall to the floor", () => {
    assert.strictEqual(C.calculateScore(reqs, []), 30);
});
test("matching ignores case and stray spaces", () => {
    assert.strictEqual(C.calculateScore(["  javascript ", "GIT"], ["JavaScript", "Git"]), 95);
});
test("no substring false positives ('java' is not 'javascript')", () => {
    assert.strictEqual(C.calculateScore(["java"], ["JavaScript"]), 30);
});
test("boundary: exactly 70% auto-qualifies, 67% does not", () => {
    const ten = Array.from({ length: 10 }, (_, i) => "s" + i);
    assert.strictEqual(C.calculateScore(ten.slice(0, 7), ten), 70);
    assert.strictEqual(C.evaluateGate(70, 'untested').state, 'AUTO_APPLY');
    assert.strictEqual(C.calculateScore(["a", "b"], ["a", "b", "c"]), 67);
    assert.strictEqual(C.evaluateGate(69, 'untested').state, 'SIM_REQUIRED');
});
test("rounding edge: raw 69.5% is rounded to 70 BEFORE the gate (documented behaviour)", () => {
    const req = Array.from({ length: 200 }, (_, i) => "k" + i);
    assert.strictEqual(C.calculateScore(req.slice(0, 139), req), 70);
});
test("all four gate states", () => {
    assert.strictEqual(C.evaluateGate(85, 'untested').state, 'AUTO_APPLY');
    assert.strictEqual(C.evaluateGate(61, 'untested').state, 'SIM_REQUIRED');
    assert.strictEqual(C.evaluateGate(61, 'passed').state, 'SIM_UNLOCKED');
    assert.strictEqual(C.evaluateGate(61, 'failed').state, 'INELIGIBLE');
    assert.strictEqual(C.evaluateGate(95, 'failed').state, 'INELIGIBLE');
});
console.log(`\nALL ${passed} TESTS PASSED`);
