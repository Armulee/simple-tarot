"use client"

import {
    Calendar,
    BarChart3,
    Compass,
    MessageCircle,
    Orbit,
    Sparkles,
    Type,
    ShieldCheck,
    Hash,
    AlertTriangle,
    Brain,
    Palette,
    Shirt,
    Smartphone,
    Cloud,
    LayoutDashboard,
    Heart,
    NotebookPen,
    Hand,
    LineChart,
    Lightbulb,
    BookOpen,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { roadmapPhases } from "@/lib/roadmap"

type FeatureIconComponent = typeof Sparkles

const featureIconMap: Record<string, FeatureIconComponent> = {
    BarChart3,
    Compass,
    MessageCircle,
    Orbit,
    Sparkles,
    Type,
    ShieldCheck,
    Hash,
    AlertTriangle,
    Brain,
    Palette,
    Shirt,
    Smartphone,
    Cloud,
    LayoutDashboard,
    Heart,
    NotebookPen,
    Hand,
    LineChart,
    Lightbulb,
    BookOpen,
}

export default function RoadmapSection() {
    const t = useTranslations("HomeDiscover.Roadmap")
    const [hoveredItem, setHoveredItem] = useState<number | null>(null)
    const [currentDate] = useState(() => new Date())

    const roadmap = roadmapPhases.map((phase) => ({
        ...phase,
        phaseLabel: t(phase.phaseKey),
        title: t(`${phase.translationKey}.title`),
        statusLabel: t(phase.statusKey),
        eta: t(`${phase.translationKey}.eta`),
        features: t.raw(`${phase.translationKey}.features`) as string[],
        featureIcons: phase.featureIconKeys.map(
            (key) =>
                featureIconMap[key as keyof typeof featureIconMap] ?? Sparkles
        ),
    }))

    return (
        <div className='space-y-8 md:space-y-12'>
            {/* Enhanced section header */}
            <div
                className={`text-center transition-all duration-1000 opacity-100 translate-y-0`}
            >
                <div className='inline-flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4'>
                    <Calendar className='w-4 h-4 md:w-6 md:h-6 text-accent animate-pulse' />
                    <span className='text-primary font-semibold text-xs md:text-sm uppercase tracking-wider'>
                        {t("label")}
                    </span>
                    <Calendar className='w-4 h-4 md:w-6 md:h-6 text-accent animate-pulse' />
                </div>
                <h2 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4 px-4'>
                    {t("title")}
                </h2>
                <p className='text-gray-400 max-w-2xl mx-auto text-sm md:text-base lg:text-lg px-4'>
                    {t("description")}
                </p>
            </div>

            {/* Timeline container */}
            <div className='relative'>
                {/* Timeline line - hidden on mobile and md+ (grid layout) */}
                <div className='hidden'></div>

                {/* Timeline items - grid layout: 2 columns on md, 3 columns on lg */}
                <div className='space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0 lg:grid-cols-3 lg:gap-6 xl:gap-8'>
                    {roadmap.map((phase, index) => {
                        const isCompleted =
                            phase.statusKey === "status.completed"
                        const isInDevelopment =
                            phase.statusKey === "status.inDevelopment"
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
                                        (target.getTime() - start.getTime())) *
                                        100
                                )
                            }
                        }
                        progressValue = Math.max(
                            0,
                            Math.min(100, progressValue)
                        )

                        return (
                            <div
                                key={`${phase.phaseKey}-${phase.title}-${index}`}
                                className={`relative transition-all duration-700 delay-${index * 150} opacity-100 translate-x-0`}
                                onMouseEnter={() => setHoveredItem(index)}
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                {/* Timeline connector - hidden (grid layout on md+) */}
                                <div className='hidden'></div>

                                {/* Timeline dot with status - hidden (grid layout on md+) */}
                                <div className='hidden'></div>

                                {/* Content card */}
                                <div
                                    className={`
                                    bg-gradient-to-br from-gray-800/40 to-gray-900/60 
                                    backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 md:p-6 lg:p-6 xl:p-8
                                    transition-all duration-500 hover:scale-105 hover:shadow-2xl h-full
                                    ${hoveredItem === index ? `shadow-2xl ${phase.glowColor}` : "shadow-lg"}
                                `}
                                >
                                    {/* Status badge - positioned differently on mobile */}
                                    <div className='absolute -top-3 left-4 md:left-6'>
                                        <span
                                            className={`inline-flex items-center px-2 py-1 md:px-3 md:py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${statusStyle}`}
                                        >
                                            {phase.statusLabel}
                                        </span>
                                    </div>

                                    {/* Animated background gradient */}
                                    <div
                                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${phase.color} opacity-0 hover:opacity-5 transition-opacity duration-500`}
                                    ></div>

                                    {/* Header */}
                                    <div className='relative flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 md:mb-6'>
                                        <div className='flex-1'>
                                            <div className='flex items-center gap-2 md:gap-3 mb-2'>
                                                <span className='text-base md:text-lg font-bold text-white'>
                                                    {phase.title}
                                                </span>
                                            </div>

                                            {phase.eta && (
                                                <div className='flex items-center gap-2 text-xs md:text-sm text-gray-400'>
                                                    <Calendar className='w-3 h-3 md:w-4 md:h-4 flex-shrink-0' />
                                                    <span>
                                                        {t("eta")}: {phase.eta}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Features grid */}
                                    <div className='space-y-2 md:space-y-3'>
                                        {phase.features.map(
                                            (feature, featureIndex) => {
                                                const FeatureIcon =
                                                    phase.featureIcons?.[
                                                        featureIndex
                                                    ] ?? Sparkles
                                                return (
                                                    <div
                                                        key={featureIndex}
                                                        className='flex items-start gap-2 md:gap-3 bg-gray-800/40 border border-gray-700/40 rounded-xl p-3 md:p-4 text-left text-xs md:text-sm text-gray-300 leading-relaxed hover:border-primary/40 transition-colors duration-300'
                                                    >
                                                        <FeatureIcon className='w-3 h-3 md:w-4 md:h-4 text-primary mt-0.5 flex-shrink-0' />
                                                        <span>{feature}</span>
                                                    </div>
                                                )
                                            }
                                        )}
                                    </div>

                                    {/* Progress indicator */}
                                    <div className='mt-4 md:mt-6'>
                                        <div className='flex items-center justify-between text-xs md:text-sm text-gray-400 mb-2'>
                                            <span>{t("progress")}</span>
                                            <span>{progressValue}%</span>
                                        </div>
                                        <div className='w-full bg-gray-700/50 rounded-full h-1.5 md:h-2 overflow-hidden'>
                                            <div
                                                className={`h-full bg-gradient-to-r ${phase.color} rounded-full transition-all duration-1000`}
                                                style={{
                                                    width: `${progressValue}%`,
                                                }}
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
