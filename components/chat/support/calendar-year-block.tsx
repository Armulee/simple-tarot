"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { ArrowRight, Calendar as CalendarIcon } from "lucide-react"
import type { SupportBlockPayload } from "@/components/chat/types"
import { useSupportBlockTopicCopy } from "./use-support-block-topic-copy"
import CalendarClient from "@/components/calendar"

type Props = {
    payload: Extract<SupportBlockPayload, { kind: "calendar-year" }>
}

export function CalendarYearBlock({ payload }: Props) {
    const t = useTranslations("SupportBlock")
    const { title, description } = useSupportBlockTopicCopy(payload)

    return (
        <div className='w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]'>
            <div className='flex items-start gap-3 px-4 pt-4'>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary'>
                    <CalendarIcon className='h-5 w-5' />
                </div>
                <div className='min-w-0 flex-1'>
                    <h4 className='text-sm font-semibold text-white'>
                        {title}
                    </h4>
                    <p className='mt-1 text-xs leading-relaxed text-white/70'>
                        {description}
                    </p>
                </div>
                <span className='shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 font-mono text-xs tabular-nums text-white/85'>
                    {payload.year}
                </span>
            </div>

            <div className='mt-2 px-2 pb-2 sm:px-3 sm:pb-3'>
                <CalendarClient embedded />
            </div>

            <div className='border-t border-white/[0.06] px-4 py-3'>
                <Link
                    href={payload.href}
                    className='group inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80'
                >
                    {t("openCalendar")}
                    <ArrowRight className='h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5' />
                </Link>
            </div>
        </div>
    )
}
