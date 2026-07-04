/**
 * Server-side wish economy + free-reveal gating for the avatar feature.
 *
 * Every function here is a thin, typed wrapper over the SECURITY DEFINER RPCs
 * defined in database-avatar-wishes.sql. The atomicity / locking lives in
 * Postgres (FOR UPDATE on the entitlement row), so this module just calls the
 * RPCs through the service-role client. Never call these from the client.
 */

import { supabaseAdmin } from "@/lib/supabase"

export type AvatarMode = "free" | "paid"

export type Entitlement = {
    freeRevealUsed: boolean
    wishBalance: number
}

export type StartSessionResult =
    | {
          ok: true
          mode: AvatarMode
          wishBalance: number
          freeRevealUsed: boolean
      }
    | {
          ok: false
          reason: "NO_WISHES" | "SESSION_ALREADY_ACTIVE" | "INVALID_ARGS" | "DB_ERROR"
          wishBalance: number
          freeRevealUsed: boolean
      }

function requireAdmin() {
    if (!supabaseAdmin) {
        throw new Error("SUPABASE_NOT_CONFIGURED")
    }
    return supabaseAdmin
}

/** Read (creating if missing) the user's free-reveal flag + wish balance. */
export async function getEntitlement(userId: string): Promise<Entitlement> {
    const admin = requireAdmin()
    const { data, error } = await admin.rpc("avatar_get_or_create_entitlement", {
        p_user_id: userId,
    })
    if (error) throw new Error(error.message)
    const row = Array.isArray(data) ? data[0] : data
    return {
        freeRevealUsed: Boolean(row?.free_reveal_used),
        wishBalance: Number(row?.wish_balance ?? 0),
    }
}

/**
 * Atomically check eligibility and reserve the session:
 *   - free path: reserve the free reveal (reverted on refund),
 *   - paid path: deduct 1 wish (refunded on refund).
 * Rejects if neither is available, or if the user already has a live session.
 */
export async function startSession(opts: {
    userId: string
    sessionId: string
    durationSeconds: number
}): Promise<StartSessionResult> {
    const admin = requireAdmin()
    const { data, error } = await admin.rpc("avatar_start_session", {
        p_user_id: opts.userId,
        p_session_id: opts.sessionId,
        p_duration_seconds: opts.durationSeconds,
    })
    if (error) {
        return {
            ok: false,
            reason: "DB_ERROR",
            wishBalance: 0,
            freeRevealUsed: false,
        }
    }
    const row = Array.isArray(data) ? data[0] : data
    const wishBalance = Number(row?.wish_balance ?? 0)
    const freeRevealUsed = Boolean(row?.free_reveal_used)
    if (row?.ok) {
        return {
            ok: true,
            mode: row.mode as AvatarMode,
            wishBalance,
            freeRevealUsed,
        }
    }
    const reason = (row?.reason as string) ?? "DB_ERROR"
    return {
        ok: false,
        reason:
            reason === "NO_WISHES" ||
            reason === "SESSION_ALREADY_ACTIVE" ||
            reason === "INVALID_ARGS"
                ? reason
                : "DB_ERROR",
        wishBalance,
        freeRevealUsed,
    }
}

/** Store the short-lived HeyGen token on the session row (server-only). */
export async function attachHeygenToken(sessionId: string, token: string): Promise<void> {
    const admin = requireAdmin()
    await admin
        .from("avatar_sessions")
        .update({ heygen_token: token })
        .eq("session_id", sessionId)
}

export type SessionRecord = {
    sessionId: string
    userId: string
    mode: AvatarMode
    status: "active" | "ended"
    spoke: boolean
    heygenToken: string | null
    expiresAt: string | null
}

/** Load a session row (used by speak/stop to verify ownership + get token). */
export async function getSession(sessionId: string): Promise<SessionRecord | null> {
    const admin = requireAdmin()
    const { data, error } = await admin
        .from("avatar_sessions")
        .select("session_id, user_id, mode, status, spoke, heygen_token, expires_at")
        .eq("session_id", sessionId)
        .maybeSingle()
    if (error || !data) return null
    return {
        sessionId: data.session_id,
        userId: data.user_id,
        mode: data.mode,
        status: data.status,
        spoke: Boolean(data.spoke),
        heygenToken: data.heygen_token ?? null,
        expiresAt: data.expires_at ?? null,
    }
}

/**
 * Mark that the avatar genuinely spoke. After this the credit (free or wish)
 * is considered consumed and end-of-session will not refund it.
 */
export async function markSpoke(sessionId: string): Promise<void> {
    const admin = requireAdmin()
    const { error } = await admin.rpc("avatar_mark_spoke", { p_session_id: sessionId })
    if (error) throw new Error(error.message)
}

/**
 * End the session. Refunds automatically when the avatar never spoke (broken
 * session). Pass forceRefund to refund even after speaking (rare).
 */
export async function endSession(
    sessionId: string,
    forceRefund = false,
): Promise<{ ended: boolean; refunded: boolean; mode: AvatarMode | null }> {
    const admin = requireAdmin()
    const { data, error } = await admin.rpc("avatar_end_session", {
        p_session_id: sessionId,
        p_force_refund: forceRefund,
    })
    if (error) return { ended: false, refunded: false, mode: null }
    const row = Array.isArray(data) ? data[0] : data
    return {
        ended: Boolean(row?.ended),
        refunded: Boolean(row?.refunded),
        mode: (row?.mode as AvatarMode) ?? null,
    }
}
