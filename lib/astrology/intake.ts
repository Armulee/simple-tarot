import type { AstrologySystem } from "@/lib/astrology/types"

export type BirthTimeHint = "day" | "night" | "unknown"

/** Eastern countries typically use Vedic/sidereal; Western use tropical */
const VEDIC_COUNTRIES = new Set([
    "india", "thailand", "sri lanka", "nepal", "bangladesh", "pakistan",
    "indonesia", "malaysia", "singapore", "myanmar", "cambodia", "laos",
    "vietnam", "bhutan", "maldives",
])

export function getDefaultAstrologySystem(
    locale?: string | null,
    country?: string | null
): AstrologySystem {
    if (country) {
        const key = country.trim().toLowerCase()
        if (VEDIC_COUNTRIES.has(key)) return "vedic_sidereal"
    }
    if (locale === "th") return "vedic_sidereal"
    return "western_tropical"
}

export function resolveBirthTime(args: {
    hour?: number | null
    minute?: number | null
    timeHint?: BirthTimeHint
}) {
    const hasExactTime =
        Number.isFinite(args.hour as number) && Number.isFinite(args.minute as number)

    if (hasExactTime) {
        return {
            hour: Number(args.hour),
            minute: Number(args.minute),
            isApproximate: false,
            approximationReason: null as string | null,
        }
    }

    if (args.timeHint === "day") {
        return {
            hour: 12,
            minute: 0,
            isApproximate: true,
            approximationReason: "daytime_midpoint",
        }
    }

    return {
        hour: 0,
        minute: 0,
        isApproximate: true,
        approximationReason:
            args.timeHint === "night" ? "nighttime_midpoint" : "time_unknown_midnight",
    }
}
