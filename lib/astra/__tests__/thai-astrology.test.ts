import assert from "node:assert/strict"
import test from "node:test"
import {
    THAKSA_CYCLE_YEARS,
    ageInYears,
    birthDayStar,
    missingElement,
    rulingAgeStar,
    weekdayIndex,
} from "../thai-astrology.ts"

test("the eight planetary strengths make up one 108-year cycle", () => {
    assert.equal(THAKSA_CYCLE_YEARS, 108)
})

test("the birth-day star follows the weekday", () => {
    // 1995-03-14 was a Tuesday.
    assert.equal(weekdayIndex({ year: 1995, month: 3, day: 14 }), 2)
    assert.equal(birthDayStar({ year: 1995, month: 3, day: 14 }), "mars")
})

test("a Wednesday birth after dusk belongs to Rahu", () => {
    const wednesday = { year: 1995, month: 3, day: 15 }
    assert.equal(birthDayStar(wednesday), "mercury")
    assert.equal(birthDayStar(wednesday, { hour: 9 }), "mercury")
    assert.equal(birthDayStar(wednesday, { hour: 21 }), "rahu")
    assert.equal(birthDayStar(wednesday, { hour: 2 }), "rahu")
})

test("the age is consumed by each star in turn, starting at the birth-day star", () => {
    // Sun-born: Sun rules the first 6 years, then the Moon for 15.
    assert.deepEqual(rulingAgeStar("sun", 3), {
        star: "sun",
        fromAge: 0,
        toAge: 6,
        cycle: 0,
    })
    assert.deepEqual(rulingAgeStar("sun", 6), {
        star: "moon",
        fromAge: 6,
        toAge: 21,
        cycle: 0,
    })
    assert.equal(rulingAgeStar("sun", 20).star, "moon")
    assert.equal(rulingAgeStar("sun", 21).star, "mars")
})

test("the cycle repeats after 108 years", () => {
    const first = rulingAgeStar("mars", 4)
    const second = rulingAgeStar("mars", 4 + THAKSA_CYCLE_YEARS)
    assert.equal(second.star, first.star)
    assert.equal(second.cycle, 1)
    assert.equal(second.fromAge, first.fromAge + THAKSA_CYCLE_YEARS)
})

test("age counts whole years and never goes negative", () => {
    const birth = { year: 2000, month: 6, day: 15 }
    assert.equal(ageInYears(birth, new Date("2024-06-14T00:00:00Z")), 23)
    assert.equal(ageInYears(birth, new Date("2024-06-15T00:00:00Z")), 24)
    assert.equal(ageInYears(birth, new Date("1999-01-01T00:00:00Z")), 0)
})

test("the thinnest element is the one that is missing", () => {
    assert.equal(
        missingElement(["Aries", "Leo", "Taurus", "Virgo", "Gemini"]),
        "water",
    )
    // Evenly spread placements leave nothing to point at.
    assert.equal(missingElement(["Aries", "Taurus", "Gemini", "Cancer"]), null)
    assert.equal(missingElement([]), null)
})
