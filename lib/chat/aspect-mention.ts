/**
 * Matches which personalized aspect events a reply actually TALKS ABOUT, so
 * the chat can render the aspect cards for exactly those planetary contacts
 * (e.g. the horoscope explanation that says "Saturn pressing your natal
 * Mercury" gets the Saturn→Mercury card under the paragraph).
 *
 * Thai planet names double as weekday names (เสาร์ = Saturday, ศุกร์ =
 * Friday…), so the seven classical planets require the ดาว/ดวง prefix the
 * model naturally uses for planets ("ดาวเสาร์"); Rahu/Ketu and the outer
 * planets are unambiguous without it. English names match on word boundaries
 * so "Sunday" never counts as the Sun.
 */

export type MentionableAspectEvent = {
    aspectKey: string
    transitPlanet: string
    natalPlanet: string
}

const PLANET_MENTION_VARIANTS: Record<string, string[]> = {
    Sun: ["sun", "ดาวอาทิตย์", "ดวงอาทิตย์", "ດາວອາທິດ", "ດວງອາທິດ"],
    Moon: ["moon", "ดาวจันทร์", "ดวงจันทร์", "จันทรา", "ດາວຈັນ", "ດວງຈັນ"],
    Mercury: ["mercury", "ดาวพุธ", "ດາວພຸດ"],
    Venus: ["venus", "ดาวศุกร์", "ດາວສຸກ"],
    Mars: ["mars", "ดาวอังคาร", "ດາວອັງຄານ"],
    Jupiter: ["jupiter", "ดาวพฤหัสบดี", "ดาวพฤหัส", "ດາວພະຫັດ"],
    Saturn: ["saturn", "ดาวเสาร์", "ດາວເສົາ"],
    Rahu: ["rahu", "ราหู", "ຣາຫູ", "ລາຫູ"],
    Ketu: ["ketu", "เกตุ", "ເກດ"],
    Uranus: ["uranus", "ยูเรนัส", "ຢູເຣນັສ"],
    Neptune: ["neptune", "เนปจูน", "ເນບຈູນ"],
    Pluto: ["pluto", "พลูโต", "ພລູໂຕ"],
}

function isPlanetMentioned(text: string, planet: string): boolean {
    const variants = PLANET_MENTION_VARIANTS[planet]
    if (!variants) return false
    return variants.some((variant) =>
        /^[a-z]+$/.test(variant)
            ? new RegExp(`\\b${variant}\\b`, "i").test(text)
            : text.includes(variant),
    )
}

/**
 * Returns the events whose planetary contact the text mentions, deduped by
 * aspectKey and capped at `max`. Pair matches (both transit AND natal planet
 * named) win; when none exist, events whose transit planet is named are used
 * as a softer fallback. No mention → no cards.
 */
export function matchMentionedAspectEvents<T extends MentionableAspectEvent>(
    text: string,
    events: T[],
    max = 3,
): T[] {
    if (!text.trim() || events.length === 0) return []

    const collect = (predicate: (event: T) => boolean): T[] => {
        const seen = new Set<string>()
        const out: T[] = []
        for (const event of events) {
            if (seen.has(event.aspectKey)) continue
            if (!predicate(event)) continue
            seen.add(event.aspectKey)
            out.push(event)
            if (out.length >= max) break
        }
        return out
    }

    const pairMatches = collect(
        (event) =>
            isPlanetMentioned(text, event.transitPlanet) &&
            isPlanetMentioned(text, event.natalPlanet),
    )
    if (pairMatches.length > 0) return pairMatches

    return collect((event) => isPlanetMentioned(text, event.transitPlanet))
}
