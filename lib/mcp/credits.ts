import { supabaseAdmin } from "@/lib/supabase"

/** User-facing message Claude can relay verbatim when a user is out of stars. */
export const OUT_OF_CREDITS_MESSAGE =
    "You're out of credits. Top up at https://askingfate.com/pricing to keep going."

export class OutOfCreditsError extends Error {
    constructor() {
        super(OUT_OF_CREDITS_MESSAGE)
        this.name = "OutOfCreditsError"
    }
}

/**
 * Atomically consume `cost` stars (the app's credits, "ดวงดาว") for a user.
 *
 * Reuses the existing `star_spend` Postgres RPC — an atomic
 * check-and-decrement, so concurrent calls can't overspend (Task 4). Throws
 * `OutOfCreditsError` when the balance is insufficient; nothing is deducted in
 * that case.
 */
export async function consumeCredits(
    userId: string,
    cost: number,
): Promise<void> {
    if (!supabaseAdmin) {
        throw new Error("Supabase admin client is not configured")
    }

    const { data, error } = await supabaseAdmin.rpc("star_spend", {
        p_anon_device_id: null,
        p_amount: cost,
        p_user_id: userId,
    })

    if (error) {
        throw new Error(error.message)
    }

    const row = data?.[0] as { ok?: boolean } | undefined
    if (!row || row.ok === false) {
        throw new OutOfCreditsError()
    }
}
