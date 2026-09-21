/**
 * Whose readings don't count as usage.
 *
 * Admins are the people testing the product, so their readings are real
 * `chat_sessions` rows that would still skew every admin number. The list is
 * the `admins` table — the same one requireAdmin() authorises against — so
 * adding an admin is all it takes; there is nothing else to configure.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

/** Ids are interpolated into PostgREST filter strings, so keep them inert. */
const SAFE_ID = /^[A-Za-z0-9_:.@-]+$/

/**
 * Owner ids whose sessions every admin surface leaves out.
 *
 * Reading the table is best effort: if it fails, the numbers include admin
 * readings, which beats failing the whole dashboard over a filter.
 */
export async function excludedOwnerIds(
    admin: SupabaseClient,
): Promise<string[]> {
    const { data, error } = await admin.from("admins").select("user_id")
    if (error) {
        console.error(
            "[admin] could not read the admins table; admin readings will be counted",
            error,
        )
        return []
    }
    const ids = (data ?? [])
        .map((row) => (row as { user_id?: unknown }).user_id)
        .filter(
            (id): id is string =>
                typeof id === "string" && id.length > 0 && SAFE_ID.test(id),
        )
    return Array.from(new Set(ids))
}

/**
 * Drop those owners' rows from a `chat_sessions` query.
 *
 * `owner_user_id <> id` evaluates to NULL — and so filters the row out — for
 * anonymous readings, hence the explicit null branch: guests must stay in.
 * An empty list filters nothing.
 */
export function excludeOwners<T extends { or: (filters: string) => T }>(
    query: T,
    ids: string[],
): T {
    if (ids.length === 0) return query
    return query.or(
        `owner_user_id.is.null,owner_user_id.not.in.(${ids.join(",")})`,
    )
}
