"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import NotFound from "@/app/not-found"

type AdminMetrics = {
    totalUsers: number
    anonymousUsers: number
    authenticatedUsers: number
    interpretationCount: number
    paidSubscribers: number
}

type AdminState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "notfound" }
    | { status: "ready"; data: AdminMetrics }

export default function AdminDashboardPage() {
    const t = useTranslations("Admin")
    const { user, loading } = useAuth()
    const [state, setState] = useState<AdminState>({ status: "loading" })

    useEffect(() => {
        if (loading) return
        if (!user) {
            setState({ status: "notfound" })
            return
        }

        const loadMetrics = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (!session) {
                    setState({ status: "notfound" })
                    return
                }

                const response = await fetch("/api/admin/metrics", {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                })

                if (response.status === 401 || response.status === 403) {
                    setState({ status: "notfound" })
                    return
                }

                if (!response.ok) {
                    setState({
                        status: "error",
                        message: t("metricsError"),
                    })
                    return
                }

                const data = (await response.json()) as AdminMetrics
                setState({ status: "ready", data })
            } catch {
                setState({
                    status: "error",
                    message: t("metricsError"),
                })
            }
        }

        void loadMetrics()
    }, [loading, user, t])

    if (state.status === "loading") {
        return (
            <div className='min-h-screen px-6 py-16'>
                <div className='max-w-5xl mx-auto'>
                    <h1 className='text-3xl font-serif text-white mb-4'>
                        {t("title")}
                    </h1>
                    <p className='text-white/60'>{t("loading")}</p>
                </div>
            </div>
        )
    }

    if (state.status === "notfound") {
        return <NotFound />
    }

    if (state.status === "error") {
        return (
            <div className='min-h-screen px-6 py-16'>
                <div className='max-w-5xl mx-auto'>
                    <h1 className='text-3xl font-serif text-white mb-4'>
                        {t("title")}
                    </h1>
                    <p className='text-red-300'>{state.message}</p>
                </div>
            </div>
        )
    }

    const metrics = state.data

    const cards = [
        { label: t("totalUsers"), value: metrics.totalUsers },
        { label: t("anonymousUsers"), value: metrics.anonymousUsers },
        { label: t("authenticatedUsers"), value: metrics.authenticatedUsers },
        { label: t("interpretations"), value: metrics.interpretationCount },
        { label: t("paidSubscribers"), value: metrics.paidSubscribers },
    ]

    return (
        <div className='min-h-screen px-6 py-16'>
            <div className='max-w-5xl mx-auto space-y-8'>
                <div>
                    <h1 className='text-3xl font-serif text-white'>
                        {t("title")}
                    </h1>
                    <p className='text-white/60 mt-2'>{t("subtitle")}</p>
                    <Link
                        href="/admin/tarot-codex"
                        className='mt-4 inline-block text-sm text-white/70 underline hover:text-white'
                    >
                        Tarot Codex →
                    </Link>
                </div>

                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {cards.map((card) => (
                        <Card
                            key={card.label}
                            className='border border-white/10 bg-white/5 p-5 text-white'
                        >
                            <p className='text-sm text-white/60'>
                                {card.label}
                            </p>
                            <p className='mt-3 text-3xl font-semibold'>
                                {card.value.toLocaleString()}
                            </p>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
