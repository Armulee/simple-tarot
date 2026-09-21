import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import type { DemographicsAnalytics } from "@/lib/admin/analytics-shared"
import { analyticsErrorBody, analyticsRpc } from "@/lib/admin/analytics-rpc"
import { excludedOwnerIds } from "@/lib/admin/excluded-owners"

export const dynamic = "force-dynamic"

/**
 * Who the users are: age, location and gender, all self-reported.
 *
 * No date range — demographics describe the userbase as it stands, not a
 * window of it, so this mirrors /analytics/totals rather than /analytics.
 */
export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    try {
        const data = await analyticsRpc<DemographicsAnalytics>(
            admin,
            "admin_analytics_demographics",
            {},
            await excludedOwnerIds(admin),
        )
        return NextResponse.json(data, { status: 200 })
    } catch (error) {
        console.error("[admin/demographics] failed", error)
        return NextResponse.json(analyticsErrorBody(error), { status: 500 })
    }
}
