"use client"

import Link from "next/link"
import { Sparkles, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

export default function PurchasePage() {
    const t = useTranslations("StarsPurchase")

    return (
        <section className='relative z-10 max-w-3xl mx-auto px-6 py-16 text-center space-y-8'>
            <div className='flex justify-center'>
                <Link
                    href='/pricing'
                    className='inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors'
                >
                    <ArrowLeft className='w-4 h-4' />
                    {t("backToPricing")}
                </Link>
            </div>

            <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-500/10'>
                <Sparkles className='w-9 h-9 text-yellow-300 animate-pulse' />
            </div>
            <p className='text-xs uppercase tracking-[0.35em] text-yellow-200'>
                {t("badge")}
            </p>
            <div className='space-y-4'>
                <h1 className='font-serif text-4xl font-bold text-white'>
                    {t("title")}
                </h1>
                <p className='text-base text-white/80 leading-relaxed max-w-2xl mx-auto'>
                    {t("description")}
                </p>
                <p className='text-sm text-white/60 max-w-2xl mx-auto'>
                    {t("helper")}
                </p>
            </div>

            <div className='flex flex-col gap-3 sm:flex-row sm:justify-center sm:items-center'>
                <Link href='/stars' className='w-full sm:w-auto'>
                    <Button className='w-full rounded-full bg-white text-black hover:brightness-95'>
                        {t("ctaBackToStars")}
                    </Button>
                </Link>
                <Link href='/articles/share-rewards' className='w-full sm:w-auto'>
                    <Button
                        variant='outline'
                        className='w-full rounded-full border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10'
                    >
                        {t("ctaEarnFree")}
                    </Button>
                </Link>
            </div>
        </section>
    )
}
