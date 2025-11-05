import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
    if (!supabaseAdmin) {
        return NextResponse.json(
            {
                profiles: 0,
                interpretations: 0,
                followUps: 0,
                revisions: 0,
            },
            { status: 200 }
        )
    }

    try {
        const [profiles, interpretations, followUps, revisions] =
            await Promise.all([
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
                        .from("tarot_readings")
                        .select("*", { count: "exact", head: true })
                        .not("parent_id", "is", null)
                    if (error) throw error
                    return count ?? 0
                })(),
                (async () => {
                    const { count, error } = await supabaseAdmin
                        .from("tarot_versions")
                        .select("*", { count: "exact", head: true })
                    if (error) throw error
                    return count ?? 0
                })(),
            ])

        return NextResponse.json(
            { profiles, interpretations, followUps, revisions },
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
