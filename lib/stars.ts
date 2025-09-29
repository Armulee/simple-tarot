import type { User } from "@supabase/supabase-js"

export type StarState = {
  currentStars: number
  lastRefillAt: number | null
  refillCap: number
  firstLoginBonusGranted?: boolean
}

type GetOrCreateArgs = { p_anon_device_id: string | null; p_user_id: string | null }
type SpendArgs = { p_anon_device_id: string | null; p_amount: number; p_user_id: string | null }
type AddArgs = { p_anon_device_id: string | null; p_amount: number; p_user_id: string | null }

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
  const cap = user ? 12 : 5
  return {
    currentStars: row?.current_stars ?? 5,
    lastRefillAt: tsToMs(row?.last_refill_at),
    refillCap: cap,
    firstLoginBonusGranted: Boolean(row?.first_login_bonus_granted)
  }
}

// removed starRefresh; provider will handle periodic refresh/refill by calling get-or-create when needed

export async function starSpend(user: User | null, amount: number): Promise<{ ok: boolean, state: StarState }>
{
  const res = await fetch("/api/stars/spend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, user_id: user?.id ?? null }) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "STAR_SPEND_FAILED")
  const row = json.data?.[0]
  const cap = user ? 12 : 5
  const ok = Boolean(row?.ok)
  const state: StarState = { currentStars: row?.current_stars ?? 5, lastRefillAt: tsToMs(row?.last_refill_at), refillCap: cap }
  return { ok, state }
}

export async function starAdd(user: User | null, amount: number): Promise<StarState> {
  const res = await fetch("/api/stars/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, user_id: user?.id ?? null }) })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "STAR_ADD_FAILED")
  const row = json.data?.[0]
  const cap = user ? 12 : 5
  return { currentStars: row?.current_stars ?? 5, lastRefillAt: tsToMs(row?.last_refill_at), refillCap: cap }
}

export async function starSyncUserToDevice(user: User): Promise<void> {
  // Server-side only: we will assume DID exists; optional route can be added if needed
  await fetch("/api/stars/get-or-create")
}

