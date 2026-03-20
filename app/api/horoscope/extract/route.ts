import { generateObject } from "ai"
import { z } from "zod"
import { getDefaultAstrologySystem } from "@/lib/astrology/intake"
import { selectTransitDateFromSources } from "@/lib/astrology/transit-date-extract"
import { resolveLocationFromCountryState } from "@/lib/location"

const MODEL = "deepseek/deepseek-v3.2"

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

export async function POST(req: Request) {
    try {
        const payload = requestSchema.parse(await req.json())
        const locale = payload.locale || "en"

        const fallbackExtracted: z.infer<typeof extractSchema> = {
            birthDate: null,
            birthTime: {
                hour: null,
                minute: null,
                timeHint: "unknown",
                isExact: false,
            },
            location: null,
            systemPreference: "unknown",
            transitDate: null,
        }

        let extracted: z.infer<typeof extractSchema> = fallbackExtracted
        try {
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
- Transit precision:
  1) Exact full date has highest priority.
  2) Relative day words (today/tomorrow) are second.
  3) Day-only phrases (on 20 / วันที่ 20 / date 15) are third and should use current month/year.
  4) Otherwise no transit date.
- Transit: Set transitDate.mentioned=true ONLY when you can resolve a concrete calendar day/month/year for transit/forecast timing.
- Transit examples:
  - "today"/"วันนี้"/"this day" -> current date
  - "tomorrow"/"พรุ่งนี้" -> tomorrow
  - "วันที่ 20"/"on 20"/"date 15" -> that day in current month/year
  - "15 Jan 2025"/"March 3" -> parse date
- Transit negative rules:
  - If message only says broad periods like "this month", "next year", "soon", "ช่วงนี้", "เดือนหน้า" with no specific day, set mentioned=false.
  - If date is ambiguous and cannot be resolved to a single day/month/year, set mentioned=false.
  - Do not use birth date as transitDate unless user clearly asks forecast/transit for that same date.`,
                prompt: `User locale: ${locale}
Current date: ${new Date().toISOString().slice(0, 10)}
Message:
${payload.message}`,
            })
            extracted = extraction.object
        } catch {
            // Fail-soft: keep request flowing with deterministic fallbacks instead of 400.
            // This allows /api/horoscope/question to apply default timeframe fallback.
            extracted = fallbackExtracted
        }

        const hasDate = Boolean(
            extracted.birthDate?.day &&
                extracted.birthDate?.month &&
                extracted.birthDate?.year,
        )

        const hasExactTime = Boolean(
            extracted.birthTime?.isExact &&
                extracted.birthTime?.hour != null &&
                extracted.birthTime?.minute != null,
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
            const resolved = resolveLocationFromCountryState(
                country,
                state || undefined,
            )
            if (resolved) {
                country = resolved.countryName
                state = resolved.stateName || state
                lat = resolved.latitude
                lng = resolved.longitude
                timezone = resolved.timezone
            }
        }

        const usedLocationFallback =
            !extracted.location?.country && Boolean(country)
        const defaultSystem = getDefaultAstrologySystem(
            locale,
            country || undefined,
        )
        const systemPreference =
            extracted.systemPreference === "unknown"
                ? defaultSystem
                : extracted.systemPreference

        const transit = selectTransitDateFromSources({
            message: payload.message,
            extractedTransit: extracted.transitDate,
        })
        const missingFields: string[] = []
        if (!hasDate) missingFields.push("birthDate")
        if (!(hasExactTime || hasTimeHint))
            missingFields.push("birthTimeOrDayNight")
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
                    Boolean(
                        country &&
                            lat != null &&
                            lng != null &&
                            timezone != null,
                    ),
                missingFields,
            },
            transit,
        })
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "EXTRACT_FAILED"
        return Response.json({ error: message }, { status: 400 })
    }
}
