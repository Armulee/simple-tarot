"use client"

import { LogIn } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

export function AuthGateCard() {
    const t = useTranslations("Calendar")

    return (
        <div className='relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl p-8 sm:p-10 text-center space-y-5'>
            <div className='absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl' />
            <div className='absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl' />
            <div className='relative mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/40 shadow-[0_0_24px_-6px_rgba(252,211,77,0.5)]'>
                <LogIn className='h-6 w-6' />
            </div>
            <div className='relative space-y-2'>
                <h2 className='font-serif italic text-3xl text-white'>
                    {t("auth.title")}
                </h2>
                <p className='text-sm text-white/65 max-w-md mx-auto leading-relaxed'>
                    {t("auth.body")}
                </p>
            </div>
            <Link
                href='/signin'
                className='relative inline-flex items-center justify-center rounded-xl bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors shadow-[0_8px_24px_-8px_rgba(255,255,255,0.4)]'
            >
                {t("auth.cta")}
            </Link>
        </div>
    )
}
