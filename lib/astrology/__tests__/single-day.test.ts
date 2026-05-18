import assert from "node:assert/strict"
import test from "node:test"
import {
    isNatalQuestionRange,
    isSingleDayQuestionRange,
    looksLikeNatalQuestion,
    looksLikeTimingQuestion,
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

test("ai-inferred single day → true (dated day reading)", () => {
    assert.equal(
        isSingleDayQuestionRange({ durationDays: 1, source: "ai_inferred" }),
        true,
    )
})

test("ai-inferred multi-day → false for single-day helper", () => {
    assert.equal(
        isSingleDayQuestionRange({ durationDays: 7, source: "ai_inferred" }),
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

test("isNatalQuestionRange: ai_inferred multi-day → true", () => {
    assert.equal(
        isNatalQuestionRange({ durationDays: 7, source: "ai_inferred" }),
        true,
    )
})

test("isNatalQuestionRange: ai_inferred single day → false (daily verdict)", () => {
    assert.equal(
        isNatalQuestionRange({ durationDays: 1, source: "ai_inferred" }),
        false,
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

test("looksLikeNatalQuestion: timeless self questions → true", () => {
    assert.equal(looksLikeNatalQuestion("Which career fits me?"), true)
    assert.equal(looksLikeNatalQuestion("Am I lucky in love?"), true)
    assert.equal(
        looksLikeNatalQuestion("งานแบบไหนที่เหมาะกับฉัน"),
        true,
    )
})

test("looksLikeNatalQuestion: today/tomorrow → false", () => {
    assert.equal(looksLikeNatalQuestion("How is today for me?"), false)
    assert.equal(looksLikeNatalQuestion("วันนี้เป็นอย่างไร"), false)
    assert.equal(
        looksLikeNatalQuestion("Will I have a good day tomorrow?"),
        false,
    )
})

test("looksLikeNatalQuestion: calendar windows → false", () => {
    assert.equal(looksLikeNatalQuestion("How is this month?"), false)
    assert.equal(looksLikeNatalQuestion("What about next year?"), false)
    assert.equal(looksLikeNatalQuestion("เดือนหน้าจะเป็นยังไง"), false)
})

test("looksLikeNatalQuestion: 'within N days' → false", () => {
    assert.equal(looksLikeNatalQuestion("Anything within 7 days?"), false)
    assert.equal(
        looksLikeNatalQuestion("Will I get the job in 30 days?"),
        false,
    )
})

test("looksLikeNatalQuestion: explicit dates → false", () => {
    assert.equal(looksLikeNatalQuestion("How about 2026-06-12?"), false)
    assert.equal(looksLikeNatalQuestion("What about 12/06/2026?"), false)
    assert.equal(looksLikeNatalQuestion("June 12, 2026?"), false)
})

test("looksLikeNatalQuestion: empty / non-string input is safe", () => {
    assert.equal(looksLikeNatalQuestion(""), false)
    assert.equal(looksLikeNatalQuestion(undefined as unknown as string), false)
})

test("looksLikeTimingQuestion: 'when will I be rich?' → true", () => {
    assert.equal(looksLikeTimingQuestion("When will I be rich?"), true)
    assert.equal(looksLikeTimingQuestion("When can I find love?"), true)
    assert.equal(looksLikeTimingQuestion("When should I quit my job?"), true)
})

test("looksLikeTimingQuestion: Thai/Lao timing markers → true", () => {
    assert.equal(looksLikeTimingQuestion("เมื่อไหร่ฉันจะรวย"), true)
    assert.equal(looksLikeTimingQuestion("วันไหนเหมาะกับการเริ่มต้น"), true)
    assert.equal(looksLikeTimingQuestion("ເມື່ອໃດຂ້ອຍຈະຮັ່ງມີ"), true)
    // Informal Thai with "ช่วงไหน" (what period / window).
    assert.equal(looksLikeTimingQuestion("มึงว่ากุจะรวย ช่วงไหน"), true)
    assert.equal(looksLikeTimingQuestion("จะเจอเนื้อคู่ตอนไหน"), true)
    assert.equal(looksLikeTimingQuestion("อีกกี่เดือนจะได้งานใหม่"), true)
    assert.equal(looksLikeTimingQuestion("อีกนานไหมจะหายป่วย"), true)
    // Lao "what period / how long".
    assert.equal(looksLikeTimingQuestion("ຊ່ວງໃດຂ້ອຍຈະຮັ່ງມີ"), true)
    assert.equal(looksLikeTimingQuestion("ອີກດົນບໍ່ຈະໄດ້ວຽກໃໝ່"), true)
})

test("looksLikeTimingQuestion: timeless / dated questions → false", () => {
    assert.equal(
        looksLikeTimingQuestion("Which career fits me?"),
        false,
    )
    assert.equal(looksLikeTimingQuestion("How is today for me?"), false)
    assert.equal(
        looksLikeTimingQuestion("When I was younger I was unhappy"),
        false,
    )
})

test("looksLikeTimingQuestion: empty / non-string input is safe", () => {
    assert.equal(looksLikeTimingQuestion(""), false)
    assert.equal(
        looksLikeTimingQuestion(undefined as unknown as string),
        false,
    )
})

test("looksLikeNatalQuestion: timing questions are excluded", () => {
    // 'when will I..?' is timing, not natal, even though it has no date.
    assert.equal(looksLikeNatalQuestion("When will I be rich?"), false)
    assert.equal(looksLikeNatalQuestion("เมื่อไหร่ฉันจะรวย"), false)
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
