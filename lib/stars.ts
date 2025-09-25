import { supabase } from "./supabase"
import { getAnonDeviceId } from "./device-id"
import type { User } from "@supabase/supabase-js"

export type StarState = {
  currentStars: number
  lastRefillAt: number | null
  refillCap: number
}

function getHeaders() {
  if (typeof window === "undefined") return {}
  const did = getAnonDeviceId()
  return did ? { "x-anon-device-id": did } : {}
}

function tsToMs(ts?: string | null): number | null {
  if (!ts) return null
  const d = new Date(ts)
  const ms = d.getTime()
  return Number.isFinite(ms) ? ms : null
}

export async function starGetOrCreate(user: User | null): Promise<StarState> {
  const anonId = typeof window !== "undefined" ? getAnonDeviceId() : null
  const { data, error } = await supabase.rpc("star_get_or_create", {
    p_anon_device_id: anonId,
    p_user_id: user?.id ?? null
  })
  if (error) throw error
  const cap = user ? 15 : 5
  return {
    currentStars: data?.[0]?.current_stars ?? 5,
    lastRefillAt: tsToMs(data?.[0]?.last_refill_at),
    refillCap: cap
  }
}

export async function starRefresh(user: User | null): Promise<StarState> {
  const anonId = typeof window !== "undefined" ? getAnonDeviceId() : null
  const { data, error } = await supabase.rpc("star_refresh", {
    p_anon_device_id: anonId,
    p_user_id: user?.id ?? null
  })
  if (error) throw error
  const cap = user ? 15 : 5
  return {
    currentStars: data?.[0]?.current_stars ?? 5,
    lastRefillAt: tsToMs(data?.[0]?.last_refill_at),
    refillCap: cap
  }
}

export async function starSpend(user: User | null, amount: number): Promise<{ ok: boolean, state: StarState }>
{
  const anonId = typeof window !== "undefined" ? getAnonDeviceId() : null
  const { data, error } = await supabase.rpc("star_spend", {
    p_anon_device_id: anonId,
    p_user_id: user?.id ?? null,
    p_amount: amount
  })
  if (error) throw error
  const cap = user ? 15 : 5
  const ok = Boolean(data?.[0]?.ok)
  const state: StarState = {
    currentStars: data?.[0]?.current_stars ?? 5,
    lastRefillAt: tsToMs(data?.[0]?.last_refill_at),
    refillCap: cap
  }
  return { ok, state }
}

export async function starAdd(user: User | null, amount: number): Promise<StarState> {
  const anonId = typeof window !== "undefined" ? getAnonDeviceId() : null
  const { data, error } = await supabase.rpc("star_add", {
    p_anon_device_id: anonId,
    p_user_id: user?.id ?? null,
    p_amount: amount
  })
  if (error) throw error
  const cap = user ? 15 : 5
  return {
    currentStars: data?.[0]?.current_stars ?? 5,
    lastRefillAt: tsToMs(data?.[0]?.last_refill_at),
    refillCap: cap
  }
}

export async function starSyncUserToDevice(user: User): Promise<void> {
  const anonId = typeof window !== "undefined" ? getAnonDeviceId() : null
  if (!anonId) return
  const { error } = await supabase.rpc("star_sync_user_to_device", {
    p_anon_device_id: anonId,
    p_user_id: user.id
  })
  if (error) throw error
}

