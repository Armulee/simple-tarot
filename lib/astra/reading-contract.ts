import type { AstraGuardrail, AstraIntent, AstraTopic } from "@/lib/astra/intent"
import type {
    AstraBubble,
    AstraQuickReply,
} from "@/lib/astra/opening-contract"

/**
 * What a routed reading looks like on the wire.
 *
 * `basis` carries the computed values the answer was built from — the proof
 * layer reads it, and it is what makes "she used the stars" checkable rather
 * than claimed.
 */

export type AstraReadingSource = {
    /** Which craft answered. */
    intent: AstraIntent
    topic: AstraTopic
    /** Same person, same question, same day → same id. */
    answerId: string
    seed: string
    computedAtIso: string
    /** Short label for the "see where this came from" link. */
    label: string
    /** The engine's own output, untouched. */
    values: Record<string, unknown>
}

export type AstraPredictionNote = {
    /** The day she will come back and ask how it went. */
    dueDateIso: string
}

export type AstraReadingResponse =
    | {
          kind: "reading"
          bubbles: AstraBubble[]
          source: AstraReadingSource
          guardrail: AstraGuardrail | null
          prediction: AstraPredictionNote | null
      }
    /** An explicit tarot request: the existing draw flow answers it. */
    | { kind: "tarot" }
    /**
     * Nothing in the message to read. She asks one question back — and offers
     * the answers as chips, so the ask-back is never a dead end.
     */
    | {
          kind: "unsure"
          bubbles: AstraBubble[]
          quickReplies: AstraQuickReply[]
      }
    /** No birth details yet, so the intake has to run first. */
    | { kind: "needs_birth" }
