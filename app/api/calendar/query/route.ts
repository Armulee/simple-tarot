import { z } from "zod"
import { queryCalendarDates } from "@/lib/calendar/query"
import type { CalendarPlanTier } from "@/lib/calendar/access-window"
import type { CalendarQueryIntent } from "@/lib/calendar-helper"

const requestSchema = z.object({
    intent: z.enum([
        "job_change",
        "resignation",
        "marriage",
        "contract_sign",
        "travel_long",
        "major_purchase",
    ] satisfies [CalendarQueryIntent, ...CalendarQueryIntent[]]),
    locale: z.string().optional(),
    planTier: z.enum(["free", "basic", "pro"]).optional(),
    searchDays: z.number().int().min(1).max(365).optional(),
    maxCandidates: z.number().int().min(1).max(7).optional(),
    todayIso: z.string().optional(),
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
    }),
})

function addDays(date: Date, days: number) {
    const next = new Date(date.getTime())
    next.setDate(next.getDate() + days)
    return next
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())
        const today = body.todayIso ? new Date(`${body.todayIso}T00:00:00`) : new Date()
        const searchStart = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
        )
        const searchEnd =
            body.searchDays != null ? addDays(searchStart, body.searchDays) : undefined

        const result = await queryCalendarDates({
            intent: body.intent,
            locale: body.locale,
            birth: body.birth,
            planTier: (body.planTier ?? "free") as CalendarPlanTier,
            today: searchStart,
            startDate: searchStart,
            endDate: searchEnd,
            maxCandidates: body.maxCandidates,
        })

        return Response.json(result, { status: 200 })
    } catch (error) {
        console.error("[calendar/query] request failed:", error)
        const message =
            error instanceof Error ? error.message : "CALENDAR_QUERY_FAILED"
        return Response.json({ error: message }, { status: 400 })
    }
}
