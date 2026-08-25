import assert from "node:assert/strict"
import test from "node:test"
import {
    THAKSA_CYCLE_YEARS,
    ageInYears,
    birthDayStar,
    kalakiniStar,
    missingElement,
    nakshatraIndex,
    ruekOfNakshatra,
    rulingAgeStar,
    watchAtTime,
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

test("กาลกิณี is the eighth star of the round", () => {
    // Sun-born: Sun, Moon, Mars, Mercury, Saturn, Jupiter, Rahu, Venus.
    assert.equal(kalakiniStar("sun"), "venus")
    assert.equal(kalakiniStar("moon"), "sun")
})

test("the day's watches open on the weekday's own star", () => {
    // 1995-03-14 was a Tuesday, so Mars rules it.
    const morning = watchAtTime({
        year: 1995,
        month: 3,
        day: 14,
        hour: 6,
        minute: 30,
    })
    assert.equal(morning.star, "mars")
    assert.equal(morning.index, 1)
    assert.equal(morning.isNight, false)

    // Two watches on: Mars → Mercury → Saturn.
    const later = watchAtTime({
        year: 1995,
        month: 3,
        day: 14,
        hour: 9,
        minute: 15,
    })
    assert.equal(later.index, 3)
    assert.equal(later.star, "saturn")
})

test("after midnight still belongs to the night before", () => {
    const afterMidnight = watchAtTime({
        year: 1995,
        month: 3,
        day: 15,
        hour: 1,
        minute: 0,
    })
    assert.equal(afterMidnight.isNight, true)
    // Reckoned under Tuesday, not Wednesday.
    assert.equal(afterMidnight.dayStar, "mars")
    // The night's fifth watch runs 00:00–01:30.
    assert.equal(afterMidnight.index, 5)
})

test("the mansions cycle through nine ฤกษ์", () => {
    assert.equal(nakshatraIndex(0), 0)
    assert.equal(nakshatraIndex(13.4), 1)
    assert.equal(nakshatraIndex(359.9), 26)
    assert.equal(ruekOfNakshatra(0), "thalitho")
    assert.equal(ruekOfNakshatra(6), "phetchakhat")
    assert.equal(ruekOfNakshatra(9), "thalitho")
    assert.equal(ruekOfNakshatra(26), "samano")
})
