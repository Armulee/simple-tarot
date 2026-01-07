"use client"

import React from "react"
import { CardImage } from "@/components/card-image"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"

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
}: {
    card: SpreadCard
    positionLabel: string
    className?: string
    style?: React.CSSProperties
    rotate?: boolean
}) {
    // We can't use hooks here easily if we want to be pure, but we need translations for "View Details"
    // We'll just hardcode "View Details" or pass it down? 
    // The parent component is client-side, so we can use hooks?
    // Yes, "use client" is at top.
    
    // We'll skip the translation hook for the button text to avoid complexity if this is used in a server component,
    // but this file is marked use client. So we can use useTranslations.
    const t = useTranslations("ReadingPage")

    return (
        <div
            className={`flex flex-col items-center gap-2 relative group ${className}`}
            style={style}
        >
            <Badge
                variant='outline'
                className='bg-black/50 text-white border-primary/50 backdrop-blur-md whitespace-nowrap z-20 shadow-sm'
            >
                {positionLabel}
            </Badge>

            {/* Badge for card name on top of image */}
            <div className={`relative ${rotate ? "rotate-90" : ""}`}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-max max-w-[120px]">
                     <Badge
                        variant='secondary'
                        className='bg-white/20 text-white/90 border-primary/30 text-[10px] truncate block max-w-full'
                    >
                        {card.meaning}
                    </Badge>
                </div>

                <CardImage
                    card={card}
                    size='md'
                    showAura={true}
                    showLabel={false}
                    className='hover:scale-105 transition-transform duration-200 z-10'
                />
            </div>
            
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

    const renderCard = (index: number, extraClass = "", style = {}, rotate = false) => {
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
                <div className='absolute top-0 right-[10%]'>{renderCard(6)}</div>

                {/* 2: Mid Left */}
                <div className='absolute top-[120px] left-[20%]'>{renderCard(1)}</div>
                
                {/* 6: Mid Right */}
                <div className='absolute top-[120px] right-[20%]'>{renderCard(5)}</div>

                {/* 3: Low Left */}
                <div className='absolute top-[240px] left-[30%]'>{renderCard(2)}</div>
                
                {/* 5: Low Right */}
                <div className='absolute top-[240px] right-[30%]'>{renderCard(4)}</div>

                {/* 4: Center Bottom */}
                <div className='absolute top-[340px] left-1/2 -translate-x-1/2'>{renderCard(3)}</div>
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
            <div className='flex flex-col lg:flex-row items-center lg:items-start justify-center gap-16 py-8 animate-fade-in'>
                {/* Cross Section */}
                <div className='relative w-[300px] h-[450px] flex items-center justify-center'>
                     {/* 1: Center */}
                     <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10'>
                        {renderCard(0)}
                     </div>
                     
                     {/* 2: Crossing (Rotated) */}
                     <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 opacity-90 pointer-events-none'>
                        {/* We render card 2 rotated. Note: pointer-events-none because it overlaps 1. 
                            We might want to allow clicking, so maybe offset it slightly or z-index it higher? 
                            Let's keep z-index higher. */}
                        <div className="rotate-90 scale-105 pointer-events-auto">
                            {renderCard(1, "", {}, false)} {/* Pass false to rotate prop, assume wrapper rotates. Actually let's use the prop */}
                        </div>
                     </div>

                     {/* 5: Above */}
                     <div className='absolute top-0 left-1/2 -translate-x-1/2'>
                        {renderCard(4)}
                     </div>

                     {/* 3: Below */}
                     <div className='absolute bottom-0 left-1/2 -translate-x-1/2'>
                        {renderCard(2)}
                     </div>

                     {/* 4: Left */}
                     <div className='absolute top-1/2 left-0 -translate-y-1/2'>
                        {renderCard(3)}
                     </div>

                     {/* 6: Right */}
                     <div className='absolute top-1/2 right-0 -translate-y-1/2'>
                        {renderCard(5)}
                     </div>
                </div>

                {/* Staff Section (Cards 7-10 from bottom to top) */}
                <div className='flex flex-col-reverse gap-4'>
                    {/* 7: Bottom (Self) */}
                    {renderCard(6)}
                    {/* 8: Environment */}
                    {renderCard(7)}
                    {/* 9: Hopes/Fears */}
                    {renderCard(8)}
                    {/* 10: Outcome (Top) */}
                    {renderCard(9)}
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
