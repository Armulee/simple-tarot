import { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { resultPageHtml } from "@/lib/admin/delete-requests"

export const dynamic = "force-dynamic"

function html(body: string, status = 200): Response {
    return new Response(body, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    })
}

/** Public, token-secured. Clicking "Reject" cancels the pending deletion. */
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
        .select("token, status")
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

    await supabaseAdmin
        .from("admin_delete_requests")
        .update({ status: "rejected", resolved_at: new Date().toISOString() })
        .eq("token", token)

    return html(
        resultPageHtml(
            "Rejected",
            "The deletion was cancelled. No records were removed.",
            "warn",
        ),
    )
}
