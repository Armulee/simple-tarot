import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"
import { generateTarotSlug } from "@/lib/slug-utils"

// Check if an interpretation already exists and return the existing ID or null
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
        const _ownerUserId: string | null =
            typeof body?.user_id === "string" && body.user_id
                ? body.user_id
                : null

        if (!question || !interpretation) {
            return NextResponse.json(
                { error: "MISSING_FIELDS" },
                { status: 400 }
            )
        }

        // Generate the expected slug for this interpretation
        const expectedSlug = generateTarotSlug(question, cards, interpretation)

        // Check if an interpretation with the same content already exists
        // We'll check by matching the question, cards, and interpretation content
        const { data: existingInterpretation, error } = await supabaseAdmin
            .from("shared_tarot")
            .select("id, question, cards, interpretation, created_at")
            .eq("question", question)
            .eq("interpretation", interpretation)
            .eq("did", did) // Only check for the same device/user
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error("Error checking existing interpretation:", error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        if (existingInterpretation) {
            // Return the existing interpretation ID
            return NextResponse.json({
                id: existingInterpretation.id,
                exists: true,
                created_at: existingInterpretation.created_at,
            })
        }

        // No existing interpretation found
        return NextResponse.json({
            id: null,
            exists: false,
            expectedSlug: expectedSlug,
        })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
