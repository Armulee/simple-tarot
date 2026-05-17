"use client"

import { AlertTriangle, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { DayData } from "@/lib/calendar-helper"
import { severityClass } from "@/lib/calendar-styles"
import { SectionHeader } from "./SectionHeader"

export function HighlightsWarningsCard({ data }: { data: DayData }) {
    const t = useTranslations("Calendar")

    if (data.highlights.length === 0 && data.warnings.length === 0) {
        return null
    }

    return (
        <div className='rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-5 space-y-3'>
            <SectionHeader
                icon={Sparkles}
                label={t("detail.highlightsWarnings")}
            />
            <ul className='space-y-2'>
                {data.highlights.map((h, i) => (
                    <li
                        key={`h-${i}`}
                        className='flex items-start gap-3 rounded-2xl bg-amber-200/[0.04] ring-1 ring-amber-200/15 px-3 py-2.5'
                    >
                        <span className='mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-amber-300/15 ring-1 ring-amber-300/30'>
                            <Sparkles className='h-3 w-3 text-amber-200' />
                        </span>
                        <div>
                            <div className='text-sm text-white/90 leading-snug'>
                                {h.text}
                            </div>
                            <div className='text-[11px] text-amber-200/70 mt-0.5'>
                                {h.category}
                            </div>
                        </div>
                    </li>
                ))}
                {data.warnings.map((w, i) => (
                    <li
                        key={`w-${i}`}
                        className={cn(
                            "flex items-start gap-3 rounded-2xl px-3 py-2.5 ring-1",
                            w.severity === "high"
                                ? "bg-red-500/[0.06] ring-red-500/30"
                                : w.severity === "medium"
                                  ? "bg-orange-500/[0.05] ring-orange-500/25"
                                  : "bg-yellow-500/[0.04] ring-yellow-500/20",
                        )}
                    >
                        <span
                            className={cn(
                                "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xl ring-1",
                                w.severity === "high"
                                    ? "bg-red-500/15 ring-red-400/40"
                                    : w.severity === "medium"
                                      ? "bg-orange-500/15 ring-orange-400/30"
                                      : "bg-yellow-500/15 ring-yellow-400/30",
                            )}
                        >
                            <AlertTriangle
                                className={cn(
                                    "h-3 w-3",
                                    severityClass[w.severity],
                                )}
                            />
                        </span>
                        <div className='text-sm text-white/85 leading-snug'>
                            {w.text}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}
