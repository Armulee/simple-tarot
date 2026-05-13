import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Partial profile enrichment from OAuth providers (currently: Google gender).
 * Writes ONLY the gender column, and ONLY when the existing value is empty —
 * the user's manual selection always wins. Distinct from `PUT /api/profile`,
 * which writes a full record (and would null other fields).
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.split(" ")[1]
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin!.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = (await request.json().catch(() => ({}))) as {
            gender?: string | null
        }
        const incomingGender =
            typeof body.gender === "string" && body.gender.trim().length > 0
                ? body.gender.trim()
                : null

        if (!incomingGender) {
            return NextResponse.json({ updated: false })
        }

        const { data: existing, error: existingError } = await supabaseAdmin!
            .from("profiles")
            .select("gender")
            .eq("id", user.id)
            .single()

        if (existingError && existingError.code !== "PGRST116") {
            return NextResponse.json(
                { error: "Failed to read profile" },
                { status: 500 },
            )
        }

        if (existing?.gender && String(existing.gender).trim().length > 0) {
            return NextResponse.json({ updated: false })
        }

        const nowIso = new Date().toISOString()
        const { data: profile, error } = await supabaseAdmin!
            .from("profiles")
            .upsert(
                {
                    id: user.id,
                    gender: incomingGender,
                    updated_at: nowIso,
                },
                { onConflict: "id" },
            )
            .select()
            .single()

        if (error) {
            console.error("Profile oauth-enrich error:", error)
            return NextResponse.json(
                { error: "Failed to update profile" },
                { status: 500 },
            )
        }

        return NextResponse.json({ updated: true, profile })
    } catch (error) {
        console.error("Profile oauth-enrich error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        )
    }
}
