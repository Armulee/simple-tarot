"use client"

import { useTranslations } from "next-intl"
import { Heart, UserRound } from "lucide-react"
import type {
    SynastryPersonInfo,
    SynastryReadingPayload,
} from "@/lib/chat/synastry-schema"

function PersonCircle({
    info,
    fallbackName,
}: {
    info: SynastryPersonInfo
    fallbackName: string
}) {
    const name = info.name?.trim() || fallbackName
    return (
        <div className='flex w-24 shrink-0 flex-col items-center gap-2 sm:w-28'>
            <div className='flex size-20 items-center justify-center rounded-full border border-pink-400/40 bg-gradient-to-br from-pink-500/30 via-rose-500/20 to-fuchsia-500/20 shadow-[0_0_24px_-6px_rgba(244,114,182,0.5)] sm:size-24'>
                <UserRound className='size-8 text-pink-100 sm:size-9' aria-hidden />
            </div>
            <div className='text-center'>
                <p className='truncate text-sm font-semibold text-white'>
                    {name}
                </p>
                {info.sunSign ? (
                    <p className='text-[11px] text-pink-200/80'>
                        {info.sunSign}
                    </p>
                ) : null}
            </div>
        </div>
    )
}

function SummaryCard({
    name,
    headline,
    summary,
}: {
    name: string
    headline: string
    summary: string
}) {
    return (
        <div className='rounded-2xl border border-pink-400/15 bg-white/[0.04] p-4 backdrop-blur-xl'>
            <p className='flex items-center gap-1.5 text-sm font-semibold text-white'>
                <UserRound className='size-3.5 shrink-0 text-pink-300' />
                {name}
            </p>
            <p className='mt-0.5 text-[12px] font-medium text-pink-200/90'>
                {headline}
            </p>
            <p className='mt-2 text-sm leading-relaxed text-white/75'>
                {summary}
            </p>
        </div>
    )
}

export default function SynastryReading({
    reading,
}: {
    reading: SynastryReadingPayload
}) {
    const t = useTranslations("Synastry")
    const { personA, personB, result } = reading
    const nameA = personA.name?.trim() || t("you")
    const nameB = personB.name?.trim() || t("them")

    return (
        <div className='w-full space-y-6 rounded-[28px] border border-pink-400/20 bg-white/[0.04] p-4 shadow-[0_20px_60px_-24px_rgba(244,114,182,0.4)] backdrop-blur-2xl ring-1 ring-pink-400/10 sm:p-6'>
            <p className='text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-300/80'>
                {t("compatibility")}
            </p>

            {/* Two circles with the overall score between them */}
            <div className='flex items-center justify-center gap-2 sm:gap-5'>
                <PersonCircle info={personA} fallbackName={t("you")} />
                <div className='flex flex-col items-center gap-1'>
                    <Heart
                        className='size-6 text-pink-400 sm:size-7'
                        aria-hidden
                    />
                    <span className='text-2xl font-bold text-pink-100 tabular-nums sm:text-3xl'>
                        {result.compatibilityScore}%
                    </span>
                </div>
                <PersonCircle info={personB} fallbackName={t("them")} />
            </div>

            {/* Per-person summaries */}
            <div className='grid gap-3 sm:grid-cols-2'>
                <SummaryCard
                    name={nameA}
                    headline={result.personA.headline}
                    summary={result.personA.summary}
                />
                <SummaryCard
                    name={nameB}
                    headline={result.personB.headline}
                    summary={result.personB.summary}
                />
            </div>

            {/* Compatibility dimensions */}
            {result.dimensions.length > 0 ? (
                <div className='space-y-2.5'>
                    {result.dimensions.map((dim, i) => (
                        <div key={`${dim.label}-${i}`} className='space-y-1'>
                            <div className='flex items-center justify-between text-xs'>
                                <span className='text-white/80'>
                                    {dim.label}
                                </span>
                                <span className='tabular-nums text-pink-200/80'>
                                    {dim.score}%
                                </span>
                            </div>
                            <div className='h-1.5 w-full overflow-hidden rounded-full bg-white/10'>
                                <div
                                    className='h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-400 to-fuchsia-400'
                                    style={{
                                        width: `${Math.max(0, Math.min(100, dim.score))}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {/* Comparison */}
            <section className='space-y-1.5'>
                <h3 className='text-sm font-semibold text-pink-200'>
                    {t("comparison")}
                </h3>
                <p className='text-sm leading-relaxed text-white/80'>
                    {result.comparison}
                </p>
            </section>

            {/* Direct answer */}
            <section className='space-y-1.5 rounded-2xl border border-pink-400/20 bg-pink-500/10 p-4'>
                <h3 className='text-sm font-semibold text-pink-100'>
                    {t("interpretation")}
                </h3>
                <p className='text-sm leading-relaxed text-white/85'>
                    {result.interpretation}
                </p>
            </section>
        </div>
    )
}
