"use client"

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react"
import { notFound } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

export type AdminMetrics = {
    totalUsers: number
    anonymousUsers: number
    authenticatedUsers: number
    interpretationCount: number
    paidSubscribers: number
}

type AdminContextValue =
    | { status: "loading" }
    | { status: "forbidden" }
    | { status: "ready"; metrics: AdminMetrics }

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminGuard({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth()
    const [state, setState] = useState<AdminContextValue>({ status: "loading" })

    useEffect(() => {
        if (loading) return
        if (!user) {
            setState({ status: "forbidden" })
            return
        }

        const check = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) {
                setState({ status: "forbidden" })
                return
            }

            const response = await fetch("/api/admin/metrics", {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            })

            if (response.status === 401 || response.status === 403) {
                setState({ status: "forbidden" })
                return
            }

            if (!response.ok) {
                setState({ status: "forbidden" })
                return
            }

            const data = (await response.json()) as AdminMetrics
            setState({ status: "ready", metrics: data })
        }

        void check()
    }, [loading, user])

    // A non-admin must not be able to tell /admin apart from any other missing
    // page, so hand off to the real not-found boundary rather than rendering an
    // admin-specific copy of it: same markup, same metadata, same title.
    // Only the settled "forbidden" state may throw — throwing while the check is
    // still in flight would strand a genuine admin in that boundary.
    if (state.status === "forbidden") notFound()
    if (state.status === "loading") return null

    return (
        <AdminContext.Provider value={state}>
            {children}
        </AdminContext.Provider>
    )
}

export function useAdmin() {
    const ctx = useContext(AdminContext)
    if (!ctx || ctx.status !== "ready") {
        return null
    }
    return ctx.metrics
}
