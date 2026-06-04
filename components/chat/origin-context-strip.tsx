"use client"

import { CornerDownRight, Sparkles, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"

import type { OriginContext } from "@/lib/chat/origin-context"
import { followUpChipClass } from "@/components/question-input"

/**
 * Shared "context-chip + suggestions" strip rendered above the input.
 *
 * The /calendar page (PageContextComposer) and the chat session (when the
 * latest assistant turn is the inline horoscope calendar tool) both use
 * this so the visual handoff between pages is continuous: the same
 * amber/violet pill the viewer sees on /calendar travels with them into
 * the chat session.
 */
export default function OriginContextStrip({
    originContext,
    eyebrow,
    hint,
    suggestions,
    onSuggestionClick,
    onCancel,
    disabled,
}: {
    originContext: OriginContext
    eyebrow?: string
    hint?: string
    suggestions?: string[]
    onSuggestionClick?: (suggestion: string) => void
    /**
     * When provided, an X button renders next to the day pill that
     * clears the context (clears the selected calendar day so the strip
     * disappears; it'll come back once a date is selected again).
     */
    onCancel?: () => void
    disabled?: boolean
}) {
    const t = useTranslations("PageContextComposer")
    return (
        <div className='w-full space-y-2 text-left'>
            <p className='text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70'>
                {eyebrow ?? t("eyebrow")}
            </p>
            <div className='inline-flex max-w-full items-center gap-1.5'>
                <div
                    className='inline-flex max-w-full items-center gap-2 rounded-xl border border-amber-300/30 bg-gradient-to-br from-amber-300/10 via-white/[0.04] to-violet-400/10 px-3 py-1.5 text-xs text-white/85 backdrop-blur'
                    role='note'
                    aria-label={`${originContext.label} — ${hint ?? t("hint")}`}
                >
                    <Sparkles className='size-3.5 shrink-0 text-amber-200/85' />
                    <span className='truncate font-medium text-white'>
                        {originContext.label}
                    </span>
                    <span className='hidden sm:inline text-white/60'>
                        — {hint ?? t("hint")}
                    </span>
                </div>
                {onCancel ? (
                    <button
                        type='button'
                        onClick={onCancel}
                        aria-label={t("clear")}
                        title={t("clear")}
                        className='inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white'
                    >
                        <X className='size-3.5' aria-hidden />
                    </button>
                ) : null}
            </div>
            {suggestions && suggestions.length > 0 && onSuggestionClick ? (
                <Swiper
                    modules={[FreeMode, Mousewheel]}
                    noSwiping={false}
                    touchEventsTarget='container'
                    freeMode={{
                        enabled: true,
                        momentum: true,
                        sticky: false,
                    }}
                    mousewheel={{
                        forceToAxis: true,
                        releaseOnEdges: true,
                        sensitivity: 1,
                    }}
                    slidesPerView='auto'
                    spaceBetween={8}
                    className='composer-follow-up-swiper w-full touch-pan-x !overflow-visible'
                >
                    {suggestions.map((suggestion, idx) => (
                        <SwiperSlide
                            key={`origin-suggestion-${idx}`}
                            className='!w-auto !flex-shrink-0 min-w-0'
                        >
                            <div
                                role='button'
                                tabIndex={disabled ? -1 : 0}
                                aria-disabled={disabled || undefined}
                                onClick={() => {
                                    if (disabled) return
                                    onSuggestionClick(suggestion)
                                }}
                                onKeyDown={(e) => {
                                    if (disabled) return
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault()
                                        onSuggestionClick(suggestion)
                                    }
                                }}
                                className={`${followUpChipClass} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                <CornerDownRight
                                    aria-hidden
                                    className='mr-1.5 size-3.5 shrink-0 text-white/55'
                                />
                                <span className='block max-w-[min(92vw,20rem)] truncate'>
                                    {suggestion}
                                </span>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            ) : null}
        </div>
    )
}
