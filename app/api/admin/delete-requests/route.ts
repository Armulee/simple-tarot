import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { requireAdmin } from "@/lib/admin-auth"
import {
    ADMIN_APPROVAL_EMAIL,
    DELETE_RESOURCES,
    isDeleteResource,
    newDeleteToken,
} from "@/lib/admin/delete-requests"

export const dynamic = "force-dynamic"

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key-for-build")

type Detail = { title: string; subtitle: string | null }

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function buildEmailHtml(opts: {
    resourceLabel: string
    count: number
    details: Detail[]
    requestedByEmail: string | null
    approveUrl: string
    rejectUrl: string
}): string {
    const rows = opts.details
        .map(
            (d) => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #1f2937;color:#e5e7eb;font-size:14px;">
                ${escapeHtml(d.title)}
                ${d.subtitle ? `<div style="color:#9ca3af;font-size:12px;margin-top:2px;">${escapeHtml(d.subtitle)}</div>` : ""}
            </td>
        </tr>`,
        )
        .join("")

    return `
    <div style="background:#0b1020;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#0f172a;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid #1f2937;">
          <h1 style="margin:0;color:#fff;font-size:18px;">Delete approval requested</h1>
          <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">
            ${opts.count} ${escapeHtml(opts.resourceLabel)} record(s) are queued for permanent deletion${
                opts.requestedByEmail
                    ? ` (requested by ${escapeHtml(opts.requestedByEmail)})`
                    : ""
            }.
          </p>
        </div>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <div style="padding:20px 24px;display:flex;gap:12px;">
          <a href="${opts.approveUrl}" style="display:inline-block;background:#10b981;color:#06281f;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;">Approve &amp; delete</a>
          <a href="${opts.rejectUrl}" style="display:inline-block;background:#7f1d1d;color:#fecaca;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;">Reject</a>
        </div>
        <p style="margin:0;padding:0 24px 20px;color:#6b7280;font-size:11px;">
          Approving permanently removes these records from the database. This link can be used once.
        </p>
      </div>
    </div>`
}

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin, userId } = auth

    try {
        const body = (await request.json().catch(() => null)) as {
            resource?: unknown
            ids?: unknown
            details?: unknown
        } | null

        if (!isDeleteResource(body?.resource)) {
            return NextResponse.json(
                { error: "BAD_RESOURCE" },
                { status: 400 },
            )
        }
        const resource = body.resource
        const ids = Array.isArray(body?.ids)
            ? body.ids.filter((x): x is string => typeof x === "string")
            : []
        if (ids.length === 0) {
            return NextResponse.json({ error: "NO_IDS" }, { status: 400 })
        }
        const rawDetails = Array.isArray(body?.details) ? body.details : []
        const details: Detail[] = ids.map((id, i) => {
            const d = rawDetails[i] as
                | { title?: unknown; subtitle?: unknown }
                | undefined
            return {
                title:
                    typeof d?.title === "string" && d.title ? d.title : id,
                subtitle:
                    typeof d?.subtitle === "string" ? d.subtitle : null,
            }
        })

        if (
            !process.env.RESEND_API_KEY ||
            process.env.RESEND_API_KEY === "dummy-key-for-build"
        ) {
            return NextResponse.json(
                { error: "EMAIL_NOT_CONFIGURED" },
                { status: 500 },
            )
        }

        // Resolve requester email (best effort).
        let requestedByEmail: string | null = null
        try {
            const { data } = await admin.auth.admin.getUserById(userId)
            requestedByEmail = data.user?.email ?? null
        } catch {
            requestedByEmail = null
        }

        const token = newDeleteToken()
        const { data: inserted, error: insErr } = await admin
            .from("admin_delete_requests")
            .insert({
                token,
                resource,
                item_ids: ids,
                details,
                requested_by: userId,
                requested_by_email: requestedByEmail,
                status: "pending",
            })
            .select("id")
            .single()
        if (insErr) {
            console.error("[admin/delete-requests] insert failed", insErr)
            return NextResponse.json(
                { error: "INSERT_FAILED", detail: insErr.message },
                { status: 500 },
            )
        }
        const requestId = inserted.id as string

        const origin = request.nextUrl.origin
        const approveUrl = `${origin}/api/admin/delete-requests/${token}/approve`
        const rejectUrl = `${origin}/api/admin/delete-requests/${token}/reject`

        const sent = await resend.emails.send({
            from: "AskingFate Admin <support@no-reply.askingfate.com>",
            to: [ADMIN_APPROVAL_EMAIL],
            subject: `Delete approval — ${ids.length} ${DELETE_RESOURCES[resource].label}`,
            html: buildEmailHtml({
                resourceLabel: DELETE_RESOURCES[resource].label,
                count: ids.length,
                details,
                requestedByEmail,
                approveUrl,
                rejectUrl,
            }),
        })

        if (sent.error) {
            // Don't leave an un-actionable request behind.
            await admin
                .from("admin_delete_requests")
                .delete()
                .eq("id", requestId)
            console.error("[admin/delete-requests] email failed", sent.error)
            return NextResponse.json(
                { error: "EMAIL_FAILED", detail: sent.error.message },
                { status: 500 },
            )
        }

        return NextResponse.json(
            {
                ok: true,
                requestId,
                count: ids.length,
                email: ADMIN_APPROVAL_EMAIL,
            },
            { status: 202 },
        )
    } catch (error) {
        console.error("[admin/delete-requests] failed", error)
        const detail =
            error instanceof Error ? error.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: "FAILED", detail }, { status: 500 })
    }
}
