import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import type { AnalyticsTotals } from "@/lib/admin/analytics-shared"
import { analyticsErrorBody, analyticsRpc } from "@/lib/admin/analytics-rpc"
import { excludedOwnerIds } from "@/lib/admin/excluded-owners"

export const dynamic = "force-dynamic"

/** All-time summary numbers for the dashboard's top "Data" cards. */
export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    try {
        const data = await analyticsRpc<AnalyticsTotals>(
            admin,
            "admin_analytics_totals",
            {},
            await excludedOwnerIds(admin),
        )
        return NextResponse.json(data, { status: 200 })
    } catch (error) {
        console.error("[admin/analytics/totals] failed", error)
        return NextResponse.json(analyticsErrorBody(error), { status: 500 })
    }
}
