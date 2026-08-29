import assert from "node:assert/strict"
import test from "node:test"
import { proofRows, type ProofPart } from "../proof.ts"
import type { AstraReadingSource } from "../reading-contract.ts"

/**
 * The fixtures below are real output from `lib/astra/readings.ts` for a chart
 * born 12 Mar 1995, 07:20, Bangkok, asked on 29 Aug 2026 — not values invented
 * for a test. If the engines change shape, these break, which is the point.
 */

function sourceOf(
    intent: AstraReadingSource["intent"],
    values: Record<string, unknown>,
): AstraReadingSource {
    return {
        intent,
        topic: "career",
        answerId: "4826e726",
        seed: "device:abc|question|2026-08-29",
        computedAtIso: "2026-08-29T13:00:00.000Z",
        label: "chart of the moment asked",
        values,
    }
}

const IDENTITY_VALUES = {
    lagnaSign: "Pisces",
    lagnaDegree: 11.921,
    sunSign: "Aquarius",
    moonSign: "Gemini",
    dayStar: "sun",
    ageStar: "mercury",
    ageFrom: 29,
    ageTo: 46,
    age: 31,
    missingElement: "fire",
    ayanamsa: 23.789917,
}

const PRASNA_VALUES = {
    askedAtIso: "2026-08-29T13:00:00.000Z",
    watch: { index: 2, star: "mars", isNight: true, dayStar: "saturn" },
    lagnaSign: "Pisces",
    lagnaDegree: 9.7347,
    house: 10,
    houseSign: "Sagittarius",
    houseLord: "Jupiter",
    lordSign: "Cancer",
    lordHouse: 5,
    lordRetrograde: false,
    contacts: [{ planet: "Saturn", aspect: "trine", orb: 0.63 }],
    ayanamsa: 24.229504,
}

const TIMING_VALUES = {
    significator: "Venus",
    natalSign: "Capricorn",
    window: {
        startIso: "2026-09-17T13:00:00.000Z",
        peakIso: "2026-10-06T13:00:00.000Z",
        endIso: "2026-10-25T13:00:00.000Z",
        transitPlanet: "Saturn",
        aspect: "sextile",
    },
    searchedDays: 240,
}

const AUSPICIOUS_VALUES = {
    purpose: "opening",
    kalakini: "venus",
    days: [
        {
            dateIso: "2026-08-30",
            nakshatra: 25,
            ruek: "racha",
            weekdayStar: "sun",
            isKalakiniDay: false,
            score: 3,
        },
        {
            dateIso: "2026-09-02",
            nakshatra: 1,
            ruek: "mahattano",
            weekdayStar: "mercury",
            isKalakiniDay: false,
            score: 3,
        },
    ],
    searchedDays: 45,
}

function labels(source: AstraReadingSource): string[] {
    return proofRows(source).map((row) => row.labelKey)
}

function rowFor(source: AstraReadingSource, labelKey: string): ProofPart[] {
    const row = proofRows(source).find((r) => r.labelKey === labelKey)
    assert.ok(row, `no row for ${labelKey}`)
    return row.parts
}

test("the birth chart shows what it was read from", () => {
    const source = sourceOf("IDENTITY", IDENTITY_VALUES)
    assert.deepEqual(labels(source), [
        "lagna",
        "sun",
        "moon",
        "dayStar",
        "ageStar",
        "missingElement",
        "ayanamsa",
    ])
    assert.deepEqual(rowFor(source, "lagna"), [
        { t: "sign", v: "Pisces" },
        { t: "degree", v: 11.9 },
    ])
    assert.deepEqual(rowFor(source, "ageStar"), [
        { t: "star", v: "mercury" },
        { t: "raw", v: "29–46" },
    ])
})

test("no birth time is itself part of the proof, not a blank", () => {
    const source = sourceOf("IDENTITY", {
        ...IDENTITY_VALUES,
        lagnaSign: null,
        lagnaDegree: null,
    })
    assert.deepEqual(rowFor(source, "lagna"), [{ t: "term", v: "noBirthTime" }])
})

test("an evenly spread chart says so instead of naming an element", () => {
    const source = sourceOf("IDENTITY", {
        ...IDENTITY_VALUES,
        missingElement: null,
    })
    assert.deepEqual(rowFor(source, "missingElement"), [
        { t: "term", v: "evenlySpread" },
    ])
})

test("the chart of the moment shows the watch, the house and its lord", () => {
    const source = sourceOf("OUTCOME", PRASNA_VALUES)
    assert.deepEqual(labels(source), [
        "askedAt",
        "watch",
        "lagnaAsked",
        "house",
        "houseLord",
        "contacts",
        "ayanamsa",
    ])
    assert.deepEqual(rowFor(source, "watch"), [
        { t: "term", v: "night" },
        { t: "raw", v: "2/8" },
        { t: "star", v: "mars" },
    ])
    assert.deepEqual(rowFor(source, "contacts"), [
        { t: "planet", v: "Saturn" },
        { t: "aspect", v: "trine" },
        { t: "degree", v: 0.6 },
    ])
})

test("a retrograde lord is flagged, and only when it is one", () => {
    const direct = sourceOf("OUTCOME", PRASNA_VALUES)
    assert.ok(
        !rowFor(direct, "houseLord").some((p) => p.v === "retrograde"),
        "a direct lord must not be flagged",
    )
    const retro = sourceOf("OUTCOME", {
        ...PRASNA_VALUES,
        lordRetrograde: true,
    })
    assert.deepEqual(rowFor(retro, "houseLord").at(-1), {
        t: "term",
        v: "retrograde",
    })
})

test("nothing within orb is shown as a finding, not an empty row", () => {
    const source = sourceOf("OUTCOME", { ...PRASNA_VALUES, contacts: [] })
    assert.deepEqual(rowFor(source, "contacts"), [{ t: "term", v: "noContacts" }])
})

test("the transits show the contact and the window it covers", () => {
    const source = sourceOf("TIMING", TIMING_VALUES)
    assert.deepEqual(labels(source), [
        "significator",
        "transit",
        "window",
        "peak",
        "searched",
    ])
    assert.deepEqual(rowFor(source, "transit"), [
        { t: "planet", v: "Saturn" },
        { t: "aspect", v: "sextile" },
        { t: "planet", v: "Venus" },
    ])
    assert.deepEqual(rowFor(source, "window"), [
        { t: "date", v: "2026-09-17T13:00:00.000Z" },
        { t: "date", v: "2026-10-25T13:00:00.000Z" },
    ])
})

test("a search that found no window says how far it looked", () => {
    const source = sourceOf("TIMING", { ...TIMING_VALUES, window: null })
    assert.deepEqual(labels(source), ["significator", "window", "searched"])
    assert.deepEqual(rowFor(source, "window"), [{ t: "term", v: "noWindow" }])
    assert.deepEqual(rowFor(source, "searched"), [{ t: "raw", v: "240" }])
})

test("the almanac shows every day it shortlisted, not just the winner", () => {
    const source = sourceOf("AUSPICIOUS_DATE", AUSPICIOUS_VALUES)
    assert.deepEqual(labels(source), [
        "purpose",
        "kalakini",
        "day",
        "day",
        "searched",
    ])
    assert.deepEqual(proofRows(source)[2].parts, [
        { t: "date", v: "2026-08-30" },
        { t: "ruek", v: "racha" },
        { t: "star", v: "sun" },
    ])
})

test("an almanac search with no favourable day still explains itself", () => {
    const source = sourceOf("AUSPICIOUS_DATE", {
        ...AUSPICIOUS_VALUES,
        days: [],
    })
    assert.deepEqual(rowFor(source, "days"), [{ t: "term", v: "noDays" }])
    assert.deepEqual(rowFor(source, "searched"), [{ t: "raw", v: "45" }])
})

test("a malformed basis closes the sheet, it never takes the reading down", () => {
    assert.deepEqual(proofRows(sourceOf("OUTCOME", {})), [])
    assert.deepEqual(proofRows(sourceOf("TIMING", {})), [])
})
