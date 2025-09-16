"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"

type BasicCard = {
    name: string
    isReversed: boolean
}

const TAROT_DECK: string[] = [
    "The Fool",
    "The Magician",
    "The High Priestess",
    "The Empress",
    "The Emperor",
    "The Hierophant",
    "The Lovers",
    "The Chariot",
    "Strength",
    "The Hermit",
    "Wheel of Fortune",
    "Justice",
    "The Hanged Man",
    "Death",
    "Temperance",
    "The Devil",
    "The Tower",
    "The Star",
    "The Moon",
    "The Sun",
    "Judgement",
    "The World",
    "Ace of Cups",
    "Two of Cups",
    "Three of Cups",
    "Four of Cups",
    "Five of Cups",
    "Six of Cups",
    "Seven of Cups",
    "Eight of Cups",
    "Nine of Cups",
    "Ten of Cups",
    "Page of Cups",
    "Knight of Cups",
    "Queen of Cups",
    "King of Cups",
    "Ace of Swords",
    "Two of Swords",
    "Three of Swords",
    "Four of Swords",
    "Five of Swords",
    "Six of Swords",
    "Seven of Swords",
    "Eight of Swords",
    "Nine of Swords",
    "Ten of Swords",
    "Page of Swords",
    "Knight of Swords",
    "Queen of Swords",
    "King of Swords",
    "Ace of Wands",
    "Two of Wands",
    "Three of Wands",
    "Four of Wands",
    "Five of Wands",
    "Six of Wands",
    "Seven of Wands",
    "Eight of Wands",
    "Nine of Wands",
    "Ten of Wands",
    "Page of Wands",
    "Knight of Wands",
    "Queen of Wands",
    "King of Wands",
    "Ace of Pentacles",
    "Two of Pentacles",
    "Three of Pentacles",
    "Four of Pentacles",
    "Five of Pentacles",
    "Six of Pentacles",
    "Seven of Pentacles",
    "Eight of Pentacles",
    "Nine of Pentacles",
    "Ten of Pentacles",
    "Page of Pentacles",
    "Knight of Pentacles",
    "Queen of Pentacles",
    "King of Pentacles",
]

function shuffle<T>(array: T[]): T[] {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

export function LinearCardSpread({
    cardsToSelect,
    onCardsSelected,
}: {
    cardsToSelect: number
    onCardsSelected: (cards: BasicCard[]) => void
}) {
    const t = useTranslations("ReadingPage.chooseCards")
    const deck = useMemo(() => shuffle(TAROT_DECK), [])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selected, setSelected] = useState<BasicCard[]>([])

    const cardRef = useRef<HTMLDivElement | null>(null)
    const startYRef = useRef<number | null>(null)
    const deltaYRef = useRef<number>(0)
    const isDraggingRef = useRef(false)

    useEffect(() => {
        if (selected.length === cardsToSelect) {
            onCardsSelected(selected)
        }
    }, [selected, cardsToSelect, onCardsSelected])

    const handlePointerDown = (clientY: number) => {
        isDraggingRef.current = true
        startYRef.current = clientY
        deltaYRef.current = 0
        if (cardRef.current) {
            cardRef.current.style.transition = "transform 0s, opacity 0s"
        }
    }

    const handlePointerMove = (clientY: number) => {
        if (!isDraggingRef.current || startYRef.current === null) return
        const deltaY = clientY - startYRef.current
        deltaYRef.current = deltaY
        if (cardRef.current) {
            const translateY = Math.min(0, deltaY) // only allow upwards movement visually
            const rotate = Math.max(-8, translateY / 20)
            const opacity = Math.max(0.6, 1 + translateY / 300)
            cardRef.current.style.transform = `translateY(${translateY}px) rotate(${rotate}deg)`
            cardRef.current.style.opacity = `${opacity}`
        }
    }

    const commitSelection = () => {
        const name = deck[currentIndex]
        const isReversed = Math.random() < 0.5
        const next = [...selected, { name, isReversed }]
        setSelected(next)
        setCurrentIndex((i: number) => (i + 1) % deck.length)
        if (cardRef.current) {
            cardRef.current.style.transition = "transform 180ms ease, opacity 180ms ease"
            cardRef.current.style.transform = "translateY(0) rotate(0deg)"
            cardRef.current.style.opacity = "1"
        }
    }

    const resetPosition = () => {
        if (cardRef.current) {
            cardRef.current.style.transition = "transform 180ms ease, opacity 180ms ease"
            cardRef.current.style.transform = "translateY(0) rotate(0deg)"
            cardRef.current.style.opacity = "1"
        }
    }

    const handlePointerUp = () => {
        if (!isDraggingRef.current) return
        isDraggingRef.current = false

        const cardEl = cardRef.current
        if (!cardEl) {
            return
        }

        const height = cardEl.getBoundingClientRect().height
        const draggedUp = -deltaYRef.current // positive when moved up
        if (draggedUp > height / 2) {
            commitSelection()
        } else {
            resetPosition()
        }

        startYRef.current = null
        deltaYRef.current = 0
    }

    const preventTouchScrollWhileDragging = (e: TouchEvent) => {
        if (isDraggingRef.current) e.preventDefault()
    }

    useEffect(() => {
        // Prevent page scroll while dragging on mobile
        document.addEventListener("touchmove", preventTouchScrollWhileDragging, {
            passive: false,
        })
        return () => {
            document.removeEventListener(
                "touchmove",
                preventTouchScrollWhileDragging as any
            )
        }
    }, [])

    const remaining = cardsToSelect - selected.length
    const currentName = deck[currentIndex]

    return (
        <div className='w-full max-w-md mx-auto'>
            <div className='relative h-[380px] flex items-center justify-center'>
                <div
                    ref={cardRef}
                    className='w-40 h-64 rounded-xl border-2 border-border/30 bg-card/80 backdrop-blur-sm shadow-md shadow-black/20 flex items-center justify-center select-none touch-none'
                    onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => handlePointerDown(e.clientY)}
                    onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => handlePointerMove(e.clientY)}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={(e: React.TouchEvent<HTMLDivElement>) => handlePointerDown(e.touches[0].clientY)}
                    onTouchMove={(e: React.TouchEvent<HTMLDivElement>) => handlePointerMove(e.touches[0].clientY)}
                    onTouchEnd={handlePointerUp}
                    role='button'
                    aria-label='Swipe up to select card'
                >
                    <div className='text-4xl'>🌟</div>
                </div>

                {/* Gesture indicator overlay on card */}
                <div className='pointer-events-none absolute inset-0 flex items-end justify-center pb-4'>
                    <div className='flex flex-col items-center gap-2 text-center'>
                        <div className='relative w-10 h-10 rounded-full border border-white/20 bg-white/5 overflow-hidden'>
                            <div className='absolute left-1/2 -translate-x-1/2 bottom-1 w-1.5 h-4 rounded bg-white/70 animate-pulse'></div>
                            <div className='absolute left-1/2 -translate-x-1/2 bottom-1 w-1.5 h-1.5 rounded-full bg-white/90 animate-[bounce_1.2s_infinite]'></div>
                        </div>
                        <div className='text-xs text-muted-foreground'>
                            {t("swipeUpToSelect", { default: "Swipe up to select" })}
                        </div>
                    </div>
                </div>
            </div>

            <div className='mt-4 text-center space-y-1'>
                <p className='text-sm text-muted-foreground'>
                    {t("selectedCount", { selected: cardsToSelect - remaining, total: cardsToSelect })}
                </p>
                <p className='text-xs text-muted-foreground'>
                    {t("hint", { default: "Drag the card upward past halfway to confirm" })}
                </p>
            </div>

            <div className='sr-only' aria-live='polite'>
                {t("currentCard", { default: "Current card" })}: {currentName}
            </div>
        </div>
    )
}

export default LinearCardSpread

