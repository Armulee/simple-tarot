"use client"
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
// Controls are rendered by parent; this component exposes a shuffle function
// import { SwipeUpOverlay } from "./swipe-up-overlay"

interface TarotCard {
    name: string
    isReversed: boolean
    position: number
}

const INNER_CIRCLE_COUNT = 33
const OUTER_CIRCLE_COUNT = 45
const GAP_INNER_DEGREES = 28 // gap for inner circle
const GAP_OUTER_DEGREES = 18 // gap for outer circle

const TAROT_DECK = [
    // Major
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
    // Minor cups
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
    // Minor swords
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
    // Minor wands
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
    // Minor pentacles
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

interface CircularCardSpreadProps {
    cardsToSelect: number
    onCardsSelected: (cards: { name: string; isReversed: boolean }[]) => void
    deferFinalization?: boolean
    onPartialSelect?: (
        card: { name: string; isReversed: boolean },
        action: "add" | "remove",
        newSelectedCount: number
    ) => void
    externalSelectedNames?: string[]
    deckId?: string // Add deck ID to ensure unique decks
    onProvideShuffle?: (fn: () => void) => void
}

export function CircularCardSpread({
    cardsToSelect,
    onPartialSelect,
    externalSelectedNames = [],
    deckId = "default",
    onProvideShuffle,
}: CircularCardSpreadProps) {
    const [selectedCards, setSelectedCards] = useState<TarotCard[]>([])
    const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([])
    const pendingPartialRef = useRef<{
        card: { name: string; isReversed: boolean }
        action: "add" | "remove"
        count: number
    } | null>(null)

    useEffect(() => {
        const createShuffledDeck = () => {
            // Create a unique seed based on deckId to ensure different decks
            const seed = deckId
                .split("")
                .reduce((acc, char) => acc + char.charCodeAt(0), 0)
            const seededRandom = (seed: number) => {
                const x = Math.sin(seed) * 10000
                return x - Math.floor(x)
            }

            // Shuffle the full deck first
            const deck = [...TAROT_DECK]
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom(seed + i) * (i + 1))
                ;[deck[i], deck[j]] = [deck[j], deck[i]]
            }

            // Take 78 cards for inner and outer circles
            const selectedCards = deck.slice(0, 78)

            return selectedCards.map((cardName, index) => ({
                name: cardName,
                isReversed: seededRandom(seed + index + 1000) < 0.5,
                position: index,
            }))
        }

        setShuffledDeck(createShuffledDeck())
        setSelectedCards([])
    }, [deckId])

    const shuffleUnselected = () => {
        const selectedSet = new Set(selectedCards.map((s) => s.name))
        const unselected = shuffledDeck.filter((c) => !selectedSet.has(c.name))
        for (let i = unselected.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[unselected[i], unselected[j]] = [unselected[j], unselected[i]]
        }
        const selectedNames = new Set(selectedCards.map((c) => c.name))
        const newDeck: TarotCard[] = []
        let u = 0
        for (let i = 0; i < shuffledDeck.length; i++) {
            const card = shuffledDeck[i]
            if (selectedNames.has(card.name)) {
                newDeck.push(card)
            } else {
                const next = { ...unselected[u] }
                next.isReversed = Math.random() < 0.5
                newDeck.push(next)
                u++
            }
        }
        setShuffledDeck(newDeck)
        requestAnimationFrame(() => {
            const container = document.querySelector(
                '[data-circular-spread="true"]'
            )
            const cards = container?.querySelectorAll(
                '[data-circular-card="true"]'
            )
            cards?.forEach((el) => {
                el.classList.remove("animate-shuffle")
                void (el as HTMLElement).offsetWidth
                el.classList.add("animate-shuffle")
            })
        })
    }

    useEffect(() => {
        onProvideShuffle?.(shuffleUnselected)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shuffledDeck, selectedCards])

    // Memoize card positions to prevent recalculation on every render
    const cardPositions = useMemo(() => {
        return shuffledDeck.map((card, index) => {
            // Split cards into inner and outer circles based on configured counts
            const isInnerCircle = index < INNER_CIRCLE_COUNT
            const cardsInCircle = isInnerCircle
                ? INNER_CIRCLE_COUNT
                : OUTER_CIRCLE_COUNT
            const indexInCircle = isInnerCircle
                ? index
                : index - INNER_CIRCLE_COUNT

            // Distribute cards across a sweep that leaves a small gap at the top
            const sweepAngle =
                360 - (isInnerCircle ? GAP_INNER_DEGREES : GAP_OUTER_DEGREES)
            const startAngle = -sweepAngle / 2 // center the gap at the top
            const angle =
                cardsInCircle > 1
                    ? startAngle +
                      indexInCircle * (sweepAngle / (cardsInCircle - 1))
                    : 0

            const radius = isInnerCircle ? 100 : 180 // Inner circle smaller radius
            const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius
            const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius
            return { angle, x, y, isInnerCircle, indexInCircle, cardsInCircle }
        })
    }, [shuffledDeck])

    const handleCardClick = useCallback(
        (card: TarotCard) => {
            // Prevent picking duplicates that are already selected externally
            const isAlreadySelected = selectedCards.some(
                (s: TarotCard) => s.name === card.name
            )
            if (
                externalSelectedNames.includes(card.name) &&
                !isAlreadySelected
            ) {
                return
            }

            let next: TarotCard[] = selectedCards
            let action: "add" | "remove" | null = null

            if (isAlreadySelected) {
                next = selectedCards.filter(
                    (selected: TarotCard) => selected.name !== card.name
                )
                action = "remove"
            } else if (selectedCards.length < cardsToSelect) {
                next = [...selectedCards, card]
                action = "add"
            }

            if (next !== selectedCards) {
                setSelectedCards(next)
                if (action) {
                    pendingPartialRef.current = {
                        card: { name: card.name, isReversed: card.isReversed },
                        action,
                        count: next.length,
                    }
                }
            }
        },
        [selectedCards, cardsToSelect, externalSelectedNames]
    )

    // Fire parent callback after state commit to avoid setState during render warnings
    useEffect(() => {
        if (pendingPartialRef.current && onPartialSelect) {
            const { card, action, count } = pendingPartialRef.current
            onPartialSelect(card, action, count)
            pendingPartialRef.current = null
        }
    }, [selectedCards, onPartialSelect])

    // Memoize card rendering to prevent unnecessary re-renders
    const renderedCards = useMemo(() => {
        return shuffledDeck.map((card, index) => {
            const { angle, x, y, isInnerCircle, indexInCircle, cardsInCircle } =
                cardPositions[index]

            const isSelected = selectedCards.some(
                (selected) => selected.name === card.name
            )
            const selectionOrder =
                selectedCards.findIndex(
                    (selected) => selected.name === card.name
                ) + 1

            const isExternallyTaken =
                externalSelectedNames.includes(card.name) && !isSelected

            // Ensure the first card at the top renders above the others in its circle
            const baseZ = isInnerCircle ? 200 : 100
            const computedZIndex = isSelected
                ? 1000
                : baseZ + (cardsInCircle - indexInCircle)

            return (
                <div
                    key={`${card.name}-${index}-${deckId}`}
                    className={`absolute transition-all duration-300 ${
                        isExternallyTaken
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:scale-110"
                    } ${isInnerCircle ? "z-10" : "z-5"}`}
                    style={{
                        left: `calc(50% + ${x}px - 30px)`,
                        top: `calc(50% + ${y}px - 42px)`,
                        transform: `rotate(${angle}deg)`,
                        zIndex: computedZIndex,
                    }}
                >
                    <div className='relative'>
                        <div
                            data-circular-card='true'
                            className={`w-16 h-24 rounded-[16px] bg-gradient-to-br from-[#15a6ff] via-[#b56cff] to-[#15a6ff] p-px shadow-2xl select-none ${
                                isExternallyTaken
                                    ? "pointer-events-none"
                                    : "cursor-pointer"
                            }`}
                            onClick={() =>
                                !isExternallyTaken && handleCardClick(card)
                            }
                            role='button'
                            aria-label='Click to select card'
                        >
                            <div className='w-full h-full rounded-[14px] bg-white p-[3px]'>
                                <div
                                    className='relative w-full h-full rounded-[12px] overflow-hidden border border-white/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.6)]'
                                    style={{
                                        background:
                                            "linear-gradient(135deg, #05081a, #1a0b2e 60%, #3b0f4a), radial-gradient(circle at 30% 20%, #7b2cbf 0%, transparent 40%), radial-gradient(circle at 70% 80%, #00bcd4 0%, transparent 45%)",
                                    }}
                                >
                                    <div
                                        className='absolute inset-0 pointer-events-none'
                                        style={{
                                            background:
                                                "radial-gradient(1px 1px at 20% 30%, #ffffff 99%, transparent 100%), radial-gradient(1px 1px at 80% 60%, #ffffff 99%, transparent 100%), radial-gradient(1px 1px at 40% 80%, #ffffff 99%, transparent 100%), radial-gradient(1px 1px at 60% 20%, #ffffff 99%, transparent 100%), radial-gradient(1px 1px at 75% 25%, #ffffff 99%, transparent 100%)",
                                        }}
                                    />
                                    <div className='relative flex items-center justify-center h-full'>
                                        <div className='text-amber-300 text-xl'>
                                            ✷
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isSelected && (
                            <div className='absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold z-20'>
                                {selectionOrder}
                            </div>
                        )}
                    </div>
                </div>
            )
        })
    }, [
        shuffledDeck,
        cardPositions,
        selectedCards,
        externalSelectedNames,
        deckId,
        handleCardClick,
    ])

    return (
        <>
            <div className='relative w-full max-w-4xl mx-auto'>
                {/* Shuffle control moved to parent header */}
                <div
                    className='relative w-full aspect-square max-w-md mx-auto min-h-[400px]'
                    data-circular-spread='true'
                >
                    {renderedCards}
                </div>
            </div>
        </>
    )
}
