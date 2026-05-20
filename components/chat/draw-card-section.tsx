"use client"

import { useState } from "react"
import {
    RotateCw,
    Star,
    MoreVertical,
    Hand,
    Minus,
    Plus,
    Sparkles,
    Lock,
} from "lucide-react"
import type { RefObject } from "react"
import { useTranslations } from "next-intl"
import { LinearCardSpread } from "@/components/tarot/card-selection/linear-card-spread"
import { ManualCardSelectionDialog } from "@/components/tarot/card-selection/manual-card-selection-dialog"
import { ManualPickPaywallDialog } from "@/components/tarot/card-selection/manual-pick-paywall-dialog"
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover"
import type { SubscriptionPlanTier } from "@/lib/payments/subscription-plans"
import {
    PAID_TIER_MAX_CARDS,
    getMaxCardsForTier,
    canUseManualCardPick,
} from "@/lib/payments/plan-limits"
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
    onCardsToSelectChange: (count: number) => void
    onProvideShuffle: (fn: () => void) => void
    onProvideRandomPick: (fn: (times?: number) => void) => void
    onProvideSelectByIndices: (fn: (indices: number[]) => void) => void
    selectionResetSignal: number
    containerRef?: RefObject<HTMLDivElement | null>
    planTier?: SubscriptionPlanTier | "free" | null
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
    onCardsToSelectChange,
    onProvideShuffle,
    onProvideRandomPick,
    onProvideSelectByIndices,
    selectionResetSignal,
    containerRef,
    planTier,
}: DrawCardSectionProps) {
    const t = useTranslations("ReadingPage.chooseCards")
    const [manualDialogOpen, setManualDialogOpen] = useState(false)
    const [paywallDialogOpen, setPaywallDialogOpen] = useState(false)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const maxCards = getMaxCardsForTier(planTier)
    const manualPickUnlocked = canUseManualCardPick(planTier)
    const atMaxLimit = cardsToSelect >= maxCards
    const upgradeForMoreCards =
        atMaxLimit && maxCards < PAID_TIER_MAX_CARDS

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
                        onClick={() => pickFn?.(cardsToSelect)}
                        className='flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40'
                        disabled={!pickFn}
                    >
                        <Sparkles className='w-3.5 h-3.5' />
                        {cardUi.pickAllCta()}
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
                                    if (manualPickUnlocked) {
                                        setManualDialogOpen(true)
                                    } else {
                                        setPaywallDialogOpen(true)
                                    }
                                }}
                            >
                                <Hand className='w-4 h-4 text-purple-300' />
                                <span className='flex-1'>
                                    {t("manualSelect")}
                                </span>
                                {!manualPickUnlocked && (
                                    <Lock className='w-3.5 h-3.5 text-white/40' />
                                )}
                            </button>
                            <div className='mt-1 border-t border-white/10 px-3 py-2'>
                                <p className='text-xs text-white/60'>
                                    {cardUi.cardCount(cardsToSelect)}
                                </p>
                                <div className='mt-2 flex items-center justify-between gap-2'>
                                    <button
                                        type='button'
                                        className='flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/80 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40'
                                        onClick={() =>
                                            onCardsToSelectChange(
                                                Math.max(1, cardsToSelect - 1),
                                            )
                                        }
                                        disabled={cardsToSelect <= 1}
                                        aria-label={cardUi.decreaseCardCount}
                                    >
                                        <Minus className='w-4 h-4' />
                                    </button>
                                    <span className='min-w-10 text-center text-sm font-medium text-white'>
                                        {cardsToSelect}
                                    </span>
                                    <button
                                        type='button'
                                        className='flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/80 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40'
                                        onClick={() => {
                                            if (upgradeForMoreCards) {
                                                setPopoverOpen(false)
                                                setPaywallDialogOpen(true)
                                                return
                                            }
                                            onCardsToSelectChange(
                                                Math.min(
                                                    maxCards,
                                                    cardsToSelect + 1,
                                                ),
                                            )
                                        }}
                                        disabled={
                                            cardsToSelect >= PAID_TIER_MAX_CARDS
                                        }
                                        aria-label={cardUi.increaseCardCount}
                                    >
                                        {upgradeForMoreCards ? (
                                            <Lock className='w-3.5 h-3.5' />
                                        ) : (
                                            <Plus className='w-4 h-4' />
                                        )}
                                    </button>
                                </div>
                                {upgradeForMoreCards && (
                                    <p className='mt-2 text-[10px] text-purple-200/70 leading-snug'>
                                        {t("freeTierMaxCardsHint", {
                                            max: maxCards,
                                        })}
                                    </p>
                                )}
                            </div>
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
                resetSignal={selectionResetSignal}
                swipeLabel={cardUi.swipe}
            />

            <ManualCardSelectionDialog
                key={`${selectionResetSignal}-${cardsToSelect}`}
                open={manualDialogOpen}
                onOpenChange={setManualDialogOpen}
                cardsToSelect={cardsToSelect}
                onCardsSelected={onCardsSelected}
            />

            <ManualPickPaywallDialog
                open={paywallDialogOpen}
                onOpenChange={setPaywallDialogOpen}
                currentTier={planTier ?? "free"}
            />
        </div>
    )
}
