"use client"

import { MessageCircle, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"

import type { LandingMode } from "@/lib/landing-mode-storage"

/**
 * The floating button that swaps the landing page between the talking avatar
 * and the original chat composer. Present in both modes so neither is a
 * one-way door.
 */
export function ModeFab({
    mode,
    onToggle,
}: {
    mode: LandingMode
    onToggle: () => void
}) {
    const t = useTranslations("Immerse")
    const toLegacy = mode === "immerse"
    const label = toLegacy ? t("switchToLegacy") : t("switchToImmerse")

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={label}
            title={label}
            className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-black/40 transition-transform hover:scale-105 active:scale-95"
        >
            {toLegacy ? (
                <MessageCircle className="h-6 w-6" />
            ) : (
                <Sparkles className="h-6 w-6" />
            )}
        </button>
    )
}
