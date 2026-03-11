import assert from "node:assert/strict"
import test from "node:test"
import { horoscopeInterpretationSchema } from "../schema.ts"

test("horoscope schema accepts output without legacy planetInsights", () => {
    const parsed = horoscopeInterpretationSchema.parse({
        interpretation: "A concise interpretation.",
        conclusion: "A short conclusion.",
        suggestions: ["Q1?", "Q2?", "Q3?"],
    })

    assert.deepEqual(parsed.aspectInsights, [])
})

test("horoscope schema supports aspectInsights mapping", () => {
    const parsed = horoscopeInterpretationSchema.parse({
        aspectInsights: [
            {
                aspectKey: "Sun|trine|Moon|2026-03-01",
                keyword: "opening",
                sentiment: "good",
                insight: "Energy flows smoothly.",
            },
        ],
        interpretation: "A concise interpretation.",
        conclusion: "A short conclusion.",
        suggestions: ["Q1?", "Q2?", "Q3?"],
    })

    assert.equal(parsed.aspectInsights.length, 1)
    assert.equal(parsed.aspectInsights[0]?.aspectKey, "Sun|trine|Moon|2026-03-01")
})
