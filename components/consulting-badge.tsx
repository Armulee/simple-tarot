"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { ConsultingPhasesText } from "@/components/chat/consulting-phases-text"

export function ConsultingBadge({
    label,
    multiStep = false,
}: {
    label?: string
    /**
     * When true (and no explicit `label` is given) the badge runs the two-step
     * "AI thinking" text animation instead of the static "Consulting…" string.
     */
    multiStep?: boolean
}) {
    const t = useTranslations("Home")
    const [dots, setDots] = useState(1)

    const step1Phrases = useMemo(
        () => (t.raw("loadingPhases.step1") as string[] | undefined) ?? [],
        [t],
    )
    const step2Phrases = useMemo(
        () => (t.raw("loadingPhases.step2") as string[] | undefined) ?? [],
        [t],
    )

    const useMultiStep = multiStep && label == null

    useEffect(() => {
        if (useMultiStep) return
        const interval = window.setInterval(() => {
            setDots((prev) => (prev >= 3 ? 1 : prev + 1))
        }, 500)
        return () => window.clearInterval(interval)
    }, [useMultiStep])

    return (
        <div className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_-5px_rgba(56,189,248,0.3)]'>
            <Loader2 className='h-4 w-4 text-primary animate-spin shrink-0' />
            {useMultiStep ? (
                <ConsultingPhasesText
                    step1Phrases={step1Phrases}
                    step2Phrases={step2Phrases}
                    fallback={t("consulting")}
                    className='text-sm font-medium text-white/90'
                />
            ) : (
                <span className='text-sm font-medium text-white/90'>
                    {`${label ?? t("consulting")}${".".repeat(dots)}`}
                </span>
            )}
        </div>
    )
}
