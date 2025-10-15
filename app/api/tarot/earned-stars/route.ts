import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Get earned stars (daily) for the owner of a specific tarot reading
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

        // Count earned stars from share_visit_awards table by OWNER for TODAY (Bangkok),
        // so visits to both /tarot/[id] and /share/tarot/[id] are reflected.
        const getBangkokDateKey = (): string => {
            const offsetMs = 7 * 60 * 60 * 1000
            const bkk = new Date(Date.now() + offsetMs)
            const y = bkk.getUTCFullYear()
            const m = String(bkk.getUTCMonth() + 1).padStart(2, "0")
            const d = String(bkk.getUTCDate()).padStart(2, "0")
            return `${y}-${m}-${d}`
        }

        const dateKey = getBangkokDateKey()
        const ownerIds: string[] = []
        if (reading.owner_user_id) ownerIds.push(reading.owner_user_id)
        if (reading.did) ownerIds.push(reading.did)

        let totalCount = 0
        if (ownerIds.length > 0) {
            // Prefer a single IN() query when we have both identifiers
            const { count, error: countError } = await supabaseAdmin
                .from("share_visit_awards")
                .select("id", { count: "exact", head: true })
                .eq("date_key", dateKey)
                .in("owner_id", ownerIds)

            if (countError) {
                return NextResponse.json(
                    { error: countError.message },
                    { status: 400 }
                )
            }
            totalCount = count || 0
        }

        const maxStars = 5
        const earnedStars = Math.min(totalCount, maxStars)

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
