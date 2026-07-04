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
    comingSoon = false,
    onComingSoonClick,
}: {
    value: ComposerTarget
    onChange: (value: ComposerTarget) => void
    /** When true, the avatar feature isn't live yet: show a "COMING SOON" badge. */
    comingSoon?: boolean
    /** Clicking the avatar segment while `comingSoon` calls this instead of onChange. */
    onComingSoonClick?: () => void
}) {
    const t = useTranslations("QuestionInput")
    return (
        <div className="relative inline-flex items-center rounded-full border border-white/12 bg-white/5 p-0.5">
            {comingSoon && (
                <span className="pointer-events-none absolute -right-1.5 -top-2 z-10 rounded-full bg-amber-400 px-1.5 py-px text-[8px] font-bold uppercase leading-tight tracking-wide text-black shadow">
                    {t("comingSoon")}
                </span>
            )}
            <Segment
                active={value === "avatar"}
                onClick={() =>
                    comingSoon ? onComingSoonClick?.() : onChange("avatar")
                }
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
