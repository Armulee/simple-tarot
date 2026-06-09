"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react"

export interface DynamicThinkingLabels {
    /** Shown before any reasoning tokens arrive (State 1). */
    consulting: string
    /** Shown once reasoning finishes and the answer begins (State 4). */
    complete: string
    /** Accessible label for the expand/collapse control. */
    toggle: string
}

const DEFAULT_LABELS: DynamicThinkingLabels = {
    consulting: "Consulting…",
    complete: "Consultation Complete",
    toggle: "Toggle reasoning",
}

/**
 * Collapse runs of whitespace and return the most recent sentence-like segment
 * of the reasoning so the headline tracks the model's *current* train of
 * thought instead of the whole transcript.
 */
function deriveHeadline(reasoning: string): string {
    const normalized = reasoning.replace(/\s+/g, " ").trim()
    if (!normalized) return ""
    const segments = normalized.split(/(?<=[.!?。！？…])\s+/).filter(Boolean)
    return segments.length ? segments[segments.length - 1] : normalized
}

/**
 * Gemini-style live chain-of-thought indicator.
 *
 * States:
 *   1. Initial wait      — `isThinking` and no reasoning yet → "Consulting…".
 *   2. Streaming reasoning — `isThinking` with reasoning → live headline + chevron.
 *   4. Complete          — `!isThinking` with reasoning → checkmark + complete label.
 * (Renders nothing once finished if no reasoning was ever produced.)
 *
 * Fully controlled: it keeps no streaming buffers of its own (the parent owns
 * `reasoningText`), so there are no timers/intervals to leak. The only local
 * state is the expand/collapse toggle.
 */
export function DynamicThinking({
    reasoningText,
    isThinking,
    labels,
    className,
}: {
    reasoningText: string
    isThinking: boolean
    labels?: Partial<DynamicThinkingLabels>
    className?: string
}) {
    const resolvedLabels = { ...DEFAULT_LABELS, ...labels }
    const [expanded, setExpanded] = useState(false)
    const scrollRef = useRef<HTMLDivElement | null>(null)

    const hasReasoning = reasoningText.trim().length > 0
    const headline = useMemo(
        () => deriveHeadline(reasoningText),
        [reasoningText],
    )

    // Keep the expanded transcript pinned to the latest tokens while streaming.
    useEffect(() => {
        if (!expanded || !isThinking) return
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [reasoningText, expanded, isThinking])

    // Nothing meaningful happened (no reasoning, not thinking) — let the answer
    // speak for itself.
    if (!isThinking && !hasReasoning) return null

    const headlineText =
        isThinking && !hasReasoning
            ? resolvedLabels.consulting
            : !isThinking
              ? resolvedLabels.complete
              : headline || resolvedLabels.consulting

    const canExpand = hasReasoning

    return (
        <div
            className={`w-full overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 backdrop-blur-xl shadow-[0_0_20px_-8px_rgba(56,189,248,0.3)] ${
                className ?? ""
            }`}
        >
            <div className='flex items-center gap-2 px-4 py-2.5'>
                {isThinking ? (
                    <Loader2 className='h-4 w-4 shrink-0 animate-spin text-primary' />
                ) : (
                    <span className='flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20'>
                        <Check className='h-3 w-3 text-emerald-400' />
                    </span>
                )}

                <span
                    className='min-w-0 flex-1 truncate text-sm font-medium text-white/90'
                    title={headlineText}
                >
                    {headlineText}
                </span>

                {canExpand && (
                    <button
                        type='button'
                        onClick={() => setExpanded((v) => !v)}
                        aria-expanded={expanded}
                        aria-label={resolvedLabels.toggle}
                        className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white'
                    >
                        {expanded ? (
                            <ChevronDown className='h-4 w-4' />
                        ) : (
                            <ChevronRight className='h-4 w-4' />
                        )}
                    </button>
                )}
            </div>

            {canExpand && expanded && (
                <div className='border-t border-white/10 px-4 py-3'>
                    <div
                        ref={scrollRef}
                        className='max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-white/60'
                    >
                        {reasoningText}
                    </div>
                </div>
            )}
        </div>
    )
}
