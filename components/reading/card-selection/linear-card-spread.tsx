"use client"

import React, { useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"

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
    const [selected, setSelected] = useState<BasicCard[]>([])
    const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set())
    const deckRef = useRef<HTMLDivElement | null>(null)

    // Active drag state for a slide
    const activeElRef = useRef<HTMLDivElement | null>(null)
    const activeNameRef = useRef<string | null>(null)
    const startYRef = useRef<number | null>(null)

    const finalizeIfDone = (next: BasicCard[]) => {
        if (next.length === cardsToSelect) {
            onCardsSelected(next)
        }
    }

    const handleDown = (
        eY: number,
        el: HTMLDivElement,
        name: string
    ) => {
        if (selectedNames.has(name)) return
        activeElRef.current = el
        activeNameRef.current = name
        startYRef.current = eY
        el.style.transition = "transform 0s, opacity 0s"
    }

    const handleMove = (eY: number) => {
        if (startYRef.current == null || !activeElRef.current) return
        const deltaY = eY - startYRef.current
        const translateY = Math.min(0, deltaY)
        const rotate = Math.max(-8, translateY / 20)
        activeElRef.current.style.transform = `translateY(${translateY}px) rotate(${rotate}deg)`
    }

    const handleUp = () => {
        const el = activeElRef.current
        const name = activeNameRef.current
        if (!el || !name) return
        const deckRect = deckRef.current?.getBoundingClientRect()
        const cardRect = el.getBoundingClientRect()
        const isFullyOutOfDeck = deckRect ? cardRect.bottom <= deckRect.top : false

        if (isFullyOutOfDeck) {
            const isReversed = Math.random() < 0.5
            const next = [...selected, { name, isReversed }]
            setSelected(next)
            setSelectedNames((prev) => new Set(prev).add(name))
            finalizeIfDone(next)
            // Hide/restore element
            el.style.transition = "transform 180ms ease"
            el.style.transform = "translateY(-120%) rotate(-6deg)"
        } else {
            el.style.transition = "transform 180ms ease"
            el.style.transform = "translateY(0) rotate(0deg)"
        }
        // reset
        activeElRef.current = null
        activeNameRef.current = null
        startYRef.current = null
    }

    const remaining = cardsToSelect - selected.length

    return (
        <div className='w-full' ref={deckRef}>
            <Swiper
                modules={[FreeMode]}
                freeMode={{ enabled: true, momentum: true }}
                slidesPerView='auto'
                spaceBetween={-40}
                className='w-full px-4'
            >
                {deck.map((name, idx) => {
                    const disabled = selectedNames.has(name)
                    return (
                        <SwiperSlide key={`${name}-${idx}`} className='!w-28'>
                            <div className='flex items-center justify-center h-[320px]'>
                                <div
                                    className={`w-24 h-36 rounded-xl border-2 backdrop-blur-sm flex items-center justify-center select-none touch-none ${
                                        disabled
                                            ? "pointer-events-none border-blue-900 bg-blue-900"
                                            : "border-blue-900 bg-gradient-to-br from-blue-900 to-purple-900"
                                    }`}
                                    onMouseDown={(e: React.MouseEvent<HTMLDivElement>) =>
                                        handleDown(e.clientY, e.currentTarget, name)
                                    }
                                    onMouseMove={(e: React.MouseEvent<HTMLDivElement>) =>
                                        handleMove(e.clientY)
                                    }
                                    onMouseUp={handleUp}
                                    onMouseLeave={handleUp}
                                    onTouchStart={(e: React.TouchEvent<HTMLDivElement>) =>
                                        handleDown(e.touches[0].clientY, e.currentTarget, name)
                                    }
                                    onTouchMove={(e: React.TouchEvent<HTMLDivElement>) =>
                                        handleMove(e.touches[0].clientY)
                                    }
                                    onTouchEnd={handleUp}
                                    role='button'
                                    aria-label='Swipe up to select card'
                                >
                                    <div className='text-2xl'>🌟</div>
                                </div>
                            </div>
                        </SwiperSlide>
                    )
                })}
            </Swiper>

            <div className='mt-2 text-center space-y-1'>
                <p className='text-sm text-muted-foreground'>
                    {t("selectedCount", { selected: cardsToSelect - remaining, total: cardsToSelect })}
                </p>
                <p className='text-xs text-muted-foreground'>
                    {t("swipeUpToSelect", { default: "Swipe up on a card to select" })}
                </p>
            </div>
        </div>
    )
}

export default LinearCardSpread

