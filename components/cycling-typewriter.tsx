"use client"

import { useState, useEffect, useCallback } from "react"
import { TypewriterText } from "./typewriter-text"
import { useTranslations } from "next-intl"

interface CyclingTypewriterProps {
    className?: string
}

interface TypewriterContent {
    line1: string
    line2: string
}

export function CyclingTypewriter({ className = "" }: CyclingTypewriterProps) {
    const t = useTranslations("Home")
    const [currentPhase, setCurrentPhase] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [showContent, setShowContent] = useState(true)
    const [contentPhases, setContentPhases] = useState<TypewriterContent[]>([])

    // Initialize content phases when translations are available
    useEffect(() => {
        if (t) {
            const phases: TypewriterContent[] = [
                {
                    line1: t("hero.line1"),
                    line2: t("hero.line2")
                },
                {
                    line1: t("cyclingTypewriter.phase1.line1"),
                    line2: t("cyclingTypewriter.phase1.line2")
                },
                {
                    line1: t("cyclingTypewriter.phase2.line1"),
                    line2: t("cyclingTypewriter.phase2.line2")
                },
                {
                    line1: t("cyclingTypewriter.phase3.line1"),
                    line2: t("cyclingTypewriter.phase3.line2")
                }
            ]
            setContentPhases(phases)
        }
    }, [t])

    // Calculate typing duration for each line (assuming 60ms per character)
    const getTypingDuration = useCallback((text: string) => text.length * 60, [])

    // Calculate total duration for both lines + 3 second pause
    const getTotalDuration = useCallback((content: TypewriterContent) => {
        const line1Duration = getTypingDuration(content.line1)
        const line2Duration = getTypingDuration(content.line2)
        return Math.max(line1Duration, line2Duration) + 3000 // 3 seconds pause
    }, [getTypingDuration])

    useEffect(() => {
        if (contentPhases.length === 0) return

        const currentContent = contentPhases[currentPhase]
        const totalDuration = getTotalDuration(currentContent)

        const timer = setTimeout(() => {
            setIsTransitioning(true)
            setShowContent(false)
            
            // After transition animation, move to next phase
            setTimeout(() => {
                setCurrentPhase((prev) => (prev + 1) % contentPhases.length)
                setIsTransitioning(false)
                setShowContent(true)
            }, 500) // Transition duration
        }, totalDuration)

        return () => clearTimeout(timer)
    }, [currentPhase, contentPhases, getTotalDuration])

    const currentContent = contentPhases[currentPhase]

    // Don't render anything if contentPhases is not loaded yet
    if (contentPhases.length === 0) {
        return <div className={`${className}`} />
    }

    return (
        <div className={`transition-all duration-500 ${className}`}>
            {showContent && (
                <div className={`space-y-4 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                    <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                        <TypewriterText
                            text={currentContent.line1}
                            speed={60}
                            className='text-white'
                        />
                        <br />
                        <TypewriterText
                            text={currentContent.line2}
                            speed={60}
                            delay={60 * currentContent.line1.length}
                            className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'
                        />
                    </h1>
                </div>
            )}
        </div>
    )
}