import assert from "node:assert/strict"
import test from "node:test"
import {
    mergeOriginContextIntoSummary,
    resolveOriginContextStrategyOverride,
} from "../origin-context.ts"

test("calendar-day context anchors an anchor-less question to a daily verdict on that date", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "calendar-day", isoDate: "2026-06-09" },
        replyStrategy: "natal",
        hasOwnTimeAnchor: false,
    })
    assert.ok(override)
    assert.equal(override.replyStrategy, "daily")
    assert.deepEqual(override.questionRange, {
        startDateIso: "2026-06-09",
        endDateIso: "2026-06-09",
        durationDays: 1,
        granularity: "hourly",
    })
})

test("calendar-day context also anchors a 'general' fallback classification", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "calendar-day", isoDate: "2026-06-09" },
        replyStrategy: "general",
        hasOwnTimeAnchor: false,
    })
    assert.equal(override?.replyStrategy, "daily")
})

test("a date written in the question itself wins over the attached day", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "calendar-day", isoDate: "2026-06-09" },
        replyStrategy: "daily",
        hasOwnTimeAnchor: true,
    })
    assert.equal(override, null)
})

test("timing and technical questions keep their strategy despite an attached day", () => {
    for (const replyStrategy of ["timing", "technical", "timeline"]) {
        const override = resolveOriginContextStrategyOverride({
            originContext: { kind: "calendar-day", isoDate: "2026-06-09" },
            replyStrategy,
            hasOwnTimeAnchor: false,
        })
        assert.equal(override, null, `strategy ${replyStrategy} must not be overridden`)
    }
})

test("calendar-day context with an invalid date is ignored", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "calendar-day", isoDate: "9 June 2026" },
        replyStrategy: "natal",
        hasOwnTimeAnchor: false,
    })
    assert.equal(override, null)
})

test("birth-chart context routes an anchor-less general question to the natal strategy", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "birth-chart" },
        replyStrategy: "general",
        hasOwnTimeAnchor: false,
    })
    assert.ok(override)
    assert.equal(override.replyStrategy, "natal")
    assert.equal(override.questionRange, null)
})

test("birth-chart context leaves natal and anchored questions untouched", () => {
    assert.equal(
        resolveOriginContextStrategyOverride({
            originContext: { kind: "birth-chart" },
            replyStrategy: "natal",
            hasOwnTimeAnchor: false,
        }),
        null,
    )
    assert.equal(
        resolveOriginContextStrategyOverride({
            originContext: { kind: "birth-chart" },
            replyStrategy: "daily",
            hasOwnTimeAnchor: true,
        }),
        null,
    )
})

test("no attachment means no override", () => {
    assert.equal(
        resolveOriginContextStrategyOverride({
            originContext: null,
            replyStrategy: "natal",
            hasOwnTimeAnchor: false,
        }),
        null,
    )
})

test("merges origin context ahead of the conversation summary", () => {
    const merged = mergeOriginContextIntoSummary(
        {
            kind: "calendar-day",
            label: "Tuesday 9 June 2026",
            isoDate: "2026-06-09",
            summary: "Selected day: Tuesday 9 June 2026 (2026-06-09)",
        },
        "User asked: how is my career",
    )
    assert.ok(merged.startsWith("Page context (where the user started this chat):"))
    assert.ok(merged.includes("2026-06-09"))
    assert.ok(merged.endsWith("User asked: how is my career"))
})
