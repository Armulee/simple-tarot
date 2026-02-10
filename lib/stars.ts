import type { User } from "@supabase/supabase-js"

export type StarState = {
    currentStars: number
    dailyStars: number
    planStars: number
    addonStars: number
    dailyLastRefillAt: number | null
    firstLoginBonusGranted?: boolean
    firstTimeLoginGrant?: boolean
}

// type GetOrCreateArgs = { p_anon_device_id: string | null; p_user_id: string | null }
// type SpendArgs = { p_anon_device_id: string | null; p_amount: number; p_user_id: string | null }
// type AddArgs = { p_anon_device_id: string | null; p_amount: number; p_user_id: string | null }

function tsToMs(ts?: string | null): number | null {
    if (!ts) return null
    const d = new Date(ts)
    const ms = d.getTime()
    return Number.isFinite(ms) ? ms : null
}

export async function starGetOrCreate(user: User | null): Promise<StarState> {
    const url = user?.id
        ? `/api/stars/get-or-create?user_id=${encodeURIComponent(user.id)}`
        : "/api/stars/get-or-create"
    const res = await fetch(url, { method: "GET" })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "STAR_INIT_FAILED")
    const row = json.data?.[0]
    return {
        currentStars: row?.current_stars ?? 5,
        dailyStars: row?.daily_stars ?? row?.current_stars ?? 5,
        planStars: row?.plan_stars ?? 0,
        addonStars: row?.addon_stars ?? 0,
        dailyLastRefillAt: tsToMs(
            row?.daily_last_refill_at ?? row?.last_refill_at
        ),
        firstLoginBonusGranted: Boolean(row?.first_login_bonus_granted),
        firstTimeLoginGrant: Boolean(row?.first_time_login_grant),
    }
}

// removed starRefresh; no periodic refresh needed

export async function starSpend(
    user: User | null,
    amount: number
): Promise<{ ok: boolean; state: StarState }> {
    const res = await fetch("/api/stars/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, user_id: user?.id ?? null }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "STAR_SPEND_FAILED")
    const row = json.data?.[0]
    const ok = Boolean(row?.ok)
    const state: StarState = {
        currentStars: row?.current_stars ?? 5,
        dailyStars: row?.daily_stars ?? 5,
        planStars: row?.plan_stars ?? 0,
        addonStars: row?.addon_stars ?? 0,
        dailyLastRefillAt: tsToMs(
            row?.daily_last_refill_at ?? row?.last_refill_at
        ),
    }
    return { ok, state }
}

export async function starAdd(
    user: User | null,
    amount: number
): Promise<StarState> {
    const res = await fetch("/api/stars/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, user_id: user?.id ?? null }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "STAR_ADD_FAILED")
    const row = json.data?.[0]
    return {
        currentStars: row?.current_stars ?? 5,
        dailyStars: row?.daily_stars ?? 5,
        planStars: row?.plan_stars ?? 0,
        addonStars: row?.addon_stars ?? 0,
        dailyLastRefillAt: tsToMs(
            row?.daily_last_refill_at ?? row?.last_refill_at
        ),
    }
}

export async function starSet(user: User, balance: number): Promise<StarState> {
    const res = await fetch("/api/stars/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, balance }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "STAR_SET_FAILED")
    const row = json.data?.[0]
    return {
        currentStars: row?.current_stars ?? 5,
        dailyStars: row?.daily_stars ?? 5,
        planStars: row?.plan_stars ?? 0,
        addonStars: row?.addon_stars ?? 0,
        dailyLastRefillAt: tsToMs(
            row?.daily_last_refill_at ?? row?.last_refill_at
        ),
    }
}

export async function starSyncUserToDevice(): Promise<void> {
    // Server-side only: we will assume DID exists; optional route can be added if needed
    await fetch("/api/stars/get-or-create")
}
