"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Link } from "@/i18n/navigation"
import { cardNameToSlug, getKeywordsForCard } from "@/lib/tarot/codex-utils"
import NotFound from "@/app/not-found"

export type TarotCodexRow = {
    id: number
    card_name: string
    meaning_general: string
    reversed_meaning_general: string
    meaning_love: string | null
    reversed_meaning_love: string | null
    meaning_career: string | null
    reversed_meaning_career: string | null
    meaning_financial: string | null
    reversed_meaning_financial: string | null
    advice: string | null
    astrology: string | null
    timing: string | null
    yes_no: string | null
}

type AdminState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "notfound" }
    | { status: "ready"; data: TarotCodexRow[] }

function truncate(s: string, len = 100) {
    if (!s) return ""
    return s.length > len ? s.slice(0, len) + "…" : s
}

export default function AdminTarotCodexPage() {
    const { user, loading } = useAuth()
    const [state, setState] = useState<AdminState>({ status: "loading" })

    const fetchData = useCallback(async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
            setState({ status: "notfound" })
            return
        }

        const response = await fetch("/api/admin/tarot-codex", {
            headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (response.status === 401 || response.status === 403) {
            setState({ status: "notfound" })
            return
        }

        if (!response.ok) {
            setState({ status: "error", message: "Failed to load tarot codex" })
            return
        }

        const data = (await response.json()) as TarotCodexRow[]
        setState({ status: "ready", data })
    }, [])

    useEffect(() => {
        if (loading) return
        if (!user) {
            setState({ status: "notfound" })
            return
        }
        void fetchData()
    }, [loading, user, fetchData])

    if (state.status === "loading") {
        return (
            <div className="min-h-screen px-6 py-16">
                <div className="mx-auto max-w-6xl">
                    <h1 className="mb-4 font-serif text-3xl text-white">
                        Tarot Codex
                    </h1>
                    <p className="text-white/60">Loading...</p>
                </div>
            </div>
        )
    }

    if (state.status === "notfound") return <NotFound />

    if (state.status === "error") {
        return (
            <div className="min-h-screen px-6 py-16">
                <div className="mx-auto max-w-6xl">
                    <h1 className="mb-4 font-serif text-3xl text-white">
                        Tarot Codex
                    </h1>
                    <p className="text-red-300">{state.message}</p>
                </div>
            </div>
        )
    }

    const rows = state.data

    return (
        <div className="min-h-screen px-6 py-16">
            <div className="mx-auto max-w-6xl space-y-8">
                <div>
                    <Link
                        href="/admin"
                        className="text-sm text-white/60 hover:text-white"
                    >
                        ← Admin
                    </Link>
                    <h1 className="mt-2 font-serif text-3xl text-white">
                        Tarot Codex
                    </h1>
                    <p className="mt-1 text-white/60">
                        {rows.length} cards · Click any card to edit
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {rows.map((row) => {
                        const slug = cardNameToSlug(row.card_name)
                        const keywords = getKeywordsForCard(row.card_name)

                        return (
                            <Link
                                key={row.id}
                                href={`/admin/tarot-codex/${row.id}`}
                                className="group block"
                            >
                                <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-4 shadow-lg transition-all duration-300 hover:border-amber-500/50 hover:shadow-amber-500/10 hover:shadow-xl">
                                    <div className="relative mx-auto mb-4 aspect-[2/3] w-full max-w-[140px] overflow-hidden rounded-lg border border-white/20 bg-white/5 shadow-md">
                                        <Image
                                            src={`/assets/rider-waite-tarot/${slug}.png`}
                                            alt={row.card_name}
                                            fill
                                            sizes="140px"
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                    <h3 className="text-center font-semibold text-white">
                                        {row.card_name}
                                    </h3>
                                    {keywords.length > 0 && (
                                        <div className="mt-2 flex flex-wrap justify-center gap-1">
                                            {keywords.slice(0, 4).map((kw) => (
                                                <span
                                                    key={kw}
                                                    className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200"
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <p className="mt-3 line-clamp-3 text-sm text-white/70">
                                        {truncate(row.meaning_general, 120)}
                                    </p>
                                    <div className="mt-3 text-center text-xs text-amber-400/80">
                                        Edit →
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
