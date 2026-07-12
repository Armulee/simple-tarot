"use client"

/**
 * Decorative ritual candles (Part 3.3 — sacred reading ambiance).
 *
 * Pure CSS: wax body + layered flame with a slow sway/flicker and a
 * breathing halo (keyframes live in globals.css under "Ritual reading").
 * Strictly decorative: aria-hidden, pointer-events-none, and the flames
 * freeze (but stay lit) under prefers-reduced-motion.
 *
 * Render inside a `relative` container; position via `className`.
 */
export function RitualCandle({
    tall = false,
    className = "",
}: {
    tall?: boolean
    className?: string
}) {
    return (
        <div
            aria-hidden
            className={`ritual-candle ${tall ? "ritual-candle--tall" : ""} ${className}`}
        >
            <div className='ritual-candle-halo' />
            <div className='relative'>
                <div className='ritual-flame' />
                <div className='ritual-candle-body' />
            </div>
        </div>
    )
}

/**
 * A pair of candles flanking a ritual area (the card spread). Hidden on
 * very narrow screens where the deck needs every pixel.
 */
export function RitualCandlesFrame() {
    return (
        <div
            aria-hidden
            className='pointer-events-none absolute inset-x-0 top-0 hidden sm:block'
        >
            <RitualCandle
                tall
                className='absolute left-3 top-3 opacity-80'
            />
            <RitualCandle className='absolute right-3 top-5 opacity-70' />
        </div>
    )
}
