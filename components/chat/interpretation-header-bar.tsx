"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { Sparkle } from "lucide-react"
import ActionSection, {
    type ActionSectionProps,
} from "@/components/tarot/interpretation/action"

const HEADER_ROW_GAP_PX = 12
const HEADER_MEASURE_PAD_PX = 2
const HEADER_SCREEN_EDGE_PAD_PX = 12

export function InterpretationHeaderBar(
    props?: {
        isLoading?: boolean
        /**
         * When true, the right-side compact `ActionSection` fades up. Defaults
         * to `!isLoading` so existing call sites still reveal actions when the
         * full interpretation finishes. Pass an earlier signal (e.g. card
         * insights done streaming) to fade actions in mid-stream.
         */
        showActions?: boolean
    } & Partial<Omit<ActionSectionProps, "variant" | "compactAvailableWidthPx">>,
) {
    const {
        isLoading = false,
        showActions: showActionsProp,
        ...actionSectionProps
    } = props ?? {}
    const showActions = showActionsProp ?? !isLoading
    const headerRowRef = useRef<HTMLDivElement>(null)
    const pillRef = useRef<HTMLDivElement>(null)
    const [compactAvailableWidthPx, setCompactAvailableWidthPx] = useState<
        number | undefined
    >(undefined)

    const measureAvailability = useCallback(() => {
        const rowEl = headerRowRef.current
        const pillEl = pillRef.current
        if (!rowEl || !pillEl || !showActions) return
        const rowRect = rowEl.getBoundingClientRect()
        const pillRect = pillEl.getBoundingClientRect()
        const fromFlexRow =
            rowRect.width -
            pillRect.width -
            HEADER_ROW_GAP_PX -
            HEADER_MEASURE_PAD_PX
        const screenW =
            typeof window !== "undefined" ? window.innerWidth : rowRect.width
        const fromScreenRight =
            screenW - pillRect.right - HEADER_SCREEN_EDGE_PAD_PX
        const next = Math.max(0, Math.min(fromFlexRow, fromScreenRight))
        setCompactAvailableWidthPx((prev) =>
            prev !== undefined && Math.abs(prev - next) < 0.5 ? prev : next,
        )
    }, [showActions])

    useLayoutEffect(() => {
        if (!showActions) return
        const run = () => {
            requestAnimationFrame(() => measureAvailability())
        }
        run()
        const ro = new ResizeObserver(run)
        const row = headerRowRef.current
        const pill = pillRef.current
        if (row) ro.observe(row)
        if (pill) ro.observe(pill)
        window.addEventListener("resize", run)
        window.visualViewport?.addEventListener("resize", run)
        return () => {
            ro.disconnect()
            window.removeEventListener("resize", run)
            window.visualViewport?.removeEventListener("resize", run)
        }
    }, [showActions, measureAvailability])

    return (
        <div
            ref={headerRowRef}
            className='flex min-w-0 items-center justify-between gap-3'
        >
            <div
                ref={pillRef}
                className='flex w-fit shrink-0 items-center space-x-3 rounded-full bg-primary/20 px-4 py-2'
            >
                <Sparkle
                    fill='currentColor'
                    className='h-4 w-4 shrink-0 text-accent'
                />
                <div>
                    <p className='whitespace-nowrap text-sm text-accent'>
                        AI Interpretation
                    </p>
                </div>
            </div>
            {showActions && (
                <div className='animate-fade-up'>
                    <ActionSection
                        variant='compact'
                        compactAvailableWidthPx={compactAvailableWidthPx}
                        {...actionSectionProps}
                    />
                </div>
            )}
        </div>
    )
}
