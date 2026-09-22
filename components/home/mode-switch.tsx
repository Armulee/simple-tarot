"use client"

import { MessageCircle, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import type { LandingMode } from "@/lib/landing-mode-storage"
import { useLandingMode } from "./landing-mode-context"

/**
 * Swaps the landing page between Astra and the original chat composer.
 *
 * Shaped like the composer's own avatar/chat toggle rather than a floating
 * circle: the circle sat on top of that toggle in legacy mode and hid half of
 * it, and two round buttons in the same corner read as two unrelated actions.
 * Both modes put this at the right end of the row under their input.
 */
export function ModeSwitch() {
    const { mode, setMode } = useLandingMode()
    const t = useTranslations("QuestionInput")

    return (
        <div className="inline-flex items-center rounded-full border border-white/12 bg-white/5 p-0.5">
            <Segment
                active={mode === "immerse"}
                onClick={() => setMode("immerse")}
                aria={t("avatarModeAria")}
            >
                <Sparkles className="h-3.5 w-3.5" />
                {t("avatarMode")}
            </Segment>
            <Segment
                active={mode === "legacy"}
                onClick={() => setMode("legacy")}
                aria={t("chatModeAria")}
            >
                <MessageCircle className="h-3.5 w-3.5" />
                {t("chatMode")}
            </Segment>
        </div>
    )
}

function Segment({
    active,
    onClick,
    aria,
    children,
}: {
    active: boolean
    onClick: () => void
    aria: string
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            aria-label={aria}
            className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                active
                    ? "bg-gradient-to-r from-indigo-500/40 to-purple-500/40 text-white"
                    : "text-white/55 hover:text-white/80",
            )}
        >
            {children}
        </button>
    )
}

export type { LandingMode }
