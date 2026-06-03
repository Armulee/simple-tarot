"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { ArrowRight, Calendar as CalendarIcon } from "lucide-react"
import type { SupportBlockPayload } from "@/components/chat/types"
import { useSupportBlockTopicCopy } from "./use-support-block-topic-copy"

type Props = {
    payload: Extract<SupportBlockPayload, { kind: "calendar-year" }>
}

export function CalendarYearBlock({ payload }: Props) {
    const t = useTranslations("SupportBlock")
    const { title, description } = useSupportBlockTopicCopy(payload)
    const monthsRaw = t("calendarMonths")
    const months = monthsRaw.split(",").map((m) => m.trim())
    const now = new Date()
    const currentMonthIndex = now.getUTCMonth()
    const isCurrentYear = payload.year === now.getUTCFullYear()

    return (
        <div className='w-full md:max-w-[85%] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4'>
            <div className='flex items-start gap-3'>
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

            <div className='mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-6'>
                {months.map((m, idx) => {
                    const isCurrent = isCurrentYear && idx === currentMonthIndex
                    const monthIso = `${payload.year}-${String(idx + 1).padStart(2, "0")}`
                    return (
                        <Link
                            key={idx}
                            href={`/calendar?month=${monthIso}`}
                            className={
                                isCurrent
                                    ? "rounded-lg border border-primary/40 bg-primary/15 px-2 py-2 text-center text-[11px] font-medium text-white transition-colors hover:bg-primary/20"
                                    : "rounded-lg border border-white/[0.08] bg-white/[0.02] px-2 py-2 text-center text-[11px] text-white/75 transition-colors hover:border-white/20 hover:text-white"
                            }
                        >
                            {m}
                        </Link>
                    )
                })}
            </div>

            <Link
                href={payload.href}
                className='group mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80'
            >
                {t("openCalendar")}
                <ArrowRight className='h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5' />
            </Link>
        </div>
    )
}
