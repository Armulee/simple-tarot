"use client"

import { useEffect, useMemo, useState } from "react"

/**
 * Two-step "AI thinking" loading text.
 *
 * Step 1 (chat-decision phase) shows a randomly chosen phrase for
 * `step1DurationMs` (~2s), then fades out. Step 2 (interpretation phase) fades in a
 * second randomly chosen phrase and holds it until the component unmounts —
 * which is exactly when the real answer begins streaming, so the simulated
 * timeline terminates instantly. All timers are cleared on unmount, so there
 * are no leaks if the stream interrupts mid-animation.
 *
 * Styling is intentionally minimal: callers keep their own badge container and
 * secondary animations (spinner / pulse) and only swap the text node.
 */

/** Default time Step 1 stays on screen before fading toward Step 2. */
export const STEP_ONE_DURATION_MS = 2000
/** Opacity fade duration; kept within the 300–500ms "premium feel" range. */
export const FADE_DURATION_MS = 400

/**
 * Remembers the last phrase served for a given list so consecutive loads don't
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

type Phase = "step1" | "step2"

export function ConsultingPhasesText({
    step1Phrases,
    step2Phrases,
    fallback = "",
    step1DurationMs = STEP_ONE_DURATION_MS,
    fadeDurationMs = FADE_DURATION_MS,
    className,
}: {
    step1Phrases: readonly string[]
    step2Phrases: readonly string[]
    /** Shown when a phrase list is empty (e.g. missing translations). */
    fallback?: string
    step1DurationMs?: number
    fadeDurationMs?: number
    className?: string
}) {
    // Pick once per mount so a new phrase is chosen every time a new message is
    // sent (the parent remounts this node for each loading session).
    const step1Text = useMemo(
        () => pickRandomPhrase(step1Phrases) ?? fallback,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    )
    const step2Text = useMemo(
        () => pickRandomPhrase(step2Phrases) ?? fallback,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    )

    const [phase, setPhase] = useState<Phase>("step1")
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        // Fade Step 1 out near the end of its window...
        const fadeOutTimer = window.setTimeout(() => {
            setVisible(false)
        }, step1DurationMs)

        // ...then swap to Step 2 and fade it back in once the fade-out lands.
        const swapTimer = window.setTimeout(() => {
            setPhase("step2")
            setVisible(true)
        }, step1DurationMs + fadeDurationMs)

        return () => {
            window.clearTimeout(fadeOutTimer)
            window.clearTimeout(swapTimer)
        }
    }, [step1DurationMs, fadeDurationMs])

    const text = phase === "step2" ? step2Text : step1Text

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
