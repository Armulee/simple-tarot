"use client"

import { useTranslations } from "next-intl"

import { ResultCard } from "./stage/result-card"
import type { RevealResult } from "./use-avatar-session"

/**
 * Readings Astra has already spoken, re-readable below the stage — a live
 * video can't be scrolled back.
 *
 * The AskingFate story that used to sit here now renders at page level as the
 * `#learn-more` section, so both landing modes carry it; this only holds what
 * is specific to a live avatar session. Nothing renders until there is
 * something to show.
 */
export function ExploreSection({
    transcript,
}: {
    transcript: RevealResult[]
}) {
    const t = useTranslations("Immerse")
    if (transcript.length === 0) return null

    return (
        <section className="relative z-10 px-4 pb-8 pt-12">
            <div className="mx-auto w-full max-w-2xl space-y-3">
                <h2 className="text-sm font-semibold text-white/70">
                    {t("savedReadings")}
                </h2>
                {transcript.map((result, i) => (
                    <ResultCard key={i} result={result} />
                ))}
            </div>
        </section>
    )
}
