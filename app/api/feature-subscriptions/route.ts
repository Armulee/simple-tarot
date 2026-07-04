import { NextResponse } from "next/server"

import { getUserFromBearer } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"

/** Features a user can subscribe to for launch notifications. */
const ALLOWED_FEATURES = new Set(["avatar"])

/**
 * GET — is the current user already subscribed to `feature`?
 * Query: ?feature=avatar
 */
export async function GET(req: Request) {
    const user = await getUserFromBearer(req)
    if (!user) {
        return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
    }
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "SERVER_NOT_CONFIGURED" }, { status: 500 })
    }
    const feature = new URL(req.url).searchParams.get("feature")?.toLowerCase() ?? ""
    if (!ALLOWED_FEATURES.has(feature)) {
        return NextResponse.json({ error: "UNKNOWN_FEATURE" }, { status: 400 })
    }
    const { data } = await supabaseAdmin
        .from("feature_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("feature", feature)
        .maybeSingle()
    return NextResponse.json({ subscribed: Boolean(data) })
}

/**
 * POST — subscribe the current (authenticated) user to a feature waitlist.
 * Body: { feature: "avatar" }
 *
 * Login is required, so this doubles as the "auto-subscribe after sign-in"
 * endpoint the /subscribe callback page calls.
 */
export async function POST(req: Request) {
    const user = await getUserFromBearer(req)
    if (!user) {
        return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
    }
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "SERVER_NOT_CONFIGURED" }, { status: 500 })
    }

    let body: { feature?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
    }
    const feature = (body.feature ?? "").toLowerCase().trim()
    if (!ALLOWED_FEATURES.has(feature)) {
        return NextResponse.json({ error: "UNKNOWN_FEATURE" }, { status: 400 })
    }

    const email = user.email
    if (!email) {
        return NextResponse.json({ error: "NO_EMAIL" }, { status: 400 })
    }

    const { error } = await supabaseAdmin.rpc("feature_subscribe", {
        p_user_id: user.id,
        p_email: email,
        p_feature: feature,
    })
    if (error) {
        console.error("[feature-subscriptions] subscribe failed:", error)
        return NextResponse.json({ error: "SUBSCRIBE_FAILED" }, { status: 500 })
    }

    return NextResponse.json({ subscribed: true, email })
}
