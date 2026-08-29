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

/**
 * How much she was actually given to work with.
 *
 * `READ` — they told her enough that the computed values bear on the question,
 * so she commits. `PROBE` — they named a subject but not the substance of it,
 * so she guesses the shape from the chart and asks them to fill it in; a
 * verdict here would be invented. `TALK` — they are speaking to her, not
 * asking about their life, and the chart has no business in the answer.
 */
export const ASTRA_REGISTERS = ["READ", "PROBE", "TALK"] as const
export type AstraRegister = (typeof ASTRA_REGISTERS)[number]

export type AstraReadingSource = {
    /** Which craft answered. */
    intent: AstraIntent
    /** READ or PROBE — TALK never carries a source. */
    register: Exclude<AstraRegister, "TALK">
    /**
     * Whether asking this again today replays this same answer. Only a
     * committed reading is written down and replayed; a probe is a live
     * conversation and must be free to move when they say more.
     */
    replayable: boolean
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
     * They were talking to her, not asking about their life. She answers as a
     * person: no chart, no verdict, no date, and nothing written down.
     */
    | { kind: "talk"; bubbles: AstraBubble[] }
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
