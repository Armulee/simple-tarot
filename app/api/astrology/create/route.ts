import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"
import { nanoid } from "nanoid"

type ChartSnapshot = {
    houses?: unknown
    planets?: unknown
}

// Create a new astrology (horoscope) reading entry and return the ID
export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 }
            )
        }

        const did = await readAndVerifyDid()
        if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })

        const body = await req.json()

        const ownerUserId: string | null =
            typeof body?.user_id === "string" && body.user_id
                ? body.user_id
                : null

        const question: string | null =
            typeof body?.question === "string" && body.question.trim()
                ? body.question.trim().slice(0, 500)
                : null

        const birth = body?.birth ?? {}
        const transit = body?.transit ?? {}
        const birthChart: ChartSnapshot = body?.birthChart ?? {}
        const transitChart: ChartSnapshot = body?.transitChart ?? {}

        const requiredBirth = ["day", "month", "year"]
        const requiredTransit = ["day", "month", "year"]
        for (const k of requiredBirth) {
            if (birth?.[k] == null || birth?.[k] === "")
                return NextResponse.json(
                    { error: "MISSING_FIELDS" },
                    { status: 400 }
                )
        }
        for (const k of requiredTransit) {
            if (transit?.[k] == null || transit?.[k] === "")
                return NextResponse.json(
                    { error: "MISSING_FIELDS" },
                    { status: 400 }
                )
        }

        const shortId = nanoid(7)

        let attempts = 0
        let finalId = shortId
        while (attempts < 5) {
            const { data: existing } = await supabaseAdmin
                .from("astrology_readings")
                .select("id")
                .eq("id", finalId)
                .maybeSingle()

            if (!existing) break
            finalId = nanoid(7)
            attempts++
        }

        const now = new Date().toISOString()

        const { error } = await supabaseAdmin.from("astrology_readings").insert({
            id: finalId,
            did,
            owner_user_id: ownerUserId,

            birth_day: parseInt(String(birth.day)),
            birth_month: parseInt(String(birth.month)),
            birth_year: parseInt(String(birth.year)),
            birth_hour: parseInt(String(birth.hour ?? 12)),
            birth_minute: parseInt(String(birth.minute ?? 0)),
            birth_timezone: parseFloat(String(birth.timezone ?? 0)),
            birth_lat: parseFloat(String(birth.lat ?? 0)),
            birth_lng: parseFloat(String(birth.lng ?? 0)),
            birth_country: (birth.country ?? null) || null,
            birth_state_province: (birth.state ?? null) || null,

            transit_day: parseInt(String(transit.day)),
            transit_month: parseInt(String(transit.month)),
            transit_year: parseInt(String(transit.year)),
            transit_hour: parseInt(String(transit.hour ?? 12)),
            transit_minute: parseInt(String(transit.minute ?? 0)),
            transit_timezone: parseFloat(String(transit.timezone ?? 0)),
            transit_lat: parseFloat(String(transit.lat ?? 0)),
            transit_lng: parseFloat(String(transit.lng ?? 0)),
            transit_country: (transit.country ?? null) || null,
            transit_state_province: (transit.state ?? null) || null,

            question,

            birth_houses: birthChart.houses ?? null,
            birth_planets: birthChart.planets ?? null,
            transit_houses: transitChart.houses ?? null,
            transit_planets: transitChart.planets ?? null,

            summary: null,
            created_at: now,
            updated_at: now,
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ id: finalId })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}


