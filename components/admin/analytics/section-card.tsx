"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

/**
 * Shared shell for an analytics section: header (icon + label + title) and
 * standardized loading / error / empty handling. Children render only when
 * data is present.
 */
export function AnalyticsSection({
    label,
    title,
    icon,
    loading,
    error,
    empty,
    emptyHint,
    children,
}: {
    label: string
    title: string
    icon: ReactNode
    loading: boolean
    error: boolean
    empty: boolean
    emptyHint?: string
    children: ReactNode
}) {
    const t = useTranslations("Admin")
    return (
        <section className="space-y-4">
            <div>
                <div className="flex items-center gap-2 text-amber-400/80">
                    {icon}
                    <span className="text-xs font-medium uppercase tracking-wider">
                        {label}
                    </span>
                </div>
                <h2 className="mt-1.5 font-serif text-xl font-semibold text-white">
                    {title}
                </h2>
            </div>

            {error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 px-4 py-8 text-center text-sm text-rose-200/80">
                    {t("metricsError")}
                </div>
            ) : loading ? (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-white/40">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : empty ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-center text-sm text-white/40">
                    <span>{t("analyticsEmpty")}</span>
                    {emptyHint ? (
                        <span className="text-xs text-white/30">{emptyHint}</span>
                    ) : null}
                </div>
            ) : (
                children
            )}
        </section>
    )
}

/** Placeholder card for a metric that's blocked (no underlying data). */
export function BlockedPlaceholder({ reason }: { reason: string }) {
    return (
        <div className="flex h-40 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/12 bg-white/[0.01] px-4 text-center">
            <span className="text-sm text-white/45">{reason}</span>
        </div>
    )
}
