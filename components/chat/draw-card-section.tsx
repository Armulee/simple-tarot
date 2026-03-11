"use client"

import { RotateCw, Sparkles, Star } from "lucide-react"
import type { RefObject } from "react"
import { LinearCardSpread } from "@/components/tarot/card-selection/linear-card-spread"
import type { CardUiText } from "./types"

type DrawCardSectionProps = {
    cardsToSelect: number
    shortQuestion: string
    selectedCount: number
    cardUi: CardUiText
    shuffleFn: (() => void) | null
    pickFn: ((times?: number) => void) | null
    onCardsSelected: (cards: { name: string; isReversed: boolean }[]) => void
    onSelectedCountChange: (count: number) => void
    onProvideShuffle: (fn: () => void) => void
    onProvideRandomPick: (fn: (times?: number) => void) => void
    onProvideSelectByIndices: (fn: (indices: number[]) => void) => void
    containerRef?: RefObject<HTMLDivElement | null>
}

export default function DrawCardSection({
    cardsToSelect,
    shortQuestion,
    selectedCount,
    cardUi,
    shuffleFn,
    pickFn,
    onCardsSelected,
    onSelectedCountChange,
    onProvideShuffle,
    onProvideRandomPick,
    onProvideSelectByIndices,
    containerRef,
}: DrawCardSectionProps) {
    return (
        <div
            ref={containerRef}
            className='w-full md:max-w-[85%] rounded-2xl border border-white/10 bg-white/5 p-4'
        >
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2 text-center'>
                <div className='space-y-1'>
                    {shortQuestion && (
                        <p className='text-xs text-white/60'>{shortQuestion}</p>
                    )}
                    <p className='text-sm text-white'>
                        {cardUi.selected(selectedCount, cardsToSelect)}
                    </p>
                    <p className='text-xs text-yellow-300 flex items-center justify-center gap-1'>
                        <Star className='w-3.5 h-3.5' fill='currentColor' />
                        {cardUi.consumeStar}
                    </p>
                </div>
                <div className='flex items-center gap-2 justify-center'>
                    <button
                        type='button'
                        onClick={() => shuffleFn?.()}
                        className='flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40'
                        disabled={!shuffleFn}
                    >
                        <RotateCw className='w-3.5 h-3.5' />
                        {cardUi.shuffle}
                    </button>
                    <button
                        type='button'
                        onClick={() => pickFn?.()}
                        className='flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40'
                        disabled={!pickFn}
                    >
                        <Sparkles className='w-3.5 h-3.5' />
                        {cardUi.pick}
                    </button>
                </div>
            </div>
            <LinearCardSpread
                cardsToSelect={cardsToSelect}
                onCardsSelected={onCardsSelected}
                onPartialSelect={(_, __, count) => onSelectedCountChange(count)}
                onProvideShuffle={(fn) => onProvideShuffle(fn)}
                onProvideRandomPick={(fn) => onProvideRandomPick(fn)}
                onProvideSelectByIndices={(fn) => onProvideSelectByIndices(fn)}
                swipeLabel={cardUi.swipe}
            />
        </div>
    )
}
