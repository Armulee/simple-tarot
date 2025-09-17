"use client"
import React, { useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { SwipeUpOverlay } from "../swipe-up-overlay"

interface TarotCard {
    name: string
    isReversed: boolean
    position: number
}

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
}

export function CircularCardSpread({
    cardsToSelect,
    onCardsSelected,
    deferFinalization = false,
    onPartialSelect,
    externalSelectedNames = [],
    deckId = "default",
}: CircularCardSpreadProps) {
    const t = useTranslations("ReadingPage.chooseCards")
    const [selectedCards, setSelectedCards] = useState<TarotCard[]>([])
    const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([])

    useEffect(() => {
        const createShuffledDeck = () => {
            // Create a unique seed based on deckId to ensure different decks
            const seed = deckId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
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
    }, [deckId])

    // Memoize card positions to prevent recalculation on every render
    const cardPositions = useMemo(() => {
        return shuffledDeck.map((card, index) => {
            // Split cards into inner (first 39) and outer (last 39) circles
            const isInnerCircle = index < 39
            const cardsInCircle = 39
            const angle = (index % cardsInCircle) * (360 / cardsInCircle)
            const radius = isInnerCircle ? 100 : 180 // Inner circle smaller radius
            const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius
            const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius
            return { angle, x, y, isInnerCircle }
        })
    }, [shuffledDeck])

    const handleCardClick = (card: TarotCard) => {
        // Prevent picking duplicates that are already selected externally
        if (
            externalSelectedNames.includes(card.name) &&
            !selectedCards.some((s) => s.name === card.name)
        ) {
            return
        }

        // If card is already selected, deselect it
        if (selectedCards.some((selected: TarotCard) => selected.name === card.name)) {
            setSelectedCards((prev: TarotCard[]) => {
                const next = prev.filter((selected: TarotCard) => selected.name !== card.name)
                onPartialSelect?.(
                    { name: card.name, isReversed: card.isReversed },
                    "remove",
                    next.length
                )
                return next
            })
        } else if (selectedCards.length < cardsToSelect) {
            // Add card to selection
            const newSelected: TarotCard[] = [...selectedCards, card]
            setSelectedCards(newSelected)
            onPartialSelect?.(
                { name: card.name, isReversed: card.isReversed },
                "add",
                newSelected.length
            )
        }
    }


    // Memoize card rendering to prevent unnecessary re-renders
    const renderedCards = useMemo(() => {
        return shuffledDeck.map((card, index) => {
            const { angle, x, y, isInnerCircle } = cardPositions[index]

            const isSelected = selectedCards.some(
                (selected) => selected.name === card.name
            )
            const selectionOrder =
                selectedCards.findIndex(
                    (selected) => selected.name === card.name
                ) + 1

            const isExternallyTaken =
                externalSelectedNames.includes(card.name) && !isSelected

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
                        zIndex: isSelected ? 20 : (isInnerCircle ? 10 : 5),
                    }}
                >
                            <div className='relative'>
                                <div
                                    className={`w-16 h-24 rounded-[16px] bg-gradient-to-br from-[#15a6ff] via-[#b56cff] to-[#15a6ff] p-[2px] shadow-2xl select-none ${
                                        isExternallyTaken ? "pointer-events-none" : "cursor-pointer"
                                    }`}
                                    onClick={() => !isExternallyTaken && handleCardClick(card)}
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
                                                <div className='text-amber-300 text-xl'>✷</div>
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
    }, [shuffledDeck, cardPositions, selectedCards, externalSelectedNames, deckId])

    return (
        <>
            <div className='relative w-full max-w-4xl mx-auto'>
            <div className='relative w-full aspect-square max-w-md mx-auto min-h-[400px]'>
                {renderedCards}
            </div>

            <div className='text-center mt-8 space-y-2'>
                <p className='text-lg font-medium'>
                    {t("selectFromSpread", { count: cardsToSelect })}
                </p>
                <p className='text-sm text-muted-foreground'>
                    {t("selectedCount", {
                        selected: selectedCards.length,
                        total: cardsToSelect,
                    })}
                </p>
                <p className='text-xs text-muted-foreground'>
                    Click on cards to select them
                </p>
            </div>
            
            {/* Confirmation Button */}
            {selectedCards.length > 0 && (
                <div className='mt-6 flex justify-center'>
                    <button
                        onClick={() => {
                            onCardsSelected(
                                selectedCards.map((c) => ({
                                    name: c.name,
                                    isReversed: c.isReversed,
                                }))
                            )
                        }}
                        className='px-8 py-3 bg-gradient-to-r from-[#15a6ff] to-[#b56cff] text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'
                    >
                        Confirm Selection ({selectedCards.length}/{cardsToSelect})
                    </button>
                </div>
            )}
            </div>
            
        </>
    )
}
