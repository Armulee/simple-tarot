"use client"

import React from "react"
import { CardImage } from "@/components/card-image"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import QuickInsight from "./quick-insight"
export interface SpreadCard {
    id: number
    name: string
    image: string
    meaning: string // This is the card name (e.g. "The Fool (Reversed)")
    isReversed: boolean
    slug: string
}

interface SpreadLayoutProps {
    cards: SpreadCard[]
    readingType?: string | null
    question?: string | null
}

const POSITION_MEANINGS: Record<string, string[]> = {
    simple: ["Interpretation"],
    general: [
        "Origin / Past / Root",
        "Current situation / Tension",
        "Direction / Likely outcome",
    ],
    detailed: [
        "Core situation",
        "Obstacle / challenge",
        "Hidden influence",
        "Advice / action",
        "Probable outcome",
    ],
    expanded: [
        "You",
        "The other person / external force",
        "Connection / interaction",
        "Strength",
        "Weakness",
        "Advice",
        "Outcome",
    ],
    celtic: [
        "Present situation",
        "Immediate challenge",
        "Root cause (subconscious)",
        "Past foundation",
        "Conscious goal",
        "Near future",
        "Self-perception",
        "External environment",
        "Hopes & fears",
        "Final outcome",
    ],
}

function CardWithLabel({
    card,
    positionLabel,
    className = "",
    style = {},
    rotate = false,
    cardsLength,
    index,
    question,
    size = "md",
}: {
    index: number
    card: SpreadCard
    positionLabel: string
    className?: string
    style?: React.CSSProperties
    rotate?: boolean
    cardsLength: number
    question?: string | null
    size?: "sm" | "md" | "lg"
}) {
    return (
        <div
            className={`flex flex-col items-center gap-2 relative group ${className}`}
            style={style}
        >
            {cardsLength > 1 && (
                <div className='flex flex-col items-center gap-1.5 z-20 animate-fade-in'>
                    <div
                        className={`flex items-center gap-2 rounded-full bg-indigo-950/40 backdrop-blur-xl border border-white/10 shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all duration-500 ${
                            size === "sm" ? "px-2 py-0.5" : "px-3 py-1"
                        }`}
                    >
                        <div
                            className={`flex items-center justify-center rounded-full bg-gradient-to-tr from-primary to-secondary font-bold text-white shadow-inner ${
                                size === "sm"
                                    ? "w-4 h-4 text-[9px]"
                                    : "w-5 h-5 text-[10px]"
                            }`}
                        >
                            {index + 1}
                        </div>
                        <span
                            className={`font-medium tracking-wide text-indigo-100 uppercase ${
                                size === "sm" ? "text-[10px]" : "text-[11px]"
                            }`}
                        >
                            {positionLabel}
                        </span>
                        <Sparkles
                            className={
                                size === "sm"
                                    ? "w-2.5 h-2.5 text-secondary animate-pulse"
                                    : "w-3 h-3 text-secondary animate-pulse"
                            }
                        />
                    </div>
                </div>
            )}

            {/* Badge for card name on top of image and QuickInsight side-by-side */}
            <div className='flex flex-row items-center gap-4 z-10'>
                <div className={`relative ${rotate ? "rotate-90" : ""}`}>
                    <Badge
                        variant='secondary'
                        className={`mx-auto bg-white/20 text-white/90 border-primary/30 truncate block max-w-full ${
                            size === "sm"
                                ? "text-[9px] px-1.5 py-0"
                                : "text-[10px]"
                        }`}
                    >
                        {card.meaning}
                    </Badge>

                    <CardImage
                        card={card}
                        size={size}
                        showAura={true}
                        showLabel={false}
                        className={`hover:scale-105 transition-transform duration-200 z-10 mx-auto ${
                            size === "sm" ? "mt-2" : "mt-4"
                        }`}
                    />
                </div>

                {question && (
                    <div className='hidden sm:block'>
                        <QuickInsight
                            cardName={card.name}
                            positionMeaning={positionLabel}
                            question={question}
                            index={index}
                        />
                    </div>
                )}
            </div>

            {question && (
                <div className='sm:hidden'>
                    <QuickInsight
                        cardName={card.name}
                        positionMeaning={positionLabel}
                        question={question}
                        index={index}
                    />
                </div>
            )}

            <Button
                asChild
                size='sm'
                variant='ghost'
                className='shadow-md text-[10px] h-6 px-2 underline underline-offset-2 text-white/80 opacity-60 hover:opacity-100 hover:bg-transparent ease duration-300 z-20'
            >
                <Link
                    href={`/articles/tarot/${card.slug}${
                        card.isReversed ? "#reversed-overview" : ""
                    }`}
                >
                    View Details
                    <ArrowRight className='ml-0.5 w-3 h-3' />
                </Link>
            </Button>
        </div>
    )
}

export default function SpreadLayout({
    cards,
    readingType: propReadingType,
    question,
}: SpreadLayoutProps) {
    // Determine reading type fallback based on card count if not provided
    let type = propReadingType
    if (!type) {
        if (cards.length === 1) type = "simple"
        else if (cards.length === 3) type = "general"
        else if (cards.length === 5) type = "detailed"
        else if (cards.length === 7) type = "expanded"
        else if (cards.length === 10) type = "celtic"
        else type = "simple" // fallback
    }

    const meanings = POSITION_MEANINGS[type] || []

    const renderCard = (
        index: number,
        extraClass = "",
        style = {},
        rotate = false,
        size: "sm" | "md" | "lg" = "md"
    ) => {
        const card = cards[index]
        if (!card) return null
        return (
            <CardWithLabel
                key={card.id}
                card={card}
                positionLabel={meanings[index] || `Position ${index + 1}`}
                className={extraClass}
                style={style}
                rotate={rotate}
                cardsLength={cards.length}
                index={index}
                question={question}
                size={size}
            />
        )
    }

    if (type === "simple") {
        return (
            <div className='flex justify-center py-8 animate-fade-in'>
                {renderCard(0)}
            </div>
        )
    }

    if (type === "general") {
        return (
            <div className='flex flex-wrap justify-center gap-8 py-8 animate-fade-in'>
                {cards.map((_, i) => renderCard(i))}
            </div>
        )
    }

    if (type === "detailed") {
        // 5-card Cross
        //       5
        //   2   1   3
        //       4
        return (
            <div className='flex flex-col items-center gap-4 py-8 animate-fade-in'>
                {/* Top: 5 */}
                <div className='mb-4'>{renderCard(4)}</div>

                {/* Middle Row: 2, 1, 3 */}
                <div className='flex gap-8 items-center'>
                    {renderCard(1)} {/* 2: Obstacle/Challenge (Left) */}
                    {renderCard(0, "scale-110 z-10")} {/* 1: Core (Center) */}
                    {renderCard(2)} {/* 3: Hidden (Right) */}
                </div>

                {/* Bottom: 4 */}
                <div className='mt-4'>{renderCard(3)}</div>
            </div>
        )
    }

    if (type === "expanded") {
        // 7-card Horseshoe / U-like
        // 1           7
        //  2         6
        //   3       5
        //       4
        // We can implement this with a grid or flex with margins
        return (
            <div className='relative w-full max-w-3xl mx-auto h-[500px] py-8 animate-fade-in hidden md:block'>
                {/* Using absolute positioning for precise horseshoe shape on desktop */}
                {/* Center point is 50% */}

                {/* 1: Top Left */}
                <div className='absolute top-0 left-[10%]'>{renderCard(0)}</div>

                {/* 7: Top Right */}
                <div className='absolute top-0 right-[10%]'>
                    {renderCard(6)}
                </div>

                {/* 2: Mid Left */}
                <div className='absolute top-[120px] left-[20%]'>
                    {renderCard(1)}
                </div>

                {/* 6: Mid Right */}
                <div className='absolute top-[120px] right-[20%]'>
                    {renderCard(5)}
                </div>

                {/* 3: Low Left */}
                <div className='absolute top-[240px] left-[30%]'>
                    {renderCard(2)}
                </div>

                {/* 5: Low Right */}
                <div className='absolute top-[240px] right-[30%]'>
                    {renderCard(4)}
                </div>

                {/* 4: Center Bottom */}
                <div className='absolute top-[340px] left-1/2 -translate-x-1/2'>
                    {renderCard(3)}
                </div>
            </div>
        )
    }

    // Mobile fallback for expanded or just regular flex for safety
    if (type === "expanded") {
        return (
            <div className='flex flex-wrap justify-center gap-6 py-8 animate-fade-in md:hidden'>
                {cards.map((_, i) => renderCard(i))}
            </div>
        )
    }

    if (type === "celtic") {
        // Celtic Cross
        // Left Section (Cross) + Right Section (Staff)
        return (
            <div className='flex flex-row items-start justify-center gap-2 sm:gap-8 lg:gap-12 py-8 animate-fade-in overflow-x-hidden'>
                {/* Cross Section */}
                <div className='relative w-[240px] h-[340px] flex items-center justify-center shrink-0 scale-[0.7] sm:scale-100 -mx-10 sm:mx-0'>
                    {/* 1: Center */}
                    <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10'>
                        {renderCard(0, "", {}, false, "sm")}
                    </div>

                    {/* 2: Crossing (Rotated) */}
                    <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 opacity-90 pointer-events-none'>
                        <div className='rotate-90 scale-105 pointer-events-auto'>
                            {renderCard(1, "", {}, false, "sm")}
                        </div>
                    </div>

                    {/* 5: Above */}
                    <div className='absolute top-0 left-1/2 -translate-x-1/2'>
                        {renderCard(4, "", {}, false, "sm")}
                    </div>

                    {/* 3: Below */}
                    <div className='absolute bottom-0 left-1/2 -translate-x-1/2'>
                        {renderCard(2, "", {}, false, "sm")}
                    </div>

                    {/* 4: Left */}
                    <div className='absolute top-1/2 left-0 -translate-y-1/2'>
                        {renderCard(3, "", {}, false, "sm")}
                    </div>

                    {/* 6: Right */}
                    <div className='absolute top-1/2 right-0 -translate-y-1/2'>
                        {renderCard(5, "", {}, false, "sm")}
                    </div>
                </div>

                {/* Staff Section (Cards 7-10) */}
                {/* Arranged vertically (downwards) in the traditional Celtic Cross style */}
                <div className='flex flex-col-reverse gap-3 sm:gap-4 shrink-0 scale-[0.8] sm:scale-100'>
                    {/* 7: Self */}
                    {renderCard(6, "", {}, false, "sm")}
                    {/* 8: Environment */}
                    {renderCard(7, "", {}, false, "sm")}
                    {/* 9: Hopes/Fears */}
                    {renderCard(8, "", {}, false, "sm")}
                    {/* 10: Outcome */}
                    {renderCard(9, "", {}, false, "sm")}
                </div>
            </div>
        )
    }

    // Fallback
    return (
        <div className='flex flex-wrap justify-center gap-6 py-8 animate-fade-in'>
            {cards.map((_, i) => renderCard(i))}
        </div>
    )
}
