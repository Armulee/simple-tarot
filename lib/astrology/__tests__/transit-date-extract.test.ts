import assert from "node:assert/strict"
import test from "node:test"
import {
    resolveDeterministicTransitDate,
    selectTransitDateFromSources,
    toValidTransitDateParts,
} from "../transit-date-extract.ts"

test("resolves explicit full date in message", () => {
    const resolved = resolveDeterministicTransitDate(
        "Please forecast for 2026-04-15",
        new Date("2026-03-01T00:00:00.000Z"),
    )
    assert.deepEqual(resolved, {
        day: 15,
        month: 4,
        year: 2026,
    })
})

test("resolves relative keywords for today and tomorrow", () => {
    const now = new Date("2026-03-01T00:00:00.000Z")
    const today = resolveDeterministicTransitDate("today", now)
    const tomorrow = resolveDeterministicTransitDate("พรุ่งนี้", now)

    assert.deepEqual(today, { day: 1, month: 3, year: 2026 })
    assert.deepEqual(tomorrow, { day: 2, month: 3, year: 2026 })
})

test("resolves day-only form in current month and year", () => {
    const resolved = resolveDeterministicTransitDate(
        "Can you read on 20?",
        new Date("2026-03-01T00:00:00.000Z"),
    )
    assert.deepEqual(resolved, {
        day: 20,
        month: 3,
        year: 2026,
    })
})

test("does not resolve broad period without specific day", () => {
    const resolved = resolveDeterministicTransitDate(
        "How is my love life next month?",
        new Date("2026-03-01T00:00:00.000Z"),
    )
    assert.equal(resolved, null)
})

test("rejects invalid AI transit dates", () => {
    const valid = toValidTransitDateParts({
        mentioned: true,
        day: 29,
        month: 2,
        year: 2024,
    })
    const invalid = toValidTransitDateParts({
        mentioned: true,
        day: 30,
        month: 2,
        year: 2024,
    })

    assert.deepEqual(valid, { day: 29, month: 2, year: 2024 })
    assert.equal(invalid, null)
})

test("deterministic transit takes precedence over AI and ignores birth-date context", () => {
    const selected = selectTransitDateFromSources({
        message: "I was born on 1990-02-11. Please forecast for tomorrow.",
        extractedTransit: {
            mentioned: true,
            day: 11,
            month: 2,
            year: 1990,
        },
        now: new Date("2026-03-01T00:00:00.000Z"),
    })

    assert.deepEqual(selected, {
        mentioned: true,
        day: 2,
        month: 3,
        year: 2026,
    })
})
