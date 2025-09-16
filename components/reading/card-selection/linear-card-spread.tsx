"use client"
import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"

// Import Swiper styles
import "swiper/css"
import "swiper/css/free-mode"
import "swiper/css/mousewheel"

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

interface LinearCardSpreadProps {
    cardsToSelect: number
    onCardsSelected: (cards: { name: string; isReversed: boolean }[]) => void
}

export function LinearCardSpread({
    cardsToSelect,
    onCardsSelected,
}: LinearCardSpreadProps) {
    const t = useTranslations("ReadingPage.chooseCards")
    const [selectedCards, setSelectedCards] = useState<TarotCard[]>([])
    const [shuffledDeck, setShuffledDeck] = useState<TarotCard[]>([])
    const [showOverlay, setShowOverlay] = useState<string | null>(null)
    const [dragOffset, setDragOffset] = useState(0)
    const dragRef = useRef<{ startY: number; cardName: string } | null>(null)

    useEffect(() => {
        const createShuffledDeck = () => {
            const deck = [...TAROT_DECK]
            const shuffled: TarotCard[] = []

            // Use all 78 cards instead of just 52
            for (let i = 0; i < TAROT_DECK.length; i++) {
                if (deck.length === 0) break

                const randomIndex = Math.floor(Math.random() * deck.length)
                const cardName = deck.splice(randomIndex, 1)[0]

                shuffled.push({
                    name: cardName,
                    isReversed: Math.random() < 0.5,
                    position: i,
                })
            }

            // Additional shuffle for better randomization
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }

            return shuffled
        }

        setShuffledDeck(createShuffledDeck())
    }, [])

    // Cleanup effect to reset styles when component unmounts
    useEffect(() => {
        return () => {
            // Reset overscroll behavior when component unmounts
            document.body.style.overscrollBehaviorX = ""
            document.documentElement.style.overscrollBehaviorX = ""
        }
    }, [])

    const handleCardTouch = (card: TarotCard) => {
        if (showOverlay === card.name) {
            // Hide overlay
            setShowOverlay(null)
        } else {
            // Show overlay for this card
            setShowOverlay(card.name)
        }
    }

    const handleDragStart = (e: React.TouchEvent, card: TarotCard) => {
        if (showOverlay !== card.name) return

        dragRef.current = {
            startY: e.touches[0].clientY,
            cardName: card.name,
        }
    }

    const handleDragMove = (e: React.TouchEvent) => {
        if (!dragRef.current) return

        const currentY = e.touches[0].clientY
        const deltaY = dragRef.current.startY - currentY

        // Only allow upward dragging
        if (deltaY > 0) {
            setDragOffset(Math.min(deltaY, 100)) // Max 100px upward
        }
    }

    const handleDragEnd = (e: React.TouchEvent) => {
        if (!dragRef.current) return

        const deltaY = dragRef.current.startY - e.changedTouches[0].clientY

        // If dragged up enough, select the card
        if (deltaY > 50) {
            const card = shuffledDeck.find(
                (c) => c.name === dragRef.current!.cardName
            )
            if (card) {
                handleCardSelection(card)
            }
        }

        // Reset drag state
        dragRef.current = null
        setDragOffset(0)
        setShowOverlay(null)
    }

    const handleCardSelection = (card: TarotCard) => {
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

    const handleMouseEnter = () => {
        // Disable browser swipe navigation when mouse enters the swiper
        document.body.style.overscrollBehaviorX = "none"
        document.documentElement.style.overscrollBehaviorX = "none"
    }

    const handleMouseLeave = () => {
        // Re-enable browser swipe navigation when mouse leaves the swiper
        document.body.style.overscrollBehaviorX = ""
        document.documentElement.style.overscrollBehaviorX = ""
    }

    const handleWheel = (e: React.WheelEvent) => {
        // Prevent default browser behavior for horizontal wheel events
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            e.preventDefault()
        }
    }

    return (
        <div className='relative w-full max-w-6xl mx-auto'>
            <div
                className='w-full py-8'
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
            >
                <Swiper
                    modules={[FreeMode, Mousewheel]}
                    freeMode={true}
                    mousewheel={{
                        forceToAxis: true,
                        sensitivity: 1,
                        releaseOnEdges: true,
                    }}
                    spaceBetween={-40}
                    slidesPerView='auto'
                    className='linear-card-spread'
                    breakpoints={{
                        320: {
                            spaceBetween: -30,
                        },
                        640: {
                            spaceBetween: -35,
                        },
                        1024: {
                            spaceBetween: -40,
                        },
                    }}
                >
                    {shuffledDeck.map((card, index) => {
                        const isSelected = selectedCards.some(
                            (selected) => selected.name === card.name
                        )
                        const selectionOrder =
                            selectedCards.findIndex(
                                (selected) => selected.name === card.name
                            ) + 1

                        return (
                            <SwiperSlide
                                key={`${card.name}-${index}`}
                                className='!w-auto'
                                style={{
                                    zIndex: shuffledDeck.length - index,
                                }}
                            >
                                <div
                                    className='cursor-pointer transition-all duration-300 hover:scale-105'
                                    onClick={() => handleCardTouch(card)}
                                    onTouchStart={(e) =>
                                        handleDragStart(e, card)
                                    }
                                    onTouchMove={handleDragMove}
                                    onTouchEnd={handleDragEnd}
                                >
                                    <div className='relative'>
                                        {/* Drag Overlay */}
                                        {showOverlay === card.name && (
                                            <div className='absolute inset-0 z-20 bg-black/50 rounded-lg flex flex-col items-center justify-center text-white text-center p-2'>
                                                <div className='text-lg mb-2'>
                                                    👆
                                                </div>
                                                <div className='text-xs font-medium mb-1'>
                                                    Swipe Up to Select
                                                </div>
                                                <div className='text-xs opacity-80'>
                                                    Tap to dismiss
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            className={`w-20 h-28 rounded-lg border-2 transition-all duration-500 ${
                                                isSelected
                                                    ? "border-primary bg-primary/20 shadow-lg shadow-primary/50"
                                                    : "border-border/30 bg-card/80 hover:border-primary/50"
                                            } backdrop-blur-sm flex items-center justify-center relative overflow-hidden`}
                                            style={{
                                                transform: isSelected
                                                    ? "rotateY(180deg)"
                                                    : showOverlay === card.name
                                                    ? `translateY(-${dragOffset}px)`
                                                    : "rotateY(0deg)",
                                                transformStyle: "preserve-3d",
                                            }}
                                        >
                                            <div
                                                className='absolute inset-0 flex items-center justify-center backface-hidden'
                                                style={{
                                                    backfaceVisibility:
                                                        "hidden",
                                                }}
                                            >
                                                <div className='w-full h-full bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg flex items-center justify-center'>
                                                    <div className='text-2xl'>
                                                        🌟
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className='absolute inset-0 flex flex-col items-center justify-center backface-hidden text-xs text-center p-2'
                                                style={{
                                                    backfaceVisibility:
                                                        "hidden",
                                                    transform:
                                                        "rotateY(180deg)",
                                                }}
                                            >
                                                <div
                                                    className={`text-primary mb-1 text-lg ${
                                                        card.isReversed
                                                            ? "transform rotate-180"
                                                            : ""
                                                    }`}
                                                >
                                                    ✦
                                                </div>
                                                <div className='text-[9px] leading-tight font-medium'>
                                                    {card.name}
                                                </div>
                                                {card.isReversed && (
                                                    <div className='text-[7px] text-muted-foreground mt-1'>
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
                            </SwiperSlide>
                        )
                    })}
                </Swiper>
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
                    Swipe horizontally or use mousewheel to explore all 78 cards
                </p>
            </div>
        </div>
    )
}
