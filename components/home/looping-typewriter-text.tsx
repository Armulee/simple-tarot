"use client"

import { useState, useEffect, useRef } from "react"

type Phase = "typing" | "holding" | "fadingOut"

interface LoopingTypewriterTextProps {
    phrases: string[]
    speed?: number
    holdDuration?: number
    fadeDuration?: number
    className?: string
    /** For the first phrase only: character index to split white (before) vs gradient (after) */
    firstPhraseSplitAt?: number
    /** Explicit split index per phrase. When provided, used instead of getSplitIndex (ensures correct word boundaries e.g. for Thai) */
    splitAtPerPhrase?: number[]
}

function pickNextPhrase(phrases: string[], currentIndex: number): number {
    if (phrases.length <= 1) return 0
    const rotatingCount = phrases.length - 1
    const indices = Array.from({ length: rotatingCount }, (_, i) => i + 1)
    const withoutCurrent = indices.filter((i) => i !== currentIndex)
    const pool = withoutCurrent.length > 0 ? withoutCurrent : indices
    return pool[Math.floor(Math.random() * pool.length)]
}

/** Find a natural break point (space after ~35% of phrase) for white/gradient split */
function getSplitIndex(
    phrase: string,
    phraseIndex: number,
    firstPhraseSplitAt?: number,
): number {
    if (
        phraseIndex === 0 &&
        firstPhraseSplitAt != null &&
        firstPhraseSplitAt > 0
    ) {
        return firstPhraseSplitAt
    }
    const minSplit = Math.floor(phrase.length * 0.3)
    const maxSplit = Math.floor(phrase.length * 0.6)
    const spaceIndex = phrase.indexOf(" ", minSplit)
    if (spaceIndex >= 0 && spaceIndex <= maxSplit) {
        return spaceIndex + 1
    }
    const fallback = phrase.indexOf(" ")
    return fallback >= 0 ? fallback + 1 : Math.floor(phrase.length * 0.4)
}

export function LoopingTypewriterText({
    phrases,
    speed = 50,
    holdDuration = 3000,
    fadeDuration = 500,
    className = "",
    firstPhraseSplitAt,
    splitAtPerPhrase,
}: LoopingTypewriterTextProps) {
    const [phase, setPhase] = useState<Phase>("typing")
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0)
    const [displayedText, setDisplayedText] = useState("")
    const [currentCharIndex, setCurrentCharIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)
    const containerRef = useRef<HTMLSpanElement>(null)

    const text = phrases[currentPhraseIndex] ?? ""
    const isComplete = currentCharIndex >= text.length

    // Typing: add characters one by one
    useEffect(() => {
        if (phase !== "typing") return
        if (currentCharIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + text[currentCharIndex])
                setCurrentCharIndex((prev) => prev + 1)
            }, speed)
            return () => clearTimeout(timeout)
        }
        if (isComplete) {
            setPhase("holding")
        }
    }, [phase, currentCharIndex, text, speed, isComplete])

    // Holding: wait before fading out
    useEffect(() => {
        if (phase !== "holding") return
        const timeout = setTimeout(() => {
            setPhase("fadingOut")
        }, holdDuration)
        return () => clearTimeout(timeout)
    }, [phase, holdDuration])

    // FadingOut: animate opacity, then switch phrase and restart typing
    useEffect(() => {
        if (phase !== "fadingOut") return
        setIsVisible(false)
        const timeout = setTimeout(() => {
            const nextIndex = pickNextPhrase(phrases, currentPhraseIndex)
            setCurrentPhraseIndex(nextIndex)
            setDisplayedText("")
            setCurrentCharIndex(0)
            setIsVisible(true)
            setPhase("typing")
        }, fadeDuration)
        return () => clearTimeout(timeout)
    }, [phase, fadeDuration, phrases, currentPhraseIndex])

    const explicitSplit = splitAtPerPhrase?.[currentPhraseIndex]
    const splitAt =
        explicitSplit ??
        getSplitIndex(text, currentPhraseIndex, firstPhraseSplitAt)
    const whitePart = displayedText.slice(0, splitAt)
    const gradientPart = displayedText.slice(splitAt)

    return (
        <span
            ref={containerRef}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(-8px)",
                transition: `opacity ${fadeDuration}ms ease-out, transform ${fadeDuration}ms ease-out`,
            }}
        >
            <span className='font-playfair text-white'>{whitePart}</span>
            <br />
            <span
                className={
                    className ||
                    "font-playfair text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-clip-text"
                }
            >
                {gradientPart}
            </span>
            {phase === "typing" && (
                <span className='animate-pulse text-primary'>|</span>
            )}
        </span>
    )
}
