"use client"

import { Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"

import { followUpChipClass } from "@/components/question-input"

/** "Try asking…" starter prompts. Tapping one sends it straight to Astra. */
export function TryAskingChips({ onPick }: { onPick: (question: string) => void }) {
    const t = useTranslations("Immerse")
    const prompts = t.raw("tryAsking") as string[]
    if (!Array.isArray(prompts) || prompts.length === 0) return null

    return (
        <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-white/85">
                <Sparkles className="h-4 w-4 text-amber-200" />
                {t("tryAskingLabel")}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                {prompts.map((prompt) => (
                    <button
                        key={prompt}
                        type="button"
                        onClick={() => onPick(prompt)}
                        className={`${followUpChipClass} shrink-0 whitespace-nowrap`}
                    >
                        {prompt}
                    </button>
                ))}
            </div>
        </div>
    )
}
