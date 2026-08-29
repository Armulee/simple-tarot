import type { AstraIntent } from "@/lib/astra/intent"
import type { AstraReadingSource } from "@/lib/astra/reading-contract"

/**
 * What the answer was computed from, turned into rows a person can read.
 *
 * This is the layer that makes "she used the stars" checkable instead of
 * claimed: every row here is a value an engine in `lib/astra/readings.ts`
 * produced before a single word was written. Nothing is invented here — this
 * file only rearranges what the engine already returned.
 *
 * It carries no wording of its own. A row names a label key and a list of
 * parts; the sheet translates both, so every string a person sees still lives
 * in the locale files.
 */

/** One piece of a row's value, tagged with how to render it. */
export type ProofPart =
    /** Already display-ready: a number, an id, a count. */
    | { t: "raw"; v: string }
    /** Canonical English planet name, as the swisseph layer produces it. */
    | { t: "planet"; v: string }
    | { t: "sign"; v: string }
    /** ทักษา star, lowercase, as `thai-astrology.ts` produces it. */
    | { t: "star"; v: string }
    | { t: "ruek"; v: string }
    | { t: "element"; v: string }
    | { t: "aspect"; v: string }
    /** ISO date — the sheet formats it in the viewer's locale. */
    | { t: "date"; v: string }
    | { t: "dateTime"; v: string }
    /** A degree within a sign, e.g. 12.4°. */
    | { t: "degree"; v: number }
    /** A label key with no value of its own, e.g. "retrograde", "none". */
    | { t: "term"; v: string }

export type ProofRow = {
    /** Key under `Astra.proof.row.*`. */
    labelKey: string
    parts: ProofPart[]
}

function raw(v: string | number): ProofPart {
    return { t: "raw", v: String(v) }
}

/** Rounded the way an astrologer would quote it, not the way a float prints. */
function degree(value: number): ProofPart {
    return { t: "degree", v: Math.round(value * 10) / 10 }
}

type Values = Record<string, never>

function identityRows(v: Values): ProofRow[] {
    const rows: ProofRow[] = []
    // With no birth time there is no ascendant, and saying so is part of the
    // proof: it is why she did not name one.
    rows.push({
        labelKey: "lagna",
        parts:
            v.lagnaSign == null
                ? [{ t: "term", v: "noBirthTime" }]
                : [{ t: "sign", v: v.lagnaSign }, degree(Number(v.lagnaDegree))],
    })
    rows.push({ labelKey: "sun", parts: [{ t: "sign", v: v.sunSign }] })
    rows.push({ labelKey: "moon", parts: [{ t: "sign", v: v.moonSign }] })
    rows.push({ labelKey: "dayStar", parts: [{ t: "star", v: v.dayStar }] })
    rows.push({
        labelKey: "ageStar",
        parts: [
            { t: "star", v: v.ageStar },
            raw(`${v.ageFrom}–${v.ageTo}`),
        ],
    })
    rows.push({
        labelKey: "missingElement",
        parts:
            v.missingElement == null
                ? [{ t: "term", v: "evenlySpread" }]
                : [{ t: "element", v: v.missingElement }],
    })
    rows.push({ labelKey: "ayanamsa", parts: [degree(Number(v.ayanamsa))] })
    return rows
}

function prasnaRows(v: Values): ProofRow[] {
    const watch = v.watch as unknown as {
        index: number
        star: string
        isNight: boolean
        dayStar: string
    }
    const contacts = (v.contacts ?? []) as unknown as {
        planet: string
        aspect: string
        orb: number
    }[]
    return [
        { labelKey: "askedAt", parts: [{ t: "dateTime", v: v.askedAtIso }] },
        {
            labelKey: "watch",
            parts: [
                { t: "term", v: watch.isNight ? "night" : "day" },
                raw(`${watch.index}/8`),
                { t: "star", v: watch.star },
            ],
        },
        {
            labelKey: "lagnaAsked",
            parts: [
                { t: "sign", v: v.lagnaSign },
                degree(Number(v.lagnaDegree)),
            ],
        },
        {
            labelKey: "house",
            parts: [raw(Number(v.house)), { t: "sign", v: v.houseSign }],
        },
        {
            labelKey: "houseLord",
            parts: [
                { t: "planet", v: v.houseLord },
                { t: "sign", v: v.lordSign },
                raw(Number(v.lordHouse)),
                ...(v.lordRetrograde
                    ? [{ t: "term", v: "retrograde" } as ProofPart]
                    : []),
            ],
        },
        {
            labelKey: "contacts",
            parts:
                contacts.length === 0
                    ? [{ t: "term", v: "noContacts" }]
                    : contacts.flatMap((c) => [
                          { t: "planet", v: c.planet } as ProofPart,
                          { t: "aspect", v: c.aspect } as ProofPart,
                          degree(c.orb),
                      ]),
        },
        { labelKey: "ayanamsa", parts: [degree(Number(v.ayanamsa))] },
    ]
}

function timingRows(v: Values): ProofRow[] {
    const window = v.window as unknown as {
        startIso: string
        peakIso: string
        endIso: string
        transitPlanet: string
        aspect: string
    } | null
    const rows: ProofRow[] = [
        {
            labelKey: "significator",
            parts: [
                { t: "planet", v: v.significator },
                { t: "sign", v: v.natalSign },
            ],
        },
    ]
    if (!window) {
        // A search that found nothing is a result, and the sheet says so
        // rather than leaving the row blank.
        rows.push({ labelKey: "window", parts: [{ t: "term", v: "noWindow" }] })
        rows.push({ labelKey: "searched", parts: [raw(Number(v.searchedDays))] })
        return rows
    }
    rows.push({
        labelKey: "transit",
        parts: [
            { t: "planet", v: window.transitPlanet },
            { t: "aspect", v: window.aspect },
            { t: "planet", v: v.significator },
        ],
    })
    rows.push({
        labelKey: "window",
        parts: [
            { t: "date", v: window.startIso },
            { t: "date", v: window.endIso },
        ],
    })
    rows.push({ labelKey: "peak", parts: [{ t: "date", v: window.peakIso }] })
    rows.push({ labelKey: "searched", parts: [raw(Number(v.searchedDays))] })
    return rows
}

function auspiciousRows(v: Values): ProofRow[] {
    const days = (v.days ?? []) as unknown as {
        dateIso: string
        ruek: string
        weekdayStar: string
        isKalakiniDay: boolean
    }[]
    const rows: ProofRow[] = [
        { labelKey: "purpose", parts: [{ t: "term", v: `purpose.${v.purpose}` }] },
        { labelKey: "kalakini", parts: [{ t: "star", v: v.kalakini }] },
    ]
    if (days.length === 0) {
        rows.push({ labelKey: "days", parts: [{ t: "term", v: "noDays" }] })
        rows.push({ labelKey: "searched", parts: [raw(Number(v.searchedDays))] })
        return rows
    }
    // One row per candidate day: the almanac's shortlist, not just its winner.
    for (const day of days) {
        rows.push({
            labelKey: "day",
            parts: [
                { t: "date", v: day.dateIso },
                { t: "ruek", v: day.ruek },
                { t: "star", v: day.weekdayStar },
            ],
        })
    }
    rows.push({ labelKey: "searched", parts: [raw(Number(v.searchedDays))] })
    return rows
}

const BY_INTENT: Record<AstraIntent, (v: Values) => ProofRow[]> = {
    IDENTITY: identityRows,
    OUTCOME: prasnaRows,
    TIMING: timingRows,
    AUSPICIOUS_DATE: auspiciousRows,
}

/**
 * A value every reading of that craft has. Its absence means the basis is not
 * what it claims to be — an old row, a truncated write — and a sheet built
 * from it would show invented blanks rather than proof.
 */
const REQUIRED_KEY: Record<AstraIntent, string> = {
    IDENTITY: "dayStar",
    OUTCOME: "watch",
    TIMING: "significator",
    AUSPICIOUS_DATE: "kalakini",
}

/**
 * The computed values behind one reading, as rows.
 *
 * Returns an empty list rather than throwing when the basis is unusable: a
 * proof sheet that cannot open is a smaller problem than a reading that
 * crashes because someone tapped the link under it.
 */
export function proofRows(source: AstraReadingSource): ProofRow[] {
    const builder = BY_INTENT[source.intent]
    const values = source.values as Values | null | undefined
    if (!builder || !values || values[REQUIRED_KEY[source.intent]] == null) {
        return []
    }
    try {
        return builder(values)
    } catch {
        return []
    }
}
