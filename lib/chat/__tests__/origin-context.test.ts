import assert from "node:assert/strict"
import test from "node:test"
import {
    mergeOriginContextIntoSummary,
    resolveOriginContextStrategyOverride,
} from "../origin-context.ts"

const TODAY = "2026-06-12"

const dailyOn = (iso: string) => ({
    replyStrategy: "daily",
    questionRange: {
        startDateIso: iso,
        endDateIso: iso,
        durationDays: 1,
        granularity: "hourly",
    },
})

test("calendar-day context anchors an anchor-less question to a daily verdict on that date", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "calendar-day", isoDate: "2026-06-09" },
        replyStrategy: "natal",
        questionRange: null,
        currentDateIso: TODAY,
    })
    assert.deepEqual(override, dailyOn("2026-06-09"))
})

test("calendar-day context also anchors a 'general' fallback classification", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "calendar-day", isoDate: "2026-06-09" },
        replyStrategy: "general",
        questionRange: null,
        currentDateIso: TODAY,
    })
    assert.equal(override?.replyStrategy, "daily")
})

test("relative 'today' phrasing re-anchors onto the attached day", () => {
    // "วันนี้จะเปนไง" with 16 June attached: the LLM resolves วันนี้ to the
    // wall-clock today — but in this UI it means the attached day.
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "calendar-day", isoDate: "2026-06-16" },
        replyStrategy: "daily",
        questionRange: { startDateIso: TODAY, endDateIso: TODAY },
        currentDateIso: TODAY,
    })
    assert.deepEqual(override, dailyOn("2026-06-16"))
})

test("attached day equal to today needs no re-anchor", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "calendar-day", isoDate: TODAY },
        replyStrategy: "daily",
        questionRange: { startDateIso: TODAY, endDateIso: TODAY },
        currentDateIso: TODAY,
    })
    assert.equal(override, null)
})

test("an absolute date written in the question wins over the attached day", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "calendar-day", isoDate: "2026-06-16" },
        replyStrategy: "daily",
        questionRange: { startDateIso: "2026-06-20", endDateIso: "2026-06-20" },
        currentDateIso: TODAY,
    })
    assert.equal(override, null)
})

test("multi-day windows starting today are not re-anchored", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "calendar-day", isoDate: "2026-06-16" },
        replyStrategy: "timeline",
        questionRange: { startDateIso: TODAY, endDateIso: "2026-06-18" },
        currentDateIso: TODAY,
    })
    assert.equal(override, null)
})

test("timing and technical questions keep their strategy despite an attached day", () => {
    for (const replyStrategy of ["timing", "technical", "timeline"]) {
        const override = resolveOriginContextStrategyOverride({
            originContext: { kind: "calendar-day", isoDate: "2026-06-09" },
            replyStrategy,
            questionRange: null,
            currentDateIso: TODAY,
        })
        assert.equal(override, null, `strategy ${replyStrategy} must not be overridden`)
    }
})

test("calendar-day context with an invalid date is ignored", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "calendar-day", isoDate: "9 June 2026" },
        replyStrategy: "natal",
        questionRange: null,
        currentDateIso: TODAY,
    })
    assert.equal(override, null)
})

test("birth-chart context routes an anchor-less general question to the natal strategy", () => {
    const override = resolveOriginContextStrategyOverride({
        originContext: { kind: "birth-chart" },
        replyStrategy: "general",
        questionRange: null,
        currentDateIso: TODAY,
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
            questionRange: null,
            currentDateIso: TODAY,
        }),
        null,
    )
    assert.equal(
        resolveOriginContextStrategyOverride({
            originContext: { kind: "birth-chart" },
            replyStrategy: "daily",
            questionRange: { startDateIso: TODAY, endDateIso: TODAY },
            currentDateIso: TODAY,
        }),
        null,
    )
})

test("no attachment means no override", () => {
    assert.equal(
        resolveOriginContextStrategyOverride({
            originContext: null,
            replyStrategy: "natal",
            questionRange: null,
            currentDateIso: TODAY,
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
