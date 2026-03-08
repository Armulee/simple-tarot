"use client"

import type { TarotCard } from "@/contexts/tarot-context"
import type {
    HoroscopeBirthData,
    HoroscopeTransitData,
} from "@/types/horoscope"
import type { ConversationContextPayload } from "@/lib/astrology/question-context"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"

export type AspectInsightItem = {
    aspectKey: string
    keyword: string
    sentiment: "good" | "bad" | "neutral"
    insight?: string
}

export type SourceAspectEvent = {
    aspectKey: string
    transitPlanet: string
    natalPlanet: string
    aspectType: string
    keyword?: string
    sentiment?: "good" | "bad" | "neutral"
    orb?: number
    transitPositionText?: string
    natalPositionText?: string
    transitAbsoluteText?: string
    natalAbsoluteText?: string
}

export type ChatMessage = {
    id: string
    role: "user" | "assistant"
    text: string
    variant?: "plain" | "box" | "horoscope" | "tool"
    cards?: TarotCard[]
    insights?: string[]
    cardMeanings?: string[]
    isLoading?: boolean
    question?: string
    spreadType?: ChatDecision["spreadType"] | null
    aspectInsights?: AspectInsightItem[]
    followUpConclusion?: string
    followUpSuggestions?: string[]
    followUpLoading?: boolean
    toolType?: "user-date-form" | "transit-date-form"
    toolBirthPrefill?: HoroscopeBirthData | null
    /** True when form was shown after user clicked loading to cancel */
    toolFromCancel?: boolean
    toolTransitPrefill?: HoroscopeTransitData | null
    /** Raw Swiss Ephemeris chart data passed to the AI for interpretation */
    chartData?: Record<string, unknown> | null
    /** Personalized transit aspects extracted from chartData for UI usage */
    personalizedTransitAspects?: PersonalizedTransitAspectsResult | null
    /** Stream-merged subset of personalized transit aspects discussed by AI text */
    personalizedTransitAspectsMerged?: PersonalizedTransitAspectsResult | null
    /** AI-generated meanings for planets relevant to the question */
    planetMeanings?: Record<string, string> | null
    /** AI-generated meanings for houses relevant to the question */
    houseMeanings?: Record<string, string> | null
    /** Birth data for loading horoscope (used for display and cancel) */
    horoscopeBirthData?: HoroscopeBirthData | null
    /** Aspect key that triggered this message via "Ask more" */
    sourceAspectKey?: string
    /** Event data for rendering a compact card at the top of the response */
    sourceAspectEvent?: SourceAspectEvent
    /** Cached interpretations per astrology system for instant restore when switching back */
    interpretationCache?: Record<
        string,
        {
            chartData: Record<string, unknown>
            text: string
            aspectInsights?: AspectInsightItem[]
            personalizedTransitAspects?: PersonalizedTransitAspectsResult | null
            personalizedTransitAspectsMerged?: PersonalizedTransitAspectsResult | null
            followUpConclusion?: string
            followUpSuggestions?: string[]
        }
    >
}

export type ChatDecision = {
    type: "chat" | "draw" | "horoscope"
    spreadType?: string
    cardCount?: number
    assistantText: string
    /** True if the user's message is directly related to the last message (follow-up) */
    isFollowUp?: boolean
}

export type HoroscopeExtractResponse = {
    birthDate?: {
        day?: number | null
        month?: number | null
        year?: number | null
    }
    birthTime?: {
        hour?: number | null
        minute?: number | null
        timeHint?: "day" | "night" | "unknown"
    }
    location?: {
        timezone?: number | null
        lat?: number | null
        lng?: number | null
        country?: string | null
        state?: string | null
        usedLocationFallback?: boolean
    }
    systemPreference?:
        | "western_tropical"
        | "vedic_sidereal"
        | "both"
        | "unknown"
    transit?: {
        mentioned?: boolean
        day?: number | null
        month?: number | null
        year?: number | null
    }
    readiness?: {
        hasDate?: boolean
        hasTime?: boolean
        hasLocation?: boolean
        readyForCalculation?: boolean
        missingFields?: string[]
    }
}

export type ChatSessionPayload = {
    id: string
    question: string
    messages: ChatMessage[]
    decision: ChatDecision | null
    owner_user_id?: string | null
    showInsufficientStars?: boolean
    showCardDraw?: boolean
}

export type ConversationContext = ConversationContextPayload

export type CardUiText = {
    selected: (selectedCount: number, cardsToSelect: number) => string
    consumeStar: string
    shuffle: string
    pick: string
    swipe: string
    drawCta: (cardsToSelect: number) => string
    topUpCta: (cardsToSelect: number) => string
    pickAllCta: () => string
    pickAllPlaceholder: string
}
