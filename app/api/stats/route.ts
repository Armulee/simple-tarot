import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
    if (!supabaseAdmin) {
        return NextResponse.json(
            {
                totalUsers: 0,
                profiles: 0,
                interpretations: 0,
            },
            { status: 200 }
        )
    }

    try {
        const [totalUsers, profiles, interpretations] =
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
                        .from("chat_sessions")
                        .select("*", { count: "exact", head: true })
                    if (error) throw error
                    return count ?? 0
                })(),
            ])

        return NextResponse.json(
            { totalUsers, profiles, interpretations },
            { status: 200 }
        )
    } catch (error) {
        console.error("[stats] failed to load counts", error)
        return NextResponse.json(
            { message: "Unable to load stats" },
            { status: 500 }
        )
    }
}
