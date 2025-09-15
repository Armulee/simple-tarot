"use client"
import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"

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
}

export function CircularCardSpread({
    cardsToSelect,
    onCardsSelected,
}: CircularCardSpreadProps) {
    const t = useTranslations("ReadingPage.chooseCards")
    const [selectedCards, setSelectedCards] = useState<TarotCard[]>([])
    const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([])

    useEffect(() => {
        const createShuffledDeck = () => {
            const deck = [...TAROT_DECK]
            const shuffled: TarotCard[] = []

            for (let i = 0; i < 52; i++) {
                if (deck.length === 0) break

                const randomIndex = Math.floor(Math.random() * deck.length)
                const cardName = deck.splice(randomIndex, 1)[0]

                shuffled.push({
                    name: cardName,
                    isReversed: Math.random() < 0.5,
                    position: i,
                })
            }

            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }

            return shuffled
        }

        setShuffledDeck(createShuffledDeck())
    }, [])

    const handleCardClick = (card: TarotCard) => {
        if (selectedCards.some((selected) => selected.name === card.name)) {
            setSelectedCards((prev) =>
                prev.filter((selected) => selected.name !== card.name)
            )
        } else if (selectedCards.length < cardsToSelect) {
            const newSelected = [...selectedCards, card]
            setSelectedCards(newSelected)

            if (newSelected.length === cardsToSelect) {
                setTimeout(
                    () =>
                        onCardsSelected(
                            newSelected.map((c) => ({
                                name: c.name,
                                isReversed: c.isReversed,
                            }))
                        ),
                    500
                )
            }
        }
    }

    return (
        <div className='relative w-full max-w-4xl mx-auto'>
            <div className='relative w-full aspect-square max-w-md mx-auto min-h-[400px]'>
                {shuffledDeck.map((card, index) => {
                    const angle = (index * 360) / shuffledDeck.length
                    const radius = 140
                    const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius
                    const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius

                    const isSelected = selectedCards.some(
                        (selected) => selected.name === card.name
                    )
                    const selectionOrder =
                        selectedCards.findIndex(
                            (selected) => selected.name === card.name
                        ) + 1

                    return (
                        <div
                            key={`${card.name}-${index}`}
                            className='absolute cursor-pointer transition-all duration-300 hover:scale-110'
                            style={{
                                left: `calc(50% + ${x}px - 30px)`,
                                top: `calc(50% + ${y}px - 42px)`,
                                transform: `rotate(${angle}deg)`,
                                zIndex: isSelected ? 10 : 1,
                            }}
                            onClick={() => handleCardClick(card)}
                        >
                            <div className='relative'>
                                <div
                                    className={`w-16 h-24 rounded-lg border-2 transition-all duration-500 ${
                                        isSelected
                                            ? "border-primary bg-primary/20 shadow-lg shadow-primary/50"
                                            : "border-border/30 bg-card/80 hover:border-primary/50"
                                    } backdrop-blur-sm flex items-center justify-center relative overflow-hidden`}
                                    style={{
                                        transform: isSelected
                                            ? "rotateY(180deg)"
                                            : "rotateY(0deg)",
                                        transformStyle: "preserve-3d",
                                    }}
                                >
                                    <div
                                        className='absolute inset-0 flex items-center justify-center backface-hidden'
                                        style={{ backfaceVisibility: "hidden" }}
                                    >
                                        <div className='w-full h-full bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg flex items-center justify-center'>
                                            <div className='text-2xl'>🌟</div>
                                        </div>
                                    </div>

                                    <div
                                        className='absolute inset-0 flex flex-col items-center justify-center backface-hidden text-xs text-center p-1'
                                        style={{
                                            backfaceVisibility: "hidden",
                                            transform: "rotateY(180deg)",
                                        }}
                                    >
                                        <div
                                            className={`text-primary mb-1 ${
                                                card.isReversed
                                                    ? "transform rotate-180"
                                                    : ""
                                            }`}
                                        >
                                            ✦
                                        </div>
                                        <div className='text-[8px] leading-tight'>
                                            {card.name}
                                        </div>
                                        {card.isReversed && (
                                            <div className='text-[6px] text-muted-foreground mt-1'>
                                                {t("reversed")}
                                            </div>
                                        )}
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
                })}
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
            </div>
        </div>
    )
}
