import assert from "node:assert/strict"
import test from "node:test"
import {
    classifyQuestion,
    detectGuardrail,
    detectTopic,
    type IntentResult,
} from "../intent.ts"

function intentOf(question: string) {
    const result: IntentResult = classifyQuestion(question)
    return result.kind === "reading" ? result.intent : result.kind
}

test("who-am-i questions go to the birth chart", () => {
    assert.equal(intentOf("ฉันเป็นคนแบบไหน"), "IDENTITY")
    assert.equal(intentOf("ดวงกำเนิดของฉันเป็นยังไง"), "IDENTITY")
    assert.equal(intentOf("ฉันเหมาะกับอาชีพอะไร"), "IDENTITY")
    assert.equal(intentOf("What kind of person am I?"), "IDENTITY")
    assert.equal(intentOf("what are my strengths"), "IDENTITY")
})

test("when questions go to the transits", () => {
    assert.equal(intentOf("เมื่อไหร่จะดีขึ้น"), "TIMING")
    assert.equal(intentOf("อีกนานไหมกว่าจะได้งานใหม่"), "TIMING")
    assert.equal(intentOf("ช่วงไหนของปีนี้จะผ่านพ้น"), "TIMING")
    assert.equal(intentOf("When will I meet someone?"), "TIMING")
    assert.equal(intentOf("how long until this ends"), "TIMING")
})

test("what-happens questions go to the chart of the moment", () => {
    assert.equal(intentOf("ถ้าอาทิตย์หน้าปล่อยเวอร์ชันใหม่ไปเลย จะเป็นยังไงต่อ"), "OUTCOME")
    assert.equal(intentOf("ควรลาออกไหม"), "OUTCOME")
    assert.equal(intentOf("เขาคิดยังไงกับฉัน"), "OUTCOME")
    assert.equal(intentOf("แฟนเก่าจะกลับมาไหม"), "OUTCOME")
    assert.equal(intentOf("Should I take the offer?"), "OUTCOME")
    assert.equal(intentOf("Will he text me back?"), "OUTCOME")
})

test("which-day questions go to the almanac, even with timing words in them", () => {
    assert.equal(intentOf("ควรเปิดร้านวันไหนดี"), "AUSPICIOUS_DATE")
    assert.equal(intentOf("หาฤกษ์แต่งงานให้หน่อย"), "AUSPICIOUS_DATE")
    assert.equal(intentOf("วันมงคลเดือนหน้ามีวันไหนบ้าง"), "AUSPICIOUS_DATE")
    assert.equal(intentOf("best day to sign the contract"), "AUSPICIOUS_DATE")
})

test("an explicit tarot request is left to the tarot flow", () => {
    assert.equal(intentOf("ขอจั่วไพ่ให้หน่อย"), "tarot")
    assert.equal(intentOf("draw me a card"), "tarot")
})

test("she asks back rather than guessing at nothing", () => {
    assert.equal(intentOf(""), "unsure")
    assert.equal(intentOf("อืม"), "unsure")
    assert.equal(intentOf("ok"), "unsure")
})

test("a bare life area is still answerable as an outcome", () => {
    assert.equal(intentOf("เรื่องงานช่วงนี้"), "OUTCOME")
    assert.equal(intentOf("ความรักตอนนี้"), "OUTCOME")
})

test("topics are picked off the question", () => {
    assert.equal(detectTopic("ควรลาออกไหม"), "career")
    assert.equal(detectTopic("แฟนเก่าจะกลับมาไหม"), "love")
    assert.equal(detectTopic("ควรลงทุนคริปโตไหม"), "money")
    assert.equal(detectTopic("จะหายป่วยไหม"), "health")
    assert.equal(detectTopic("ย้ายไปต่างประเทศดีไหม"), "travel")
    assert.equal(detectTopic("สอบติดไหม"), "study")
    assert.equal(detectTopic("อะไรก็ได้"), "general")
})

test("the subjects she must not decide are flagged", () => {
    assert.equal(detectGuardrail("แม่ป่วยเป็นมะเร็ง จะหายไหม"), "health")
    assert.equal(detectGuardrail("ควรกู้เงินมาลงทุนไหม"), "money")
    assert.equal(detectGuardrail("คดีนี้จะชนะไหม"), "legal")
    assert.equal(detectGuardrail("จะท้องปีนี้ไหม"), "pregnancy")
    assert.equal(detectGuardrail("ไม่อยากอยู่แล้ว"), "life")
    assert.equal(detectGuardrail("ควรลาออกไหม"), null)
})

test("a flagged question still gets routed, it is not refused", () => {
    const result = classifyQuestion("แม่ป่วยเป็นมะเร็ง จะหายไหม")
    assert.equal(result.kind, "reading")
    if (result.kind !== "reading") return
    assert.equal(result.intent, "OUTCOME")
    assert.equal(result.guardrail, "health")
})

test("questions about the product are left to the flows that answer them", () => {
    assert.equal(intentOf("ราคาเท่าไหร่"), "passthrough")
    assert.equal(intentOf("ดวงดาวหมดแล้วทำยังไง"), "passthrough")
    assert.equal(intentOf("How much is the subscription?"), "passthrough")
    assert.equal(intentOf("I want a refund"), "passthrough")
})

test("a one-word answer to her own question still routes", () => {
    // She asks "what is heaviest right now?" and offers Work / Someone / Both.
    assert.equal(intentOf("Work"), "OUTCOME")
    assert.equal(intentOf("งาน"), "OUTCOME")
    assert.equal(detectTopic("Work"), "career")
    // "Both" names no life area, and is still taken as a question to answer.
    assert.equal(intentOf("Both"), "OUTCOME")
})

test("the blank-cheque fortune question is a reading, not a shrug", () => {
    assert.equal(intentOf("What will my future be?"), "OUTCOME")
    assert.equal(intentOf("อนาคตฉันจะเป็นยังไง"), "OUTCOME")
    assert.equal(intentOf("ดูดวงให้หน่อย"), "OUTCOME")
    assert.equal(intentOf("tell me my fortune"), "OUTCOME")
    assert.equal(intentOf("what does my destiny hold"), "OUTCOME")
})

test("a question she has no pattern for is still a question", () => {
    // The patterns pick WHICH craft answers. They are not a list of the only
    // sentences she is allowed to hear.
    assert.equal(
        intentOf("Tomorrow I will go to the tech event, what would happen?"),
        "OUTCOME",
    )
    assert.equal(intentOf("I have an interview tomorrow"), "OUTCOME")
    assert.equal(intentOf("my landlord is raising the rent"), "OUTCOME")
    assert.equal(intentOf("she stopped replying"), "OUTCOME")
    assert.equal(intentOf("พรุ่งนี้ไปสัมภาษณ์งาน"), "OUTCOME")
    assert.equal(intentOf("แม่ไม่คุยกับหนูมาสามวันแล้ว"), "OUTCOME")
})

test("an event or an interview is work, so the reading goes to that house", () => {
    assert.equal(detectTopic("Tomorrow I go to the tech event"), "career")
    assert.equal(detectTopic("I have an interview tomorrow"), "career")
    assert.equal(detectTopic("พรุ่งนี้มีประชุมใหญ่"), "career")
})

test("only filler makes her ask back", () => {
    for (const filler of ["ok", "okay", "hmm", "อืม", "555", "hi", "สวัสดี", "?", "ครับ", "thanks"]) {
        assert.equal(intentOf(filler), "unsure", filler)
    }
    // Anything with something in it is taken, however oddly it is put.
    assert.equal(intentOf("idk about this whole thing"), "OUTCOME")
})

test("Thai has no word boundaries, so a short pattern must not swallow a word", () => {
    // ยา (medicine) sits inside อยาก (want), ยาก (hard) and พยาบาล (nurse);
    // reading any of those as a health question changes what she is allowed
    // to say. Each line below was a real misfire.
    assert.equal(detectGuardrail("อยากย้ายไปอยู่ญี่ปุ่น"), null)
    assert.equal(detectGuardrail("งานยากจัง ทำไม่ไหวแล้ว"), null)
    assert.equal(detectGuardrail("อยากรู้ว่าเขาคิดยังไงกับเรา"), null)
    // จะตาย is an intensifier — "starving", not a crisis.
    assert.equal(detectGuardrail("หิวจะตายแล้ว กินอะไรดี"), null)
    assert.equal(detectGuardrail("เหนื่อยจะตาย พรุ่งนี้ยังต้องไปทำงานอีก"), null)
    // ท้อง is also a stomach and a sky.
    assert.equal(detectGuardrail("ปวดท้องมาสองวันแล้ว"), null)
    assert.equal(detectGuardrail("ท้องฟ้าวันนี้สวยจัง"), null)
    // ศาลพระภูมิ is a spirit house, not a courtroom.
    assert.equal(detectGuardrail("ไหว้ศาลพระภูมิแล้วดีขึ้นไหม"), null)
})

test("the guardrails still catch what they are for", () => {
    assert.equal(detectGuardrail("ต้องกินยาไปตลอดชีวิตไหม"), "health")
    assert.equal(detectGuardrail("ไปรักษาตัวที่โรงพยาบาลมา"), "health")
    assert.equal(detectGuardrail("แม่ป่วยเป็นมะเร็ง จะหายไหม"), "health")
    assert.equal(detectGuardrail("ไม่อยากอยู่แล้ว"), "life")
    assert.equal(detectGuardrail("จะท้องปีนี้ไหม"), "pregnancy")
})

test("a topic is not stolen by a longer word that contains it", () => {
    // รัก opens รักษา, เลิก opens เลิกงาน, หมอ opens หมอดู, แม่ opens แม่หมอ.
    assert.equal(detectTopic("ไปรักษาตัวที่โรงพยาบาลมา"), "health")
    assert.equal(detectTopic("เลิกงานแล้วจะไปไหนดี"), "career")
    assert.equal(detectTopic("ขอถามหมอดูหน่อย"), "general")
    assert.equal(detectTopic("ปวดท้องมาสองวันแล้ว"), "health")
    assert.equal(detectTopic("อยากย้ายไปอยู่ญี่ปุ่น"), "travel")
    assert.equal(detectTopic("เปิดร้านกาแฟจะรุ่งไหม"), "career")
})

test("she hears the same question however it is phrased", () => {
    assert.equal(intentOf("ฉันเป็นคนยังไง"), "IDENTITY")
    assert.equal(intentOf("ฉันเป็นคนแบบไหน"), "IDENTITY")
    assert.equal(intentOf("ผมเป็นคนอย่างไร"), "IDENTITY")
})

test("a question with no fortune-telling word in it is still answered", () => {
    // The merit-making end of the range: nothing here names a chart, a date
    // or an outcome, and she must still take it rather than shrug.
    for (const q of [
        "ล้างส้วมในวัดแล้วได้อะไร",
        "ทำบุญแบบไหนได้บุญมากสุด",
        "ปล่อยปลาแล้วดวงจะดีขึ้นจริงไหม",
        "ถวายสังฆทานแล้วได้อะไร",
        "หมาหายไปเมื่อวาน",
        "เพื่อนยืมเงินไปแล้วเงียบ",
        "my landlord is raising the rent",
        "i feel stuck",
    ]) {
        assert.equal(intentOf(q), "OUTCOME", q)
    }
})
