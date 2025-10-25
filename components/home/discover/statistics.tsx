"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect, useRef } from "react"
import { TrendingUp, Users, Star, Zap } from "lucide-react"

export default function StatisticsSection() {
    const t = useTranslations("HomeDiscover.Statistics")
    const [isVisible, setIsVisible] = useState(false)
    const [animatedNumbers, setAnimatedNumbers] = useState<number[]>([])
    const sectionRef = useRef<HTMLDivElement>(null)

    const items = t.raw("items") as Array<{ number: string; label: string }>

    // Extract numeric values for animation
    const numericValues = items.map((item) => {
        const num = item.number.replace(/[^\d]/g, "")
        return parseInt(num) || 0
    })

    useEffect(() => {
        setIsVisible(true)
    }, [])

    useEffect(() => {
        if (!isVisible) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // Start animation when section comes into view
                    animateNumbers()
                }
            },
            { threshold: 0.3 }
        )

        if (sectionRef.current) {
            observer.observe(sectionRef.current)
        }

        return () => observer.disconnect()
    }, [isVisible])

    const animateNumbers = () => {
        const duration = 2000 // 2 seconds
        const steps = 60
        const stepDuration = duration / steps

        numericValues.forEach((targetValue, index) => {
            let currentStep = 0
            const increment = targetValue / steps

            const timer = setInterval(() => {
                currentStep++
                const currentValue = Math.min(
                    Math.floor(increment * currentStep),
                    targetValue
                )

                setAnimatedNumbers((prev) => {
                    const newNumbers = [...prev]
                    newNumbers[index] = currentValue
                    return newNumbers
                })

                if (currentStep >= steps) {
                    clearInterval(timer)
                }
            }, stepDuration)
        })
    }

    const icons = [TrendingUp, Users, Star, Zap]
    const colors = [
        "from-blue-500 to-cyan-500",
        "from-green-500 to-emerald-500",
        "from-yellow-500 to-orange-500",
        "from-purple-500 to-pink-500",
    ]

    return (
        <div ref={sectionRef} className='relative overflow-hidden'>
            {/* Background effects */}
            <div className='absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl'></div>
            <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary rounded-t-2xl'></div>

            {/* Floating particles */}
            <div className='absolute inset-0 overflow-hidden rounded-2xl'>
                <div className='absolute top-4 left-4 w-2 h-2 bg-primary/30 rounded-full animate-ping delay-1000'></div>
                <div className='absolute top-8 right-8 w-1 h-1 bg-secondary/40 rounded-full animate-pulse delay-2000'></div>
                <div className='absolute bottom-6 left-1/4 w-1.5 h-1.5 bg-primary/20 rounded-full animate-bounce delay-3000'></div>
                <div className='absolute bottom-4 right-1/3 w-1 h-1 bg-secondary/30 rounded-full animate-ping delay-4000'></div>
            </div>

            <div className='relative bg-gradient-to-r from-gray-800/40 to-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8'>
                {/* Enhanced header */}
                <div
                    className={`text-center mb-12 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
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

                {/* Statistics grid */}
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
                    {items.map((item, idx) => {
                        const IconComponent = icons[idx] || TrendingUp
                        const color = colors[idx] || "from-primary to-secondary"
                        const animatedValue = animatedNumbers[idx] || 0

                        return (
                            <div
                                key={idx}
                                className={`group text-center transition-all duration-700 delay-${idx * 200} ${
                                    isVisible
                                        ? "opacity-100 translate-y-0"
                                        : "opacity-0 translate-y-8"
                                }`}
                            >
                                {/* Card container */}
                                <div className='relative bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 hover:border-primary/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl'>
                                    {/* Icon */}
                                    <div className='flex justify-center mb-4'>
                                        <div
                                            className={`
                                            w-16 h-16 rounded-2xl bg-gradient-to-r ${color} 
                                            flex items-center justify-center shadow-lg group-hover:scale-110 
                                            transition-all duration-300 group-hover:rotate-6
                                        `}
                                        >
                                            <IconComponent className='w-8 h-8 text-white' />
                                        </div>
                                    </div>

                                    {/* Animated number */}
                                    <div className='mb-3'>
                                        <div
                                            className={`
                                            text-4xl md:text-5xl font-bold bg-gradient-to-r ${color} 
                                            bg-clip-text text-transparent group-hover:scale-110 
                                            transition-all duration-300
                                        `}
                                        >
                                            {animatedValue.toLocaleString()}
                                            {item.number.includes("+") && "+"}
                                            {item.number.includes("%") && "%"}
                                        </div>

                                        {/* Animated underline */}
                                        <div
                                            className={`
                                            w-16 h-1 bg-gradient-to-r ${color} rounded-full mx-auto mt-2
                                            transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center
                                        `}
                                        ></div>
                                    </div>

                                    {/* Label */}
                                    <div className='text-gray-300 group-hover:text-white transition-colors duration-300'>
                                        {item.label}
                                    </div>

                                    {/* Hover effect overlay */}
                                    <div className='absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none'></div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Additional visual elements */}
                <div
                    className={`mt-12 text-center transition-all duration-1000 delay-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
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
