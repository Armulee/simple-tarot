import assert from "node:assert/strict"
import test from "node:test"
import { isBirthChartSuitabilityQuestion } from "../question-intent.ts"

test("detects birth chart suitability-style questions", () => {
    assert.equal(
        isBirthChartSuitabilityQuestion(
            "Based on my birth chart, what career path is suitable for me?"
        ),
        true
    )
})

test("ignores non-suitability horoscope questions", () => {
    assert.equal(
        isBirthChartSuitabilityQuestion("How is my love life in the next months?"),
        false
    )
})
