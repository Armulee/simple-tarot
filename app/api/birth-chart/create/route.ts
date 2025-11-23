import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"
import { nanoid } from "nanoid"

// Create a new birth chart entry and return the ID
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
        const day = body?.day
        const month = body?.month
        const year = body?.year
        const hour = body?.hour || "12"
        const minute = body?.minute || "0"
        const timezone = body?.timezone || "0"
        const lat = body?.lat || "0"
        const lng = body?.lng || "0"
        const country = body?.country || ""
        const state = body?.state || ""
        const chartData = body?.chartData || {}
        const ownerUserId: string | null =
            typeof body?.user_id === "string" && body.user_id
                ? body.user_id
                : null

        if (!day || !month || !year) {
            return NextResponse.json(
                { error: "MISSING_FIELDS" },
                { status: 400 }
            )
        }

        // Generate a random short ID
        const shortId = nanoid(7)

        // Check if ID already exists and generate a new one if needed
        let attempts = 0
        let finalId = shortId
        while (attempts < 5) {
            const { data: existing } = await supabaseAdmin
                .from("birth_charts")
                .select("id")
                .eq("id", finalId)
                .maybeSingle()

            if (!existing) break

            finalId = nanoid(7)
            attempts++
        }

        const { error } = await supabaseAdmin.from("birth_charts").insert({
            id: finalId,
            did,
            owner_user_id: ownerUserId,
            day: parseInt(day),
            month: parseInt(month),
            year: parseInt(year),
            hour: parseInt(hour),
            minute: parseInt(minute),
            timezone: parseFloat(timezone),
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            country: country || null,
            state_province: state || null,
            houses: chartData.houses || null,
            planets: chartData.planets || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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
