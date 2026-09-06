import type { AstraIntent } from "@/lib/astra/intent"

/**
 * How much the computed values actually agree with each other.
 *
 * Every reading came out equally certain, which no person is. The engines
 * already hand back several independent signals — whether the lord of the
 * house is moving forward or backward, what is touching it and from where,
 * whether a transit window exists at all — and nothing was reading them
 * together. This does, in code, before a word is written.
 *
 * It is never shown. It only sets how firmly she is allowed to speak.
 */

export type ReadingStrength =
    /** The signals point the same way. She may commit. */
    | "strong"
    /** They contradict each other. Certainty here would be invented. */
    | "mixed"
    /** Nothing is moving. That is the finding, not a reason to make one up. */
    | "quiet"

/** Benefic and malefic in the ordinary Jyotish sense; the rest are neutral. */
const BENEFIC = new Set(["Jupiter", "Venus"])
const MALEFIC = new Set(["Saturn", "Mars", "Rahu"])
const HARMONIOUS = new Set(["trine", "sextile"])
const HARD = new Set(["square", "opposition"])

type Contact = { planet: string; aspect: string; orb: number }

/**
 * A contact counts for more the tighter it is: a trine three degrees wide is
 * barely a contact at all, and treating it as one is how a chart gets read
 * into saying whatever was wanted.
 */
function weightOf(orb: number): number {
    if (orb <= 1) return 2
    if (orb <= 2) return 1
    return 0.5
}

function contactPull(contact: Contact): number {
    const weight = weightOf(contact.orb)
    const benefic = BENEFIC.has(contact.planet)
    const malefic = MALEFIC.has(contact.planet)
    if (HARMONIOUS.has(contact.aspect)) {
        return benefic ? weight : malefic ? weight * 0.5 : weight * 0.75
    }
    if (HARD.has(contact.aspect)) {
        return malefic ? -weight : benefic ? -weight * 0.5 : -weight * 0.75
    }
    // Conjunction takes the nature of what is conjunct.
    return benefic ? weight : malefic ? -weight : 0
}

function prasnaStrength(values: Record<string, unknown>): ReadingStrength {
    const contacts = (values.contacts ?? []) as Contact[]
    const retrograde = Boolean(values.lordRetrograde)

    // Nothing touching the lord and nothing holding it back is not a weak
    // yes or a weak no — it is a chart with no news in it.
    if (contacts.length === 0) return retrograde ? "mixed" : "quiet"

    const pulls = contacts.map(contactPull)
    const total = pulls.reduce((sum, pull) => sum + pull, 0)
    const positive = pulls.filter((pull) => pull > 0).length
    const negative = pulls.filter((pull) => pull < 0).length

    // Contacts pulling opposite ways, or a helping contact on a lord that is
    // walking backward, is a split picture however strong either side looks.
    if (positive > 0 && negative > 0) return "mixed"
    if (retrograde && total > 0) return "mixed"

    return Math.abs(total) >= 1 ? "strong" : "quiet"
}

function timingStrength(values: Record<string, unknown>): ReadingStrength {
    const window = values.window as { startIso: string; endIso: string } | null
    if (!window) return "quiet"
    // A window the search actually found is a real event; its width is the
    // only thing left to judge, and a very wide one is a season, not a date.
    const days =
        (Date.parse(window.endIso) - Date.parse(window.startIso)) / 86_400_000
    return days <= 60 ? "strong" : "mixed"
}

function auspiciousStrength(values: Record<string, unknown>): ReadingStrength {
    const days = (values.days ?? []) as { score: number }[]
    if (days.length === 0) return "quiet"
    return days.some((day) => day.score >= 3) ? "strong" : "mixed"
}

/**
 * A birth chart is a description, not a forecast — it does not get weaker
 * because the sky is quiet today.
 */
export function readingStrength(
    intent: AstraIntent,
    values: Record<string, unknown> | null | undefined,
): ReadingStrength {
    if (!values) return "quiet"
    switch (intent) {
        case "OUTCOME":
            return prasnaStrength(values)
        case "TIMING":
            return timingStrength(values)
        case "AUSPICIOUS_DATE":
            return auspiciousStrength(values)
        case "IDENTITY":
            return "strong"
    }
}

/**
 * What that permits her to say. Kept next to the scoring so the two can never
 * drift apart, and phrased as licence rather than as a script — the wording
 * is hers, the certainty is ours.
 */
export const STRENGTH_NOTE: Record<ReadingStrength, string> = {
    strong: `THE SIGNALS AGREE. You may commit, and you should. Say it plainly and stand behind it — no hedging, no "perhaps", no "the stars suggest".`,
    mixed: `THE SIGNALS DISAGREE WITH EACH OTHER. Do not fake certainty you were not given. Either say the picture is split and what each side is pulling toward, or ask them for the one detail that would settle it. A confident answer here would be invented.`,
    quiet: `NOTHING IS MOVING IN THIS CHART RIGHT NOW. That is the finding. Say there is no push either way yet rather than manufacturing one — "nothing is coming for this yet" is a real answer and an honest one. Do not give a date.`,
}
