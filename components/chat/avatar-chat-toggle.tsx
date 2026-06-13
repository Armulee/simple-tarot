"use client"

import { useTranslations } from "next-intl"
import { MessageCircle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export type ComposerTarget = "avatar" | "chat"

/**
 * Segmented avatar/chat toggle for the composer's bottom row. Decides whether a
 * submitted question is answered by the talking avatar (routes to /avatar) or
 * the text chat.
 */
export function AvatarChatToggle({
    value,
    onChange,
}: {
    value: ComposerTarget
    onChange: (value: ComposerTarget) => void
}) {
    const t = useTranslations("QuestionInput")
    return (
        <div className="inline-flex items-center rounded-full border border-white/12 bg-white/5 p-0.5">
            <Segment
                active={value === "avatar"}
                onClick={() => onChange("avatar")}
                aria={t("avatarModeAria")}
            >
                <Sparkles className="h-3.5 w-3.5" />
                {t("avatarMode")}
            </Segment>
            <Segment
                active={value === "chat"}
                onClick={() => onChange("chat")}
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
