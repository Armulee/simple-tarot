"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"

interface GetStartedTourOverlayProps {
    isOpen: boolean
    onClose: () => void
    targetRef: React.RefObject<HTMLDivElement | null>
}

export function GetStartedTourOverlay({
    isOpen,
    onClose,
    targetRef,
}: GetStartedTourOverlayProps) {
    const t = useTranslations("Home")
    const [rect, setRect] = useState<DOMRect | null>(null)

    const updateRect = useCallback(() => {
        const el = targetRef.current
        if (!el) return
        setRect(el.getBoundingClientRect())
    }, [targetRef])

    useEffect(() => {
        if (!isOpen) return
        const run = () => {
            requestAnimationFrame(() => {
                updateRect()
            })
        }
        run()
        const timer = window.setTimeout(run, 100)
        const onResize = () => updateRect()
        window.addEventListener("resize", onResize)
        return () => {
            window.clearTimeout(timer)
            window.removeEventListener("resize", onResize)
        }
    }, [isOpen, updateRect])

    useEffect(() => {
        if (!isOpen) return
        const onScroll = () => onClose()
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            role='button'
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            className='fixed inset-0 z-50 cursor-pointer bg-black/85'
            aria-label='Click to close tour'
        >
            {/* Focal point aura around input */}
            {rect && (
                <div
                    className='pointer-events-none absolute rounded-2xl border-2 border-primary/60'
                    style={{
                        left: rect.left - 12,
                        top: rect.top - 12,
                        width: rect.width + 24,
                        height: rect.height + 24,
                        boxShadow:
                            "0 0 40px 12px rgba(99,102,241,0.5), 0 0 80px 24px rgba(168,85,247,0.3), 0 0 120px 36px rgba(34,211,238,0.2)",
                    }}
                />
            )}

            {/* Instruction text - positioned above input */}
            {rect && (
                <div
                    className='w-full animate-fade-in pointer-events-none absolute left-1/2 -translate-x-1/2 text-center px-4 max-w-sm'
                    style={{
                        bottom: 200,
                    }}
                >
                    <p className='text-white/95 text-sm font-medium leading-relaxed'>
                        {t("tourInstruction")}
                    </p>
                    <p className='text-white/70 text-xs mt-2 italic'>
                        {t("tourExamples")}
                    </p>
                </div>
            )}
        </div>
    )
}
