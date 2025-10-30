import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"
import { nanoid } from "nanoid"

// Create a new tarot reading entry and return the ID
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
        const question = (body?.question ?? "").toString().slice(0, 500)
        const cards = Array.isArray(body?.cards)
            ? body.cards.map((c: unknown) => String(c)).slice(0, 10)
            : []
        const ownerUserId: string | null =
            typeof body?.user_id === "string" && body.user_id
                ? body.user_id
                : null
        const parentReadingId: string | null =
            typeof body?.parent_reading_id === "string" && body.parent_reading_id
                ? body.parent_reading_id
                : null

        if (!question || cards.length === 0) {
            return NextResponse.json(
                { error: "MISSING_FIELDS" },
                { status: 400 }
            )
        }

        // Generate a random short ID
        const shortId = nanoid(7) // 7 characters should be sufficient

        // Check if ID already exists and generate a new one if needed
        let attempts = 0
        let finalId = shortId
        while (attempts < 5) {
            const { data: existing } = await supabaseAdmin
                .from("tarot_readings")
                .select("id")
                .eq("id", finalId)
                .maybeSingle()

            if (!existing) break

            // Generate a new random ID if it exists
            finalId = nanoid(7)
            attempts++
        }

        const { error } = await supabaseAdmin.from("tarot_readings").insert({
            id: finalId,
            did, // owner DID (device id)
            owner_user_id: ownerUserId,
            question,
            cards,
            interpretation: null, // Will be filled when first accessed
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            parent_id: parentReadingId,
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