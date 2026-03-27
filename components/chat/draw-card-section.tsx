"use client"

import { useState } from "react"
import { RotateCw, Sparkles, Star, MoreVertical, Hand } from "lucide-react"
import type { RefObject } from "react"
import { useTranslations } from "next-intl"
import { LinearCardSpread } from "@/components/tarot/card-selection/linear-card-spread"
import { ManualCardSelectionDialog } from "@/components/tarot/card-selection/manual-card-selection-dialog"
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover"
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
    const t = useTranslations("ReadingPage.chooseCards")
    const [manualDialogOpen, setManualDialogOpen] = useState(false)
    const [popoverOpen, setPopoverOpen] = useState(false)

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

                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type='button'
                                className='flex items-center justify-center w-8 h-8 rounded-full border border-white/10 text-white/80 hover:text-white hover:border-white/30 transition-colors'
                                aria-label={t("options")}
                            >
                                <MoreVertical className='w-4 h-4' />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            align='end'
                            className='w-56 bg-[#1a0b2e] border-purple-500/20 p-1'
                        >
                            <button
                                type='button'
                                className='flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors text-left'
                                onClick={() => {
                                    setPopoverOpen(false)
                                    setManualDialogOpen(true)
                                }}
                            >
                                <Hand className='w-4 h-4 text-purple-300' />
                                {t("manualSelect")}
                            </button>
                        </PopoverContent>
                    </Popover>
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

            <ManualCardSelectionDialog
                open={manualDialogOpen}
                onOpenChange={setManualDialogOpen}
                cardsToSelect={cardsToSelect}
                onCardsSelected={onCardsSelected}
            />
        </div>
    )
}
