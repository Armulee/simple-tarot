import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import type { AnalyticsTotals } from "@/lib/admin/analytics-shared"

export const dynamic = "force-dynamic"

/** All-time summary numbers for the dashboard's top "Data" cards. */
export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    try {
        const { data, error } = await admin.rpc("admin_analytics_totals")
        if (error) throw new Error(error.message)
        return NextResponse.json(data as AnalyticsTotals, { status: 200 })
    } catch (error) {
        console.error("[admin/analytics/totals] failed", error)
        return NextResponse.json({ error: "FAILED_TO_LOAD" }, { status: 500 })
    }
}
