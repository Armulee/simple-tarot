"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { AdminAnalyticsResponse } from "@/lib/admin/analytics-shared"

/**
 * Fetches the full analytics payload for the shared [from, to] window.
 * One request feeds every analytics card, so changing the date filter
 * refreshes all of them together.
 */
export function useAnalytics(fromISO: string, toISO: string) {
    const [data, setData] = useState<AdminAnalyticsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        if (!fromISO || !toISO) return
        let cancelled = false
        setLoading(true)
        setError(false)
        ;(async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (!session) {
                    if (!cancelled) setError(true)
                    return
                }
                const res = await fetch(
                    `/api/admin/analytics?from=${fromISO}&to=${toISO}`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    },
                )
                if (!res.ok) {
                    if (!cancelled) setError(true)
                    return
                }
                const json = (await res.json()) as AdminAnalyticsResponse
                if (!cancelled) setData(json)
            } catch {
                if (!cancelled) setError(true)
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [fromISO, toISO])

    return { data, loading, error }
}
