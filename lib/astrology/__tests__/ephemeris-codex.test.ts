import assert from "node:assert/strict"
import test from "node:test"
import { computeCodexCoverage } from "../codex-coverage.ts"

test("marks coverage complete when all expected days exist", () => {
    const coverage = computeCodexCoverage(30, 30)
    assert.equal(coverage.isComplete, true)
    assert.equal(coverage.ratio, 1)
})

test("marks coverage incomplete and supports fallback decision", () => {
    const coverage = computeCodexCoverage(730, 420)
    assert.equal(coverage.isComplete, false)
    assert.ok(coverage.ratio < 1)
})
