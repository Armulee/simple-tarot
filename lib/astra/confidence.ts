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
    /**
     * The search genuinely found nothing — no transit inside the window, no
     * favourable day in the almanac. Only ever a real empty result, never a
     * chart that merely lacked a tight aspect.
     */
    | "quiet"

/** Benefic and malefic in the ordinary Jyotish sense; the rest are neutral. */
const BENEFIC = new Set(["Jupiter", "Venus"])
const MALEFIC = new Set(["Saturn", "Mars", "Rahu"])
const HARMONIOUS = new Set(["trine", "sextile"])
const HARD = new Set(["square", "opposition"])

/** Angular houses act, succedent hold, cadent slip. The twelfth undoes. */
const ANGULAR = new Set([1, 4, 7, 10])
const SUCCEDENT = new Set([2, 5, 8, 11])

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

/**
 * The chart of a moment is never empty.
 *
 * The first version of this read aspects and nothing else, and an aspect
 * within three degrees simply is not there about half the time — so 61% of
 * every reading came back "quiet" and she told people the sky was still,
 * whatever they had asked. That was not a finding about their life. It was
 * this function looking at one signal and missing it.
 *
 * The lord of the house is always somewhere, always moving forward or back,
 * and the hour always has a ruler. Those are read first; aspects only add.
 */
function prasnaStrength(values: Record<string, unknown>): ReadingStrength {
    let pushing = 0
    let holding = 0
    const add = (amount: number) => {
        if (amount > 0) pushing += amount
        else holding -= amount
    }

    const house = Number(values.lordHouse)
    if (ANGULAR.has(house)) add(2)
    else if (SUCCEDENT.has(house)) add(1.5)
    else if (house === 12) add(-2)
    else add(-1.5)

    if (values.lordRetrograde) add(-2)

    // The hour ruling the question and the lord of the house being the same
    // body is the moment agreeing with the matter.
    const watch = values.watch as { star?: string } | undefined
    const lord = String(values.houseLord ?? "").toLowerCase()
    if (watch?.star && lord && watch.star.toLowerCase() === lord) add(1)

    for (const contact of (values.contacts ?? []) as Contact[]) {
        add(contactPull(contact))
    }

    // Both sides carrying real weight is a split picture, and saying so is the
    // honest answer — not a weaker version of a verdict.
    if (pushing >= 2 && holding >= 2) return "mixed"
    return Math.max(pushing, holding) >= 2 ? "strong" : "mixed"
}

function timingStrength(values: Record<string, unknown>): ReadingStrength {
    const window = values.window as { startIso: string; endIso: string } | null
    // A search that found no contact at all across its whole span is a real
    // empty result, and the only honest "quiet" this craft produces.
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
    if (!values) return "mixed"
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
    quiet: `THE SEARCH CAME BACK EMPTY — no contact inside the span looked at, or no day the almanac favours. That is a real result and you should say it plainly: nothing is coming for this inside the time you can see. Do not invent a date to fill the gap. But still answer them: say what that emptiness means for what they asked, and what to do while nothing is moving.`,
}
