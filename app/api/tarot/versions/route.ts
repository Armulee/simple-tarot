import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"

async function getRequesterIdentity(req: NextRequest) {
    const did = await readAndVerifyDid()
    let userId: string | null = null

    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ") && supabaseAdmin) {
        const token = authHeader.split(" ")[1]
        const {
            data: { user },
        } = await supabaseAdmin.auth.getUser(token)
        if (user) userId = user.id
    }

    return { did, userId }
}

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

        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "Supabase not configured" },
                { status: 500 }
            )
        }

        const { did, userId } = await getRequesterIdentity(req)

        // Get the reading to verify ownership
        const { data: reading, error: readingError } = await supabaseAdmin
            .from("tarot_readings")
            .select("id, owner_user_id, did")
            .eq("id", readingId)
            .single()

        if (readingError || !reading) {
            return NextResponse.json(
                { error: "Reading not found" },
                { status: 404 }
            )
        }

        // Verify ownership
        const isOwner =
            (userId && reading.owner_user_id === userId) ||
            (did && reading.did === did)

        if (!isOwner) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        // Get versions for this reading, ordered by creation time (newest first)
        const { data: versions, error: versionsError } = await supabaseAdmin
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

        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "Supabase not configured" },
                { status: 500 }
            )
        }

        const { did, userId } = await getRequesterIdentity(req)

        // Get the reading to verify ownership
        const { data: reading, error: readingError } = await supabaseAdmin
            .from("tarot_readings")
            .select("id, owner_user_id, did")
            .eq("id", reading_id)
            .single()

        if (readingError || !reading) {
            return NextResponse.json(
                { error: "Reading not found" },
                { status: 404 }
            )
        }

        // Verify ownership
        const isOwner =
            (userId && reading.owner_user_id === userId) ||
            (did && reading.did === did)

        if (!isOwner) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        // Insert new version using service role
        const { data: version, error: insertError } = await supabaseAdmin
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
