/** Server-side config for the admin delete-approval workflow. */

import type { SupabaseClient } from "@supabase/supabase-js"

export const ADMIN_APPROVAL_EMAIL = "admin@askingfate.com"

/** Resources an admin may request to delete, mapped to their backing table. */
export const DELETE_RESOURCES = {
    interpretations: { table: "chat_sessions", label: "Interpretations" },
    revenue: { table: "billing_transactions", label: "Revenue transactions" },
} as const

export type DeleteResource = keyof typeof DELETE_RESOURCES

export function isDeleteResource(v: unknown): v is DeleteResource {
    return typeof v === "string" && v in DELETE_RESOURCES
}

/**
 * Map of itemId → pending-request id for a resource, so list endpoints can flag
 * rows that already have an open delete request. Resilient to the table not yet
 * existing (returns an empty map).
 */
export async function pendingDeletionMap(
    admin: SupabaseClient,
    resource: DeleteResource,
): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    const { data } = await admin
        .from("admin_delete_requests")
        .select("id, item_ids")
        .eq("resource", resource)
        .eq("status", "pending")
    for (const r of data ?? []) {
        const row = r as { id: string; item_ids?: unknown }
        const ids = Array.isArray(row.item_ids)
            ? (row.item_ids as string[])
            : []
        for (const id of ids) map.set(id, row.id)
    }
    return map
}

/** 256-bit unguessable token for the email approval links. */
export function newDeleteToken(): string {
    return (
        crypto.randomUUID().replace(/-/g, "") +
        crypto.randomUUID().replace(/-/g, "")
    )
}

/** Minimal standalone HTML page shown after clicking an email link. */
export function resultPageHtml(
    title: string,
    message: string,
    tone: "ok" | "warn" | "error",
): string {
    const color =
        tone === "ok" ? "#10b981" : tone === "warn" ? "#f59e0b" : "#ef4444"
    return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;background:#0b1020;font-family:-apple-system,Segoe UI,Roboto,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="max-width:440px;margin:24px;padding:32px;background:#0f172a;border:1px solid #1f2937;border-radius:16px;text-align:center;">
    <div style="width:48px;height:48px;border-radius:999px;background:${color}22;color:${color};font-size:24px;line-height:48px;margin:0 auto 16px;">●</div>
    <h1 style="margin:0 0 8px;color:#fff;font-size:20px;">${title}</h1>
    <p style="margin:0;color:#9ca3af;font-size:14px;">${message}</p>
  </div>
</body></html>`
}
