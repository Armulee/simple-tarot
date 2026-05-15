"use client"

import type { TarotCard } from "@/contexts/tarot-context"
import type {
    HoroscopeBirthData,
    HoroscopeTransitData,
} from "@/types/horoscope"
import type { PromptRedactionType } from "@/lib/privacy/prompt-redaction"
import type { ConversationContextPayload } from "@/lib/astrology/question-context"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"
import type { QuestionDomain } from "@/lib/chat/situation-schema"
import type {
    SupportBlockKind,
    SupportTopic,
} from "@/lib/chat/support-topics"

export type AspectInsightItem = {
    aspectKey: string
    keyword: string
    sentiment: "good" | "bad" | "neutral"
    insight?: string
    impact?: string
    intensity?: "low" | "medium" | "high"
}

export type RelevanceStat = {
    label: string
    pct: number
}

export type DailyVerdict = {
    mood: "good" | "caution" | "rest"
    headline: string
    subtext: string
    actions: string[]
    watchOut?: string
    focusArea?: string
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

export type PerCardSentence = {
    cardName: string
    sentence: string
}

export type ChatMessage = {
    id: string
    role: "user" | "assistant"
    text: string
    /** Client-only raw text restored from sessionStorage for local display. */
    displayText?: string
    keyMessage?: string
    /** New tarot result schema: short verdict shown as the largest text. */
    headline?: string
    /** New tarot result schema: nuance / condition under the headline. */
    subtitle?: string
    /** New tarot result schema: per-card breakdown rendered as the chip list. */
    perCard?: PerCardSentence[]
    /** New tarot result schema: soft, non-commanding next step. */
    nextStep?: string
    variant?: "plain" | "box" | "horoscope" | "tool"
    cards?: TarotCard[]
    insights?: string[]
    /**
     * AI-generated, decoration-rich HTML fragment that magnifies the key
     * takeaways of a tarot reading. Rendered at the very top of the assistant
     * message (above the "card says" section) and sanitized before display.
     */
    detailedHtml?: string
    cardMeanings?: string[]
    isLoading?: boolean
    spreadType?: ChatDecision["spreadType"] | null
    aspectInsights?: AspectInsightItem[]
    relevance?: RelevanceStat[]
    /** Single-day verdict, populated only when questionRange.durationDays === 1 */
    dailyVerdict?: DailyVerdict | null
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
    /** From /api/situation: whether the question touches legal / medical / financial advice. */
    questionDomain?: QuestionDomain
    /** Sanitized question persisted for assistant messages. */
    question?: string
    /** Client-only raw question restored from sessionStorage for local display. */
    displayQuestion?: string
    /** Pointer to the local-only raw prompt in sessionStorage. */
    privacyStorageKey?: string
    /** Pointer used to restore the raw source question for assistant UI. */
    questionPrivacyStorageKey?: string
    /** True while client-side PII sanitisation is in flight for this message. */
    isSanitizing?: boolean
    /** Indicates that identifiers were redacted before send/persist. */
    privacyRedacted?: boolean
    /** Placeholder categories that were applied to the prompt. */
    privacyRedactionTypes?: PromptRedactionType[]
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
            relevance?: RelevanceStat[]
            dailyVerdict?: DailyVerdict | null
            personalizedTransitAspects?: PersonalizedTransitAspectsResult | null
            personalizedTransitAspectsMerged?: PersonalizedTransitAspectsResult | null
            followUpConclusion?: string
            followUpSuggestions?: string[]
            headline?: string
            subtitle?: string
            perCard?: PerCardSentence[]
            nextStep?: string
        }
    >
    /** True when a stream was manually stopped and partial text should be preserved */
    streamStopped?: boolean
    /** Topic resolved for support-mode replies, used by SupportBlock rendering. */
    supportTopic?: SupportTopic
    /** Concrete data the support tool block needs to render. */
    supportBlock?: SupportBlockPayload | null
}

export type ChatDecision = {
    type: "chat" | "draw" | "horoscope" | "support"
    spreadType?: string
    cardCount?: number
    spreadReason?: string
    assistantText?: string
    /** True if the user's message is directly related to the last message (follow-up) */
    isFollowUp?: boolean
    /** When type === "support": which tool block to render. */
    supportTopic?: SupportTopic
    /** When supportTopic === "tarot-card": canonical card slug. */
    supportCardSlug?: string
}

/**
 * Concrete payload consumed by the SupportBlock renderer in the chat. The
 * decision route returns a `supportTopic`; the chat session resolves it into
 * one of these payload shapes before persisting on the assistant message.
 */
export type SupportBlockPayload =
    | {
          kind: "plan"
          topic: SupportTopic
          href: string
          title: string
          description: string
      }
    | {
          kind: "star-packs"
          topic: SupportTopic
          href: string
          title: string
          description: string
      }
    | {
          kind: "contact"
          topic: SupportTopic
          href: string
          title: string
          description: string
      }
    | {
          kind: "tarot-card"
          topic: SupportTopic
          href: string
          title: string
          description: string
          cardSlug: string
          cardName: string
          arcana: "major" | "minor"
          suit: "wands" | "cups" | "swords" | "pentacles" | null
          uprightKeywords: string[]
          reversedKeywords: string[]
      }
    | {
          kind: "article"
          topic: SupportTopic
          href: string
          title: string
          description: string
          iconId?: string
      }
    | {
          kind: "page"
          topic: SupportTopic
          href: string
          title: string
          description: string
          iconId?: string
      }

export type SupportBlockPayloadKind = SupportBlockKind

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
    displayQuestion?: string
    questionPrivacyStorageKey?: string
    privacyRedacted?: boolean
    privacyRedactionTypes?: PromptRedactionType[]
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
    cardCount: (cardsToSelect: number) => string
    decreaseCardCount: string
    increaseCardCount: string
    swipe: string
    drawCta: (cardsToSelect: number) => string
    topUpCta: (cardsToSelect: number) => string
    pickAllCta: () => string
    pickAllPlaceholder: string
}
