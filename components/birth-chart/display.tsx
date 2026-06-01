"use client"

import { useTranslations } from "next-intl"
import BirthChartStats from "./stats"
import BirthChartOrbitVisual from "./orbit-visual"
import BirthChartShareSection from "./share-section"
import BirthChartInfoCard from "./info-card"
import BirthChartHouses from "./houses"
import BirthChartPlanets from "./planets"

interface BirthChartDisplayProps {
    birthChart: {
        id: string
        day: number
        month: number
        year: number
        hour: number
        minute: number
        timezone: number
        lat: number
        lng: number
        country?: string | null
        state_province?: string | null
        houses?: Record<string, unknown> | null
        planets?: Record<string, unknown> | null
        created_at: string
    }
    mode?: "shared" | "personal"
    onChartUpdated?: () => void | Promise<void>
}

export default function BirthChartDisplay({
    birthChart,
    mode = "shared",
    onChartUpdated,
}: BirthChartDisplayProps) {
    const t = useTranslations("BirthChart")

    return (
        <div className='relative max-w-5xl mx-auto px-5 lg:px-8 py-12 lg:py-20 space-y-16 lg:space-y-20'>
            {/* Hero */}
            <header className='space-y-8 text-center'>
                <div className='space-y-3'>
                    <p className='text-[13px] font-medium text-white/55'>
                        {t("subtitle")}
                    </p>
                    <h1 className='text-4xl sm:text-5xl font-semibold tracking-tight text-white'>
                        {t("pageTitle")}
                    </h1>
                </div>
                <div className='mx-auto max-w-xl'>
                    <BirthChartInfoCard
                        birthChart={birthChart}
                        mode={mode}
                        onChartUpdated={onChartUpdated}
                    />
                </div>
            </header>

            {/* Wheel — quietly framed, lets the cosmic backdrop breathe */}
            <Surface tone='hero'>
                <div className='mx-auto w-full max-w-2xl px-2 py-2'>
                    <BirthChartOrbitVisual planets={birthChart.planets} />
                </div>
            </Surface>

            {/* Strengths */}
            <Section
                title={t("planetaryStrengths")}
                subtitle={t("planetarySectionLabel")}
            >
                <BirthChartStats planets={birthChart.planets} />
            </Section>

            {/* Houses */}
            <Section
                title={t("yourHouses")}
                subtitle={t("lifeAreasSectionLabel")}
            >
                <BirthChartHouses
                    houses={birthChart.houses}
                    planets={birthChart.planets}
                />
            </Section>

            {/* Planets */}
            <Section
                title={t("planetaryPositions")}
                subtitle={t("planetarySectionLabel")}
            >
                <BirthChartPlanets planets={birthChart.planets} />
            </Section>

            {mode === "shared" && (
                <BirthChartShareSection id={birthChart.id} />
            )}
        </div>
    )
}

function Section({
    title,
    subtitle,
    children,
}: {
    title: string
    subtitle?: string
    children: React.ReactNode
}) {
    return (
        <section className='space-y-6'>
            <div className='space-y-1.5 text-center sm:text-left'>
                {subtitle ? (
                    <p className='text-xs font-medium text-white/45'>
                        {subtitle}
                    </p>
                ) : null}
                <h2 className='text-2xl sm:text-3xl font-semibold tracking-tight text-white'>
                    {title}
                </h2>
            </div>
            {children}
        </section>
    )
}

function Surface({
    children,
    tone = "card",
}: {
    children: React.ReactNode
    tone?: "card" | "hero"
}) {
    const radius = tone === "hero" ? "rounded-[28px]" : "rounded-2xl"
    return (
        <div
            className={`${radius} bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/[0.06] shadow-[0_20px_60px_-24px_rgba(0,0,0,0.55)] p-4 sm:p-6`}
        >
            {children}
        </div>
    )
}
