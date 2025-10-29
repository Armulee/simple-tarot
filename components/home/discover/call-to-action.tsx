"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { ArrowRight, Sparkles, Star, Zap } from "lucide-react"

export default function CallToActionSection() {
    const t = useTranslations("HomeDiscover.CTA")
    const [isVisible, setIsVisible] = useState(false)
    const [, setHoveredButton] = useState<string | null>(null)

    useEffect(() => {
        setIsVisible(true)
    }, [])

    return (
        <div className='relative overflow-hidden'>
            {/* Animated background */}
            <div className='absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-2xl'></div>
            <div className='absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl'></div>

            {/* Floating particles */}
            <div className='absolute inset-0 overflow-hidden rounded-2xl'>
                <div className='absolute top-6 left-6 w-3 h-3 bg-primary/20 rounded-full animate-bounce delay-1000'></div>
                <div className='absolute top-12 right-8 w-2 h-2 bg-secondary/30 rounded-full animate-ping delay-2000'></div>
                <div className='absolute bottom-8 left-1/4 w-1.5 h-1.5 bg-primary/15 rounded-full animate-pulse delay-3000'></div>
                <div className='absolute bottom-6 right-1/3 w-2.5 h-2.5 bg-secondary/25 rounded-full animate-bounce delay-4000'></div>
                <div className='absolute top-1/2 left-8 w-1 h-1 bg-primary/20 rounded-full animate-ping delay-5000'></div>
                <div className='absolute top-1/3 right-12 w-1.5 h-1.5 bg-secondary/20 rounded-full animate-pulse delay-6000'></div>
            </div>

            {/* Gradient overlay */}
            <div className='absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 rounded-2xl'></div>

            <div className='relative bg-gradient-to-r from-gray-800/40 to-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-12 text-center'>
                {/* Enhanced header */}
                <div
                    className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                    <div className='inline-flex items-center gap-2 mb-6'>
                        <Sparkles className='w-6 h-6 text-accent animate-pulse' />
                        <span className='text-primary font-semibold text-sm uppercase tracking-wider'>
                            {t("label")}
                        </span>
                        <Sparkles className='w-6 h-6 text-accent animate-pulse' />
                    </div>

                    <h2 className='text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight'>
                        <span className='block mb-2'>{t("title")}</span>
                        <span className='text-transparent bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text animate-gradient-x'>
                            {t("subheading")}
                        </span>
                    </h2>

                    <p className='text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed'>
                        {t("desc")}
                    </p>
                </div>

                {/* Enhanced buttons */}
                <div
                    className={`flex flex-col sm:flex-row gap-6 justify-center transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                    {/* Primary button */}
                    <button
                        className='group relative px-10 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold text-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-primary/25'
                        onMouseEnter={() => setHoveredButton("primary")}
                        onMouseLeave={() => setHoveredButton(null)}
                    >
                        <span className='relative z-10 flex items-center justify-center gap-2'>
                            {t("primary")}
                            <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform duration-300' />
                        </span>

                        {/* Animated background */}
                        <div className='absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>

                        {/* Shine effect */}
                        <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700'></div>

                        {/* Glow effect */}
                        <div className='absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300 -z-10'></div>
                    </button>

                    {/* Secondary button */}
                    <button
                        className='group relative px-10 py-4 border-2 border-accent/30 text-accent rounded-xl font-semibold text-lg hover:scale-105 transition-all duration-300 hover:border-accent hover:bg-accent/10 hover:text-white'
                        onMouseEnter={() => setHoveredButton("secondary")}
                        onMouseLeave={() => setHoveredButton(null)}
                    >
                        <span className='relative z-10 flex items-center justify-center gap-2'>
                            {t("secondary")}
                            <Star className='w-5 h-5 group-hover:rotate-12 transition-transform duration-300 text-accent' />
                        </span>

                        {/* Animated background */}
                        <div className='absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>

                        {/* Border glow */}
                        <div className='absolute inset-0 border-2 border-primary rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                    </button>
                </div>

                {/* Additional features */}
                <div
                    className={`mt-12 transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                >
                    <div className='flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400'>
                        <div className='flex items-center gap-2'>
                            <Zap className='w-4 h-4 text-accent' />
                            <span>{t("features.instantAccess")}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                            <Star className='w-4 h-4 text-accent' />
                            <span>{t("features.premiumQuality")}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                            <Sparkles className='w-4 h-4 text-accent' />
                            <span>{t("features.mysticalExperience")}</span>
                        </div>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className='absolute top-4 left-4 w-8 h-8 border border-primary/20 rounded-full animate-spin-slow'></div>
                <div className='absolute bottom-4 right-4 w-6 h-6 border border-secondary/20 rounded-full animate-spin-slow delay-1000'></div>
                <div className='absolute top-1/2 left-4 w-4 h-4 border border-primary/15 rounded-full animate-ping delay-2000'></div>
                <div className='absolute top-1/3 right-4 w-3 h-3 border border-secondary/15 rounded-full animate-ping delay-3000'></div>
            </div>
        </div>
    )
}
