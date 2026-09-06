import assert from "node:assert/strict"
import test from "node:test"
import { readingStrength } from "../confidence.ts"

/** The shape `readPrasna` returns, with only the fields the scoring reads. */
function prasna(
    contacts: { planet: string; aspect: string; orb: number }[],
    lordRetrograde = false,
) {
    return { contacts, lordRetrograde }
}

test("one tight helping contact on a lord going forward is a firm yes", () => {
    assert.equal(
        readingStrength("OUTCOME", prasna([
            { planet: "Jupiter", aspect: "trine", orb: 0.4 },
        ])),
        "strong",
    )
})

test("one tight hard contact from a malefic is just as firm the other way", () => {
    assert.equal(
        readingStrength("OUTCOME", prasna([
            { planet: "Saturn", aspect: "square", orb: 0.6 },
        ])),
        "strong",
    )
})

test("contacts pulling opposite ways is a split picture, not a weak one", () => {
    assert.equal(
        readingStrength("OUTCOME", prasna([
            { planet: "Jupiter", aspect: "trine", orb: 0.5 },
            { planet: "Saturn", aspect: "square", orb: 0.8 },
        ])),
        "mixed",
    )
})

test("help arriving on a lord that is walking backward is also split", () => {
    assert.equal(
        readingStrength("OUTCOME", prasna(
            [{ planet: "Venus", aspect: "sextile", orb: 0.3 }],
            true,
        )),
        "mixed",
    )
})

test("a wide contact is barely a contact, so it does not carry a verdict", () => {
    assert.equal(
        readingStrength("OUTCOME", prasna([
            { planet: "Mercury", aspect: "sextile", orb: 2.9 },
        ])),
        "quiet",
    )
})

test("nothing touching the lord is a finding, not a faint yes", () => {
    assert.equal(readingStrength("OUTCOME", prasna([])), "quiet")
    // Unless the lord is held back, which is itself something to say.
    assert.equal(readingStrength("OUTCOME", prasna([], true)), "mixed")
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

test("no transit inside the search window is quiet, and must stay quiet", () => {
    assert.equal(readingStrength("TIMING", { window: null }), "quiet")
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
    assert.equal(readingStrength("AUSPICIOUS_DATE", { days: [] }), "quiet")
})

test("a birth chart describes rather than forecasts, so it never goes quiet", () => {
    assert.equal(readingStrength("IDENTITY", { dayStar: "sun" }), "strong")
})

test("a missing basis is quiet, never a confident guess", () => {
    assert.equal(readingStrength("OUTCOME", null), "quiet")
    assert.equal(readingStrength("TIMING", undefined), "quiet")
})
