import { z } from "zod"
import { buildChartData } from "@/lib/astrology/build-chart-data"

export const runtime = "nodejs"

const requestSchema = z.object({
    locale: z.string().optional(),
    birth: z.object({
        day: z.number().int().min(1).max(31),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(1900).max(2100),
        hour: z.number().int().min(0).max(23).nullable().optional(),
        minute: z.number().int().min(0).max(59).nullable().optional(),
        timeHint: z.enum(["day", "night", "unknown"]).optional(),
        timezone: z.number(),
        lat: z.number(),
        lng: z.number(),
        country: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        usedLocationFallback: z.boolean().optional(),
    }),
    system: z.enum(["western_tropical", "vedic_sidereal", "both"]).optional(),
    transit: z
        .object({
            day: z.number().int().min(1).max(31).nullable().optional(),
            month: z.number().int().min(1).max(12).nullable().optional(),
            year: z.number().int().min(1900).max(2100).nullable().optional(),
            hour: z.number().int().min(0).max(23).nullable().optional(),
            minute: z.number().int().min(0).max(59).nullable().optional(),
            timezone: z.number().nullable().optional(),
            lat: z.number().nullable().optional(),
            lng: z.number().nullable().optional(),
            country: z.string().nullable().optional(),
            state: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
})

/**
 * Returns the raw Swiss Ephemeris chart data that gets passed to the AI
 * for horoscope interpretation. Use this to inspect what data the AI receives.
 */
export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())
        const locale = body.locale || "en"

        const chartData = await buildChartData(
            {
                birth: body.birth,
                system: body.system,
                transit: body.transit ?? undefined,
            },
            locale
        )

        return Response.json(chartData, { status: 200 })
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "CHART_DATA_FAILED"
        return Response.json({ error: message }, { status: 400 })
    }
}
