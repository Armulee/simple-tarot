"use client"

import { AudioLines, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"

/** "Ask by Voice" / "Try a Sample Question" pills under the composer. */
export function QuickActions({
    onAskByVoice,
    onTrySample,
    showVoice,
}: {
    onAskByVoice: () => void
    onTrySample: () => void
    /** Hidden where the browser has no speech recognition. */
    showVoice: boolean
}) {
    const t = useTranslations("Immerse")
    return (
        <div className="flex flex-wrap items-center justify-center gap-2">
            {showVoice && (
                <Pill onClick={onAskByVoice} icon={<AudioLines className="h-4 w-4" />}>
                    {t("askByVoice")}
                </Pill>
            )}
            <Pill onClick={onTrySample} icon={<Sparkles className="h-4 w-4" />}>
                {t("trySample")}
            </Pill>
        </div>
    )
}

function Pill({
    onClick,
    icon,
    children,
}: {
    onClick: () => void
    icon: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm text-white/90 backdrop-blur-md transition-colors hover:bg-white/15"
        >
            {icon}
            {children}
        </button>
    )
}
