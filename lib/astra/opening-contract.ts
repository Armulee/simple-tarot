/**
 * Shape of the opening turn, shared by the server that composes it and the
 * client that plays it out bubble by bubble.
 */

import type { ChartElement, ThaiStar } from "@/lib/astra/thai-astrology"

export type AstraBubble = {
    /** Stable id so a replay never duplicates a bubble already on screen. */
    id: string
    text: string
    /** How long she "types" before this bubble lands. */
    typingMs: number
}

export type AstraQuickReply = {
    id: string
    label: string
}

/** What the reading was computed from — surfaced later by the proof sheet. */
export type AstraReadingBasis = {
    /** Deterministic id for this opening: same person, same day, same read. */
    answerId: string
    seed: string
    computedAtIso: string
    birthTimeKnown: boolean
    dayStar: ThaiStar
    ageStar: ThaiStar
    ageFrom: number
    ageTo: number
    age: number
    missingElement: ChartElement | null
    lagnaSign: string | null
    lagnaDegree: number | null
    ayanamsa: number | null
    system: "vedic_sidereal"
}

export type AstraOpeningStage = "ask_birth" | "cold_read" | "follow_up"

export type AstraOpeningPayload = {
    stage: AstraOpeningStage
    bubbles: AstraBubble[]
    /** Tap answers offered above the composer once she stops speaking. */
    quickReplies: AstraQuickReply[]
    basis: AstraReadingBasis | null
    /**
     * Set when she is opening by asking how an earlier forecast turned out.
     * The tap answers record the outcome instead of sending a message.
     */
    followUpPredictionId: string | null
}

/**
 * How long she takes before a bubble appears. Long lines take longer, but the
 * wait is capped — a fortune teller pauses, she does not stall.
 */
export function typingMsForText(text: string): number {
    return Math.min(2200, Math.max(650, 380 + text.length * 22))
}
