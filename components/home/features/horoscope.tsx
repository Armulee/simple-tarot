"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { TypewriterText } from "@/components/typewriter-text"
import { useTranslations } from "next-intl"

export default function Horoscope() {
    const t = useTranslations("Home")
    const [shouldStartTypewriter, setShouldStartTypewriter] = useState(false)

    // Listen for when this slide becomes active (index 1)
    useEffect(() => {
        const handleSlideChange = () => {
            setShouldStartTypewriter(true)
        }

        // Check if we're on the birth chart slide (index 1)
        const checkSlide = () => {
            const event = new CustomEvent("check-horoscope-slide")
            window.dispatchEvent(event)
        }

        window.addEventListener("horoscope-slide-active", handleSlideChange)
        checkSlide()

        return () => {
            window.removeEventListener(
                "horoscope-slide-active",
                handleSlideChange
            )
        }
    }, [])

    const title1 = t("astrologyFeature.title1")
    const title2 = t("astrologyFeature.title2")

    return (
        <div className='space-y-6 text-center px-4 w-full max-w-3xl'>
            {/* Main Heading (match other features) */}
            <div className='space-y-4'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance'>
                    {shouldStartTypewriter ? (
                        <>
                            <TypewriterText
                                key={`typewriter-astrology-1`}
                                text={`${title1} `}
                                speed={60}
                                className='text-white'
                            />
                            <TypewriterText
                                key={`typewriter-astrology-2`}
                                text={title2}
                                speed={60}
                                delay={60 * (title1.length + 1)}
                                className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'
                            />
                        </>
                    ) : (
                        <>
                            <span className='text-white'>{title1} </span>
                            <span className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                                {title2}
                            </span>
                        </>
                    )}
                </h1>

                <div className='flex items-center justify-center gap-2 text-white/70 text-base sm:text-lg'>
                    <span>{t("astrologyFeature.tagline")}</span>
                </div>

                <p className='text-white/55 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed'>
                    {t("astrologyFeature.instruction")}
                </p>
            </div>

            {/* CTA (keep it simple like requested, but styled like other features) */}
            <div className='flex justify-center pt-2'>
                <Button
                    asChild
                    className='group relative overflow-hidden rounded-full px-7 py-2.5 text-white font-semibold border border-border/60 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 backdrop-blur-xl shadow-[0_12px_40px_-14px_rgba(56,189,248,0.55)] hover:shadow-[0_16px_55px_-16px_rgba(56,189,248,0.75)] hover:border-primary/60 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0'
                >
                    <Link
                        href='/astrology'
                        className='inline-flex items-center gap-2'
                    >
                        {/* soft glow / sheen */}
                        <span className='pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_10%_0%,rgba(99,102,241,0.45),rgba(168,85,247,0.25)_35%,rgba(34,211,238,0.18)_65%,transparent_80%)] opacity-70 group-hover:opacity-100 transition-opacity' />
                        <span className='pointer-events-none absolute -inset-1 translate-x-[-60%] group-hover:translate-x-[120%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent' />

                        <span className='relative z-10'>
                            {t("astrologyFeature.cta")}
                        </span>
                        <ArrowRight className='relative z-10 w-4 h-4 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all' />
                    </Link>
                </Button>
            </div>
        </div>
    )
}
