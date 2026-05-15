"use client"

import { Lock, ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"

/**
 * User message row: short line + lock + hover (or touch) explainer for PII redaction.
 */
export function PrivacyRedactedNoticeHover() {
    const t = useTranslations("Home")

    return (
        <HoverCard openDelay={150} closeDelay={150}>
            <HoverCardTrigger asChild>
                <button
                    type='button'
                    className='flex max-w-[80%] flex-row items-start gap-1.5 text-left text-[11px] leading-relaxed text-white/45 transition-colors hover:text-white/70 hover:decoration-white/40 cursor-help'
                >
                    <Lock
                        className='mt-0.5 h-3 w-3 shrink-0'
                        aria-hidden
                    />
                    <span>{t("privacyRedactedNotice")}</span>
                </button>
            </HoverCardTrigger>
            <HoverCardContent
                align='end'
                side='top'
                sideOffset={8}
                className='w-80 border-white/10 bg-[#0f0e18]/95 p-4 text-foreground shadow-xl backdrop-blur-xl sm:w-[22rem]'
            >
                <div className='space-y-3'>
                    <p className='text-sm font-medium text-white'>
                        {t("privacyRedactedPopoverTitle")}
                    </p>
                    <p className='text-xs leading-relaxed text-white/75'>
                        {t("privacyRedactedPopoverIntro")}
                    </p>
                    <ul className='list-disc space-y-1 pl-4 text-xs leading-relaxed text-white/55'>
                        <li>{t("privacyRedactedPopoverCriteria.name")}</li>
                        <li>{t("privacyRedactedPopoverCriteria.email")}</li>
                        <li>{t("privacyRedactedPopoverCriteria.phone")}</li>
                        <li>{t("privacyRedactedPopoverCriteria.handle")}</li>
                        <li>{t("privacyRedactedPopoverCriteria.address")}</li>
                    </ul>
                    <Link
                        href='/articles/privacy-redaction'
                        className='inline-flex items-center gap-1.5 pt-1 text-xs font-medium text-primary hover:text-primary/90'
                    >
                        {t("privacyRedactedReadGuide")}
                        <ArrowRight className='h-3.5 w-3.5' />
                    </Link>
                </div>
            </HoverCardContent>
        </HoverCard>
    )
}
