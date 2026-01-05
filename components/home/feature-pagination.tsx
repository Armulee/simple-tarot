"use client"

import type React from "react"
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import {
    Sparkles,
    Calendar,
    Star,
    ArrowUpAZ,
    Hash,
    Palette,
    Hand,
    ChevronDown,
    type LucideIcon,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"

interface Feature {
    id: string
    component: React.ComponentType
    available: boolean
}

interface FeaturePaginationProps {
    features: Feature[]
    activeIndex: number
    onDotClick: (index: number) => void
    onLearnMore?: () => void
}

// Map feature IDs to their icons
const featureIcons: Record<string, LucideIcon> = {
    tarot: Sparkles,
    birthChart: Calendar,
    horoscope: Star,
    namelogy: ArrowUpAZ,
    numerology: Hash,
    luckyColors: Palette,
    palmistry: Hand,
}

const featureColors: Record<
    string,
    { solid: string; soft: string; outline: string }
> = {
    tarot: {
        solid: "oklch(0.5 0.12 280)",
        soft: "oklch(0.5 0.12 280 / 0.18)",
        outline: "oklch(0.5 0.12 280 / 0.28)",
    },
    birthChart: {
        solid: "oklch(0.65 0.12 200)",
        soft: "oklch(0.65 0.12 200 / 0.16)",
        outline: "oklch(0.65 0.12 200 / 0.26)",
    },
    horoscope: {
        solid: "oklch(0.6 0.16 105)",
        soft: "oklch(0.6 0.16 105 / 0.14)",
        outline: "oklch(0.6 0.16 105 / 0.24)",
    },
    namelogy: {
        solid: "oklch(0.7 0.14 40)",
        soft: "oklch(0.7 0.14 40 / 0.14)",
        outline: "oklch(0.7 0.14 40 / 0.24)",
    },
    numerology: {
        solid: "oklch(0.62 0.14 330)",
        soft: "oklch(0.62 0.14 330 / 0.15)",
        outline: "oklch(0.62 0.14 330 / 0.25)",
    },
    luckyColors: {
        solid: "oklch(0.7 0.12 250)",
        soft: "oklch(0.7 0.12 250 / 0.14)",
        outline: "oklch(0.7 0.12 250 / 0.24)",
    },
    palmistry: {
        solid: "oklch(0.7 0.14 15)",
        soft: "oklch(0.7 0.14 15 / 0.14)",
        outline: "oklch(0.7 0.14 15 / 0.24)",
    },
}

type CSSVars = React.CSSProperties & { [key: `--${string}`]: string }

export default function FeaturePagination({
    features,
    activeIndex,
    onDotClick,
    onLearnMore,
}: FeaturePaginationProps) {
    const trackRef = useRef<HTMLDivElement | null>(null)
    const btnRefs = useRef<Array<HTMLButtonElement | null>>([])
    const [indicator, setIndicator] = useState<{
        x: number
        y: number
        size: number
    } | null>(null)
    const [isMoving, setIsMoving] = useState(false)
    const prevIndexRef = useRef(activeIndex)

    const activeFeatureId = features[activeIndex]?.id
    const activeColor = useMemo(() => {
        if (activeFeatureId && featureColors[activeFeatureId]) {
            return featureColors[activeFeatureId]
        }
        return {
            solid: "oklch(0.45 0.12 280)",
            soft: "oklch(0.45 0.12 280 / 0.18)",
            outline: "oklch(0.45 0.12 280 / 0.28)",
        }
    }, [activeFeatureId])

    const measure = useCallback((index: number) => {
        const track = trackRef.current
        const btn = btnRefs.current[index]
        if (!track || !btn) return

        const trackRect = track.getBoundingClientRect()
        const btnRect = btn.getBoundingClientRect()

        setIndicator({
            x: btnRect.left - trackRect.left,
            y: btnRect.top - trackRect.top,
            size: btnRect.width,
        })
    }, [])

    useLayoutEffect(() => {
        measure(activeIndex)
    }, [activeIndex, features.length, measure])

    useEffect(() => {
        const onResize = () => measure(activeIndex)
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [activeIndex, measure])

    useEffect(() => {
        const prev = prevIndexRef.current
        if (prev !== activeIndex) {
            setIsMoving(true)
        }
        prevIndexRef.current = activeIndex
    }, [activeIndex])

    return (
        <div className='flex flex-col items-center gap-4 pointer-events-auto'>
            <p className='text-xs text-white/60 flex items-center gap-2'>
                <ChevronLeft className='w-4 h-4' />
                Swipe or click below to see more services
                <ChevronRight className='w-4 h-4' />
            </p>
            {/* Feature Icons */}
            <div
                ref={trackRef}
                className='feature-icon-track flex items-center gap-3'
            >
                {indicator ? (
                    <span
                        aria-hidden='true'
                        className='feature-icon-indicator'
                        style={
                            {
                                width: indicator.size,
                                height: indicator.size,
                                transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)`,
                                "--indicator-soft": activeColor.soft,
                                "--indicator-outline": activeColor.outline,
                                "--indicator-solid": activeColor.solid,
                            } as CSSVars
                        }
                        onTransitionEnd={(e) => {
                            if (e.propertyName === "transform") {
                                setIsMoving(false)
                            }
                        }}
                    />
                ) : null}
                {features.map((feature, index) => {
                    const Icon = featureIcons[feature.id] || Sparkles
                    const isActive = index === activeIndex
                    const isPreparing = isMoving && isActive
                    const c =
                        featureColors[feature.id] ??
                        ({
                            solid: "oklch(0.45 0.12 280)",
                            soft: "oklch(0.45 0.12 280 / 0.18)",
                            outline: "oklch(0.45 0.12 280 / 0.28)",
                        } as const)

                    return (
                        <button
                            key={feature.id}
                            type='button'
                            onClick={() => onDotClick(index)}
                            ref={(el) => {
                                btnRefs.current[index] = el
                            }}
                            className={[
                                "feature-icon-btn group relative rounded-full p-2",
                                "focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent",
                                "transition-[transform,opacity,background-color,box-shadow,filter] duration-300 ease-out",
                                "active:scale-[0.98]",
                                isActive
                                    ? "feature-icon-btn--current opacity-100"
                                    : "opacity-60 hover:opacity-100 hover:bg-white/10 hover:scale-105",
                                isPreparing
                                    ? "feature-icon-btn--preparing"
                                    : "",
                            ].join(" ")}
                            aria-label={`Go to ${feature.id}`}
                            style={
                                {
                                    "--feature-solid": c.solid,
                                    "--feature-soft": c.soft,
                                    "--feature-outline": c.outline,
                                } as CSSVars
                            }
                        >
                            <Icon
                                className={[
                                    "feature-icon w-4 h-4 transition-[transform,filter,color] duration-300 ease-out",
                                    isActive
                                        ? "feature-icon--current text-white"
                                        : "text-white/70 group-hover:text-white/90",
                                ].join(" ")}
                            />
                        </button>
                    )
                })}
            </div>

            {/* Learn More Section */}
            <button
                type='button'
                className='flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors'
                onClick={onLearnMore}
            >
                <div className='flex items-center gap-4'>
                    <div className='h-px w-12 bg-white/30' />
                    <span className='text-xs uppercase tracking-wide'>
                        Learn more
                    </span>
                    <div className='h-px w-12 bg-white/30' />
                </div>
                <ChevronDown className='w-5 h-5 animate-bounce' />
            </button>
        </div>
    )
}
