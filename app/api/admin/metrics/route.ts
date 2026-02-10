import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SERVER_NOT_CONFIGURED" },
                { status: 500 }
            )
        }

        const authHeader = request.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
        }

        const token = authHeader.split(" ")[1]
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
        }

        const { data: adminRow, error: adminError } = await supabaseAdmin
            .from("admins")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle()

        if (adminError || !adminRow) {
            return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
        }

        const now = new Date().toISOString()

        const [totalUsers, authenticatedUsers, interpretationCount, paidSubscribers] =
            await Promise.all([
                (async () => {
                    const { count, error } = await supabaseAdmin
                        .from("stars")
                        .select("*", { count: "exact", head: true })
                    if (error) throw error
                    return count ?? 0
                })(),
                (async () => {
                    const { count, error } = await supabaseAdmin
                        .from("profiles")
                        .select("*", { count: "exact", head: true })
                    if (error) throw error
                    return count ?? 0
                })(),
                (async () => {
                    const { count, error } = await supabaseAdmin
                        .from("tarot_readings")
                        .select("*", { count: "exact", head: true })
                        .not("interpretation", "is", null)
                    if (error) throw error
                    return count ?? 0
                })(),
                (async () => {
                    const { count, error } = await supabaseAdmin
                        .from("billing_subscriptions")
                        .select("*", { count: "exact", head: true })
                        .or(
                            `status.in.(active,trialing),and(status.eq.canceled,current_period_end.gt.${now})`
                        )
                    if (error) throw error
                    return count ?? 0
                })(),
            ])

        const anonymousUsers = Math.max(
            0,
            (totalUsers ?? 0) - (authenticatedUsers ?? 0)
        )

        return NextResponse.json(
            {
                totalUsers,
                anonymousUsers,
                authenticatedUsers,
                interpretationCount,
                paidSubscribers,
            },
            { status: 200 }
        )
    } catch (error) {
        console.error("[admin-metrics] failed to load counts", error)
        return NextResponse.json(
            { error: "FAILED_TO_LOAD_METRICS" },
            { status: 500 }
        )
    }
}
