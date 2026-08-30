import type { AnalyticsErrorBody } from "@/lib/admin/analytics-rpc"

/**
 * Pull the technical reason out of a failed admin analytics response.
 *
 * The admin page is the only place this renders, and an admin staring at
 * "Failed to load metrics." has nothing to act on — the PostgREST message plus
 * its hint usually names the exact fix (most often: apply the analytics SQL).
 * Returns null when the body carries nothing useful.
 */
export async function readErrorDetail(res: Response): Promise<string | null> {
    try {
        const body = (await res.json()) as Partial<AnalyticsErrorBody>
        const parts = [body.detail, body.hint].filter(
            (p): p is string => typeof p === "string" && p.length > 0,
        )
        return parts.length > 0 ? parts.join(" — ") : `HTTP ${res.status}`
    } catch {
        return `HTTP ${res.status}`
    }
}
