"use client"

import {
    CheckCircle,
    Clock,
    Target,
    Sparkles,
    Calendar,
    ArrowRight,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"

export default function RoadmapSection() {
    const t = useTranslations("HomeDiscover.Roadmap")
    const [isVisible, setIsVisible] = useState(false)
    const [hoveredItem, setHoveredItem] = useState<number | null>(null)
    const [currentDate, setCurrentDate] = useState(() => new Date())

    useEffect(() => {
        setIsVisible(true)
        const interval = setInterval(() => {
            setCurrentDate(new Date())
        }, 1000 * 60 * 60)
        return () => clearInterval(interval)
    }, [])

    const roadmap = [
        {
            phase: t("phases.dec_2025"),
            title: t("birthChart.title"),
            status: t("status.inDevelopment"),
            eta: t("birthChart.eta"),
            features: t.raw("birthChart.features") as string[],
            color: "from-indigo-500 to-sky-500",
            glowColor: "shadow-indigo-500/20",
            startDate: "2025-07-01",
            targetDate: "2025-12-12",
        },
        {
            phase: t("phases.dec_2025"),
            title: t("horoscope.title"),
            status: t("status.inDevelopment"),
            eta: t("horoscope.eta"),
            features: t.raw("horoscope.features") as string[],
            color: "from-fuchsia-500 to-rose-500",
            glowColor: "shadow-fuchsia-500/20",
            startDate: "2025-07-01",
            targetDate: "2025-12-12",
        },
        {
            phase: t("phases.jan_2026"),
            title: t("namelogy.title"),
            status: t("status.planned"),
            eta: t("namelogy.eta"),
            features: t.raw("namelogy.features") as string[],
            color: "from-amber-500 to-orange-500",
            glowColor: "shadow-amber-500/20",
            startDate: "2025-09-15",
            targetDate: "2026-01-15",
        },
        {
            phase: t("phases.jan_2026"),
            title: t("numerology.title"),
            status: t("status.planned"),
            eta: t("numerology.eta"),
            features: t.raw("numerology.features") as string[],
            color: "from-emerald-500 to-teal-500",
            glowColor: "shadow-emerald-500/20",
            startDate: "2025-09-15",
            targetDate: "2026-01-15",
        },
        {
            phase: t("phases.jan_2026"),
            title: t("luckyColors.title"),
            status: t("status.planned"),
            eta: t("luckyColors.eta"),
            features: t.raw("luckyColors.features") as string[],
            color: "from-cyan-500 to-blue-500",
            glowColor: "shadow-cyan-500/20",
            startDate: "2025-10-01",
            targetDate: "2026-01-20",
        },
        {
            phase: t("phases.q1_2026"),
            title: t("mobileApp.title"),
            status: t("status.planned"),
            eta: t("mobileApp.eta"),
            features: t.raw("mobileApp.features") as string[],
            color: "from-purple-500 to-indigo-500",
            glowColor: "shadow-purple-500/20",
            startDate: "2025-11-01",
            targetDate: "2026-03-31",
        },
        {
            phase: t("phases.q1_2026"),
            title: t("fatedRelations.title"),
            status: t("status.planned"),
            eta: t("fatedRelations.eta"),
            features: t.raw("fatedRelations.features") as string[],
            color: "from-pink-500 to-red-500",
            glowColor: "shadow-pink-500/20",
            startDate: "2025-11-15",
            targetDate: "2026-03-31",
        },
        {
            phase: t("phases.mar_2026"),
            title: t("palmistry.title"),
            status: t("status.planned"),
            eta: t("palmistry.eta"),
            features: t.raw("palmistry.features") as string[],
            color: "from-slate-500 to-violet-500",
            glowColor: "shadow-violet-500/20",
            startDate: "2026-01-01",
            targetDate: "2026-03-31",
        },
    ]

    return (
        <div className='space-y-12'>
            {/* Enhanced section header */}
            <div
                className={`text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
                <div className='inline-flex items-center gap-2 mb-4'>
                    <Calendar className='w-6 h-6 text-accent animate-pulse' />
                    <span className='text-primary font-semibold text-sm uppercase tracking-wider'>
                        {t("label")}
                    </span>
                    <Calendar className='w-6 h-6 text-accent animate-pulse' />
                </div>
                <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
                    {t("title")}
                </h2>
                <p className='text-gray-400 max-w-2xl mx-auto text-lg'>
                    {t("description")}
                </p>
            </div>

            {/* Timeline container */}
            <div className='relative'>
                {/* Timeline line */}
                <div className='absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-primary opacity-30'></div>

                {/* Timeline items */}
                <div className='space-y-8'>
                    {roadmap.map((phase, index) => {
                        const isCompleted =
                            phase.status === t("status.completed")
                        const isInDevelopment =
                            phase.status === t("status.inDevelopment")
                        const isPlanned = phase.status === t("status.planned")
                        const statusStyle = isCompleted
                            ? "bg-green-500/20 text-green-200 border border-green-400/40"
                            : isInDevelopment
                              ? "bg-blue-500/20 text-blue-200 border border-blue-400/40"
                              : "bg-amber-500/20 text-amber-200 border border-amber-400/40"
                        const start = new Date(phase.startDate ?? "")
                        const target = new Date(phase.targetDate ?? "")
                        let progressValue = 0
                        if (isCompleted) {
                            progressValue = 100
                        } else if (
                            !Number.isNaN(start.valueOf()) &&
                            !Number.isNaN(target.valueOf()) &&
                            start < target
                        ) {
                            if (currentDate <= start) {
                                progressValue = 0
                            } else if (currentDate >= target) {
                                progressValue = 100
                            } else {
                                progressValue = Math.round(
                                    ((currentDate.getTime() - start.getTime()) /
                                        (target.getTime() - start.getTime())) * 100
                                )
                            }
                        }
                        progressValue = Math.max(0, Math.min(100, progressValue))

                        return (
                            <div
                                key={`${phase.phase}-${phase.title}-${index}`}
                                className={`relative transition-all duration-700 delay-${index * 150} ${
                                    isVisible
                                        ? "opacity-100 translate-x-0"
                                        : "opacity-0 -translate-x-8"
                                }`}
                                onMouseEnter={() => setHoveredItem(index)}
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                {/* Timeline connector */}
                                <div className='absolute left-6 top-8 w-4 h-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full border-2 border-gray-600 z-10'></div>

                                {/* Timeline dot with status */}
                                <div
                                    className={`
                                    absolute left-6 top-6 w-6 h-6 rounded-full border-2 z-20 transition-all duration-300 flex items-center justify-center
                                    ${
                                        isCompleted
                                            ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/30"
                                            : isInDevelopment
                                              ? "bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/30 animate-pulse"
                                              : "bg-gray-500 border-gray-400"
                                    }
                                    ${hoveredItem === index ? "scale-125" : ""}
                                `}
                                >
                                    {isCompleted && (
                                        <CheckCircle className='w-3.5 h-3.5 text-white' />
                                    )}
                                    {isInDevelopment && (
                                        <Clock className='w-3.5 h-3.5 text-white' />
                                    )}
                                    {isPlanned && (
                                        <Target className='w-3.5 h-3.5 text-white' />
                                    )}
                                </div>

                                {/* Content card */}
                                <div
                                    className={`
                                    ml-16 bg-gradient-to-br from-gray-800/40 to-gray-900/60 
                                    backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8
                                    transition-all duration-500 hover:scale-105 hover:shadow-2xl
                                    ${hoveredItem === index ? `shadow-2xl ${phase.glowColor}` : "shadow-lg"}
                                `}
                                >
                                  <div className='absolute top-6 right-6'>
                                      <span
                                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${statusStyle}`}
                                      >
                                          {phase.status}
                                      </span>
                                  </div>

                                    {/* Animated background gradient */}
                                    <div
                                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${phase.color} opacity-0 hover:opacity-5 transition-opacity duration-500`}
                                    ></div>

                                    {/* Header */}
                                    <div className='relative flex items-start justify-between mb-6'>
                                        <div className='flex-1'>
                                          <div className='flex items-center gap-3 mb-2'>
                                              <span className='text-lg font-bold text-white'>
                                                  {phase.title}
                                              </span>
                                          </div>

                                          {phase.eta && (
                                              <div className='flex items-center gap-2 text-sm text-gray-400'>
                                                  <Calendar className='w-4 h-4' />
                                                  {t("eta")}: {phase.eta}
                                              </div>
                                          )}
                                        </div>
                                    </div>

                                    {/* Features grid */}
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                        {phase.features.map(
                                            (feature, featureIndex) => (
                                                <div
                                                    key={featureIndex}
                                                    className='flex items-start space-x-3 group'
                                                >
                                                    <div
                                                        className={`
                                                    w-6 h-6 rounded-full bg-gradient-to-r ${phase.color} 
                                                    flex items-center justify-center flex-shrink-0 mt-0.5
                                                    group-hover:scale-110 transition-transform duration-300
                                                `}
                                                    >
                                                        <Sparkles className='w-3 h-3 text-white' />
                                                    </div>
                                                    <span className='text-gray-300 text-sm leading-relaxed group-hover:text-white transition-colors duration-300'>
                                                        {feature}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>

                                      {/* Progress indicator */}
                                      <div className='mt-6'>
                                          <div className='flex items-center justify-between text-sm text-gray-400 mb-2'>
                                              <span>{t("progress")}</span>
                                              <span>{progressValue}%</span>
                                          </div>
                                          <div className='w-full bg-gray-700/50 rounded-full h-2 overflow-hidden'>
                                              <div
                                                  className={`h-full bg-gradient-to-r ${phase.color} rounded-full transition-all duration-1000`}
                                                  style={{ width: `${progressValue}%` }}
                                              ></div>
                                          </div>
                                      </div>

                                    {/* Hover effect overlay */}
                                    <div className='absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none'></div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
