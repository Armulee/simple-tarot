/**
 * Calling the admin analytics RPCs.
 *
 * These functions live in database-admin-analytics.sql, which is applied by
 * hand — so the database can legitimately be a step behind the deployed code.
 * Two things follow from that, and this module owns both:
 *
 *  1. p_exclude_owners (the admin-account filter) only exists once that file has
 *     been re-applied. If the database predates it, the call is retried without
 *     the argument rather than failing the whole dashboard.
 *  2. When a call fails for real, the reason travels to the client. A generic
 *     "Failed to load metrics." leaves an admin with nothing to act on; the
 *     PostgREST code and message say exactly what to fix.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

/** PostgREST: no function of that name/signature in the schema cache. */
const FN_NOT_FOUND = "PGRST202"

/** Shape the admin API returns to the client when a call fails. */
export type AnalyticsErrorBody = {
    error: "FAILED_TO_LOAD"
    /** Human-readable, safe to show on the admin page. */
    detail: string
    /** PostgREST/Postgres error code, when there was one. */
    code: string | null
    /** What to do about it, when we can tell. */
    hint: string | null
}

export class AnalyticsRpcError extends Error {
    // Written out rather than declared as constructor parameter properties:
    // node --experimental-strip-types (how the repo runs its tests) rejects those.
    readonly fn: string
    readonly code: string | null
    readonly pgHint: string | null

    constructor(
        fn: string,
        code: string | null,
        message: string,
        pgHint: string | null,
    ) {
        super(message)
        this.name = "AnalyticsRpcError"
        this.fn = fn
        this.code = code
        this.pgHint = pgHint
    }

    /** True when the function itself is missing — i.e. the SQL wasn't applied. */
    get isMissingFunction(): boolean {
        return this.code === FN_NOT_FOUND
    }
}

const MIGRATION_HINT =
    "Apply database-admin-analytics.sql to the Supabase database " +
    "(psql \"$DATABASE_URL\" -f database-admin-analytics.sql), then reload."

/** Build the 500 body for a failed analytics call. */
export function analyticsErrorBody(error: unknown): AnalyticsErrorBody {
    if (error instanceof AnalyticsRpcError) {
        return {
            error: "FAILED_TO_LOAD",
            detail: `${error.fn}: ${error.message}`,
            code: error.code,
            hint: error.isMissingFunction
                ? MIGRATION_HINT
                : (error.pgHint ?? null),
        }
    }
    return {
        error: "FAILED_TO_LOAD",
        detail: error instanceof Error ? error.message : "Unknown error",
        code: null,
        hint: null,
    }
}

type Args = Record<string, string | string[]>

/**
 * Call one analytics RPC.
 *
 * `excludeOwnerIds` are the ids to leave out (from excludedOwnerIds()); pass
 * none for a function that takes no p_exclude_owners — admin_analytics_context
 * reads stars/billing rather than sessions.
 */
export async function analyticsRpc<T>(
    admin: SupabaseClient,
    fn: string,
    args: Args = {},
    excludeOwnerIds: string[] = [],
): Promise<T> {
    const hasExclusion = excludeOwnerIds.length > 0

    let { data, error } = await admin.rpc(
        fn,
        hasExclusion ? { ...args, p_exclude_owners: excludeOwnerIds } : args,
    )

    // The database hasn't been migrated for the exclusion argument yet. Losing
    // the test-data filter beats losing the dashboard, so retry plainly — but
    // say so in the logs, because the numbers now include test readings.
    if (error?.code === FN_NOT_FOUND && hasExclusion) {
        console.warn(
            `[admin/analytics] ${fn} has no p_exclude_owners argument; ` +
                `retrying without the admin-account filter. ${MIGRATION_HINT}`,
        )
        ;({ data, error } = await admin.rpc(fn, args))
    }

    if (error) {
        throw new AnalyticsRpcError(
            fn,
            error.code ?? null,
            error.message,
            error.hint ?? null,
        )
    }
    return data as T
}
