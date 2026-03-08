import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"

const VALID_CONTENT_TYPES = new Set(["tarot", "horoscope", "chat"])

async function getIdentity(req: NextRequest) {
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

export async function GET(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "Supabase not configured" },
                { status: 500 },
            )
        }

        const { searchParams } = new URL(req.url)
        const contentId = searchParams.get("contentId")
        const contentType = searchParams.get("contentType") ?? "tarot"

        if (!contentId) {
            return NextResponse.json(
                { error: "contentId is required" },
                { status: 400 },
            )
        }

        const { did } = await getIdentity(req)
        if (!did) {
            return NextResponse.json({ reaction: null })
        }

        const { data } = await supabaseAdmin
            .from("reactions")
            .select("reaction")
            .eq("content_id", contentId)
            .eq("content_type", contentType)
            .eq("did", did)
            .maybeSingle()

        return NextResponse.json({ reaction: data?.reaction ?? null })
    } catch (e) {
        console.error("Error in GET /api/reactions:", e)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "Supabase not configured" },
                { status: 500 },
            )
        }

        const { did, userId } = await getIdentity(req)
        if (!did) {
            return NextResponse.json({ error: "NO_DID" }, { status: 400 })
        }

        const body = await req.json()
        const contentId = body?.content_id
        const contentType = body?.content_type ?? "tarot"
        const reaction = body?.reaction

        if (!contentId) {
            return NextResponse.json(
                { error: "content_id is required" },
                { status: 400 },
            )
        }

        if (!VALID_CONTENT_TYPES.has(contentType)) {
            return NextResponse.json(
                { error: `content_type must be one of: ${[...VALID_CONTENT_TYPES].join(", ")}` },
                { status: 400 },
            )
        }

        if (reaction === null || reaction === undefined) {
            await supabaseAdmin
                .from("reactions")
                .delete()
                .eq("content_id", contentId)
                .eq("content_type", contentType)
                .eq("did", did)

            return NextResponse.json({ reaction: null })
        }

        if (reaction !== "like" && reaction !== "dislike") {
            return NextResponse.json(
                { error: "reaction must be 'like', 'dislike', or null" },
                { status: 400 },
            )
        }

        const { error } = await supabaseAdmin
            .from("reactions")
            .upsert(
                {
                    content_id: contentId,
                    content_type: contentType,
                    did,
                    owner_user_id: userId,
                    reaction,
                },
                { onConflict: "content_id,content_type,did" },
            )

        if (error) {
            console.error("Error upserting reaction:", error)
            return NextResponse.json(
                { error: "Failed to save reaction" },
                { status: 500 },
            )
        }

        return NextResponse.json({ reaction })
    } catch (e) {
        console.error("Error in POST /api/reactions:", e)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        )
    }
}
