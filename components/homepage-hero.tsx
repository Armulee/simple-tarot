"use client"

import { CyclingTypewriter } from "@/components/cycling-typewriter"
import HomeQuestionWrapper from "@/components/home-question-wrapper"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"
import { useTranslations } from "next-intl"

interface HomepageHeroProps {
    onLearnMore?: () => void
}

export function HomepageHero({ onLearnMore }: HomepageHeroProps) {
    const t = useTranslations("Home")
    
    return (
        <section className='relative z-10 flex flex-col items-center justify-center h-screen px-6 text-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'>
            <div className='max-w-4xl w-full mx-auto space-y-8'>
                {/* Main Heading */}
                <div className='space-y-4 pt-20'>
                    <CyclingTypewriter className='h-20 sm:h-24 md:h-28 lg:h-32' />
                </div>

                {/* Question Input */}
                <div className='flex flex-col gap-6 justify-center items-center pt-8 max-w-md mx-auto px-4'>
                    <div className='w-full opacity-0 pointer-events-none'>
                        <Suspense fallback={<div className='h-20' />}>
                            <HomeQuestionWrapper />
                        </Suspense>
                    </div>

                    <Button
                        onClick={onLearnMore}
                        variant='ghost'
                        size='lg'
                        className='border-border/30 hover:bg-card/20 backdrop-blur-sm px-8 py-6 text-lg bg-transparent text-white hover:text-white/80'
                    >
                        {t("learnMore")}
                    </Button>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
                    <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
                </div>
            </div>
        </section>
    )
}