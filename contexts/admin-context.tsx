"use client"

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import NotFound from "@/app/not-found"

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

    if (state.status === "loading" || state.status === "forbidden") {
        return <NotFound />
    }

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
