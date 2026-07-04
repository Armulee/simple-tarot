"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { TrendingUp, Users, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"

type StatConfig = {
    key: string
    label: string
}

type StatsResponse = Record<string, number>

const iconByKey: Record<string, typeof TrendingUp> = {
    totalUsers: Users,
    profiles: TrendingUp,
    interpretations: Sparkles,
}

const colorByKey: Record<string, string> = {
    totalUsers: "from-blue-500 to-cyan-500",
    profiles: "from-emerald-500 to-teal-500",
    interpretations: "from-purple-500 to-pink-500",
}

export default function StatisticsSection() {
    const t = useTranslations("About.Statistics")
    const statsConfig = useMemo(() => t.raw("items") as StatConfig[], [t])

    const [isVisible, setIsVisible] = useState(false)
    const [hoveredItem, setHoveredItem] = useState<number | null>(null)
    const [targets, setTargets] = useState<StatsResponse>({})
    const [displayValues, setDisplayValues] = useState<StatsResponse>({})
    const sectionRef = useRef<HTMLDivElement>(null)
    const displayValuesRef = useRef(displayValues)
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        displayValuesRef.current = displayValues
    }, [displayValues])

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.3 }
        )

        if (sectionRef.current) {
            observer.observe(sectionRef.current)
        }

        return () => observer.disconnect()
    }, [])

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch("/api/stats", { cache: "no-store" })
            if (!response.ok) throw new Error("Failed to load stats")
            const data: StatsResponse = await response.json()

            const nextTargets: StatsResponse = {}
            statsConfig.forEach((item) => {
                const value = data[item.key]
                nextTargets[item.key] =
                    typeof value === "number" && Number.isFinite(value)
                        ? value
                        : 0
            })
            setTargets(nextTargets)
        } catch (error) {
            console.error("[statistics] failed to fetch stats", error)
        }
    }, [statsConfig])

    const scheduleRefresh = useCallback(() => {
        if (refreshTimeoutRef.current) return
        refreshTimeoutRef.current = setTimeout(() => {
            refreshTimeoutRef.current = null
            void fetchStats()
        }, 400)
    }, [fetchStats])

    useEffect(() => {
        void fetchStats()
    }, [fetchStats])

    useEffect(() => {
        if (typeof window === "undefined") return

        const channel = supabase
            .channel("home-stats-feed")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "profiles" },
                scheduleRefresh
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "chat_sessions" },
                scheduleRefresh
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "stars" },
                scheduleRefresh
            )
            .subscribe()

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current)
                refreshTimeoutRef.current = null
            }
            void channel.unsubscribe()
        }
    }, [scheduleRefresh])

    useEffect(() => {
        const targetKeys = Object.keys(targets)
        if (!targetKeys.length) return

        const startValues: StatsResponse = {
            ...displayValuesRef.current,
        }
        const duration = 1200
        const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
        let frameId = 0
        const start = performance.now()

        const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const nextValues: StatsResponse = {}

            targetKeys.forEach((key) => {
                const startValue = startValues[key] ?? 0
                const targetValue = targets[key] ?? 0
                nextValues[key] = Math.round(
                    startValue +
                        (targetValue - startValue) * easeOutCubic(progress)
                )
            })

            setDisplayValues((prev) => ({ ...prev, ...nextValues }))

            if (progress < 1) {
                frameId = requestAnimationFrame(step)
            }
        }

        frameId = requestAnimationFrame(step)

        return () => cancelAnimationFrame(frameId)
    }, [targets])

    return (
        <div ref={sectionRef} className='relative overflow-hidden'>
            <div className='absolute inset-0 overflow-hidden rounded-2xl'>
                <div className='absolute top-4 left-4 w-2 h-2 bg-primary/30 rounded-full animate-ping delay-1000'></div>
                <div className='absolute top-8 right-8 w-1 h-1 bg-secondary/40 rounded-full animate-pulse delay-2000'></div>
                <div className='absolute bottom-6 left-1/4 w-1.5 h-1.5 bg-primary/20 rounded-full animate-bounce delay-3000'></div>
                <div className='absolute bottom-4 right-1/3 w-1 h-1 bg-secondary/30 rounded-full animate-ping delay-4000'></div>
            </div>

            <div className='relative bg-transparent rounded-2xl py-8'>
                <div
                    className={`text-center mb-12 transition-all duration-1000`}
                >
                    <div className='inline-flex items-center gap-2 mb-4'>
                        <TrendingUp className='w-6 h-6 text-accent animate-pulse' />
                        <span className='text-primary font-semibold text-sm uppercase tracking-wider'>
                            {t("label")}
                        </span>
                        <TrendingUp className='w-6 h-6 text-accent animate-pulse' />
                    </div>
                    <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
                        {t("title")}
                    </h2>
                    <p className='text-gray-400 max-w-2xl mx-auto text-lg'>
                        {t("description")}
                    </p>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
                    {statsConfig.map((item, idx) => {
                        const IconComponent = iconByKey[item.key] || TrendingUp
                        const color =
                            colorByKey[item.key] || "from-primary to-secondary"
                        const value = displayValues[item.key] ?? 0
                        const hasLoaded = Object.prototype.hasOwnProperty.call(
                            targets,
                            item.key
                        )

                        return (
                            <div
                                key={item.key}
                                className={`group text-center transition-all duration-700 delay-${idx * 200} ${
                                    isVisible
                                        ? "opacity-100 translate-y-0"
                                        : "opacity-0 translate-y-8"
                                }`}
                                onMouseEnter={() => setHoveredItem(idx)}
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                <div className='relative bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 hover:border-primary/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl'>
                                    <div className='flex justify-center mb-4'>
                                        <div
                                            className={`
                                                w-16 h-16 rounded-2xl bg-gradient-to-r ${color}
                                                flex items-center justify-center shadow-lg transition-all duration-300
                                                ${
                                                    hoveredItem === idx
                                                        ? "scale-110 rotate-6"
                                                        : ""
                                                }
                                            `}
                                        >
                                            <IconComponent className='w-8 h-8 text-white' />
                                        </div>
                                    </div>

                                    <div className='mb-3'>
                                        <div
                                            className={`
                                                text-4xl md:text-5xl font-bold bg-gradient-to-r ${color}
                                                bg-clip-text text-transparent transition-all duration-300
                                                ${hoveredItem === idx ? "scale-110" : ""}
                                            `}
                                        >
                                            {hasLoaded
                                                ? value.toLocaleString()
                                                : "—"}
                                        </div>

                                        <div
                                            className={`
                                                w-16 h-1 bg-gradient-to-r ${color} rounded-full mx-auto mt-2
                                                transform ${
                                                    hoveredItem === idx
                                                        ? "scale-x-100"
                                                        : "scale-x-0"
                                                } transition-transform duration-500 origin-center
                                            `}
                                        ></div>
                                    </div>

                                    <div className='text-gray-300 group-hover:text-white transition-colors duration-300'>
                                        {item.label}
                                    </div>

                                    <div className='absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none'></div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div
                    className={`mt-12 text-center transition-all duration-1000 delay-1000 ${
                        isVisible
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-8"
                    }`}
                >
                    <div className='inline-flex items-center space-x-2 text-gray-400'>
                        <div className='w-2 h-2 bg-primary rounded-full animate-pulse'></div>
                        <span className='text-sm'>{t("growing")}</span>
                        <div className='w-2 h-2 bg-secondary rounded-full animate-pulse delay-500'></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
