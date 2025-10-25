"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

export default function DiscoverHeader() {
    const t = useTranslations("HomeDiscover")
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setIsVisible(true)
    }, [])

    return (
        <div className='relative text-center space-y-8 overflow-hidden'>
            {/* Animated background elements */}
            <div className='absolute inset-0 -z-10'>
                <div className='absolute top-1/4 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-pulse'></div>
                <div className='absolute top-1/3 right-1/4 w-24 h-24 bg-secondary/10 rounded-full blur-lg animate-pulse delay-1000'></div>
                <div className='absolute bottom-1/4 left-1/3 w-20 h-20 bg-primary/5 rounded-full blur-md animate-pulse delay-2000'></div>
            </div>

            {/* Main heading with enhanced animations */}
            <div
                className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
                <h1 className='text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white leading-tight'>
                    <span className='block mb-2'>{t("whatIs")}</span>
                    <span className='relative inline-block'>
                        <span className='text-transparent bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text animate-gradient-x'>
                            {t("brand")}
                        </span>
                        {/* Animated underline */}
                        <div className='absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse'></div>
                    </span>
                </h1>
            </div>

            {/* Enhanced tagline with animation */}
            <div
                className={`transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
                <p className='text-gray-300 max-w-3xl mx-auto text-lg leading-relaxed'>
                    {t("tagline")}
                </p>
            </div>

            {/* Enhanced action buttons */}
            <div
                className={`transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
                <div className='flex flex-col sm:flex-row items-center justify-center gap-6 pt-4'>
                    <Link
                        href='/about'
                        className='group relative px-6 py-3 text-accent hover:text-white transition-all duration-300 border border-accent/30 hover:border-accent rounded-lg hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 backdrop-blur-sm'
                    >
                        <span className='relative z-10'>{t("learnMore")}</span>
                        <div className='absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-300'></div>
                    </Link>

                    <div className='hidden sm:block w-px h-6 bg-gradient-to-b from-transparent via-gray-600 to-transparent'></div>

                    <Link
                        href='/demo'
                        className='group relative px-6 py-3 text-accent hover:text-white transition-all duration-300 border border-accent/30 hover:border-accent rounded-lg hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 backdrop-blur-sm'
                    >
                        <span className='relative z-10'>
                            {t("requestDemo")}
                        </span>
                        <div className='absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-300'></div>
                    </Link>
                </div>
            </div>

            {/* Floating decorative elements */}
            <div className='absolute top-10 left-10 w-2 h-2 bg-primary/30 rounded-full animate-bounce delay-1000'></div>
            <div className='absolute top-20 right-16 w-1 h-1 bg-secondary/40 rounded-full animate-bounce delay-2000'></div>
            <div className='absolute bottom-10 left-20 w-1.5 h-1.5 bg-primary/20 rounded-full animate-bounce delay-3000'></div>
        </div>
    )
}
