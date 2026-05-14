"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Swiper, SwiperSlide } from "swiper/react"
import { Swiper as SwiperType } from "swiper"
import { FreeMode, Mousewheel } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"
import { SwipeUpOverlay } from "./swipe-up-overlay"
// Shuffle control is lifted to parent and provided via callback

const MIN_HOLD_MS = 200

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
    onPartialSelect,
    onProvideShuffle,
    onProvideRandomPick,
    onProvideSelectByIndices,
    resetSignal,
    swipeLabel,
}: {
    cardsToSelect: number
    onCardsSelected: (cards: BasicCard[]) => void
    onPartialSelect?: (
        card: BasicCard,
        action: "add" | "remove",
        newSelectedCount: number,
    ) => void
    onProvideShuffle?: (fn: () => void, isShuffling?: boolean) => void
    onProvideRandomPick?: (
        fn: (times?: number) => void,
        isPicking?: boolean,
    ) => void
    onProvideSelectByIndices?: (fn: (indices: number[]) => void) => void
    resetSignal?: number
    swipeLabel?: string
}) {
    const t = useTranslations("ReadingPage.chooseCards")
    const initialDeck = useMemo(() => shuffle(TAROT_DECK), [])
    const [deckList, setDeckList] = useState<string[]>(initialDeck)
    const [selected, setSelected] = useState<BasicCard[]>([])
    const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set())
    const pendingPartialRef = useRef<{
        card: BasicCard
        action: "add" | "remove"
        count: number
    } | null>(null)
    const [showSwipeOverlay, setShowSwipeOverlay] = useState(false)
    const [reversalByName, setReversalByName] = useState<Map<string, boolean>>(
        () => new Map(),
    )
    const [overlayCenter, setOverlayCenter] = useState<{
        x: number
        y: number
    }>({ x: 0, y: 0 })
    const swiperRef = useRef<SwiperType | null>(null)
    const [isRandomPicking, setIsRandomPicking] = useState(false)
    const [isShuffling, setIsShuffling] = useState(false)
    const navGuardRef = useRef<HTMLDivElement | null>(null)
    const deckRef = useRef<HTMLDivElement | null>(null)

    // Active drag state for a slide
    const activeElRef = useRef<HTMLDivElement | null>(null)
    const activeNameRef = useRef<string | null>(null)
    const startYRef = useRef<number | null>(null)
    const startXRef = useRef<number | null>(null)
    const startTimeRef = useRef<number | null>(null)
    const activeHeightRef = useRef<number>(0)
    const auraOnRef = useRef<boolean>(false)
    const verticalDragActiveRef = useRef<boolean>(false)
    const startTranslateYRef = useRef<number>(0)
    const suppressClickRef = useRef<boolean>(false)
    const suppressClickTimeoutRef = useRef<number | null>(null)
    useEffect(() => {
        if (pendingPartialRef.current && onPartialSelect) {
            const { card, action, count } = pendingPartialRef.current
            onPartialSelect(card, action, count)
            pendingPartialRef.current = null
        }
    }, [selected, onPartialSelect])

    useEffect(() => {
        pendingPartialRef.current = null
        setSelected([])
        setSelectedNames(new Set())
        setShowSwipeOverlay(false)
        activeElRef.current = null
        activeNameRef.current = null
        startYRef.current = null
        startXRef.current = null
        startTimeRef.current = null
        auraOnRef.current = false
        verticalDragActiveRef.current = false
    }, [resetSignal])

    const finalizeIfDone = (next: BasicCard[], delay = 0) => {
        if (next.length === cardsToSelect) {
            if (delay > 0) {
                setTimeout(() => {
                    onCardsSelected(next)
                }, delay)
            } else {
                onCardsSelected(next)
            }
        }
    }

    const randomPick = async (times = 1) => {
        if (isRandomPicking || selected.length >= cardsToSelect) return
        const pickTimes = Math.max(1, Math.floor(times))

        setIsRandomPicking(true)
        try {
            let nextSelected = [...selected]
            let nextSelectedNames = new Set(selectedNames)
            const nextReversalByName = new Map(reversalByName)

            for (
                let pickIndex = 0;
                pickIndex < pickTimes && nextSelected.length < cardsToSelect;
                pickIndex++
            ) {
                const unselectedNames = deckList.filter(
                    (name) => !nextSelectedNames.has(name),
                )
                if (unselectedNames.length === 0) break

                const randomName =
                    unselectedNames[
                        Math.floor(Math.random() * unselectedNames.length)
                    ]

                // 0. Get element & apply aura before scrolling
                const cardEl = deckRef.current?.querySelector(
                    `[data-card-name="${randomName}"]`,
                ) as HTMLElement

                if (cardEl) {
                    cardEl.style.transition =
                        "box-shadow 300ms ease, filter 300ms ease"
                    cardEl.style.boxShadow =
                        "0 0 0 2px rgba(59,130,246,0.8), 0 0 24px 10px rgba(124,58,237,0.7), 0 0 60px 24px rgba(59,130,246,0.5)"
                    cardEl.style.filter = "saturate(1.2) brightness(1.05)"
                }

                // 1. Scroll to card
                const index = deckList.indexOf(randomName)
                const swiper = swiperRef.current
                if (swiper) {
                    swiper.slideTo(index, 600)
                    await new Promise((r) => setTimeout(r, 700))
                }

                // 2. Animate card up
                const currentCardEl = deckRef.current?.querySelector(
                    `[data-card-name="${randomName}"]`,
                ) as HTMLElement

                if (currentCardEl) {
                    currentCardEl.style.transition =
                        "transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 300ms ease, filter 300ms ease"
                    currentCardEl.style.transform =
                        "translateY(-120%) rotate(-6deg)"
                    await new Promise((r) => setTimeout(r, 500))
                }

                // 3. Add to selected state
                const mapped = nextReversalByName.get(randomName)
                const isReversed = mapped != null ? mapped : Math.random() < 0.5
                nextReversalByName.set(randomName, isReversed)

                const nextCard = { name: randomName, isReversed }
                nextSelected = [...nextSelected, nextCard]
                nextSelectedNames = new Set(nextSelectedNames).add(randomName)

                setReversalByName(new Map(nextReversalByName))
                setSelected(nextSelected)
                setSelectedNames(new Set(nextSelectedNames))
                onPartialSelect?.(nextCard, "add", nextSelected.length)
                finalizeIfDone(nextSelected)
            }
        } finally {
            setIsRandomPicking(false)
        }
    }

    const shuffleUnselected = () => {
        if (isShuffling) return
        setIsShuffling(true)
        const selectedSet = new Set(selected.map((s) => s.name))
        const unselected = deckList.filter((n) => !selectedSet.has(n))
        const shuffledUnselected = shuffle(unselected)
        const refreshedReversal = new Map(reversalByName)
        shuffledUnselected.forEach((n) => {
            refreshedReversal.set(n, Math.random() < 0.5)
        })
        const merged: string[] = []
        for (const n of deckList) {
            if (selectedSet.has(n)) {
                merged.push(n)
            } else {
                const next = shuffledUnselected.shift()
                if (next) merged.push(next)
            }
        }
        setDeckList(merged)
        setReversalByName(refreshedReversal)
        requestAnimationFrame(() => {
            const cards =
                deckRef.current?.querySelectorAll('[data-card="true"]')
            cards?.forEach((el) => {
                el.classList.remove("animate-shuffle")
                void (el as HTMLElement).offsetWidth
                el.classList.add("animate-shuffle")
            })
        })
        // Delay for shuffle animation (approx 800ms)
        setTimeout(() => {
            setIsShuffling(false)
        }, 800)
    }

    useEffect(() => {
        onProvideShuffle?.(shuffleUnselected, isShuffling)
        onProvideRandomPick?.(randomPick, isRandomPicking)
        onProvideSelectByIndices?.((indices) => {
            if (!Array.isArray(indices) || indices.length === 0) return
            if (selected.length >= cardsToSelect) return

            const uniqueIndices = Array.from(
                new Set(
                    indices
                        .map((value) => Math.floor(Number(value)))
                        .filter((value) => Number.isFinite(value) && value > 0),
                ),
            )

            if (uniqueIndices.length === 0) return

            const refreshedReversal = new Map(reversalByName)
            const nextSelected = [...selected]
            const nextSelectedNames = new Set(selectedNames)

            for (const idx of uniqueIndices) {
                if (nextSelected.length >= cardsToSelect) break
                const name = deckList[idx - 1]
                if (!name || nextSelectedNames.has(name)) continue
                const mapped = refreshedReversal.get(name)
                const isReversed = mapped != null ? mapped : Math.random() < 0.5
                refreshedReversal.set(name, isReversed)
                const nextCard = { name, isReversed }
                nextSelected.push(nextCard)
                nextSelectedNames.add(name)
                pendingPartialRef.current = {
                    card: nextCard,
                    action: "add",
                    count: nextSelected.length,
                }
            }

            if (nextSelected.length === selected.length) return
            setReversalByName(refreshedReversal)
            setSelected(nextSelected)
            setSelectedNames(nextSelectedNames)
            finalizeIfDone(nextSelected)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        deckList,
        reversalByName,
        selected,
        selectedNames,
        isShuffling,
        isRandomPicking,
    ])

    // Prevent macOS trackpad horizontal swipe from triggering browser back/forward
    // when interacting with this horizontal deck.
    useEffect(() => {
        const el = navGuardRef.current
        if (!el) return
        const onEnter = () => {
            document.body.style.overscrollBehaviorX = "none"
            document.documentElement.style.overscrollBehaviorX = "none"
        }
        const onLeave = () => {
            document.body.style.overscrollBehaviorX = "auto"
            document.documentElement.style.overscrollBehaviorX = "auto"
        }
        el.addEventListener("pointerenter", onEnter)
        el.addEventListener("pointerleave", onLeave)
        return () => {
            el.removeEventListener("pointerenter", onEnter)
            el.removeEventListener("pointerleave", onLeave)
            onLeave()
        }
    }, [])

    useEffect(() => {
        const el = navGuardRef.current
        if (!el) return
        const onWheel: (e: WheelEvent) => void = (e) => {
            // Stop propagation of horizontal wheel to avoid browser back/forward gestures
            e.stopPropagation()
        }
        el.addEventListener("wheel", onWheel, { passive: true })
        return () => {
            el.removeEventListener("wheel", onWheel)
        }
    }, [])

    const handleCardClick = (name: string) => {
        if (selectedNames.has(name)) return
        setShowSwipeOverlay(true)
    }

    const handleDown = (eY: number, el: HTMLDivElement, name: string) => {
        activeElRef.current = el
        activeNameRef.current = name
        startYRef.current = eY
        startTimeRef.current = Date.now()
        activeHeightRef.current = el.getBoundingClientRect().height
        auraOnRef.current = false
        verticalDragActiveRef.current = false
        // Capture current translateY as baseline (supports dragging selected cards back down)
        const matrix = window.getComputedStyle(el).transform
        let translateY = 0
        if (matrix && matrix !== "none") {
            const values = matrix.match(/-?\d+\.?\d*/g)
            if (values && (values.length === 6 || values.length === 16)) {
                translateY = parseFloat(
                    values[values.length === 6 ? 5 : 13] || "0",
                )
            }
        }
        startTranslateYRef.current = translateY
        el.style.transition = "transform 0s"
    }

    const handleMove = (
        e:
            | React.MouseEvent<HTMLDivElement>
            | React.TouchEvent<HTMLDivElement>
            | React.PointerEvent<HTMLDivElement>,
    ) => {
        if (startYRef.current == null || !activeElRef.current) return
        const isTouchEvent = "touches" in e
        const currentY = isTouchEvent
            ? e.touches[0].clientY
            : (
                  e as
                      | React.MouseEvent<HTMLDivElement>
                      | React.PointerEvent<HTMLDivElement>
              ).clientY
        const currentX = isTouchEvent
            ? e.touches[0].clientX
            : (
                  e as
                      | React.MouseEvent<HTMLDivElement>
                      | React.PointerEvent<HTMLDivElement>
              ).clientX
        if (startXRef.current == null) startXRef.current = currentX
        const deltaY = currentY - startYRef.current
        const deltaX = currentX - (startXRef.current ?? currentX)

        if (!verticalDragActiveRef.current) {
            if (Math.abs(deltaY) > Math.abs(deltaX) + 10) {
                verticalDragActiveRef.current = true
            } else {
                return // let Swiper handle horizontal drag
            }
        }

        // From here on, treat as vertical drag and block Swiper
        if ("stopPropagation" in e) e.stopPropagation()
        if ("preventDefault" in e) e.preventDefault()
        const baseline = startTranslateYRef.current || 0
        const minY = -1.2 * activeHeightRef.current
        const translateY = Math.max(minY, Math.min(0, baseline + deltaY))
        const rotate = Math.max(-8, translateY / 20)
        activeElRef.current.style.transform = `translateY(${translateY}px) rotate(${rotate}deg)`

        // Dismiss the swipe overlay as soon as the card moves upward
        if (translateY < 0) {
            setShowSwipeOverlay(false)
        }

        // Aura when passed 1/2 height threshold
        const draggedUp = -translateY
        const threshold = 0.5 * activeHeightRef.current
        if (draggedUp >= threshold) {
            if (!auraOnRef.current && activeElRef.current) {
                auraOnRef.current = true
                activeElRef.current.style.boxShadow =
                    "0 0 0 2px rgba(59,130,246,0.8), 0 0 24px 10px rgba(124,58,237,0.7), 0 0 60px 24px rgba(59,130,246,0.5)"
                activeElRef.current.style.filter =
                    "saturate(1.2) brightness(1.05)"
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
        if (!verticalDragActiveRef.current) {
            // Not a vertical intent; let Swiper finish
            // reset lightweight state
            activeElRef.current = null
            activeNameRef.current = null
            startYRef.current = null
            startXRef.current = null
            startTimeRef.current = null
            auraOnRef.current = false
            verticalDragActiveRef.current = false
            return
        }
        const height =
            activeHeightRef.current || el.getBoundingClientRect().height
        const elapsed = startTimeRef.current
            ? Date.now() - startTimeRef.current
            : 0

        // Read current translateY from transform
        const matrix = window.getComputedStyle(el).transform
        let translateY = 0
        if (matrix && matrix !== "none") {
            const values = matrix.match(/-?\d+\.?\d*/g)
            if (values && (values.length === 6 || values.length === 16)) {
                translateY = parseFloat(
                    values[values.length === 6 ? 5 : 13] || "0",
                )
            }
        }
        const draggedUp = -translateY
        const threshold = 0.5 * height
        const wasSelected = (startTranslateYRef.current || 0) < -0.8 * height

        if (
            !wasSelected &&
            elapsed >= MIN_HOLD_MS &&
            draggedUp >= threshold &&
            selected.length < cardsToSelect
        ) {
            const mapped = reversalByName.get(name)
            const isReversed = mapped != null ? mapped : Math.random() < 0.5
            const nextCard = { name, isReversed }
            const next = [...selected, nextCard]
            setSelected(next)
            setSelectedNames((prev) => new Set(prev).add(name))
            pendingPartialRef.current = {
                card: nextCard,
                action: "add",
                count: next.length,
            }
            finalizeIfDone(next)
            // Hide/restore element
            el.style.transition = "transform 180ms ease"
            el.style.transform = "translateY(-120%) rotate(-6deg)"
        } else if (wasSelected) {
            // Allow cancel selection by dragging back down close to deck
            if (translateY > -0.25 * height) {
                // Cancel selection
                const removedCard = selected.find((c) => c.name === name)
                const next = selected.filter((c) => c.name !== name)
                setSelected(next)
                setSelectedNames((prev) => {
                    const nextSet = new Set(prev)
                    nextSet.delete(name)
                    return nextSet
                })
                if (removedCard) {
                    pendingPartialRef.current = {
                        card: removedCard,
                        action: "remove",
                        count: next.length,
                    }
                }
                el.style.transition = "transform 180ms ease"
                el.style.transform = "translateY(0) rotate(0deg)"
            } else {
                // Snap back to selected position
                el.style.transition = "transform 180ms ease"
                el.style.transform = "translateY(-120%) rotate(-6deg)"
            }
        } else {
            el.style.transition = "transform 180ms ease"
            el.style.transform = "translateY(0) rotate(0deg)"
        }
        // Suppress the synthetic click that follows pointerup after a drag
        suppressClickRef.current = true
        if (suppressClickTimeoutRef.current) {
            window.clearTimeout(suppressClickTimeoutRef.current)
        }
        suppressClickTimeoutRef.current = window.setTimeout(() => {
            suppressClickRef.current = false
            suppressClickTimeoutRef.current = null
        }, 350)
        // Clear aura if any
        el.style.boxShadow = ""
        el.style.filter = ""
        // reset
        activeElRef.current = null
        activeNameRef.current = null
        startYRef.current = null
        startXRef.current = null
        startTimeRef.current = null
        auraOnRef.current = false
        verticalDragActiveRef.current = false
    }

    return (
        <>
            <div
                className='w-full relative'
                ref={navGuardRef}
                style={{
                    overscrollBehaviorX: "none",
                    touchAction: "pan-y pinch-zoom",
                }}
            >
                <div className='w-full relative' ref={deckRef}>
                    {/* Controls are rendered by the parent */}
                    <Swiper
                        onSwiper={(instance) => {
                            swiperRef.current = instance
                        }}
                        modules={[FreeMode, Mousewheel]}
                        freeMode={{
                            enabled: true,
                            momentum: true,
                            sticky: false,
                        }}
                        slidesPerView='auto'
                        spaceBetween={-40}
                        grabCursor={true}
                        mousewheel={{
                            enabled: true,
                            forceToAxis: true,
                            sensitivity: 1,
                            releaseOnEdges: false,
                        }}
                        scrollbar={{
                            enabled: false,
                        }}
                        className='w-full px-4 relative z-10'
                    >
                        {deckList.map((name, idx) => {
                            const isSelected = selectedNames.has(name)
                            return (
                                <SwiperSlide
                                    key={`${name}-${idx}`}
                                    className='!w-28'
                                >
                                    <div className='flex items-end justify-center h-52'>
                                        <div
                                            className={`w-24 h-36 rounded-[16px] bg-gradient-to-br from-[#15a6ff] via-[#b56cff] to-[#15a6ff] p-px shadow-2xl select-none touch-none ${
                                                isSelected
                                                    ? "cursor-grab"
                                                    : "cursor-pointer"
                                            }`}
                                            data-card='true'
                                            data-card-name={name}
                                            onClick={(e) => {
                                                if (suppressClickRef.current) {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    return
                                                }
                                                const cardRect =
                                                    e.currentTarget.getBoundingClientRect()
                                                const parentRect =
                                                    deckRef.current?.getBoundingClientRect()
                                                const parentLeft = parentRect
                                                    ? parentRect.left
                                                    : 0
                                                const parentTop = parentRect
                                                    ? parentRect.top
                                                    : 0
                                                const centerX =
                                                    cardRect.left -
                                                    parentLeft +
                                                    cardRect.width / 2
                                                const centerY =
                                                    cardRect.top -
                                                    parentTop +
                                                    cardRect.height / 2
                                                setOverlayCenter({
                                                    x: centerX,
                                                    y: centerY,
                                                })
                                                handleCardClick(name)
                                            }}
                                            onPointerDown={(
                                                e: React.PointerEvent<HTMLDivElement>,
                                            ) => {
                                                if (!e.isPrimary) return
                                                startXRef.current = e.clientX
                                                // Keep move/up events on this element even if pointer leaves
                                                try {
                                                    e.currentTarget.setPointerCapture(
                                                        e.pointerId,
                                                    )
                                                } catch {}
                                                // Do not show or position overlay on pointer down.
                                                // Overlay should only appear and position on click.
                                                handleDown(
                                                    e.clientY,
                                                    e.currentTarget,
                                                    name,
                                                )
                                            }}
                                            onPointerMove={(
                                                e: React.PointerEvent<HTMLDivElement>,
                                            ) => handleMove(e)}
                                            onPointerUp={handleUp}
                                            onPointerCancel={handleUp}
                                            role='button'
                                            aria-label={
                                                swipeLabel ??
                                                t("swipeUpToSelect")
                                            }
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
                                    </div>
                                </SwiperSlide>
                            )
                        })}
                    </Swiper>

                    <SwipeUpOverlay
                        isVisible={showSwipeOverlay}
                        onClose={() => setShowSwipeOverlay(false)}
                        center={overlayCenter}
                        deckRect={(() => {
                            const r = deckRef.current?.getBoundingClientRect()
                            return {
                                left: r?.left ?? 0,
                                top: r?.top ?? 0,
                                right: r?.right ?? 0,
                                bottom: r?.bottom ?? 0,
                            }
                        })()}
                        onRecenter={(c) => setOverlayCenter(c)}
                        label={swipeLabel}
                    />
                </div>
            </div>
            <p className='mt-4 text-xs text-muted-foreground w-full text-center'>
                {swipeLabel ?? t("swipeUpToSelect")}
            </p>
        </>
    )
}

export default LinearCardSpread
