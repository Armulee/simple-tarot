"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStars } from "@/contexts/stars-context"

const SPARKLE_COUNT = 6
const ANIMATION_DURATION_MS = 850

interface SparkleStyle {
    x: number
    y: number
    delay: number
    scale: number
}

function generateSparkles(): SparkleStyle[] {
    const sparkles: SparkleStyle[] = []
    for (let i = 0; i < SPARKLE_COUNT; i++) {
        const angle = (i / SPARKLE_COUNT) * 360 + (Math.random() * 30 - 15)
        const rad = (angle * Math.PI) / 180
        const distance = 18 + Math.random() * 14
        sparkles.push({
            x: Math.cos(rad) * distance,
            y: Math.sin(rad) * distance,
            delay: Math.random() * 120,
            scale: 0.5 + Math.random() * 0.7,
        })
    }
    return sparkles
}

export function StarPill({ size }: { size: "sm" | "md" }) {
    const { stars, initialized, spendTrigger, lastSpendAmount } = useStars()
    const prevTriggerRef = useRef(spendTrigger)
    const [animating, setAnimating] = useState(false)
    const [displayAmount, setDisplayAmount] = useState(0)
    const [sparkles, setSparkles] = useState<SparkleStyle[]>([])

    useEffect(() => {
        if (spendTrigger > prevTriggerRef.current) {
            setDisplayAmount(lastSpendAmount)
            setSparkles(generateSparkles())
            setAnimating(true)
            const t = setTimeout(() => setAnimating(false), ANIMATION_DURATION_MS)
            prevTriggerRef.current = spendTrigger
            return () => clearTimeout(t)
        }
        prevTriggerRef.current = spendTrigger
    }, [spendTrigger, lastSpendAmount])

    const isMd = size === "md"

    return (
        <Link href='/stars' className={isMd ? undefined : "mr-1"}>
            <Button
                variant='ghost'
                className={`relative overflow-visible rounded-full bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 text-yellow-300 border border-yellow-500/30 flex items-center ${
                    isMd ? "h-10 px-3 gap-2" : "h-9 px-2 gap-1"
                } ${animating ? "star-spend-glow" : ""}`}
            >
                {/* Sparkle particles */}
                {animating &&
                    sparkles.map((s, i) => (
                        <span
                            key={i}
                            className='star-sparkle-particle'
                            style={{
                                ["--sx" as string]: `${s.x}px`,
                                ["--sy" as string]: `${s.y}px`,
                                animationDelay: `${s.delay}ms`,
                                transform: `scale(${s.scale})`,
                            }}
                        />
                    ))}

                {/* Floating "-N" text */}
                {animating && (
                    <span className='star-float-text'>
                        -{displayAmount}
                    </span>
                )}

                {/* Star icon */}
                <Star
                    className={`w-4 h-4 ${
                        animating
                            ? "star-icon-bounce"
                            : initialized
                              ? ""
                              : "animate-spin-slow"
                    }`}
                    fill='currentColor'
                />

                {/* Star count */}
                {initialized && (
                    <span
                        className={`font-semibold transition-transform duration-200 ${
                            animating ? "scale-110" : ""
                        }`}
                    >
                        {stars ?? 0}
                    </span>
                )}
            </Button>
        </Link>
    )
}
