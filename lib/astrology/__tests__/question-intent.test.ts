import assert from "node:assert/strict"
import test from "node:test"
import {
    detectPredictiveIntent,
    isBirthChartSuitabilityQuestion,
} from "../question-intent.ts"

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

test("detectPredictiveIntent: English 'what will happen' variants", () => {
    assert.equal(detectPredictiveIntent("what will happen tomorrow?"), true)
    assert.equal(
        detectPredictiveIntent("what is going to happen this month?"),
        true,
    )
    assert.equal(detectPredictiveIntent("what might happen next week"), true)
    assert.equal(
        detectPredictiveIntent("what should I expect on Friday?"),
        true,
    )
    assert.equal(
        detectPredictiveIntent("how will my career go in 2027?"),
        true,
    )
})

test("detectPredictiveIntent: Thai predictive phrasings", () => {
    assert.equal(detectPredictiveIntent("วันนี้จะเกิดอะไรขึ้นบ้าง"), true)
    assert.equal(detectPredictiveIntent("พรุ่งนี้แล้วจะเกิดอะไรขึ้นบ้าง"), true)
    assert.equal(detectPredictiveIntent("จะเกิดอะไรในเดือนหน้า"), true)
    assert.equal(detectPredictiveIntent("มีอะไรเกิดขึ้นในวันนี้ไหม"), true)
    assert.equal(detectPredictiveIntent("ปีนี้จะเป็นยังไง"), true)
    assert.equal(detectPredictiveIntent("อาทิตย์หน้าจะเป็นอย่างไร"), true)
    assert.equal(detectPredictiveIntent("อะไรจะเกิดขึ้นกับฉัน"), true)
    assert.equal(detectPredictiveIntent("เดือนนี้มีอะไรบ้าง"), true)
    assert.equal(detectPredictiveIntent("ปีหน้าจะเกิดอะไรขึ้น"), true)
})

test("detectPredictiveIntent: Lao predictive phrasings", () => {
    assert.equal(detectPredictiveIntent("ມື້ນີ້ມີຫຍັງເກີດຂຶ້ນ"), true)
    assert.equal(detectPredictiveIntent("ຈະເກີດຫຍັງໃນອາທິດໜ້າ"), true)
    assert.equal(detectPredictiveIntent("ປີນີ້ຈະເປັນແນວໃດ"), true)
})

test("detectPredictiveIntent: non-predictive questions return false", () => {
    assert.equal(
        detectPredictiveIntent("Tell me about my love life"),
        false,
    )
    assert.equal(
        detectPredictiveIntent("ดวงการเงินของฉันช่วงนี้ดีไหม"),
        false,
    )
    assert.equal(detectPredictiveIntent("hello"), false)
    assert.equal(detectPredictiveIntent(""), false)
})
