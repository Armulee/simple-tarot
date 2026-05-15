"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { useTranslations } from "next-intl"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

function useNeedsTapForHoverCard() {
    const [needsTap, setNeedsTap] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia("(hover: none), (pointer: coarse)")
        const sync = () => setNeedsTap(mq.matches)
        sync()
        mq.addEventListener("change", sync)
        return () => mq.removeEventListener("change", sync)
    }, [])

    return needsTap
}

/**
 * Key-message strip: ember-styled badge + hover card (pointer bridge to
 * content). Tap toggles the panel when the device has no hover or coarse
 * pointer; fine-pointer desktops rely on hover (no click fight).
 */
export function SensitiveDomainAdviceBadge({
    className,
}: {
    className?: string
}) {
    const t = useTranslations("ReadingPage.interpretation")
    const [open, setOpen] = useState(false)
    const needsTapForHoverCard = useNeedsTapForHoverCard()

    return (
        <HoverCard
            open={open}
            onOpenChange={setOpen}
            openDelay={90}
            closeDelay={120}
        >
            <div className={cn("flex w-full justify-start", className)}>
                <HoverCardTrigger asChild>
                    <button
                        type='button'
                        className={cn(
                            "group relative inline-flex max-w-full items-center gap-2 rounded-full",
                            "border border-orange-300/35 bg-gradient-to-r from-amber-500/[0.22] via-orange-600/[0.18] to-rose-700/[0.2]",
                            "px-2.5 py-1.5 pl-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-50/95 sm:text-xs",
                            "shadow-[0_0_26px_-10px_rgba(251,146,60,0.55),inset_0_1px_0_rgba(255,255,255,0.14)]",
                            "ring-1 ring-orange-200/10 transition duration-200",
                            "hover:border-orange-200/45 hover:shadow-[0_0_32px_-8px_rgba(251,113,133,0.45)] hover:ring-orange-100/15",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                        )}
                        aria-expanded={open}
                        aria-haspopup='dialog'
                        aria-label={t("professionalAdviceBadgeAria")}
                        onClick={() => {
                            if (needsTapForHoverCard) {
                                setOpen((v) => !v)
                            } else {
                                setOpen(true)
                            }
                        }}
                    >
                        <span
                            aria-hidden
                            className='relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300/35 via-orange-500/30 to-rose-600/35 shadow-inner ring-1 ring-white/15'
                        >
                            <span className='absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/20 opacity-60' />
                            <AlertTriangle className='relative z-[1] h-3.5 w-3.5 text-amber-100 drop-shadow-sm' />
                        </span>
                        <span className='min-w-0 normal-case tracking-normal'>
                            {t("professionalAdviceBadge")}
                        </span>
                    </button>
                </HoverCardTrigger>
            </div>
            <HoverCardContent
                align='start'
                side='bottom'
                sideOffset={10}
                collisionPadding={12}
                className={cn(
                    "w-[min(22rem,calc(100vw-1.5rem))] border-orange-400/25 bg-gradient-to-b from-[#1c0f0a]/97 via-[#140a08]/96 to-[#0f0806]/97 p-4 text-foreground shadow-[0_20px_50px_-20px_rgba(249,115,22,0.45)] backdrop-blur-xl",
                )}
            >
                <div className='space-y-3'>
                    <p className='text-sm font-semibold text-amber-50'>
                        {t("professionalAdviceHoverTitle")}
                    </p>
                    <p className='text-xs leading-relaxed text-white/78'>
                        {t("professionalAdviceHoverIntro")}
                    </p>
                    <p className='text-[11px] font-medium uppercase tracking-wide text-orange-200/75'>
                        {t("professionalAdviceHoverHowTitle")}
                    </p>
                    <ul className='list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-white/62'>
                        <li>{t("professionalAdviceHoverLegal")}</li>
                        <li>{t("professionalAdviceHoverMedical")}</li>
                        <li>{t("professionalAdviceHoverFinancial")}</li>
                    </ul>
                    <p className='border-t border-orange-500/20 pt-3 text-xs leading-relaxed text-white/55'>
                        {t("professionalAdviceHint")}
                    </p>
                </div>
            </HoverCardContent>
        </HoverCard>
    )
}
