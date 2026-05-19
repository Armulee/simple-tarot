import assert from "node:assert/strict"
import test from "node:test"
import { resolveQuestionTimeRange, resolveQuestionTimeRangeAsync } from "../question-time-range.ts"

test("uses explicit date from question as range start", () => {
    const range = resolveQuestionTimeRange("Will I find a new job on 2027-03-12?", {
        now: new Date("2026-02-21T00:00:00.000Z"),
    })
    assert.equal(range.startDateIso, "2027-03-12")
    assert.equal(range.source, "explicit")
    assert.equal(range.durationDays, 1)
    assert.equal(range.granularity, "hourly")
})

test("single-day relative question (tomorrow) resolves to hourly granularity", () => {
    const range = resolveQuestionTimeRange("What will happen tomorrow?", {
        now: new Date("2026-02-21T00:00:00.000Z"),
    })
    assert.equal(range.source, "relative")
    assert.equal(range.durationDays, 1)
    assert.equal(range.granularity, "hourly")
})

test("multi-day relative range resolves to daily granularity", () => {
    const range = resolveQuestionTimeRange(
        "What will happen within 7 days?",
        { now: new Date("2026-02-21T00:00:00.000Z") },
    )
    assert.equal(range.source, "relative")
    assert.equal(range.durationDays, 7)
    assert.equal(range.granularity, "daily")
})

test("explicit hourly intent flips granularity to hourly when range is one day", () => {
    const range = resolveQuestionTimeRange(
        "Show me hour by hour for today",
        { now: new Date("2026-02-21T00:00:00.000Z") },
    )
    assert.equal(range.durationDays, 1)
    assert.equal(range.granularity, "hourly")
})

test("default 30-day fallback uses daily granularity", () => {
    const range = resolveQuestionTimeRange("Tell me about my career", {
        now: new Date("2026-02-21T00:00:00.000Z"),
    })
    assert.equal(range.source, "default_30d")
    assert.equal(range.granularity, "daily")
})

test("uses relative duration when question asks within N months", () => {
    const range = resolveQuestionTimeRange("What will happen within 6 months?", {
        now: new Date("2026-02-21T00:00:00.000Z"),
    })
    assert.equal(range.startDateIso, "2026-02-21")
    assert.equal(range.source, "relative")
    assert.equal(range.durationDays, 180)
})

test("falls back to default 30-day range when undetermined", () => {
    const range = resolveQuestionTimeRange("Tell me about my love life", {
        now: new Date("2026-02-21T00:00:00.000Z"),
    })
    assert.equal(range.startDateIso, "2026-02-21")
    assert.equal(range.source, "default_30d")
    assert.equal(range.durationDays, 30)
})

test("async: skips AI when regex resolves today", async () => {
    const range = await resolveQuestionTimeRangeAsync("What about today?", {
        now: new Date("2026-03-01T00:00:00.000Z"),
    })
    assert.equal(range.source, "relative")
    assert.equal(range.durationDays, 1)
})

test("async: skips AI when regex resolves a relative range", async () => {
    const range = await resolveQuestionTimeRangeAsync("What will happen within 3 months?", {
        now: new Date("2026-03-01T00:00:00.000Z"),
    })
    assert.equal(range.source, "relative")
    assert.equal(range.durationDays, 90)
})

test("Thai 'this month' timing question ends on last day of current month", () => {
    const range = resolveQuestionTimeRange(
        "วันไหนกูการงานเด่นสุดในรอบเดือนนี้",
        { now: new Date("2026-05-19T12:00:00.000Z") },
    )
    assert.equal(range.source, "relative")
    assert.equal(range.startDateIso, "2026-05-19")
    assert.equal(range.endDateIso, "2026-05-31")
    assert.equal(range.granularity, "daily")
})

test("day-of-month range with daily phrasing resolves to explicit daily window", () => {
    const range = resolveQuestionTimeRange(
        "What will happen to me on 19-23 in daily",
        { now: new Date("2026-05-10T00:00:00.000Z") },
    )
    assert.equal(range.source, "explicit")
    assert.equal(range.startDateIso, "2026-05-19")
    assert.equal(range.endDateIso, "2026-05-23")
    assert.equal(range.granularity, "daily")
})

test("Thai day-of-month range resolves to explicit daily window", () => {
    const range = resolveQuestionTimeRange(
        "จะเกิดอะไรขึ้นกับกูในวันที่ 19-23 รายวัน",
        { now: new Date("2026-05-10T00:00:00.000Z") },
    )
    assert.equal(range.source, "explicit")
    assert.equal(range.startDateIso, "2026-05-19")
    assert.equal(range.endDateIso, "2026-05-23")
    assert.equal(range.granularity, "daily")
})

test("async: returns default_30d when regex has no match and AI returns 30", async () => {
    const range = await resolveQuestionTimeRangeAsync("Tell me about my love life", {
        now: new Date("2026-03-01T00:00:00.000Z"),
    })
    assert.ok(
        range.source === "default_30d" || range.source === "ai_inferred",
        `source should be default_30d or ai_inferred, got ${range.source}`,
    )
    assert.ok(range.durationDays >= 1, "durationDays should be at least 1")
})
