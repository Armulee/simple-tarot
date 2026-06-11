"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react"

export interface DynamicThinkingLabels {
    /** Shown before any reasoning tokens arrive (State 1). */
    consulting: string
    /** Shown while reasoning tokens are streaming (State 2). */
    active: string
    /** Shown once reasoning finishes and the answer begins (State 4). */
    complete: string
    /** Accessible label for the expand/collapse control. */
    toggle: string
}

const DEFAULT_LABELS: DynamicThinkingLabels = {
    consulting: "Consulting…",
    active: "Chain of thoughts",
    complete: "Deep consult for {seconds} sec",
    toggle: "Toggle reasoning",
}

const MAX_HEADLINE_WORDS = 5

const LEADING_FILLER_PATTERN =
    /^(?:i\s+(?:need|want|have)\s+to|i(?:'|\u2019)ll|i\s+will|i(?:'|\u2019)m\s+going\s+to|i\s+am\s+going\s+to|i\s+should|let(?:'|\u2019)s|let\s+me|now\s+i(?:'|\u2019)ll|now\s+i\s+will|next\s+i(?:'|\u2019)ll|next\s+i\s+will|then\s+i(?:'|\u2019)ll|then\s+i\s+will|this\s+will|it(?:'|\u2019)s\s+essential\s+for\s+me\s+to)\s+/i

const ENGLISH_STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "be",
    "for",
    "in",
    "is",
    "it",
    "of",
    "or",
    "so",
    "that",
    "the",
    "to",
    "with",
])

function titleCaseAscii(phrase: string): string {
    return phrase.replace(/\b[a-z]/g, (char) => char.toUpperCase())
}

function compactWords(segment: string): string {
    const words = segment
        .replace(/[`*_#>[\](){}]/g, " ")
        .replace(/[,:;]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean)

    const usefulWords = words.filter(
        (word) => !ENGLISH_STOP_WORDS.has(word.toLowerCase()),
    )
    const headlineWords = (usefulWords.length >= 2 ? usefulWords : words).slice(
        0,
        MAX_HEADLINE_WORDS,
    )

    return headlineWords.join(" ")
}

function deriveHeadline(reasoning: string, fallback: string): string {
    const normalized = reasoning.replace(/\s+/g, " ").trim()
    if (!normalized) return fallback

    const segments = normalized
        .split(/(?<=[.!?。！？…])\s+|\n+/)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length >= 8)

    const latestSegment = segments[segments.length - 1] ?? normalized
    const recentText = (segments.length ? segments : [normalized])
        .slice(-3)
        .join(" ")
        .toLowerCase()

    if (
        /repo|repository/.test(recentText) &&
        /option|approach|path/.test(recentText)
    ) {
        return "Exploring repository options"
    }
    if (/repo|repository/.test(recentText)) return "Exploring repository"
    if (/option|approach|path/.test(recentText)) return "Exploring options"
    if (/tool|glob|rg|search/.test(recentText)) return "Choosing search tools"
    if (/file|component|code/.test(recentText)) return "Inspecting code"
    if (/implement|update|change|edit/.test(recentText)) return "Planning updates"
    if (/test|lint|verify|check/.test(recentText)) return "Verifying changes"
    if (/question|intent|request/.test(recentText)) return "Reading the question"

    const cleaned = latestSegment
        .replace(LEADING_FILLER_PATTERN, "")
        .replace(/^(?:because|so|then|next|now)\s+/i, "")
        .trim()
    const compacted = compactWords(cleaned)
    if (!compacted) return fallback

    return /^[\x00-\x7F]+$/.test(compacted)
        ? titleCaseAscii(compacted)
        : compacted
}

function formatCompleteLabel(template: string, seconds: number | null): string {
    if (!template.includes("{seconds}")) return template
    return template.replace("{seconds}", String(seconds ?? 1))
}

/**
 * Gemini-style live chain-of-thought indicator.
 *
 * States:
 *   1. Initial wait      — `isThinking` and no reasoning yet → "Consulting…".
 *   2. Streaming reasoning — `isThinking` with reasoning → short dynamic headline + chevron.
 *   4. Complete          — `!isThinking` with reasoning → checkmark + elapsed time.
 * (Renders nothing once finished if no reasoning was ever produced.)
 *
 * Fully controlled: it keeps no streaming buffers of its own (the parent owns
 * `reasoningText`), and the transcript is only rendered inside the expanded
 * panel. The only local state is the expand/collapse toggle.
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
    const [completedSeconds, setCompletedSeconds] = useState<number | null>(
        null,
    )
    const scrollRef = useRef<HTMLDivElement | null>(null)
    const startedAtRef = useRef<number | null>(null)

    const hasReasoning = reasoningText.trim().length > 0
    const activeHeadline = useMemo(
        () =>
            hasReasoning
                ? deriveHeadline(reasoningText, resolvedLabels.active)
                : resolvedLabels.consulting,
        [
            hasReasoning,
            reasoningText,
            resolvedLabels.active,
            resolvedLabels.consulting,
        ],
    )
    const [animatedHeadline, setAnimatedHeadline] = useState(activeHeadline)
    const [headlineVersion, setHeadlineVersion] = useState(0)

    // Keep the expanded transcript pinned to the latest tokens while streaming.
    useEffect(() => {
        if (!expanded || !isThinking) return
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [reasoningText, expanded, isThinking])

    useEffect(() => {
        if (isThinking) {
            if (startedAtRef.current === null) {
                startedAtRef.current = performance.now()
                setCompletedSeconds(null)
            }
            return
        }

        if (hasReasoning && startedAtRef.current !== null) {
            const elapsedMs = performance.now() - startedAtRef.current
            setCompletedSeconds(Math.max(1, Math.round(elapsedMs / 1000)))
            startedAtRef.current = null
        }
    }, [hasReasoning, isThinking])

    useEffect(() => {
        if (animatedHeadline === activeHeadline) return

        const delayMs = isThinking && hasReasoning ? 180 : 0
        const timeout = window.setTimeout(() => {
            setAnimatedHeadline(activeHeadline)
            setHeadlineVersion((version) => version + 1)
        }, delayMs)

        return () => window.clearTimeout(timeout)
    }, [activeHeadline, animatedHeadline, hasReasoning, isThinking])

    // Nothing meaningful happened (no reasoning, not thinking) — let the answer
    // speak for itself.
    if (!isThinking && !hasReasoning) return null

    const headlineText =
        isThinking && !hasReasoning
            ? resolvedLabels.consulting
            : !isThinking
              ? formatCompleteLabel(resolvedLabels.complete, completedSeconds)
              : animatedHeadline

    const canExpand = hasReasoning

    return (
        <div
            className={`flex w-fit max-w-full flex-col overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 backdrop-blur-xl shadow-[0_0_20px_-8px_rgba(56,189,248,0.3)] ${
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
                    key={headlineVersion}
                    className='min-w-0 max-w-[16rem] truncate text-sm font-medium text-white/90 animate-fade-swap sm:max-w-[26rem]'
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
