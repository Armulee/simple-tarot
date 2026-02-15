import { generateObject } from "ai"
import { z } from "zod"
import { getDefaultAstrologySystem } from "@/lib/astrology/intake"
import { resolveLocationFromCountryState } from "@/lib/location"

const MODEL = "google/gemini-3-flash"

const extractSchema = z.object({
    birthDate: z
        .object({
            day: z.number().int().min(1).max(31).nullable(),
            month: z.number().int().min(1).max(12).nullable(),
            year: z.number().int().min(1900).max(2100).nullable(),
        })
        .nullable(),
    birthTime: z
        .object({
            hour: z.number().int().min(0).max(23).nullable(),
            minute: z.number().int().min(0).max(59).nullable(),
            timeHint: z.enum(["day", "night", "unknown"]).default("unknown"),
            isExact: z.boolean().default(false),
        })
        .nullable(),
    location: z
        .object({
            country: z.string().trim().min(1).nullable(),
            state: z.string().trim().min(1).nullable(),
        })
        .nullable(),
    systemPreference: z
        .enum(["western_tropical", "vedic_sidereal", "both", "unknown"])
        .default("unknown"),
    transitDate: z
        .object({
            mentioned: z.boolean().default(false),
            day: z.number().int().min(1).max(31).nullable(),
            month: z.number().int().min(1).max(12).nullable(),
            year: z.number().int().min(1900).max(2100).nullable(),
        })
        .nullable(),
})

const requestSchema = z.object({
    message: z.string().trim().min(1),
    locale: z.string().optional(),
    currentLocation: z
        .object({
            country: z.string().optional(),
            state: z.string().optional(),
            lat: z.number().optional(),
            lng: z.number().optional(),
            timezone: z.number().optional(),
        })
        .optional(),
})

function detectTransitMention(message: string) {
    const text = message.toLowerCase()
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)

    if (/(today|this day|วันนี้)/i.test(message)) {
        return {
            mentioned: true,
            day: now.getDate(),
            month: now.getMonth() + 1,
            year: now.getFullYear(),
        }
    }
    if (/(tomorrow|พรุ่งนี้)/i.test(message)) {
        return {
            mentioned: true,
            day: tomorrow.getDate(),
            month: tomorrow.getMonth() + 1,
            year: tomorrow.getFullYear(),
        }
    }

    const thaiDateMatch = message.match(/วันที่\s*(\d{1,2})/)
    if (thaiDateMatch) {
        const day = Number(thaiDateMatch[1])
        if (Number.isFinite(day) && day >= 1 && day <= 31) {
            return {
                mentioned: true,
                day,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
            }
        }
    }

    const englishDateMatch = text.match(/\b(on|date)\s+(\d{1,2})\b/)
    if (englishDateMatch) {
        const day = Number(englishDateMatch[2])
        if (Number.isFinite(day) && day >= 1 && day <= 31) {
            return {
                mentioned: true,
                day,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
            }
        }
    }

    return { mentioned: false, day: null, month: null, year: null }
}

export async function POST(req: Request) {
    try {
        const payload = requestSchema.parse(await req.json())
        const locale = payload.locale || "en"

        const extraction = await generateObject({
            model: MODEL,
            schema: extractSchema,
            temperature: 0,
            system: `Extract birth data and transit date from user text.

Rules:
- Do not invent values.
- If exact time isn't present, set hour/minute to null and use timeHint.
- If text says daytime/morning/afternoon -> day.
- If text says nighttime/evening/midnight -> night.
- If no clue -> unknown.
- If astrology system not specified, return "unknown".
- Transit: If user mentions a date for the transit/forecast (e.g. "today", "tomorrow", "15 Jan 2025", "next week", "วันที่ 20"), extract it. Set transitDate.mentioned=true and fill day/month/year. Use current date for "today", tomorrow for "tomorrow". If no transit date mentioned, set transitDate.mentioned=false and day/month/year to null.`,
            prompt: `User locale: ${locale}
Current date: ${new Date().toISOString().slice(0, 10)}
Message:
${payload.message}`,
        })

        const extracted = extraction.object

        const hasDate = Boolean(
            extracted.birthDate?.day &&
                extracted.birthDate?.month &&
                extracted.birthDate?.year
        )

        const hasExactTime = Boolean(
            extracted.birthTime?.isExact &&
                extracted.birthTime?.hour != null &&
                extracted.birthTime?.minute != null
        )
        const hasTimeHint =
            extracted.birthTime?.timeHint === "day" ||
            extracted.birthTime?.timeHint === "night"

        let country =
            extracted.location?.country?.trim() ||
            payload.currentLocation?.country?.trim() ||
            ""
        let state =
            extracted.location?.state?.trim() ||
            payload.currentLocation?.state?.trim() ||
            ""

        let lat =
            typeof payload.currentLocation?.lat === "number"
                ? payload.currentLocation.lat
                : null
        let lng =
            typeof payload.currentLocation?.lng === "number"
                ? payload.currentLocation.lng
                : null
        let timezone =
            typeof payload.currentLocation?.timezone === "number"
                ? payload.currentLocation.timezone
                : null

        if (country && (lat == null || lng == null || timezone == null)) {
            const resolved = resolveLocationFromCountryState(country, state || undefined)
            if (resolved) {
                country = resolved.countryName
                state = resolved.stateName || state
                lat = resolved.latitude
                lng = resolved.longitude
                timezone = resolved.timezone
            }
        }

        const usedLocationFallback = !extracted.location?.country && Boolean(country)
        const defaultSystem = getDefaultAstrologySystem(locale, country || undefined)
        const systemPreference =
            extracted.systemPreference === "unknown"
                ? defaultSystem
                : extracted.systemPreference

        const aiTransit = extracted.transitDate
        const ruleBasedTransit = detectTransitMention(payload.message)
        const hasAiTransit =
            aiTransit?.mentioned &&
            aiTransit?.day != null &&
            aiTransit?.month != null &&
            aiTransit?.year != null
        const hasRuleTransit =
            ruleBasedTransit.mentioned &&
            ruleBasedTransit.day != null &&
            ruleBasedTransit.month != null &&
            ruleBasedTransit.year != null
        const transit = hasAiTransit
            ? {
                  mentioned: true,
                  day: aiTransit.day,
                  month: aiTransit.month,
                  year: aiTransit.year,
              }
            : hasRuleTransit
              ? ruleBasedTransit
              : aiTransit?.mentioned
                ? {
                      mentioned: true,
                      day: aiTransit.day,
                      month: aiTransit.month,
                      year: aiTransit.year,
                  }
                : ruleBasedTransit
        const missingFields: string[] = []
        if (!hasDate) missingFields.push("birthDate")
        if (!(hasExactTime || hasTimeHint)) missingFields.push("birthTimeOrDayNight")
        if (!(country && lat != null && lng != null && timezone != null)) {
            missingFields.push("birthLocation")
        }

        return Response.json({
            birthDate: extracted.birthDate,
            birthTime: {
                hour: extracted.birthTime?.hour ?? null,
                minute: extracted.birthTime?.minute ?? null,
                timeHint: extracted.birthTime?.timeHint ?? "unknown",
                isExact: hasExactTime,
            },
            location: {
                country: country || null,
                state: state || null,
                lat,
                lng,
                timezone,
                usedLocationFallback,
            },
            systemPreference,
            readiness: {
                hasDate,
                hasTime: hasExactTime || hasTimeHint,
                hasLocation: Boolean(country && lat != null && lng != null),
                readyForCalculation:
                    hasDate &&
                    (hasExactTime || hasTimeHint) &&
                    Boolean(country && lat != null && lng != null && timezone != null),
                missingFields,
            },
            transit,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "EXTRACT_FAILED"
        return Response.json({ error: message }, { status: 400 })
    }
}
