"use client"

import { useMemo } from "react"
import Image from "next/image"
import { Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import { PLANET_IMAGE_ASSETS } from "@/lib/astrology/planet-images"
import { getPlanetDignity } from "@/lib/birth-chart-utils"
import type { NatalRelevantPlanet } from "@/components/chat/types"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"

type NatalPlanet = {
    sign: string
    degree: number
    longitude: number
    retrograde?: boolean
}

type NatalChart = {
    planets?: Record<string, NatalPlanet>
}

type NatalChartData = {
    charts?: NatalChart[] | null
} | null

const ZODIAC_CANONICAL: ReadonlyArray<string> = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]

const ZODIAC_ALIAS: Record<string, string> = {
    เมษ: "Aries",
    พฤษภ: "Taurus",
    มิถุน: "Gemini",
    กรกฎ: "Cancer",
    สิงห์: "Leo",
    กันย์: "Virgo",
    ตุลย์: "Libra",
    พิจิก: "Scorpio",
    ธนู: "Sagittarius",
    มกร: "Capricorn",
    กุมภ์: "Aquarius",
    มีน: "Pisces",
}

function canonicalSign(sign: string): string {
    if (ZODIAC_CANONICAL.includes(sign)) return sign
    return ZODIAC_ALIAS[sign] ?? sign
}

function formatSignDegree(deg: number): string {
    if (!Number.isFinite(deg)) return "—"
    return `${deg.toFixed(1)}°`
}

/**
 * Renders the "natal placement" strip that lives inside the verdict hero
 * when the user asks a self/birth-chart question. Each card pairs a planet
 * image + sign/degree readout with the AI-generated, plain-language reason
 * why that placement matters for the question. The component is intentionally
 * read-only: the long-form astrology breakdown still lives in the dedicated
 * "Birth Chart Information" tab.
 */
export default function NatalPlanetSpotlight({
    chartData,
    relevantPlanets,
    privacyAliases,
}: {
    chartData: Record<string, unknown> | null | undefined
    relevantPlanets: NatalRelevantPlanet[]
    privacyAliases?: PromptAliasEntry[]
}) {
    const tAstro = useTranslations("BirthChart")
    const tChat = useTranslations("HoroscopeChat.natalSpotlight")
    const aliases = privacyAliases ?? []

    const cards = useMemo(() => {
        const data = (chartData ?? null) as NatalChartData
        const planets = data?.charts?.[0]?.planets ?? {}
        return relevantPlanets
            .map((rp) => {
                const point = planets[rp.planet]
                if (!point) return null
                return {
                    planet: rp.planet,
                    reason: rp.reason,
                    point,
                }
            })
            .filter(
                (
                    item,
                ): item is {
                    planet: string
                    reason: string
                    point: NatalPlanet
                } => item !== null,
            )
    }, [relevantPlanets, chartData])

    if (cards.length === 0) return null

    return (
        <section className='space-y-4'>
            <div className='relative overflow-hidden rounded-2xl border border-indigo-300/20 bg-gradient-to-r from-indigo-500/[0.1] via-violet-500/[0.06] to-cyan-500/[0.05] px-4 py-3.5 shadow-[0_10px_36px_-18px_rgba(99,102,241,0.35)]'>
                <div
                    aria-hidden
                    className='pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.18),transparent_70%)] blur-2xl'
                />
                <div className='relative flex items-center justify-between gap-3'>
                    <div className='flex min-w-0 items-center gap-3'>
                        <span className='relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-300/35 bg-indigo-500/15 text-indigo-100 shadow-[0_0_16px_-4px_rgba(129,140,248,0.55)]'>
                            <Sparkles className='h-4 w-4' aria-hidden />
                        </span>
                        <div className='min-w-0'>
                            <h3 className='text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-100/85'>
                                {tChat("title")}
                            </h3>
                            <p className='mt-0.5 truncate text-[11px] text-white/55'>
                                {tChat("subtitle")}
                            </p>
                        </div>
                    </div>
                    <span className='shrink-0 rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white/80 ring-1 ring-white/[0.06]'>
                        {cards.length}
                    </span>
                </div>
            </div>

            <ul className='list-none space-y-3 p-0'>
                {cards.map(({ planet, reason, point }, idx) => {
                    const planetName = tAstro(`planets.${planet}`, {
                        defaultValue: planet,
                    })
                    const canonical = canonicalSign(point.sign)
                    const signName = tAstro(`zodiacSigns.${canonical}`, {
                        defaultValue: point.sign,
                    })
                    const imageSrc = PLANET_IMAGE_ASSETS[planet]
                    const dignity = getPlanetDignity(planet, canonical)
                    const isRetrograde = !!point.retrograde

                    return (
                        <li
                            key={`${planet}-${idx}`}
                            className='group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-white/[0.01] px-4 py-4 shadow-[0_8px_32px_-22px_rgba(0,0,0,0.65)] transition duration-300 hover:border-indigo-300/25 hover:from-white/[0.06] hover:shadow-[0_14px_44px_-20px_rgba(99,102,241,0.28)]'
                        >
                            <div
                                aria-hidden
                                className='pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-indigo-400/[0.10] blur-2xl'
                            />
                            <div className='relative flex items-start gap-3'>
                                <div className='relative shrink-0'>
                                    {imageSrc ? (
                                        <Image
                                            src={imageSrc}
                                            alt={planetName}
                                            width={48}
                                            height={48}
                                            className={`h-[48px] w-[48px] rounded-full object-cover ring-1 ring-white/15 shadow-[0_8px_24px_-12px_rgba(129,140,248,0.5)] transition duration-500 group-hover:scale-[1.04] ${
                                                planet === "Ketu"
                                                    ? "rotate-90"
                                                    : ""
                                            }`}
                                        />
                                    ) : (
                                        <div className='flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white/5 text-[11px] font-semibold text-white/70 ring-1 ring-white/10'>
                                            {planet.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className='min-w-0 flex-1'>
                                    <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
                                        <p className='truncate text-[14px] font-semibold leading-tight text-white/92'>
                                            {planetName}
                                        </p>
                                        <span className='truncate text-[12px] font-medium text-white/70'>
                                            {signName}
                                        </span>
                                        <span className='text-white/30'>·</span>
                                        <span className='font-mono text-[13px] font-semibold tabular-nums text-white/85'>
                                            {formatSignDegree(point.degree)}
                                        </span>
                                        {isRetrograde && (
                                            <span className='ml-1 inline-flex items-center rounded-full border border-white/15 bg-white/[0.05] px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-white/65'>
                                                {tAstro(
                                                    "stats.status.retrograde",
                                                )}
                                            </span>
                                        )}
                                        {dignity.isExalted && (
                                            <span className='ml-1 inline-flex items-center rounded-full border border-amber-300/40 bg-amber-400/12 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-amber-100'>
                                                {tAstro(
                                                    "stats.status.exalted",
                                                )}
                                            </span>
                                        )}
                                        {dignity.isOwnSign && (
                                            <span className='ml-1 inline-flex items-center rounded-full border border-sky-300/40 bg-sky-400/12 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-sky-100'>
                                                {tAstro(
                                                    "stats.status.ownSign",
                                                )}
                                            </span>
                                        )}
                                        {dignity.isDebilitated && (
                                            <span className='ml-1 inline-flex items-center rounded-full border border-red-300/40 bg-red-400/12 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-red-100'>
                                                {tAstro(
                                                    "stats.status.debilitated",
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    {reason && (
                                        <p className='mt-2 text-sm leading-relaxed text-white/[0.82]'>
                                            <PrivacyHighlightedText
                                                text={reason}
                                                aliases={aliases}
                                                supportMarkdown
                                            />
                                        </p>
                                    )}
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
