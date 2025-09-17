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
    const startTimeRef = useRef<number | null>(null)
    const activeHeightRef = useRef<number>(0)
    const auraOnRef = useRef<boolean>(false)

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
        startTimeRef.current = Date.now()
        activeHeightRef.current = el.getBoundingClientRect().height
        auraOnRef.current = false
        el.style.transition = "transform 0s"
    }

    const handleMove = (eY: number) => {
        if (startYRef.current == null || !activeElRef.current) return
        const deltaY = eY - startYRef.current
        const translateY = Math.min(0, deltaY)
        const rotate = Math.max(-8, translateY / 20)
        activeElRef.current.style.transform = `translateY(${translateY}px) rotate(${rotate}deg)`

        // Aura when passed 3/4 height threshold
        const draggedUp = -translateY
        const threshold = 0.75 * activeHeightRef.current
        if (draggedUp >= threshold) {
            if (!auraOnRef.current && activeElRef.current) {
                auraOnRef.current = true
                activeElRef.current.style.boxShadow =
                    "0 0 0 2px rgba(59,130,246,0.8), 0 0 24px 10px rgba(124,58,237,0.7), 0 0 60px 24px rgba(59,130,246,0.5)"
                activeElRef.current.style.filter = "saturate(1.2) brightness(1.05)"
            }
        } else if (auraOnRef.current && activeElRef.current) {
            auraOnRef.current = false
            activeElRef.current.style.boxShadow = ""
            activeElRef.current.style.filter = ""
        }
    }

    const handleUp = () => {
        const el = activeElRef.current
        const name = activeNameRef.current
        if (!el || !name) return
        const height = activeHeightRef.current || el.getBoundingClientRect().height
        const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0

        // Read current translateY from transform
        const matrix = window.getComputedStyle(el).transform
        let translateY = 0
        if (matrix && matrix !== "none") {
            const values = matrix.match(/-?\d+\.?\d*/g)
            if (values && (values.length === 6 || values.length === 16)) {
                translateY = parseFloat(values[values.length === 6 ? 5 : 13] || "0")
            }
        }
        const draggedUp = -translateY
        const threshold = 0.75 * height

        if (elapsed >= 500 && draggedUp >= threshold) {
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
        // Clear aura if any
        el.style.boxShadow = ""
        el.style.filter = ""
        // reset
        activeElRef.current = null
        activeNameRef.current = null
        startYRef.current = null
        startTimeRef.current = null
        auraOnRef.current = false
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
                                    className={`w-24 h-36 rounded-[16px] bg-gradient-to-br from-[#15a6ff] via-[#b56cff] to-[#15a6ff] p-[2px] shadow-2xl select-none touch-none ${
                                        disabled ? "pointer-events-none" : ""
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

