"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { DemographicsAnalytics } from "@/lib/admin/analytics-shared"
import { readErrorDetail } from "./error-detail"

/** Fetches the demographic breakdown once — it has no date range. */
export function useDemographics() {
    const [data, setData] = useState<DemographicsAnalytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [detail, setDetail] = useState<string | null>(null)

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
                const res = await fetch("/api/admin/demographics", {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                })
                if (!res.ok) {
                    const why = await readErrorDetail(res)
                    if (!cancelled) {
                        setError(true)
                        setDetail(why)
                    }
                    return
                }
                const json = (await res.json()) as DemographicsAnalytics
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

    return { data, loading, error, detail }
}
