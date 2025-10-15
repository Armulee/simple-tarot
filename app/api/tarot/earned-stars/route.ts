import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Get earned stars for a specific tarot reading
export async function GET(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 }
            )
        }

        const { searchParams } = new URL(req.url)
        const readingId = searchParams.get("readingId")

        if (!readingId) {
            return NextResponse.json(
                { error: "MISSING_READING_ID" },
                { status: 400 }
            )
        }

        // Get the reading details to find the owner
        const { data: reading, error: readingError } = await supabaseAdmin
            .from("tarot_readings")
            .select("owner_user_id, did")
            .eq("id", readingId)
            .maybeSingle()

        if (readingError || !reading) {
            return NextResponse.json(
                { error: "READING_NOT_FOUND" },
                { status: 404 }
            )
        }

        // Count earned stars from share_visit_awards table (unified schema)
        const { count, error: countError } = await supabaseAdmin
            .from("share_visit_awards")
            .select("id", { count: "exact", head: true })
            .eq("shared_id", readingId)

        if (countError) {
            return NextResponse.json(
                { error: countError.message },
                { status: 400 }
            )
        }

        const earnedStars = Math.min(count || 0, 5) // Cap at 5 stars
        const maxStars = 5

        return NextResponse.json({
            earnedStars,
            maxStars,
            ownerUserId: reading.owner_user_id,
            ownerDid: reading.did,
        })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
