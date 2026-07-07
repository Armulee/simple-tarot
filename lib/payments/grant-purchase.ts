import "server-only"

import { supabaseAdmin } from "@/lib/supabase"
import {
    getPackById,
    getPackBaseStars,
    getPackFirstPurchaseBonus,
} from "@/lib/payments/star-products"

export type GrantPurchaseResult =
    | { status: "granted"; granted: number; firstBonusApplied: boolean }
    | { status: "duplicate" }
    | { status: "not_a_pack" }
    | { status: "error"; error: string }

/**
 * Grant a one-time star pack, idempotently and atomically.
 *
 * The idempotency key is the Stripe CHECKOUT SESSION id. It is passed to
 * star_grant_purchase, which claims a UNIQUE billing_transactions row and
 * applies the balance grant in a single DB transaction. Both the Stripe
 * webhook (the intended primary path) and the /success page (a safety net for
 * when the webhook is delayed or not yet configured) call this with the same
 * key, so a purchase is granted exactly once no matter which path fires first
 * or how many times either is retried.
 */
export async function grantPackPurchase(params: {
    userId: string
    /** Stripe checkout session id — the idempotency key. */
    sessionId: string
    priceId: string
    amountCents: number
    currency: string
}): Promise<GrantPurchaseResult> {
    const { userId, sessionId, priceId, amountCents, currency } = params

    if (!supabaseAdmin) {
        return { status: "error", error: "SERVER_NOT_CONFIGURED" }
    }

    const pack = getPackById(priceId)
    if (!pack) {
        // Not a known one-time pack (e.g. a subscription price). Don't grant.
        return { status: "not_a_pack" }
    }

    const { data, error } = await supabaseAdmin.rpc("star_grant_purchase", {
        p_user_id: userId,
        p_session_id: sessionId,
        p_stars: getPackBaseStars(pack),
        p_first_bonus: getPackFirstPurchaseBonus(pack),
        p_amount_cents: Math.max(0, Math.round(amountCents)),
        p_currency: (currency || "USD").toUpperCase(),
        p_pack_name: pack.name,
    })

    if (error) {
        console.error("[grantPackPurchase] star_grant_purchase failed", {
            userId,
            sessionId,
            error: error.message,
        })
        return { status: "error", error: error.message }
    }

    const row = data?.[0] as
        | { status?: string; granted?: number; first_bonus_applied?: boolean }
        | undefined

    if (row?.status === "duplicate") {
        return { status: "duplicate" }
    }

    return {
        status: "granted",
        granted: Number(row?.granted ?? 0),
        firstBonusApplied: Boolean(row?.first_bonus_applied),
    }
}
