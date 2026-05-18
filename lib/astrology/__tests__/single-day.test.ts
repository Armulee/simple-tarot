import assert from "node:assert/strict"
import test from "node:test"
import {
    isNatalQuestionRange,
    isSingleDayQuestionRange,
    readQuestionRangeFromChartData,
} from "../single-day.ts"

test("explicit single day → true", () => {
    assert.equal(
        isSingleDayQuestionRange({ durationDays: 1, source: "explicit" }),
        true,
    )
})

test("relative single day (today/tomorrow) → true", () => {
    assert.equal(
        isSingleDayQuestionRange({ durationDays: 1, source: "relative" }),
        true,
    )
})

test("multi-day relative → false", () => {
    assert.equal(
        isSingleDayQuestionRange({ durationDays: 7, source: "relative" }),
        false,
    )
})

test("default 30-day fallback → false", () => {
    assert.equal(
        isSingleDayQuestionRange({ durationDays: 30, source: "default_30d" }),
        false,
    )
})

test("ai-inferred is never trusted as single day", () => {
    assert.equal(
        isSingleDayQuestionRange({ durationDays: 1, source: "ai_inferred" }),
        false,
    )
})

test("null/undefined inputs are safe", () => {
    assert.equal(isSingleDayQuestionRange(null), false)
    assert.equal(isSingleDayQuestionRange(undefined), false)
    assert.equal(isSingleDayQuestionRange({}), false)
})

test("readQuestionRangeFromChartData extracts shape", () => {
    const chartData = {
        questionRange: {
            durationDays: 1,
            source: "explicit",
            startDateIso: "2026-05-07",
        },
    }
    const range = readQuestionRangeFromChartData(chartData)
    assert.deepEqual(range, { durationDays: 1, source: "explicit" })
    assert.equal(isSingleDayQuestionRange(range), true)
})

test("isNatalQuestionRange: default_30d → true", () => {
    assert.equal(
        isNatalQuestionRange({ durationDays: 30, source: "default_30d" }),
        true,
    )
})

test("isNatalQuestionRange: ai_inferred → true (no explicit date)", () => {
    assert.equal(
        isNatalQuestionRange({ durationDays: 7, source: "ai_inferred" }),
        true,
    )
})

test("isNatalQuestionRange: explicit / relative date → false", () => {
    assert.equal(
        isNatalQuestionRange({ durationDays: 1, source: "explicit" }),
        false,
    )
    assert.equal(
        isNatalQuestionRange({ durationDays: 30, source: "relative" }),
        false,
    )
})

test("isNatalQuestionRange: null/undefined → false", () => {
    assert.equal(isNatalQuestionRange(null), false)
    assert.equal(isNatalQuestionRange(undefined), false)
    assert.equal(isNatalQuestionRange({}), false)
})

test("readQuestionRangeFromChartData returns null for missing/invalid data", () => {
    assert.equal(readQuestionRangeFromChartData(null), null)
    assert.equal(readQuestionRangeFromChartData(undefined), null)
    assert.equal(readQuestionRangeFromChartData({}), null)
    assert.equal(
        readQuestionRangeFromChartData({ questionRange: "bad" } as never),
        null,
    )
})
