import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, supabase } from "@/lib/supabase"
import { z } from "zod"

const SOCIAL_PLATFORMS = [
    "facebook",
    "instagram",
    "threads",
    "tiktok",
    "x",
] as const

const claimSchema = z.object({
    platform: z.enum(SOCIAL_PLATFORMS),
})

type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

async function getUserFromRequest(req: NextRequest) {
    if (!supabaseAdmin) return null
    const authHeader =
        req.headers.get("authorization") ?? req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) return null
    const token = authHeader.split(" ")[1]
    const {
        data: { user },
        error,
    } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return null
    return user
}

function isSupabaseAdminReady() {
    return Boolean(supabaseAdmin)
}

export async function GET(req: NextRequest) {
    if (!isSupabaseAdminReady()) {
        return NextResponse.json(
            { error: "SUPABASE_ADMIN_NOT_CONFIGURED" },
            { status: 500 }
        )
    }
    const user = await getUserFromRequest(req)
    if (!user) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin!
        .from("star_social_claims")
        .select("platform, stars_awarded, claimed_at")
        .eq("user_id", user.id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ claims: data ?? [] })
}

export async function POST(req: NextRequest) {
    if (!isSupabaseAdminReady()) {
        return NextResponse.json(
            { error: "SUPABASE_ADMIN_NOT_CONFIGURED" },
            { status: 500 }
        )
    }

    const user = await getUserFromRequest(req)
    if (!user) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    }

    const parsed = claimSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
        return NextResponse.json({ error: "INVALID_PLATFORM" }, { status: 400 })
    }

    const platform = parsed.data.platform as SocialPlatform

    const { data: existing, error: existingError } = await supabaseAdmin!
        .from("star_social_claims")
        .select("id")
        .eq("user_id", user.id)
        .eq("platform", platform)
        .maybeSingle()

    if (existingError && existingError.code !== "PGRST116") {
        return NextResponse.json(
            { error: existingError.message },
            { status: 500 }
        )
    }

    if (existing) {
        return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 409 })
    }

    const db = supabaseAdmin || supabase

    const { data: awardData, error: awardError } = await db.rpc("star_add", {
        p_anon_device_id: null,
        p_amount: 1,
        p_user_id: user.id,
    })

    if (awardError) {
        return NextResponse.json({ error: awardError.message }, { status: 400 })
    }

    const { data: claim, error: insertError } = await supabaseAdmin!
        .from("star_social_claims")
        .insert({
            user_id: user.id,
            platform,
            stars_awarded: 1,
        })
        .select()
        .single()

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const balance =
        Array.isArray(awardData) && awardData.length > 0
            ? awardData[0]?.current_stars ?? null
            : null

    return NextResponse.json({
        claim,
        balance,
    })
}
