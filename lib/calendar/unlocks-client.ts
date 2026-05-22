export type CalendarUnlock = {
    date: string
    starsSpent: number
    createdAt: string
}

export type StarSnapshot = {
    daily_stars: number
    plan_stars: number
    addon_stars: number
    engagement_stars_current: number
    engagement_stars_total: number
    current_stars: number
    daily_last_refill_at: string | null
}

export type UnlockResponse =
    | {
          ok: true
          already_unlocked: boolean
          unlocked_date?: string
          stars_spent?: number
          stars?: StarSnapshot
      }
    | {
          ok: false
          error: "INSUFFICIENT_STARS"
          current_stars: number
          cost: number
      }

export async function fetchCalendarUnlocks(
    userId: string,
    signal?: AbortSignal,
): Promise<CalendarUnlock[]> {
    const res = await fetch(
        `/api/calendar/unlock?user_id=${encodeURIComponent(userId)}`,
        { method: "GET", signal },
    )
    if (!res.ok) throw new Error(`UNLOCKS_FETCH_FAILED:${res.status}`)
    const json = (await res.json()) as { unlocks?: CalendarUnlock[] }
    return json.unlocks ?? []
}

export async function purchaseCalendarUnlock(
    userId: string,
    date: string,
): Promise<UnlockResponse> {
    const res = await fetch("/api/calendar/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, date }),
    })
    const json = await res.json()
    if (res.status === 402) {
        return {
            ok: false,
            error: "INSUFFICIENT_STARS",
            current_stars: Number(json?.current_stars ?? 0),
            cost: Number(json?.cost ?? 1),
        }
    }
    if (!res.ok) {
        throw new Error(json?.error || `UNLOCK_FAILED:${res.status}`)
    }
    return json as UnlockResponse
}
