"use client"

import { useCallback, useLayoutEffect, useRef, useState } from "react"
import ActionSection, {
    type ActionSectionProps,
} from "@/components/tarot/interpretation/action"

const HEADER_MEASURE_PAD_PX = 2
const HEADER_SCREEN_EDGE_PAD_PX = 12

export function InterpretationHeaderBar(
    props?: {
        isLoading?: boolean
        /**
         * When true, the compact `ActionSection` fades up. Defaults
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
    const [compactAvailableWidthPx, setCompactAvailableWidthPx] = useState<
        number | undefined
    >(undefined)

    const measureAvailability = useCallback(() => {
        const rowEl = headerRowRef.current
        if (!rowEl || !showActions) return
        const rowRect = rowEl.getBoundingClientRect()
        const fromFlexRow = rowRect.width - HEADER_MEASURE_PAD_PX
        const screenW =
            typeof window !== "undefined" ? window.innerWidth : rowRect.width
        const fromViewportRight =
            screenW - rowRect.left - HEADER_SCREEN_EDGE_PAD_PX
        const next = Math.max(0, Math.min(fromFlexRow, fromViewportRight))
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
        if (row) ro.observe(row)
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
            className='flex min-w-0 items-center justify-start gap-3'
        >
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
