import assert from "node:assert/strict"
import test from "node:test"
import { resolveQuestionTimeRange } from "../question-time-range.ts"

test("uses explicit date from question as range start", () => {
    const range = resolveQuestionTimeRange("Will I find a new job on 2027-03-12?", {
        now: new Date("2026-02-21T00:00:00.000Z"),
    })
    assert.equal(range.startDateIso, "2027-03-12")
    assert.equal(range.source, "explicit")
    assert.equal(range.durationDays, 1)
})

test("uses relative duration when question asks within N months", () => {
    const range = resolveQuestionTimeRange("What will happen within 6 months?", {
        now: new Date("2026-02-21T00:00:00.000Z"),
    })
    assert.equal(range.startDateIso, "2026-02-21")
    assert.equal(range.source, "relative")
    assert.equal(range.durationDays, 180)
})

test("falls back to default 180-day range when undetermined", () => {
    const range = resolveQuestionTimeRange("Tell me about my love life", {
        now: new Date("2026-02-21T00:00:00.000Z"),
    })
    assert.equal(range.startDateIso, "2026-02-21")
    assert.equal(range.source, "default_180d")
    assert.equal(range.durationDays, 180)
})
