import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

// GET /api/tarot/versions?readingId={id}
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const readingId = searchParams.get("readingId")

        if (!readingId) {
            return NextResponse.json(
                { error: "readingId is required" },
                { status: 400 }
            )
        }

        // Get the reading to verify ownership
        const { data: reading, error: readingError } = await supabase
            .from("tarot_readings")
            .select("id, owner_user_id")
            .eq("id", readingId)
            .single()

        if (readingError || !reading) {
            return NextResponse.json(
                { error: "Reading not found" },
                { status: 404 }
            )
        }

        // Get versions for this reading, ordered by creation time (newest first)
        const { data: versions, error: versionsError } = await supabase
            .from("tarot_versions")
            .select("id, reading_id, content, created_at")
            .eq("reading_id", readingId)
            .order("created_at", { ascending: false })

        if (versionsError) {
            console.error("Error fetching versions:", versionsError)
            return NextResponse.json(
                { error: "Failed to fetch versions" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            versions: versions || [],
            readingId,
        })
    } catch (error) {
        console.error("Error in GET /api/tarot/versions:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

// POST /api/tarot/versions
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { reading_id, content } = body

        if (!reading_id || !content) {
            return NextResponse.json(
                {
                    error: "reading_id and content are required",
                },
                { status: 400 }
            )
        }

        // Get the reading to verify ownership
        const { data: reading, error: readingError } = await supabase
            .from("tarot_readings")
            .select("id, owner_user_id")
            .eq("id", reading_id)
            .single()

        if (readingError || !reading) {
            return NextResponse.json(
                { error: "Reading not found" },
                { status: 404 }
            )
        }

        // Insert new version using service role to bypass RLS
        const client = supabaseAdmin ?? supabase
        const { data: version, error: insertError } = await client
            .from("tarot_versions")
            .insert({ reading_id, content })
            .select("id, reading_id, content, created_at")
            .single()

        if (insertError) {
            console.error("Error inserting version:", insertError)
            return NextResponse.json(
                { error: "Failed to save version" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            version,
        })
    } catch (error) {
        console.error("Error in POST /api/tarot/versions:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
