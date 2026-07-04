"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { AnalyticsTotals } from "@/lib/admin/analytics-shared"

/** Fetches the all-time summary numbers once (independent of the date filter). */
export function useTotals() {
    const [data, setData] = useState<AnalyticsTotals | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (!session) {
                    if (!cancelled) setError(true)
                    return
                }
                const res = await fetch("/api/admin/analytics/totals", {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                })
                if (!res.ok) {
                    if (!cancelled) setError(true)
                    return
                }
                const json = (await res.json()) as AnalyticsTotals
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
    }, [])

    return { data, loading, error }
}
