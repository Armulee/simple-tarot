import assert from "node:assert/strict"
import test from "node:test"
import { matchMentionedAspectEvents } from "../aspect-mention.ts"

const EVENTS = [
    {
        aspectKey: "saturn-square-mercury",
        transitPlanet: "Saturn",
        natalPlanet: "Mercury",
    },
    {
        aspectKey: "mars-trine-venus",
        transitPlanet: "Mars",
        natalPlanet: "Venus",
    },
    {
        aspectKey: "pluto-sextile-mars",
        transitPlanet: "Pluto",
        natalPlanet: "Mars",
    },
    {
        aspectKey: "jupiter-conjunct-sun",
        transitPlanet: "Jupiter",
        natalPlanet: "Sun",
    },
]

test("matches the Thai contacts the paragraph names (pair match)", () => {
    const text =
        "ช่วงสิ้นเดือนดาวเสาร์กำลังกดดาวพุธในดวงกำเนิดของคุณ ส่วนกลางกันยายนดาวอังคารเชื่อมกับดาวศุกร์แบบลื่นไหล"
    const matched = matchMentionedAspectEvents(text, EVENTS)
    assert.deepEqual(
        matched.map((event) => event.aspectKey),
        ["saturn-square-mercury", "mars-trine-venus"],
    )
})

test("matches English planet names on word boundaries", () => {
    const text =
        "Late June has Saturn pressing your natal Mercury, while mid-September flows with Jupiter easing your Sun."
    const matched = matchMentionedAspectEvents(text, EVENTS)
    assert.deepEqual(
        matched.map((event) => event.aspectKey),
        ["saturn-square-mercury", "jupiter-conjunct-sun"],
    )
})

test("Thai weekday words never count as planets", () => {
    // วันเสาร์ (Saturday), วันศุกร์ (Friday), อาทิตย์หน้า (next week) — none
    // carry the ดาว/ดวง planet prefix, so nothing should match.
    const text = "วันเสาร์นี้หรือวันศุกร์หน้า รออีกอาทิตย์หนึ่งก่อนค่อยตัดสินใจ"
    assert.deepEqual(matchMentionedAspectEvents(text, EVENTS), [])
})

test("'Sunday' does not match the Sun", () => {
    const text = "Wait until Sunday before you decide anything."
    assert.deepEqual(matchMentionedAspectEvents(text, EVENTS), [])
})

test("falls back to transit-planet mention when no full pair is named", () => {
    const text = "พลังของดาวพลูโตช่วงนั้นหนุนเรื่องการเปลี่ยนแปลงใหญ่"
    const matched = matchMentionedAspectEvents(text, EVENTS)
    assert.deepEqual(
        matched.map((event) => event.aspectKey),
        ["pluto-sextile-mars"],
    )
})

test("caps the number of cards and dedupes by aspectKey", () => {
    const text =
        "Saturn touches your Mercury, Mars meets Venus, Pluto stirs Mars, and Jupiter warms your Sun."
    const matched = matchMentionedAspectEvents(
        text,
        [...EVENTS, ...EVENTS],
        3,
    )
    assert.equal(matched.length, 3)
    assert.equal(
        new Set(matched.map((event) => event.aspectKey)).size,
        matched.length,
    )
})

test("empty text or events yields no cards", () => {
    assert.deepEqual(matchMentionedAspectEvents("", EVENTS), [])
    assert.deepEqual(matchMentionedAspectEvents("ดาวเสาร์", []), [])
})
