import assert from "node:assert/strict"
import test from "node:test"
import {
    buildPersonalizedTransitAspects,
    buildNatalLongitudes,
    buildTransitLongitudesFromSwissPlanets,
    computeRangeTransitAspects,
    mergeAspectKeywordsIntoAspects,
    type PersonalizedTransitAspectsResult,
} from "../transit-aspects"
import type { EphemerisCodexRow } from "../ephemeris-codex"

function makeRow(
    date: string,
    sunLong: number,
    opts?: { jupiterLong?: number; rahuLong?: number | null }
): EphemerisCodexRow {
    return {
        date,
        ayanamsa_lahiri: null,
        is_retrograde: {},
        sun_long: sunLong,
        moon_long: 200,
        mercury_long: 200,
        venus_long: 200,
        mars_long: 200,
        jupiter_long: opts?.jupiterLong ?? 200,
        saturn_long: 200,
        uranus_long: 200,
        neptune_long: 200,
        pluto_long: 200,
        chiron_long: null,
        lilith_long: null,
        selena_long: null,
        true_node_long: opts?.rahuLong ?? null,
        ceres_long: null,
        pallas_long: null,
        juno_long: null,
        vesta_long: null,
    }
}

function getExact(result: PersonalizedTransitAspectsResult) {
    return result.exact?.events ?? []
}

test("exact aspects include orb boundary (±5) and exclude outside boundary", () => {
    const within = buildPersonalizedTransitAspects({
        questionRange: {
            source: "explicit",
            startDateIso: "2026-03-01",
            endDateIso: "2026-03-02",
        },
        natalLongitudes: { Sun: 0 },
        codexRows: [makeRow("2026-03-01", 5)],
    })
    const outside = buildPersonalizedTransitAspects({
        questionRange: {
            source: "explicit",
            startDateIso: "2026-03-01",
            endDateIso: "2026-03-02",
        },
        natalLongitudes: { Sun: 0 },
        codexRows: [makeRow("2026-03-01", 5.1)],
    })

    assert.equal(
        getExact(within).some(
            (event) =>
                event.transitPlanet === "Sun" &&
                event.natalPlanet === "Sun" &&
                event.aspectType === "conjunction"
        ),
        true
    )
    assert.equal(
        getExact(outside).some(
            (event) =>
                event.transitPlanet === "Sun" &&
                event.natalPlanet === "Sun" &&
                event.aspectType === "conjunction"
        ),
        false
    )
})

test("range aspects split windows and track start/peak/end dates", () => {
    const range = computeRangeTransitAspects({
        startDateIso: "2026-03-01",
        endDateIso: "2026-03-05",
        natalLongitudes: { Sun: 0 },
        codexRows: [
            makeRow("2026-03-01", 4),
            makeRow("2026-03-02", 2),
            makeRow("2026-03-03", 6),
            makeRow("2026-03-04", 5),
        ],
    })
    const sunWindows =
        range?.events.filter(
            (event) =>
                event.transitPlanet === "Sun" &&
                event.natalPlanet === "Sun" &&
                event.aspectType === "conjunction"
        ) ?? []

    assert.equal(sunWindows.length, 2)
    assert.equal(sunWindows[0].startDateIso, "2026-03-01")
    assert.equal(sunWindows[0].peakDateIso, "2026-03-02")
    assert.equal(sunWindows[0].endDateIso, "2026-03-02")
    assert.equal(sunWindows[1].startDateIso, "2026-03-04")
    assert.equal(sunWindows[1].peakDateIso, "2026-03-04")
    assert.equal(sunWindows[1].endDateIso, "2026-03-04")
})

test("exact aspects can use fallback transit longitudes when codex row is missing", () => {
    const result = buildPersonalizedTransitAspects({
        questionRange: {
            source: "explicit",
            startDateIso: "2026-03-01",
            endDateIso: "2026-03-02",
        },
        natalLongitudes: { Sun: 0 },
        codexRows: [],
        fallbackExactTransitLongitudes: { Sun: 3 },
    })
    const hasSunConjunction =
        result.exact?.events.some(
            (event) =>
                event.transitPlanet === "Sun" &&
                event.natalPlanet === "Sun" &&
                event.aspectType === "conjunction"
        ) ?? false
    assert.equal(hasSunConjunction, true)
})

test("recomputes absolute longitude from sign index and degree", () => {
    const natal = buildNatalLongitudes({
        Sun: { sign: "Aries", degree: 15.5, longitude: 999 },
        Moon: { sign: "Pisces", degree: 29.5 },
    })
    const transit = buildTransitLongitudesFromSwissPlanets({
        Sun: { sign: "Taurus", degree: 10 },
        Moon: { sign: "เมถุน", degree: 5 },
    })

    assert.equal(natal.Sun, 15.5)
    assert.equal(natal.Moon, 359.5)
    assert.equal(transit.Sun, 40)
    assert.equal(transit.Moon, 65)
})

test("builds display position text for transit and natal", () => {
    const result = buildPersonalizedTransitAspects({
        questionRange: {
            source: "explicit",
            startDateIso: "2026-03-01",
            endDateIso: "2026-03-02",
        },
        natalLongitudes: { Moon: 314.8 },
        codexRows: [makeRow("2026-03-01", 200, { rahuLong: 314.9 })],
    })
    const rahuMoon = result.exact?.events.find(
        (event) => event.transitPlanet === "Rahu" && event.natalPlanet === "Moon"
    )
    assert.equal(Boolean(rahuMoon), true)
    assert.equal(rahuMoon?.transitPositionText, "Aquarius · 14.9°")
    assert.equal(rahuMoon?.natalPositionText, "Aquarius · 14.8°")
})

test("merges AI aspect keywords into computed events by aspectKey", () => {
    const base = buildPersonalizedTransitAspects({
        questionRange: {
            source: "explicit",
            startDateIso: "2026-03-01",
            endDateIso: "2026-03-02",
        },
        natalLongitudes: { Sun: 0 },
        codexRows: [makeRow("2026-03-01", 2)],
    })
    const exactEvent = base.exact?.events[0]
    assert.ok(exactEvent?.aspectKey)

    const merged = mergeAspectKeywordsIntoAspects(base, [
        {
            aspectKey: exactEvent!.aspectKey,
            keyword: "timing boost",
            sentiment: "good",
            insight: "This is a favorable opening.",
        },
    ])
    assert.equal(merged.exact?.events[0]?.keyword, "timing boost")
    assert.equal(merged.exact?.events[0]?.sentiment, "good")
})

test("classifies slow planets as main events and daily planets as minor", () => {
    const result = buildPersonalizedTransitAspects({
        questionRange: {
            source: "explicit",
            startDateIso: "2026-03-01",
            endDateIso: "2026-03-02",
        },
        natalLongitudes: { Jupiter: 0, Sun: 0 },
        codexRows: [makeRow("2026-03-01", 0, { jupiterLong: 0 })],
    })

    const jupiterEvent = result.exact?.events.find(
        (event) =>
            event.transitPlanet === "Jupiter" && event.natalPlanet === "Jupiter"
    )
    const sunEvent = result.exact?.events.find(
        (event) => event.transitPlanet === "Sun" && event.natalPlanet === "Sun"
    )

    assert.equal(jupiterEvent?.tier, "main")
    assert.equal(sunEvent?.tier, "minor")
    assert.equal((jupiterEvent?.priorityScore ?? 9999) < (sunEvent?.priorityScore ?? 0), true)
})

test("includes Rahu events from codex true_node_long", () => {
    const result = buildPersonalizedTransitAspects({
        questionRange: {
            source: "explicit",
            startDateIso: "2026-03-01",
            endDateIso: "2026-03-02",
        },
        natalLongitudes: { Rahu: 30 },
        codexRows: [makeRow("2026-03-01", 200, { rahuLong: 30 })],
    })
    const rahuEvent = result.exact?.events.find(
        (event) => event.transitPlanet === "Rahu" && event.natalPlanet === "Rahu"
    )

    assert.equal(Boolean(rahuEvent), true)
    assert.equal(rahuEvent?.tier, "main")
})
