import assert from "node:assert/strict"
import test from "node:test"
import { readingStrength } from "../confidence.ts"

/** The shape `readPrasna` returns, with only the fields the scoring reads. */
function prasna(over: Record<string, unknown> = {}) {
    return {
        lordHouse: 10,
        lordRetrograde: false,
        houseLord: "Jupiter",
        watch: { star: "venus" },
        contacts: [] as { planet: string; aspect: string; orb: number }[],
        ...over,
    }
}

test("a lord in an angular house is moving, with or without an aspect", () => {
    // An aspect inside 3° is simply absent about half the time. Reading only
    // aspects made 61% of every reading come back "nothing is moving", which
    // was a fact about this function and not about anyone's life.
    assert.equal(readingStrength("OUTCOME", prasna({ lordHouse: 1 })), "strong")
    assert.equal(readingStrength("OUTCOME", prasna({ lordHouse: 10 })), "strong")
})

test("a chart of a moment is never empty, so it never comes back quiet", () => {
    for (const lordHouse of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
        for (const lordRetrograde of [true, false]) {
            const strength = readingStrength(
                "OUTCOME",
                prasna({ lordHouse, lordRetrograde }),
            )
            assert.notEqual(
                strength,
                "quiet",
                `house ${lordHouse}${lordRetrograde ? " retrograde" : ""}`,
            )
        }
    }
})

test("a lord undone in the twelfth, walking backward, is a firm no", () => {
    assert.equal(
        readingStrength("OUTCOME", prasna({ lordHouse: 12, lordRetrograde: true })),
        "strong",
    )
})

test("help arriving on a lord that is held back is a split picture", () => {
    assert.equal(
        readingStrength("OUTCOME", prasna({
            lordHouse: 10,
            lordRetrograde: true,
            contacts: [{ planet: "Venus", aspect: "sextile", orb: 0.3 }],
        })),
        "mixed",
    )
})

test("contacts pulling opposite ways on a strong lord is still split", () => {
    assert.equal(
        readingStrength("OUTCOME", prasna({
            lordHouse: 6,
            contacts: [
                { planet: "Jupiter", aspect: "trine", orb: 0.5 },
                { planet: "Saturn", aspect: "square", orb: 0.4 },
            ],
        })),
        "mixed",
    )
})

test("the hour ruling the question agreeing with the lord adds to it", () => {
    const apart = readingStrength("OUTCOME", prasna({
        lordHouse: 3,
        houseLord: "Jupiter",
        watch: { star: "venus" },
    }))
    const together = readingStrength("OUTCOME", prasna({
        lordHouse: 3,
        houseLord: "Jupiter",
        watch: { star: "jupiter" },
    }))
    // Cadent alone is a soft no; the hour agreeing with the matter splits it.
    assert.equal(apart, "mixed")
    assert.equal(together, "mixed")
})

test("a transit window that was found is strong; a wide one is a season", () => {
    assert.equal(
        readingStrength("TIMING", {
            window: {
                startIso: "2026-09-17T00:00:00.000Z",
                endIso: "2026-10-25T00:00:00.000Z",
            },
        }),
        "strong",
    )
    assert.equal(
        readingStrength("TIMING", {
            window: {
                startIso: "2026-09-17T00:00:00.000Z",
                endIso: "2027-03-01T00:00:00.000Z",
            },
        }),
        "mixed",
    )
})

test("an empty search is the one honest quiet, and it stays quiet", () => {
    assert.equal(readingStrength("TIMING", { window: null }), "quiet")
    assert.equal(readingStrength("AUSPICIOUS_DATE", { days: [] }), "quiet")
})

test("the almanac is strong when it actually favours a day", () => {
    assert.equal(
        readingStrength("AUSPICIOUS_DATE", { days: [{ score: 3 }] }),
        "strong",
    )
    assert.equal(
        readingStrength("AUSPICIOUS_DATE", { days: [{ score: 1 }] }),
        "mixed",
    )
})

test("a birth chart describes rather than forecasts, so it never weakens", () => {
    assert.equal(readingStrength("IDENTITY", { dayStar: "sun" }), "strong")
})

test("a missing basis hedges rather than declaring the sky empty", () => {
    assert.equal(readingStrength("OUTCOME", null), "mixed")
    assert.equal(readingStrength("TIMING", undefined), "mixed")
})
