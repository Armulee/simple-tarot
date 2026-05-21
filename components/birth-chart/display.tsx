"use client"

import { useCallback, useEffect, useState } from "react"
import { CircleDot, Home, Orbit, Sparkles, Triangle } from "lucide-react"
import { useTranslations } from "next-intl"

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import BirthChartAspects from "./aspects"
import BirthChartHouses from "./houses"
import BirthChartInfoCard from "./info-card"
import BirthChartPlanets from "./planets"
import BirthChartShareSection from "./share-section"
import BirthChartStats from "./stats"
import BirthChartWheel from "./wheel"

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

type TabValue = "planets" | "houses" | "stats" | "aspects"

const HIGHLIGHT_FADE_MS = 2500

export default function BirthChartDisplay({
    birthChart,
    mode = "shared",
    onChartUpdated,
}: BirthChartDisplayProps) {
    const t = useTranslations("BirthChart")

    const [tab, setTab] = useState<TabValue>("planets")
    const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
    const [selectedHouse, setSelectedHouse] = useState<number | null>(null)
    const [showAspects, setShowAspects] = useState(false)

    const handleSelectPlanet = useCallback((planet: string) => {
        setSelectedPlanet((prev) => (prev === planet ? prev : planet))
        setSelectedHouse(null)
        setTab("planets")
        if (typeof window !== "undefined") {
            const el = document.getElementById(`bc-planet-${planet}`)
            el?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
    }, [])

    const handleSelectHouse = useCallback((house: number) => {
        setSelectedHouse((prev) => (prev === house ? prev : house))
        setSelectedPlanet(null)
        setTab("houses")
        if (typeof window !== "undefined") {
            const el = document.getElementById(`bc-house-${house}`)
            el?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
    }, [])

    // Clear the highlight ring after a moment so it reads as "pulse" rather
    // than a persistent border.
    useEffect(() => {
        if (selectedPlanet === null) return
        const id = window.setTimeout(
            () => setSelectedPlanet(null),
            HIGHLIGHT_FADE_MS,
        )
        return () => window.clearTimeout(id)
    }, [selectedPlanet])
    useEffect(() => {
        if (selectedHouse === null) return
        const id = window.setTimeout(
            () => setSelectedHouse(null),
            HIGHLIGHT_FADE_MS,
        )
        return () => window.clearTimeout(id)
    }, [selectedHouse])

    return (
        <div className='relative isolate'>
            <div className='relative max-w-6xl mx-auto px-4 lg:px-6 py-8 lg:py-12 space-y-8 lg:space-y-12'>
                {/* Hero */}
                <section className='relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]'>
                    <div
                        aria-hidden
                        className='pointer-events-none absolute -top-24 left-1/2 h-56 w-[28rem] -translate-x-1/2 rounded-full bg-violet-500/20 blur-[110px]'
                    />
                    <div
                        aria-hidden
                        className='pointer-events-none absolute -bottom-24 -right-16 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl'
                    />
                    <div
                        aria-hidden
                        className='pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl'
                    />
                    <div className='relative px-6 sm:px-10 py-10 sm:py-12 space-y-6 text-center'>
                        <div className='inline-flex items-center justify-center gap-3'>
                            <span className='h-px w-8 bg-gradient-to-r from-transparent to-amber-300/80' />
                            <p className='text-[11px] font-medium uppercase tracking-[0.32em] text-amber-200/80'>
                                {t("subtitle")}
                            </p>
                            <Sparkles className='h-3.5 w-3.5 text-amber-200/70' />
                            <span className='h-px w-8 bg-gradient-to-l from-transparent to-amber-300/80' />
                        </div>
                        <h1 className='font-serif italic text-3xl sm:text-5xl text-white leading-tight'>
                            {t("pageTitle")}
                        </h1>
                        <div className='mx-auto max-w-2xl'>
                            <BirthChartInfoCard
                                birthChart={birthChart}
                                mode={mode}
                                onChartUpdated={onChartUpdated}
                            />
                        </div>
                    </div>
                </section>

                {/* Wheel + tabs */}
                <section className='grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8'>
                    <div className='lg:sticky lg:top-20 lg:self-start'>
                        <div className='relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]'>
                            <div
                                aria-hidden
                                className='pointer-events-none absolute -top-32 left-1/2 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-violet-500/12 blur-3xl'
                            />
                            <div className='relative p-4 sm:p-6 space-y-4'>
                                <div className='flex items-center justify-between gap-3'>
                                    <div className='flex items-center gap-2'>
                                        <span className='inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-300/10 ring-1 ring-amber-300/30'>
                                            <Orbit className='h-3.5 w-3.5 text-amber-200' />
                                        </span>
                                        <p className='text-[11px] font-medium uppercase tracking-[0.28em] text-amber-200/80'>
                                            {t("wheelTitle")}
                                        </p>
                                    </div>
                                    <button
                                        type='button'
                                        onClick={() =>
                                            setShowAspects((v) => !v)
                                        }
                                        aria-pressed={showAspects}
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                                            showAspects
                                                ? "border-amber-300/60 bg-amber-300/15 text-amber-100"
                                                : "border-white/15 bg-white/[0.04] text-white/70 hover:border-white/30 hover:text-white"
                                        }`}
                                    >
                                        <Triangle className='h-3 w-3' />
                                        {t("aspectsOverlayToggle")}
                                    </button>
                                </div>
                                <BirthChartWheel
                                    houses={birthChart.houses}
                                    planets={birthChart.planets}
                                    selectedPlanet={selectedPlanet}
                                    selectedHouse={selectedHouse}
                                    onSelectPlanet={handleSelectPlanet}
                                    onSelectHouse={handleSelectHouse}
                                    showAspects={showAspects}
                                />
                                <p className='text-center text-[11px] leading-relaxed text-white/45'>
                                    {t("wheelHint")}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='min-w-0'>
                        <Tabs
                            value={tab}
                            onValueChange={(v) => setTab(v as TabValue)}
                        >
                            <TabsList className='flex w-full flex-wrap gap-1 !h-auto bg-transparent border-0 p-0'>
                                <TabsTrigger
                                    value='planets'
                                    className='gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px]'
                                >
                                    <CircleDot className='h-3.5 w-3.5' />
                                    {t("tabPlanets")}
                                </TabsTrigger>
                                <TabsTrigger
                                    value='houses'
                                    className='gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px]'
                                >
                                    <Home className='h-3.5 w-3.5' />
                                    {t("tabHouses")}
                                </TabsTrigger>
                                <TabsTrigger
                                    value='stats'
                                    className='gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px]'
                                >
                                    <Sparkles className='h-3.5 w-3.5' />
                                    {t("tabStats")}
                                </TabsTrigger>
                                <TabsTrigger
                                    value='aspects'
                                    className='gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px]'
                                >
                                    <Triangle className='h-3.5 w-3.5' />
                                    {t("tabAspects")}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value='planets' className='mt-5'>
                                <BirthChartPlanets
                                    planets={birthChart.planets}
                                    selectedPlanet={selectedPlanet}
                                />
                            </TabsContent>
                            <TabsContent value='houses' className='mt-5'>
                                <BirthChartHouses
                                    houses={birthChart.houses}
                                    planets={birthChart.planets}
                                    selectedHouse={selectedHouse}
                                />
                            </TabsContent>
                            <TabsContent value='stats' className='mt-5'>
                                <BirthChartStats planets={birthChart.planets} />
                            </TabsContent>
                            <TabsContent value='aspects' className='mt-5'>
                                <BirthChartAspects
                                    planets={birthChart.planets}
                                    showOverlay={showAspects}
                                    onToggleOverlay={setShowAspects}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                </section>

                {mode === "shared" && (
                    <BirthChartShareSection id={birthChart.id} />
                )}
            </div>
        </div>
    )
}
