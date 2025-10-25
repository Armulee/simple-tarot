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

    useEffect(() => {
        setIsVisible(true)
    }, [])

    const roadmap = [
        {
            phase: t("phases.q4_2025"),
            title: t("teamWorkspaces.title"),
            status: t("status.planned"),
            eta: t("teamWorkspaces.eta"),
            features: t.raw("teamWorkspaces.features") as string[],
            color: "from-blue-500 to-cyan-500",
            glowColor: "shadow-blue-500/20",
        },
        {
            phase: t("phases.q4_2025"),
            title: t("savedReadings.title"),
            status: t("status.planned"),
            eta: t("savedReadings.eta"),
            features: t.raw("savedReadings.features") as string[],
            color: "from-purple-500 to-pink-500",
            glowColor: "shadow-purple-500/20",
        },
        {
            phase: t("phases.q1_2026"),
            title: t("multilanguage.title"),
            status: t("status.planned"),
            eta: t("multilanguage.eta"),
            features: t.raw("multilanguage.features") as string[],
            color: "from-emerald-500 to-teal-500",
            glowColor: "shadow-emerald-500/20",
        },
        {
            phase: t("phases.q1_2026"),
            title: t("mobileEnhancements.title"),
            status: t("status.planned"),
            eta: t("mobileEnhancements.eta"),
            features: t.raw("mobileEnhancements.features") as string[],
            color: "from-orange-500 to-red-500",
            glowColor: "shadow-orange-500/20",
        },
        {
            phase: t("phases.q1_2026"),
            title: t("publicApi.title"),
            status: t("status.planned"),
            eta: t("publicApi.eta"),
            features: t.raw("publicApi.features") as string[],
            color: "from-violet-500 to-purple-500",
            glowColor: "shadow-violet-500/20",
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
                                    absolute left-6 top-6 w-6 h-6 rounded-full border-2 z-20 transition-all duration-300
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
                                        <CheckCircle className='w-4 h-4 text-white absolute -top-0.5 -left-0.5' />
                                    )}
                                    {isInDevelopment && (
                                        <Clock className='w-4 h-4 text-white absolute -top-0.5 -left-0.5' />
                                    )}
                                    {isPlanned && (
                                        <Target className='w-4 h-4 text-white absolute -top-0.5 -left-0.5' />
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
                                    {/* Animated background gradient */}
                                    <div
                                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${phase.color} opacity-0 hover:opacity-5 transition-opacity duration-500`}
                                    ></div>

                                    {/* Header */}
                                    <div className='relative flex items-start justify-between mb-6'>
                                        <div className='flex-1'>
                                            <div className='flex items-center gap-3 mb-2'>
                                                <span className='text-sm font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20'>
                                                    {phase.phase}
                                                </span>
                                                <ArrowRight className='w-4 h-4 text-gray-500' />
                                                <span className='text-lg font-bold text-white'>
                                                    {phase.title}
                                                </span>
                                            </div>

                                            {/* Status and ETA */}
                                            <div className='flex items-center gap-4'>
                                                <span
                                                    className={`
                                                    px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-300
                                                    ${
                                                        isCompleted
                                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                            : isInDevelopment
                                                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                                    }
                                                `}
                                                >
                                                    {phase.status}
                                                </span>

                                                {phase.eta && (
                                                    <span className='text-sm text-gray-400 flex items-center gap-1'>
                                                        <Calendar className='w-4 h-4' />
                                                        {t("eta")}: {phase.eta}
                                                    </span>
                                                )}
                                            </div>
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
                                            <span>
                                                {isCompleted
                                                    ? "100%"
                                                    : isInDevelopment
                                                      ? "50%"
                                                      : "0%"}
                                            </span>
                                        </div>
                                        <div className='w-full bg-gray-700/50 rounded-full h-2 overflow-hidden'>
                                            <div
                                                className={`
                                                h-full bg-gradient-to-r ${phase.color} rounded-full transition-all duration-1000
                                                ${isCompleted ? "w-full" : isInDevelopment ? "w-1/2" : "w-0"}
                                            `}
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
