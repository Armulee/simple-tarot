"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { ArrowRight } from "lucide-react"
import type { SupportBlockPayload } from "@/components/chat/types"
import CalendarClient from "@/components/calendar"

type Props = {
    payload: Extract<SupportBlockPayload, { kind: "calendar-year" }>
}

export function CalendarYearBlock({ payload }: Props) {
    const t = useTranslations("SupportBlock")

    return (
        <div className='w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]'>
            <div className='px-2 pt-3 pb-2 sm:px-3 sm:pt-4'>
                <CalendarClient embedded />
            </div>
            <div className='border-t border-white/[0.06] px-4 py-3'>
                <Link
                    href={payload.href}
                    className='group inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80'
                >
                    {t("viewMore")}
                    <ArrowRight className='h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5' />
                </Link>
            </div>
        </div>
    )
}
