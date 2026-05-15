"use client"

import Image from "next/image"
import { ArrowRight, RotateCcw } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { SupportBlockPayload } from "@/components/chat/types"

type Props = {
    payload: Extract<SupportBlockPayload, { kind: "tarot-card" }>
}

export function TarotCardBlock({ payload }: Props) {
    const t = useTranslations("TarotArticle")

    return (
        <div className='w-full md:max-w-[85%] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-fuchsia-500/10 p-4'>
            <div className='flex items-start gap-4'>
                <div className='relative h-32 w-20 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/40 sm:h-44 sm:w-28'>
                    <Image
                        src={`/assets/rider-waite-tarot/${payload.cardSlug}.png`}
                        alt={payload.cardName}
                        fill
                        sizes='(min-width: 640px) 112px, 80px'
                        className='object-contain drop-shadow-xl'
                    />
                </div>
                <div className='flex-1 min-w-0 space-y-2'>
                    <div className='flex items-center justify-between gap-2'>
                        <h4 className='text-base font-serif font-semibold text-white truncate'>
                            {payload.cardName}
                        </h4>
                        <span className='shrink-0 inline-flex rounded-full bg-white/10 border border-white/15 px-2 py-[1px] text-[10px] uppercase tracking-widest text-white/75'>
                            {payload.arcana === "major"
                                ? "Major Arcana"
                                : `Minor · ${payload.suit ?? ""}`}
                        </span>
                    </div>
                    <p className='text-xs text-white/70 leading-relaxed line-clamp-3'>
                        {payload.description}
                    </p>

                    <div className='space-y-1.5'>
                        <div className='flex items-start gap-2'>
                            <span className='shrink-0 mt-[2px] text-[10px] font-bold uppercase tracking-wider text-emerald-300/90'>
                                {t("upright")}
                            </span>
                            <div className='flex flex-wrap gap-1'>
                                {payload.uprightKeywords
                                    .slice(0, 4)
                                    .map((kw) => (
                                        <span
                                            key={kw}
                                            className='inline-flex rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-[1px] text-[10px] text-emerald-100'
                                        >
                                            {kw}
                                        </span>
                                    ))}
                            </div>
                        </div>
                        <div className='flex items-start gap-2'>
                            <span className='shrink-0 mt-[2px] text-[10px] font-bold uppercase tracking-wider text-amber-300/90 inline-flex items-center gap-1'>
                                <RotateCcw className='h-2.5 w-2.5' />
                                {t("reversed")}
                            </span>
                            <div className='flex flex-wrap gap-1'>
                                {payload.reversedKeywords
                                    .slice(0, 4)
                                    .map((kw) => (
                                        <span
                                            key={kw}
                                            className='inline-flex rounded-full bg-amber-500/10 border border-amber-500/25 px-2 py-[1px] text-[10px] text-amber-100'
                                        >
                                            {kw}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Link
                href={payload.href}
                className='group mt-4 inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90'
            >
                Read full meaning
                <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
            </Link>
        </div>
    )
}
