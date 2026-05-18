"use client"

import { Crown, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"

export function PremiumUpsellCard() {
    const t = useTranslations("Calendar")

    return (
        <div className='relative overflow-hidden rounded-3xl border border-amber-300/40 bg-gradient-to-br from-amber-400/25 via-amber-300/10 to-transparent backdrop-blur-xl p-5 space-y-3'>
            <div className='pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-amber-300/30 blur-3xl' />
            <div className='pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl' />

            <div className='relative flex items-center gap-2 text-amber-200'>
                <Crown className='h-4 w-4' />
                <span className='text-[11px] font-medium uppercase tracking-[0.2em]'>
                    {t("premium.label")}
                </span>
                <span className='ml-auto inline-flex items-center gap-1 rounded-full bg-amber-300/15 ring-1 ring-amber-300/40 px-2 py-0.5 text-[10px]'>
                    <Sparkles className='h-2.5 w-2.5' /> {t("premium.badge")}
                </span>
            </div>

            <div className='relative space-y-1'>
                <div className='font-serif italic text-xl text-white leading-tight'>
                    {t("premium.title")}
                </div>
                <div className='text-xs text-white/70 leading-relaxed'>
                    {t("premium.body")}
                </div>
            </div>

            <button
                type='button'
                className='relative w-full rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-medium text-black hover:bg-amber-200 transition-colors shadow-[0_8px_24px_-8px_rgba(252,211,77,0.6)]'
            >
                {t("premium.cta")}
            </button>
        </div>
    )
}
