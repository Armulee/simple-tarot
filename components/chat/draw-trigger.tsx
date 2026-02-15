"use client"

import { CornerDownRight } from "lucide-react"
import type { CardUiText } from "./types"

type DrawTriggerProps = {
    showInsufficientStars: boolean
    cardsToSelect: number
    cardUi: CardUiText
    onScrollToDraw: () => void
    onPickAll: () => void
}

export default function DrawTrigger({
    showInsufficientStars,
    cardsToSelect,
    cardUi,
    onScrollToDraw,
    onPickAll,
}: DrawTriggerProps) {
    return (
        <div className='flex items-center gap-2'>
            <button
                type='button'
                onClick={onScrollToDraw}
                className='w-fit flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:text-white hover:border-white/30 transition-colors text-left'
            >
                <CornerDownRight className='size-4' />
                {showInsufficientStars
                    ? cardUi.topUpCta(cardsToSelect)
                    : cardUi.drawCta(cardsToSelect)}
            </button>
            {!showInsufficientStars && (
                <button
                    type='button'
                    onClick={onPickAll}
                    className='w-fit flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:text-white hover:border-white/30 transition-colors text-left'
                >
                    <CornerDownRight className='size-4' />
                    {cardUi.pickAllCta()}
                </button>
            )}
        </div>
    )
}
