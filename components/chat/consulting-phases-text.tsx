"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Two-step "AI thinking" loading text.
 *
 * The two steps mirror the real AI workflow:
 *   - `stage = "deciding"`    → Step 1, the chat-decision API call.
 *   - `stage = "interpreting"`→ Step 2, the interpretation/response API call.
 *
 * Within each step the component continuously *cycles* through that step's
 * phrase list (a new random phrase every `phraseIntervalMs`, with a soft
 * opacity fade between phrases) — so a step shows a flowing transition of
 * phrases rather than a single static line. When `stage` flips from "deciding"
 * to "interpreting" it fades out and starts cycling the Step 2 list.
 *
 * The whole thing terminates instantly when the component unmounts — which is
 * exactly when the real answer starts streaming — and every timer is cleared in
 * the effect cleanup, so there are no leaks if the stream interrupts mid-fade.
 *
 * Styling is intentionally minimal: callers keep their own badge container and
 * secondary animations (spinner / pulse) and only swap the text node.
 */

/** How long each phrase stays on screen before transitioning to the next. */
export const PHRASE_INTERVAL_MS = 2000
/** Opacity fade duration; kept within the 300–500ms "premium feel" range. */
export const FADE_DURATION_MS = 400

export type LoadingStage = "deciding" | "interpreting"

/**
 * Remembers the last phrase served for a given list so consecutive picks don't
 * repeat. Keyed by the array reference (the i18n arrays are memoized upstream),
 * and falls back gracefully when a list isn't stable.
 */
const lastPickByList = new WeakMap<readonly string[], string>()

/**
 * Robust random pick that avoids returning the same phrase twice in a row for
 * the same list. Returns `undefined` for empty/invalid input.
 */
export function pickRandomPhrase(
    phrases: readonly string[] | null | undefined,
): string | undefined {
    if (!Array.isArray(phrases) || phrases.length === 0) return undefined
    if (phrases.length === 1) return phrases[0]

    const previous = lastPickByList.get(phrases)
    let pick = phrases[Math.floor(Math.random() * phrases.length)]
    // Re-roll until we land on a different phrase than last time.
    let guard = 0
    while (pick === previous && guard < 10) {
        pick = phrases[Math.floor(Math.random() * phrases.length)]
        guard += 1
    }

    lastPickByList.set(phrases, pick)
    return pick
}

export function ConsultingPhasesText({
    step1Phrases,
    step2Phrases,
    stage = "deciding",
    fallback = "",
    phraseIntervalMs = PHRASE_INTERVAL_MS,
    fadeDurationMs = FADE_DURATION_MS,
    className,
}: {
    step1Phrases: readonly string[]
    step2Phrases: readonly string[]
    /** Which workflow step is currently in flight. */
    stage?: LoadingStage
    /** Shown when a phrase list is empty (e.g. missing translations). */
    fallback?: string
    phraseIntervalMs?: number
    fadeDurationMs?: number
    className?: string
}) {
    const activePhrases = stage === "interpreting" ? step2Phrases : step1Phrases

    // Start with the first phrase already visible so the badge is sized to real
    // content on mount instead of briefly showing an empty (but full-width) pill
    // while a fade-in plays.
    const [text, setText] = useState(
        () => pickRandomPhrase(activePhrases) ?? fallback,
    )
    const [visible, setVisible] = useState(true)

    // Keep the freshest values available to the cycle without re-arming it.
    const phrasesRef = useRef(activePhrases)
    phrasesRef.current = activePhrases
    const fallbackRef = useRef(fallback)
    fallbackRef.current = fallback
    const isFirstRunRef = useRef(true)

    // Re-arm whenever the step changes so each step cycles its own list. We key
    // on `stage` (not the array identity) so an upstream re-memo doesn't restart
    // the cycle mid-step.
    useEffect(() => {
        let swapTimer: number | undefined

        // Fade the current phrase out, swap to a fresh one from the active
        // list, then fade it back in.
        const transition = () => {
            setVisible(false)
            swapTimer = window.setTimeout(() => {
                setText(
                    pickRandomPhrase(phrasesRef.current) ?? fallbackRef.current,
                )
                setVisible(true)
            }, fadeDurationMs)
        }

        // On the very first mount the initial phrase is already showing, so skip
        // the entrance fade (that's what caused the empty, expanded pill). On a
        // step change, fade across to the new step's phrase immediately.
        if (!isFirstRunRef.current) {
            transition()
        }
        isFirstRunRef.current = false

        const cycle = window.setInterval(transition, phraseIntervalMs)

        return () => {
            window.clearInterval(cycle)
            if (swapTimer) window.clearTimeout(swapTimer)
        }
    }, [stage, phraseIntervalMs, fadeDurationMs])

    return (
        <span
            className={className}
            style={{
                transition: `opacity ${fadeDurationMs}ms ease-in-out`,
                opacity: visible ? 1 : 0,
            }}
        >
            {text}
        </span>
    )
}
