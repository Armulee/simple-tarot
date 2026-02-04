import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"
import { nanoid } from "nanoid"

// Create a new shared interpretation
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
        const interpretation = (body?.interpretation ?? "")
            .toString()
            .slice(0, 5000)
        const ownerUserId: string | null =
            typeof body?.user_id === "string" && body.user_id
                ? body.user_id
                : null

        if (!question || !interpretation) {
            return NextResponse.json(
                { error: "MISSING_FIELDS" },
                { status: 400 }
            )
        }

        // Generate a random short ID
        const sessionId = nanoid(12)

        let attempts = 0
        let finalId = sessionId
        while (attempts < 5) {
            const { data: existing } = await supabaseAdmin
                .from("shared_tarot")
                .select("id")
                .eq("id", finalId)
                .maybeSingle()

            if (!existing) break
            finalId = nanoid(12)
            attempts++
        }

        const { error } = await supabaseAdmin.from("shared_tarot").insert({
            id: finalId,
            did, // owner DID (device id)
            owner_user_id: ownerUserId,
            question,
            cards,
            interpretation,
            created_at: new Date().toISOString(),
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
