import type { User } from "@supabase/supabase-js"

export type StarState = {
    currentStars: number
    dailyStars: number
    planStars: number
    addonStars: number
    engagementStarsCurrent: number
    engagementStarsTotal: number
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

/** Anonymous cap must match server `star_spend` / `star_get_or_create` (see supabase-schema). */
const ANON_DAILY_CAP = 3

function resolvePrimaryStars(
    user: User | null,
    row: Record<string, unknown> | undefined
): number {
    const daily = Math.max(0, Number(row?.daily_stars ?? 0))
    if (user) return daily
    // Legacy DBs may still have balance in `anon_stars` while RPC spends only `daily_stars`.
    const anonRaw = row?.anon_stars
    const anon =
        anonRaw === undefined || anonRaw === null
            ? daily
            : Math.max(0, Number(anonRaw))
    return Math.min(ANON_DAILY_CAP, Math.max(daily, anon))
}

function resolvePrimaryLastRefill(
    user: User | null,
    row: Record<string, unknown> | undefined
): number | null {
    const dailyRefill = tsToMs(
        typeof row?.daily_last_refill_at === "string" ||
            row?.daily_last_refill_at === null
            ? (row?.daily_last_refill_at as string | null)
            : null
    )
    const anonRefill = tsToMs(
        typeof row?.anon_last_refill_at === "string" ||
            row?.anon_last_refill_at === null
            ? (row?.anon_last_refill_at as string | null)
            : null
    )
    const legacyRefill = tsToMs(
        typeof row?.last_refill_at === "string" || row?.last_refill_at === null
            ? (row?.last_refill_at as string | null)
            : null
    )
    return user ? dailyRefill ?? legacyRefill : anonRefill ?? legacyRefill
}

function resolveEngagementStars(
    row: Record<string, unknown> | undefined
): { current: number; total: number } {
    return {
        current: Number(row?.engagement_stars_current ?? 0),
        total: Number(row?.engagement_stars_total ?? 0),
    }
}

export async function starGetOrCreate(user: User | null): Promise<StarState> {
    const url = user?.id
        ? `/api/stars/get-or-create?user_id=${encodeURIComponent(user.id)}`
        : "/api/stars/get-or-create"
    const res = await fetch(url, { method: "GET" })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "STAR_INIT_FAILED")
    const row = json.data?.[0]
    const primaryStars = resolvePrimaryStars(user, row)
    const planStars = Number(row?.plan_stars ?? 0)
    const addonStars = Number(row?.addon_stars ?? 0)
    const engagement = resolveEngagementStars(row)
    return {
        currentStars: Number(row?.current_stars ?? primaryStars + planStars + addonStars),
        dailyStars: primaryStars,
        planStars,
        addonStars,
        engagementStarsCurrent: engagement.current,
        engagementStarsTotal: engagement.total,
        dailyLastRefillAt: resolvePrimaryLastRefill(user, row),
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
    const primaryStars = resolvePrimaryStars(user, row)
    const planStars = Number(row?.plan_stars ?? 0)
    const addonStars = Number(row?.addon_stars ?? 0)
    const engagement = resolveEngagementStars(row)
    const state: StarState = {
        currentStars: Number(row?.current_stars ?? primaryStars + planStars + addonStars),
        dailyStars: primaryStars,
        planStars,
        addonStars,
        engagementStarsCurrent: engagement.current,
        engagementStarsTotal: engagement.total,
        dailyLastRefillAt: resolvePrimaryLastRefill(user, row),
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
    const primaryStars = resolvePrimaryStars(user, row)
    const planStars = Number(row?.plan_stars ?? 0)
    const addonStars = Number(row?.addon_stars ?? 0)
    const engagement = resolveEngagementStars(row)
    return {
        currentStars: Number(row?.current_stars ?? primaryStars + planStars + addonStars),
        dailyStars: primaryStars,
        planStars,
        addonStars,
        engagementStarsCurrent: engagement.current,
        engagementStarsTotal: engagement.total,
        dailyLastRefillAt: resolvePrimaryLastRefill(user, row),
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
        currentStars: row?.current_stars ?? 6,
        dailyStars: row?.daily_stars ?? 6,
        planStars: row?.plan_stars ?? 0,
        addonStars: row?.addon_stars ?? 0,
        engagementStarsCurrent: Number(row?.engagement_stars_current ?? 0),
        engagementStarsTotal: Number(row?.engagement_stars_total ?? 0),
        dailyLastRefillAt: tsToMs(
            row?.daily_last_refill_at ?? row?.last_refill_at
        ),
    }
}

export async function starSyncUserToDevice(): Promise<void> {
    // Server-side only: we will assume DID exists; optional route can be added if needed
    await fetch("/api/stars/get-or-create")
}
