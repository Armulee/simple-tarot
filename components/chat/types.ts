"use client"

import type { TarotCard } from "@/contexts/tarot-context"
import type { HoroscopeBirthData } from "@/types/horoscope"
import type { PromptRedactionType } from "@/lib/privacy/prompt-redaction"
import type { ConversationContextPayload } from "@/lib/astrology/question-context"
import type { OriginContext } from "@/lib/chat/origin-context"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"
import type { ReplyStrategy } from "@/lib/astrology/question-intent"
import type { QuestionDomain } from "@/lib/chat/situation-schema"
import type {
    SupportBlockKind,
    SupportTopic,
} from "@/lib/chat/support-topics"
import type { GeneralReply } from "@/lib/chat/general-reply-schema"

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
    detailedHtml: string
    watchOut?: string
    focusArea?: string
    /**
     * Short AI-generated tagline (2-6 words) shown in the verdict mood pill
     * directly under `headline`. Replaces the previous translated template
     * label ("Good Day" / "Be Mindful" / "Rest Day") so the pill stays
     * meaningful for natal questions that aren't bound to a date.
     */
    moodSubtitle?: string
    keyMessage?: {
        headline: string
        subtitle: string
    }
    /**
     * Verdict flavor.
     *   "daily"     — transit-driven single-day verdict.
     *   "natal"     — birth-chart verdict for timeless questions ("Which
     *                 career fits me?").
     *   "timing"    — forward-looking transit search for "when will X
     *                 happen?" questions; carries the peak window in
     *                 `timingWindow`.
     *   "technical" — planetary-mechanics verdict ("when will Jupiter
     *                 become exalted?", "is Mars retrograde?"). Spotlight
     *                 reads CURRENT transit positions instead of natal.
     */
    mode?: "daily" | "natal" | "timing" | "technical"
    /**
     * Natal-mode only. 1-4 birth-chart placements (canonical English planet
     * keys) the verdict is built on, each with a short plain-language reason.
     * Used to render the natal spotlight strip inside the verdict hero.
     */
    relevantPlanets?: NatalRelevantPlanet[]
    /**
     * Timing-mode only. The peak date or short window the AI picked for a
     * "when will X happen?" question. Rendered in the hero crest in place
     * of the mood icon. Always validated server-side against the forward
     * search window before being attached to the verdict.
     */
    timingWindow?: {
        startDateIso: string
        endDateIso: string
    }
    /**
     * Technical-mode only. The date the AI picked for the orbit visual to
     * anchor on — typically a future ingress / retrograde station, or a
     * past event when the question is retrospective. Omitted for current-
     * state ("Where is Saturn now?") and influence questions ("How does
     * Saturn affect me?"), where today's chart is already the right
     * answer. When set, the verdict route rebuilds chartData.transit for
     * this date so the orbit visual matches the user's question.
     */
    targetDateIso?: string
}

export type NatalRelevantPlanet = {
    /** Canonical English planet name (matches chartData.charts[0].planets key). */
    planet: string
    /** Short plain-language sentence explaining why this placement matters. */
    reason: string
}

export type PredictionTimelineSlot = {
    slotKey: string
    datetimeIso: string
    label: string
    mood: "good" | "caution" | "rest" | "mixed"
    title: string
    narrative: string
    focusArea?: string
    tags?: string[]
}

export type PredictionTimeline = {
    granularity: "hourly" | "daily"
    slots: PredictionTimelineSlot[]
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
    /**
     * Snapshot of the session's originContext at the moment this message
     * was submitted. Lets MessageList render a per-message context chip
     * (e.g. the calendar-day pill) above the bubble so the viewer sees
     * which date the question was read for, even after subsequent days
     * have been selected.
     */
    originContextSnapshot?: OriginContext | null
    /**
     * For tool-render assistant messages (e.g. `horoscope-calendar`),
     * the language the response should be displayed in — derived from
     * the triggering user message's text via detectInputLanguage so the
     * chips, intro, and follow-up sentence match what the user wrote
     * regardless of the app's UI locale.
     */
    responseLocale?: "en" | "th" | "lo"
    variant?:
        | "plain"
        | "box"
        | "horoscope"
        | "horoscope-calendar"
        | "paywall"
        | "oracle"
    /**
     * Streamed oracle-mode reading. Populated on assistant messages
     * with `variant === "oracle"`. The renderer is `OracleHero`.
     */
    oracleReading?: import("@/lib/chat/oracle-reading-schema").StreamingOracleReading | null
    /**
     * Reply strategy resolved by /api/horoscope/extract. Drives which
     * downstream route renders the reading and which tabs the
     * HoroscopeReadingTabs surfaces (natal mode vs transit mode).
     */
    replyStrategy?: ReplyStrategy
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
    /**
     * Which AI workflow step a still-loading assistant message is in:
     * `"deciding"` while the chat-decision API call is in flight, then
     * `"interpreting"` once a decision is resolved and the interpretation/
     * response call begins. Drives the two-step loading phrases.
     */
    loadingStage?: "deciding" | "interpreting"
    /** The user's question for this loading session, used to make Step 1 (decision) phrases reflect what was actually asked. */
    loadingQuestion?: string
    /** Resolved decision metadata, used to make Step 2 (interpretation) phrases reflect the actual response type and reasoning. */
    loadingDecision?: {
        type?: "chat" | "draw" | "horoscope" | "support" | "oracle"
        spreadType?: string | null
        spreadReason?: string | null
    }
    spreadType?: ChatDecision["spreadType"] | null
    aspectInsights?: AspectInsightItem[]
    relevance?: RelevanceStat[]
    /** Single-day verdict, populated only when questionRange.durationDays === 1 */
    dailyVerdict?: DailyVerdict | null
    /**
     * Predictive timeline (hourly or daily) populated only when the question is
     * a "what will happen" style ask. Streams in parallel with the main
     * interpretation and renders inside the Overview tab.
     */
    timeline?: PredictionTimeline | null
    followUpConclusion?: string
    followUpSuggestions?: string[]
    followUpLoading?: boolean
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
    /**
     * When the asker (paid) included a 3rd party's birth in the chat
     * (e.g. "วันนี้จะเป็นยังไงสำหรับคนที่เกิด 17 กค 2545"), the reading
     * runs on THAT person's chart. We carry the resolved DOB and the
     * optional name here so the assistant bubble can show a "Reading for…"
     * badge above the verdict.
     */
    horoscopeForOtherPerson?: {
        name?: string | null
        relationshipHint?: string | null
        birthDate: { day: number; month: number; year: number }
    } | null
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
            timeline?: PredictionTimeline | null
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
    /**
     * Set when the AI classified the question as horoscope but the visitor is
     * not signed in. The chat renders an inline sign-in CTA and a sample
     * tarot card instead of streaming a normal assistant reply.
     */
    horoscopeAuthGate?: HoroscopeAuthGate | null
    /**
     * Set when /api/horoscope/extract gates the question behind a paid plan
     * (e.g. asking about another person's chart on the free tier). The chat
     * renders a red error badge instead of running the interpretation.
     */
    paywall?: PaywallNotice | null
    /**
     * Structured "inner energy reflection" payload streamed from
     * /api/chat/general for general (chat) replies. When set, the message is
     * rendered with the symbolic InnerEnergyHero instead of a plain text bubble
     * so the general strategy feels emotionally immersive instead of a weak
     * fallback. Null/undefined for bridge messages (draw / horoscope / support).
     */
    generalReply?: GeneralReply | null
}

export type PaywallNotice = {
    reason: "other_person"
    requiredTier: "basic" | "pro"
}

export type HoroscopeAuthGate = {
    /** Localized sign-in link, e.g. `/signin?callbackUrl=/`. */
    signInHref: string
    /** Question the user asked, replayed if they choose the tarot fallback. */
    question: string
    /** Display name for the teaser tarot card (e.g. "The Star"). */
    cardName: string
    /** Kebab-case slug used to resolve the rider-waite image path. */
    cardSlug: string
    /** Whether the teaser card should render reversed. */
    cardIsReversed: boolean
}

export type ChatDecision = {
    type: "chat" | "draw" | "horoscope" | "support" | "oracle"
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
    /**
     * When type === "horoscope" and horoscopeMode === "calendar", the
     * assistant turn renders the interactive horoscope calendar tool
     * instead of an immediate streamed reading. No stars are spent for
     * this turn; the follow-up reading triggered by a chip click is what
     * counts.
     */
    horoscopeMode?: "calendar"
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
    | {
          kind: "calendar-year"
          topic: SupportTopic
          href: string
          title: string
          description: string
          /** Year shown in the inline preview (defaults to current year on the client). */
          year: number
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
    originContext?: OriginContext | null
    owner_user_id?: string | null
    showInsufficientStars?: boolean
    showCardDraw?: boolean
    /**
     * Server-side check: did this device create the session? Used to grant
     * compose access to anonymous owners (the original creator's device).
     */
    youAreCreatorDevice?: boolean
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
