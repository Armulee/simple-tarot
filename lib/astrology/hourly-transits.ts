import { calculateSwissEphChart } from "@/lib/astrology/swisseph"
import type {
    AstrologyPoint,
    AstrologySystem,
    SwissEphChart,
} from "@/lib/astrology/types"
import {
    buildPersonalizedTransitAspects,
    buildTransitLongitudesFromSwissPlanets,
    type PersonalizedTransitAspectsResult,
} from "@/lib/astrology/transit-aspects"

/**
 * Default snapshot hours (local clock, 24h) for a single-day timeline. We
 * deliberately keep this short so we make at most six Swiss-Ephemeris calls
 * per request — Moon shifts ~0.5° per hour and the Ascendant ~15° per hour,
 * so hourly granularity already gives us a real story to narrate.
 */
export const DEFAULT_HOURLY_SLOT_HOURS = [6, 9, 12, 15, 18, 21] as const

export type HourlyTransitSlotInput = {
    /** Local hour-of-day for the slot (0-23). */
    hour: number
    /** Optional minute, defaults to 0. */
    minute?: number
}

export type HourlyTransitSlot = {
    /** Stable key for client streaming (`hour-${hour}`). */
    slotKey: string
    /** Local hour-of-day (0-23). */
    hour: number
    /** Local minute. */
    minute: number
    /** UTC ISO timestamp of the slot's midpoint moment. */
    datetimeIso: string
    /** Transit Ascendant point at the slot. */
    ascendant: AstrologyPoint
    /** Transit planets at the slot (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Rahu, Ketu). */
    planets: Record<string, AstrologyPoint>
    /** Transit-to-natal aspects active at the slot (exact-day window). */
    aspects: PersonalizedTransitAspectsResult
}

type HourlyTransitsInput = {
    /** UTC date the timeline applies to (midnight UTC of the target day). */
    targetDateUtc: Date
    /** Local timezone offset in hours (e.g. +7 for Bangkok). */
    timezone: number
    lat: number
    lng: number
    system: AstrologySystem
    /** Natal absolute longitudes (used for transit-to-natal aspects per slot). */
    natalLongitudes: Partial<Record<string, number>>
    /** Optional override of the slot hours. */
    slotHours?: ReadonlyArray<HourlyTransitSlotInput | number>
}

function normalizeSlots(
    slots: HourlyTransitsInput["slotHours"],
): HourlyTransitSlotInput[] {
    const source = slots ?? DEFAULT_HOURLY_SLOT_HOURS
    const normalized: HourlyTransitSlotInput[] = []
    for (const entry of source) {
        if (typeof entry === "number") {
            if (entry >= 0 && entry < 24) {
                normalized.push({ hour: Math.floor(entry), minute: 0 })
            }
            continue
        }
        if (entry && typeof entry.hour === "number") {
            const hour = Math.max(0, Math.min(23, Math.floor(entry.hour)))
            const minute = Math.max(
                0,
                Math.min(59, Math.floor(entry.minute ?? 0)),
            )
            normalized.push({ hour, minute })
        }
    }
    if (normalized.length === 0) {
        for (const h of DEFAULT_HOURLY_SLOT_HOURS) {
            normalized.push({ hour: h, minute: 0 })
        }
    }
    // Cap at 8 slots to bound Swiss-Ephemeris cost per request.
    return normalized.slice(0, 8)
}

function pad2(n: number) {
    return n < 10 ? `0${n}` : String(n)
}

function buildDatetimeIso(
    targetDateUtc: Date,
    hour: number,
    minute: number,
    timezone: number,
): string {
    // The slot is local-clock; convert to UTC by subtracting the offset.
    const totalHourLocal = hour + minute / 60
    const totalHourUtc = totalHourLocal - timezone
    const baseMs = Date.UTC(
        targetDateUtc.getUTCFullYear(),
        targetDateUtc.getUTCMonth(),
        targetDateUtc.getUTCDate(),
    )
    const slotMs = baseMs + Math.round(totalHourUtc * 60 * 60 * 1000)
    return new Date(slotMs).toISOString()
}

async function computeSlotChart(
    targetDateUtc: Date,
    slot: HourlyTransitSlotInput,
    input: HourlyTransitsInput,
): Promise<SwissEphChart> {
    return calculateSwissEphChart(
        {
            year: targetDateUtc.getUTCFullYear(),
            month: targetDateUtc.getUTCMonth() + 1,
            day: targetDateUtc.getUTCDate(),
            hour: slot.hour,
            minute: slot.minute ?? 0,
            timezone: input.timezone,
            lat: input.lat,
            lng: input.lng,
        },
        input.system,
    )
}

/**
 * Compute hourly transit snapshots for a single day. Returns one slot per
 * requested hour with the transit planets, Ascendant, and the personalized
 * transit-to-natal aspects active at that moment.
 *
 * Heavy under the hood — invokes Swiss Ephemeris once per slot. We bound the
 * cost by capping `slotHours.length` at 8 (default 6 slots).
 */
export async function buildHourlyTransitSlots(
    input: HourlyTransitsInput,
): Promise<HourlyTransitSlot[]> {
    const slots = normalizeSlots(input.slotHours)
    const targetIso = input.targetDateUtc.toISOString().slice(0, 10)

    // Serial execution keeps the Swiss Ephemeris WASM instance from racing
    // with itself. Each slot is short, so 6 serial calls stay well under a
    // second on warm caches.
    const results: HourlyTransitSlot[] = []
    for (const slot of slots) {
        const chart = await computeSlotChart(input.targetDateUtc, slot, input)
        const transitLongitudes = buildTransitLongitudesFromSwissPlanets(
            chart.planets ?? {},
        )
        const aspects = buildPersonalizedTransitAspects({
            questionRange: {
                source: "explicit",
                startDateIso: targetIso,
                endDateIso: targetIso,
            },
            natalLongitudes: input.natalLongitudes,
            codexRows: [],
            fallbackExactTransitLongitudes: transitLongitudes,
        })
        results.push({
            slotKey: `hour-${pad2(slot.hour)}`,
            hour: slot.hour,
            minute: slot.minute ?? 0,
            datetimeIso: buildDatetimeIso(
                input.targetDateUtc,
                slot.hour,
                slot.minute ?? 0,
                input.timezone,
            ),
            ascendant: chart.ascendant,
            planets: chart.planets,
            aspects,
        })
    }
    return results
}

/**
 * Maps an hour-of-day (0-23) to a coarse bucket label key understood by the
 * `HoroscopeChat.timeline.hourBuckets.*` i18n strings.
 */
export function hourBucketKey(hour: number): string {
    if (hour < 5) return "lateNight"
    if (hour < 8) return "dawn"
    if (hour < 11) return "morning"
    if (hour < 14) return "midday"
    if (hour < 17) return "afternoon"
    if (hour < 20) return "evening"
    return "night"
}
