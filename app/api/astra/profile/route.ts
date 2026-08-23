import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { resolveAstraSubject } from "@/lib/server/astra-subject"

/**
 * The fortune teller's memory of one person: birth details and the thread she
 * last spoke to them in. Bound to the account / device, never to a thread —
 * opening a new thread must not ask for any of this again.
 */

const birthSchema = z.object({
    year: z.number().int().min(1900).max(2100),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    hour: z.number().int().min(0).max(23).nullable().optional(),
    minute: z.number().int().min(0).max(59).nullable().optional(),
    timeKnown: z.boolean().default(false),
    timezone: z.number().min(-12).max(14).nullable().optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    place: z.string().max(200).nullable().optional(),
})

const putSchema = z.object({
    birth: birthSchema.nullable().optional(),
    lastTopic: z.string().max(200).nullable().optional(),
    lastSessionId: z.string().max(64).nullable().optional(),
})

export type AstraProfileResponse = {
    hasBirth: boolean
    birth: z.infer<typeof birthSchema> | null
    lastTopic: string | null
    lastSessionId: string | null
}

type ProfileRow = {
    birth_year: number | null
    birth_month: number | null
    birth_day: number | null
    birth_hour: number | null
    birth_minute: number | null
    birth_time_known: boolean | null
    birth_timezone: number | null
    birth_lat: number | null
    birth_lng: number | null
    birth_place: string | null
    last_topic: string | null
    last_session_id: string | null
}

const EMPTY: AstraProfileResponse = {
    hasBirth: false,
    birth: null,
    lastTopic: null,
    lastSessionId: null,
}

export function toProfileResponse(row: ProfileRow | null): AstraProfileResponse {
    if (!row) return EMPTY
    const hasBirth =
        row.birth_year != null && row.birth_month != null && row.birth_day != null
    return {
        hasBirth,
        birth: hasBirth
            ? {
                  year: row.birth_year!,
                  month: row.birth_month!,
                  day: row.birth_day!,
                  hour: row.birth_hour,
                  minute: row.birth_minute,
                  timeKnown: Boolean(row.birth_time_known),
                  timezone: row.birth_timezone,
                  lat: row.birth_lat,
                  lng: row.birth_lng,
                  place: row.birth_place,
              }
            : null,
        lastTopic: row.last_topic,
        lastSessionId: row.last_session_id,
    }
}

const SELECT_COLUMNS =
    "birth_year, birth_month, birth_day, birth_hour, birth_minute, birth_time_known, birth_timezone, birth_lat, birth_lng, birth_place, last_topic, last_session_id"

export async function GET(req: NextRequest) {
    if (!supabaseAdmin) return NextResponse.json(EMPTY)
    const subject = await resolveAstraSubject(req)
    if (!subject) return NextResponse.json(EMPTY)

    const { data } = await supabaseAdmin
        .from("astra_user_profiles")
        .select(SELECT_COLUMNS)
        .eq("subject_type", subject.type)
        .eq("subject_id", subject.id)
        .maybeSingle()

    return NextResponse.json(toProfileResponse(data as ProfileRow | null))
}

export async function PUT(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 500 })
    }
    const subject = await resolveAstraSubject(req)
    if (!subject) return NextResponse.json({ error: "NO_SUBJECT" }, { status: 400 })

    const parsed = putSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
    }

    const { birth, lastTopic, lastSessionId } = parsed.data
    const now = new Date().toISOString()
    const { data, error } = await supabaseAdmin
        .from("astra_user_profiles")
        .upsert(
            {
                subject_type: subject.type,
                subject_id: subject.id,
                ...(birth
                    ? {
                          birth_year: birth.year,
                          birth_month: birth.month,
                          birth_day: birth.day,
                          birth_hour: birth.hour ?? null,
                          birth_minute: birth.minute ?? null,
                          birth_time_known: birth.timeKnown,
                          birth_timezone: birth.timezone ?? null,
                          birth_lat: birth.lat ?? null,
                          birth_lng: birth.lng ?? null,
                          birth_place: birth.place ?? null,
                      }
                    : {}),
                ...(lastTopic !== undefined ? { last_topic: lastTopic } : {}),
                ...(lastSessionId !== undefined
                    ? { last_session_id: lastSessionId }
                    : {}),
                last_seen_at: now,
                updated_at: now,
            },
            { onConflict: "subject_type,subject_id" },
        )
        .select(SELECT_COLUMNS)
        .maybeSingle()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(toProfileResponse(data as ProfileRow | null))
}
