import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/**
 * Cancel a pending delete request by its id. After this, the email's
 * Approve/Reject links are inert (the request is no longer `pending`).
 */
export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    try {
        const body = (await request.json().catch(() => null)) as {
            requestId?: unknown
        } | null
        const requestId =
            typeof body?.requestId === "string" ? body.requestId : ""
        if (!requestId) {
            return NextResponse.json({ error: "NO_ID" }, { status: 400 })
        }

        const { error } = await admin
            .from("admin_delete_requests")
            .update({
                status: "canceled",
                resolved_at: new Date().toISOString(),
            })
            .eq("id", requestId)
            .eq("status", "pending")
        if (error) throw error

        return NextResponse.json({ ok: true }, { status: 200 })
    } catch (error) {
        console.error("[admin/delete-requests/cancel] failed", error)
        const detail = error instanceof Error ? error.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: "FAILED", detail }, { status: 500 })
    }
}
