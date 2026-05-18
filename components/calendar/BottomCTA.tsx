"use client"

import { MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

export function BottomCTA() {
    const t = useTranslations("Calendar")

    return (
        <div className='relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] backdrop-blur-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div className='pointer-events-none absolute -top-10 left-1/3 h-32 w-72 rounded-full bg-violet-500/15 blur-3xl' />
            <div className='relative flex items-center gap-3'>
                <div className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/30 shadow-[0_0_16px_-6px_rgba(252,211,77,0.5)]'>
                    <MessageCircle className='h-5 w-5' />
                </div>
                <div>
                    <div className='font-serif italic text-base text-white leading-tight'>
                        {t("cta.title")}
                    </div>
                    <div className='text-xs text-white/60'>{t("cta.body")}</div>
                </div>
            </div>
            <Link
                href='/reading'
                className='relative inline-flex items-center justify-center rounded-xl bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors shadow-[0_8px_24px_-8px_rgba(255,255,255,0.4)]'
            >
                {t("cta.button")}
            </Link>
        </div>
    )
}
