"use client"

import { useTranslations } from "next-intl"
import { Sparkles } from "lucide-react"
import type { RevealResult } from "./use-avatar-session"

/**
 * Persisted "result card" of a spoken reading — the caption a pure video
 * can't offer. Saved to the page's transcript so it can be re-read / shared.
 */
export function ResultCard({ result }: { result: RevealResult }) {
    const t = useTranslations("Avatar")
    return (
        <div className="rounded-2xl border border-primary/25 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2 text-amber-300">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold tracking-wide">
                    {result.card.name}
                    {result.card.isReversed ? ` · ${t("reversed")}` : ""}
                </span>
            </div>
            {result.question && (
                <p className="mb-2 text-xs italic text-muted-foreground">
                    “{result.question}”
                </p>
            )}
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                {result.text}
            </p>
        </div>
    )
}
