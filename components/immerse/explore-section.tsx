"use client"

import { useTranslations } from "next-intl"

import HomeQuickCards from "@/components/home/home-quick-cards"
import { ResultCard } from "./stage/result-card"
import type { RevealResult } from "./use-avatar-session"

/**
 * What "scroll to explore" reveals: everything the avatar stage can't hold.
 *
 * Readings Astra has already spoken are re-readable here (a live video can't
 * be scrolled back), followed by the same quick-card strip the legacy landing
 * uses. The layout's <Footer /> lands underneath this section.
 */
export function ExploreSection({
    id,
    transcript,
    onPick,
}: {
    id: string
    transcript: RevealResult[]
    onPick: (question: string) => void
}) {
    const t = useTranslations("Immerse")
    return (
        <section id={id} className="relative z-10 px-4 pb-16 pt-12">
            <div className="mx-auto w-full max-w-2xl space-y-8">
                {transcript.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-white/70">
                            {t("savedReadings")}
                        </h2>
                        {transcript.map((result, i) => (
                            <ResultCard key={i} result={result} />
                        ))}
                    </div>
                )}

                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-white/70">
                        {t("exploreTitle")}
                    </h2>
                    <HomeQuickCards onCardClick={(question) => onPick(question)} embedded />
                </div>
            </div>
        </section>
    )
}
