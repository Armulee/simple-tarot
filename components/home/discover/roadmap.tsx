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
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
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
}

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

    const roadmap = roadmapPhases.map((phase) => ({
        ...phase,
        phaseLabel: t(phase.phaseKey),
        title: t(`${phase.translationKey}.title`),
        statusLabel: t(phase.statusKey),
        eta: t(`${phase.translationKey}.eta`),
        features: t.raw(`${phase.translationKey}.features`) as string[],
        featureIcons: phase.featureIconKeys.map(
            (key) => featureIconMap[key as keyof typeof featureIconMap] ?? Sparkles
        ),
    }))

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
                          const isCompleted = phase.statusKey === "status.completed"
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
                                        (target.getTime() - start.getTime())) * 100
                                )
                            }
                        }
                        progressValue = Math.max(0, Math.min(100, progressValue))

                        return (
                            <div
                                key={`${phase.phaseKey}-${phase.title}-${index}`}
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
                                      absolute left-6 top-8 -translate-y-1/2 w-6 h-6 rounded-full border-2 z-20 transition-all duration-300
                                      ${
                                          isCompleted
                                              ? "bg-green-500 border-green-400 shadow-lg shadow-green-500/30"
                                              : isInDevelopment
                                                ? "bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/30 animate-pulse"
                                                : "bg-gray-500 border-gray-400"
                                      }
                                      ${hoveredItem === index ? "scale-125" : ""}
                                  `}
                                  ></div>

                                {/* Content card */}
                                <div
                                    className={`
                                    ml-16 bg-gradient-to-br from-gray-800/40 to-gray-900/60 
                                    backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8
                                    transition-all duration-500 hover:scale-105 hover:shadow-2xl
                                    ${hoveredItem === index ? `shadow-2xl ${phase.glowColor}` : "shadow-lg"}
                                `}
                                >
                                  <div className='absolute left-6 -top-3'>
                                      <span
                                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${statusStyle}`}
                                      >
                                            {phase.statusLabel}
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
                                      <div className='space-y-3'>
                                          {phase.features.map((feature, featureIndex) => {
                                              const FeatureIcon =
                                                  phase.featureIcons?.[featureIndex] ?? Sparkles
                                              return (
                                                  <div
                                                      key={featureIndex}
                                                      className='flex items-start gap-3 bg-gray-800/40 border border-gray-700/40 rounded-xl p-4 text-left text-sm text-gray-300 leading-relaxed hover:border-primary/40 transition-colors duration-300'
                                                  >
                                                      <FeatureIcon className='w-4 h-4 text-primary mt-0.5' />
                                                      <span>{feature}</span>
                                                  </div>
                                              )
                                          })}
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
