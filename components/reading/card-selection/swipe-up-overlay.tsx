"use client"

import React, { useState, useEffect } from "react"
import { useTranslations } from "next-intl"

interface SwipeUpOverlayProps {
    isVisible: boolean
    onClose: () => void
    center: { x: number; y: number }
    deckRect: { left: number; top: number; right: number; bottom: number }
    onRecenter: (center: { x: number; y: number }) => void
}

export function SwipeUpOverlay({
    isVisible,
    onClose,
    center,
    deckRect,
    onRecenter,
}: SwipeUpOverlayProps) {
    const t = useTranslations("ReadingPage.chooseCards")
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        if (!isVisible) return
        setIsAnimating(true)
        const timer = window.setTimeout(() => {
            setIsAnimating(false)
        }, 2000)
        const handleWheel = () => onClose()
        const handleTouchMove = () => onClose()
        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as Element | null
            // Only keep overlay if the actual card (data-card) is clicked
            const cardEl = target?.closest(
                '[data-card="true"]'
            ) as HTMLElement | null
            if (cardEl) {
                const r = cardEl.getBoundingClientRect()
                const cx = r.left - deckRect.left + r.width / 2
                const cy = r.top - deckRect.top + r.height / 2
                onRecenter({ x: cx, y: cy })
                return
            }
            // Anywhere else (including swiper slides and children): dismiss
            onClose()
        }
        window.addEventListener("wheel", handleWheel, { passive: true })
        window.addEventListener("touchmove", handleTouchMove, { passive: true })
        window.addEventListener("pointerdown", handleMouseDown, true)
        return () => {
            window.clearTimeout(timer)
            window.removeEventListener("wheel", handleWheel)
            window.removeEventListener("touchmove", handleTouchMove)
            window.removeEventListener("pointerdown", handleMouseDown, true)
        }
    }, [
        isVisible,
        onClose,
        onRecenter,
        deckRect.left,
        deckRect.top,
        deckRect.right,
        deckRect.bottom,
    ])

    if (!isVisible) return null

    const glowStyle: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        background: `radial-gradient(220px 220px at ${center.x}px ${center.y}px, rgba(99,102,241,0.45) 0%, rgba(99,102,241,0.25) 36%, rgba(10,10,26,0.55) 64%, rgba(0,0,0,0.6) 75%), rgba(0,0,0,0.45)`,
    }

    return (
        <div className='absolute inset-0'>
            {/* Full-page dim backdrop (non-interactive) */}
            <div className='fixed inset-0 bg-black/70 pointer-events-none' />
            {/* Underlay highlight behind cards */}
            <div
                className='absolute inset-0 z-0'
                style={glowStyle}
                onClick={onClose}
                onWheel={onClose}
                onTouchMove={onClose}
            />

            {/* Gesture indicator above cards but non-interactive */}
            <div
                className='absolute z-20 pointer-events-none'
                style={{
                    left: center.x,
                    top: center.y,
                    transform: "translate(-50%, -50%)",
                }}
            >
                <div
                    className={`w-16 h-16 border-2 border-white rounded-full flex items-center justify-center mx-auto transition-all duration-1000 ${
                        isAnimating ? "animate-bounce" : ""
                    }`}
                >
                    <svg
                        className='w-8 h-8 text-white'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M7 11l5-5m0 0l5 5m-5-5v12'
                        />
                    </svg>
                </div>
                <div
                    className={`mx-auto mt-2 w-1 h-8 bg-white/60 rounded-full transition-all duration-1000 ${
                        isAnimating ? "animate-pulse" : ""
                    }`}
                />
                <div className='mt-2 text-center text-white text-xs bg-black/40 px-2 py-0.5 rounded-full inline-block'>
                    {t("swipeUpToSelect")}
                </div>
            </div>
        </div>
    )
}
