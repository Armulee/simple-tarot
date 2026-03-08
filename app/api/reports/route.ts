import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"

export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "Supabase not configured" },
                { status: 500 },
            )
        }

        const did = await readAndVerifyDid()
        if (!did) {
            return NextResponse.json({ error: "NO_DID" }, { status: 400 })
        }

        let userId: string | null = null
        const authHeader = req.headers.get("authorization")
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1]
            const {
                data: { user },
            } = await supabaseAdmin.auth.getUser(token)
            if (user) userId = user.id
        }

        const body = await req.json()
        const readingId = body?.reading_id
        const reason = (body?.reason ?? "").toString().slice(0, 200)
        const details = body?.details
            ? body.details.toString().slice(0, 2000)
            : null

        if (!readingId || !reason) {
            return NextResponse.json(
                { error: "reading_id and reason are required" },
                { status: 400 },
            )
        }

        const { error } = await supabaseAdmin.from("reports").insert({
            reading_id: readingId,
            did,
            owner_user_id: userId,
            reason,
            details,
        })

        if (error) {
            console.error("Error inserting report:", error)
            return NextResponse.json(
                { error: "Failed to save report" },
                { status: 500 },
            )
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error("Error in POST /api/reports:", e)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        )
    }
}
