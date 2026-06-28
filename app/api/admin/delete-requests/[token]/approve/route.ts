import { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import {
    DELETE_RESOURCES,
    isDeleteResource,
    resultPageHtml,
} from "@/lib/admin/delete-requests"

export const dynamic = "force-dynamic"

function html(body: string, status = 200): Response {
    return new Response(body, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    })
}

/** Public, token-secured. Clicking "Approve" in the email runs the deletion. */
export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ token: string }> },
) {
    const { token } = await context.params
    if (!supabaseAdmin) {
        return html(resultPageHtml("Error", "Server not configured.", "error"), 500)
    }

    const { data: req } = await supabaseAdmin
        .from("admin_delete_requests")
        .select("token, resource, item_ids, status")
        .eq("token", token)
        .maybeSingle()

    if (!req) {
        return html(
            resultPageHtml("Not found", "This delete request no longer exists.", "error"),
            404,
        )
    }
    if (req.status !== "pending") {
        return html(
            resultPageHtml(
                "Already resolved",
                `This request was already ${req.status}.`,
                "warn",
            ),
        )
    }
    if (!isDeleteResource(req.resource)) {
        return html(resultPageHtml("Error", "Unknown resource.", "error"), 400)
    }

    const ids = Array.isArray(req.item_ids) ? (req.item_ids as string[]) : []
    const table = DELETE_RESOURCES[req.resource].table

    try {
        if (ids.length > 0) {
            const { error } = await supabaseAdmin
                .from(table)
                .delete()
                .in("id", ids)
            if (error) throw error
        }
        await supabaseAdmin
            .from("admin_delete_requests")
            .update({
                status: "approved",
                deleted_count: ids.length,
                resolved_at: new Date().toISOString(),
            })
            .eq("token", token)

        return html(
            resultPageHtml(
                "Approved",
                `${ids.length} record(s) were permanently deleted.`,
                "ok",
            ),
        )
    } catch (error) {
        console.error("[delete-requests/approve] failed", error)
        return html(
            resultPageHtml("Error", "Failed to delete the records.", "error"),
            500,
        )
    }
}
