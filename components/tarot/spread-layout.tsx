"use client"

import React from "react"
import { CardImage } from "@/components/card-image"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
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
    simple: ["Quick Insight"],
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
    className = "",
    style = {},
    rotate = false,
    cardsLength,
    index,
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
                        className={`flex items-center justify-center rounded-full bg-gradient-to-tr from-primary to-secondary font-bold text-white shadow-inner ${
                            size === "sm"
                                ? "w-4 h-4 text-[9px]"
                                : "w-5 h-5 text-[10px]"
                        }`}
                    >
                        {index + 1}
                    </div>
                </div>
            )}

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
        </div>
    )
}

function SpreadBreakdown({
    cards,
    meanings,
    question,
}: {
    cards: SpreadCard[]
    meanings: string[]
    question?: string | null
}) {
    const isSingle = cards.length === 1
    return (
        <div className='mt-6 pt-10 border-t border-white/5 space-y-8 w-full max-w-3xl mx-auto'>
            <div className='text-center space-y-1'>
                <h3 className='text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]'>
                    Spread Details
                </h3>
                <div className='h-px w-8 bg-primary/30 mx-auto' />
            </div>

            <div
                className={`gap-4 px-2 w-fit mx-auto ${
                    isSingle ? "" : "grid grid-cols-1 md:grid-cols-2"
                }`}
            >
                {cards.map((card, i) => (
                    <div
                        key={card.id}
                        className={`w-full flex flex-row items-start gap-4 p-4 bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/5 group hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-300`}
                    >
                        <div className='shrink-0 flex flex-col items-center relative'>
                            <div className='absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-white z-10 shadow-lg border border-white/10'>
                                {i + 1}
                            </div>
                            <div
                                className={`w-16 h-28 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500`}
                            >
                                <CardImage
                                    card={card}
                                    size={"sm"}
                                    showAura={false}
                                    showLabel={false}
                                />
                            </div>

                            <Button
                                asChild
                                size='sm'
                                variant='ghost'
                                className='h-6 p-0 text-[10px] font-medium text-white/40 hover:text-primary hover:bg-transparent mt-2'
                            >
                                <Link
                                    href={`/articles/tarot/${card.slug}${
                                        card.isReversed
                                            ? "#reversed-overview"
                                            : ""
                                    }`}
                                >
                                    View Guide
                                    <ArrowRight className='ml-1 w-3 h-3' />
                                </Link>
                            </Button>
                        </div>

                        <div
                            className={`flex-1 min-w-0 flex flex-col h-full py-0.5`}
                        >
                            <div
                                className={`text-left mb-2`}
                            >
                                <p className='text-[10px] text-white/50 font-bold uppercase tracking-wider mb-0.5 opacity-80'>
                                    {meanings[i]}
                                </p>
                                <h4
                                    className={`${
                                        isSingle ? "text-xl" : "text-sm"
                                    } text-white font-serif font-medium leading-tight group-hover:text-primary transition-colors`}
                                >
                                    {card.meaning}
                                </h4>
                            </div>

                            <div
                                className={`flex items-center ${
                                    isSingle ? "justify-center" : "justify-start"
                                }`}
                            >
                                {question && (
                                    <QuickInsight
                                        cardName={card.name}
                                        positionMeaning={meanings[i]}
                                        question={question}
                                        index={i}
                                        className={`${
                                            isSingle ? "w-full max-w-[200px]" : "w-[140px]"
                                        } transition-transform duration-500`}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
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

    const VisualSpread = () => {
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
                <div className='flex flex-col items-center gap-4 py-8 animate-fade-in scale-[0.9] sm:scale-100'>
                    {/* Top: 5 */}
                    <div className='mb-4'>{renderCard(4)}</div>

                    {/* Middle Row: 2, 1, 3 */}
                    <div className='flex gap-2 sm:gap-8 items-center'>
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
            return (
                <>
                    <div className='relative w-full max-w-3xl mx-auto h-[1000px] py-8 animate-fade-in hidden md:block'>
                        {/* 1: Top Left */}
                        <div className='absolute top-0 left-[10%]'>
                            {renderCard(0)}
                        </div>
                        {/* 7: Top Right */}
                        <div className='absolute top-0 right-[10%]'>
                            {renderCard(6)}
                        </div>
                        {/* 2: Mid Left */}
                        <div className='absolute top-[250px] left-[20%]'>
                            {renderCard(1)}
                        </div>
                        {/* 6: Mid Right */}
                        <div className='absolute top-[250px] right-[20%]'>
                            {renderCard(5)}
                        </div>
                        {/* 3: Low Left */}
                        <div className='absolute top-[500px] left-[25%]'>
                            {renderCard(2)}
                        </div>
                        {/* 5: Low Right */}
                        <div className='absolute top-[500px] right-[25%]'>
                            {renderCard(4)}
                        </div>
                        {/* 4: Center Bottom */}
                        <div className='absolute top-[750px] left-1/2 -translate-x-1/2'>
                            {renderCard(3)}
                        </div>
                    </div>
                    <div className='flex flex-wrap justify-center gap-6 py-8 animate-fade-in md:hidden'>
                        {cards.map((_, i) => renderCard(i))}
                    </div>
                </>
            )
        }

        if (type === "celtic") {
            // Celtic Cross
            return (
                <div className='flex flex-row items-center sm:items-start justify-center gap-2 py-3 animate-fade-in overflow-x-hidden'>
                    {/* Cross Section */}
                    <div className='relative w-[240px] h-[340px] flex items-center justify-center shrink-0 scale-[0.8] sm:scale-100'>
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
                        <div className='absolute -top-20 left-1/2 -translate-x-1/2'>
                            {renderCard(4, "", {}, false, "sm")}
                        </div>
                        {/* 3: Below */}
                        <div className='absolute -bottom-20 left-1/2 -translate-x-1/2'>
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
                    {/* Staff Section */}
                    <div className='flex flex-col-reverse gap-3 sm:gap-4 shrink-0 scale-[0.8] sm:scale-100'>
                        {renderCard(6, "", {}, false, "sm")}
                        {renderCard(7, "", {}, false, "sm")}
                        {renderCard(8, "", {}, false, "sm")}
                        {renderCard(9, "", {}, false, "sm")}
                    </div>
                </div>
            )
        }

        return (
            <div className='flex flex-wrap justify-center gap-6 py-8 animate-fade-in'>
                {cards.map((_, i) => renderCard(i))}
            </div>
        )
    }

    return (
        <div className='flex flex-col w-full'>
            <VisualSpread />
            <SpreadBreakdown
                cards={cards}
                meanings={meanings}
                question={question}
            />
        </div>
    )
}
