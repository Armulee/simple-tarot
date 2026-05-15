"use client"

import { useEffect, useMemo, useState } from "react"
import { SensitiveDomainAdviceBadge } from "@/components/chat/sensitive-domain-advice-badge"
import { CardImage } from "@/components/card-image"
import ShareSection from "@/components/tarot/interpretation/share"
import { InterpretationHeaderBar } from "@/components/chat/interpretation-header-bar"
import type { ChatMessage } from "@/components/chat/types"
import { LoadingDotsText } from "@/components/chat/loading-dots-text"
import { PrivacyDetailedHtml } from "@/components/chat/privacy/privacy-detailed-html"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import {
    applyAliasesToText,
    type PromptAliasEntry,
} from "@/lib/privacy/prompt-redaction"
import { cn } from "@/lib/utils"
import { isSensitiveQuestionDomain } from "@/lib/chat/situation-schema"
import { useTranslations } from "next-intl"
import { Loader2, Share } from "lucide-react"

const INTERPRETATION_FILLER_PREFIXES = [
    /^(?:i\s+(?:feel|sense|believe|think)\s+(?:that\s+)*)/i,
    /^(?:it\s+(?:feels|seems|looks)\s+like\s+)/i,
    /^(?:for\s+(?:this|the)\s+(?:project|reading|situation|question|matter)\s*,?\s*)/i,
    /^(?:the\s+cards?\s+(?:show|suggest|indicate|reveal)\s+(?:that\s+)*)/i,
    /^(?:this\s+(?:reading|spread)\s+(?:shows|suggests|reveals)\s+(?:that\s+)*)/i,
]

function stripMarkdownFormatting(text: string): string {
    return text.replace(/\*\*/g, "").replace(/`/g, "").trim()
}

function capitalizeFirstCharacter(text: string): string {
    if (!text) return text
    return text.charAt(0).toUpperCase() + text.slice(1)
}

function trimInterpretationLead(paragraph: string): string {
    let cleaned = paragraph.trim()
    let changed = true

    while (changed) {
        changed = false
        for (const pattern of INTERPRETATION_FILLER_PREFIXES) {
            const next = cleaned.replace(pattern, "").trim()
            if (next !== cleaned) {
                cleaned = next
                changed = true
            }
        }
    }

    return capitalizeFirstCharacter(cleaned)
}

function splitIntoSentences(text: string): string[] {
    const normalized = stripMarkdownFormatting(text).replace(/\s+/g, " ").trim()
    if (!normalized) return []

    const matches = normalized.match(/[^.!?\n]+(?:[.!?]+|$)/g)
    return (matches ?? [normalized])
        .map((sentence) => sentence.trim())
        .filter(Boolean)
}

function normalizeComparisonText(text: string): string {
    return stripMarkdownFormatting(text)
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
}

/**
 * Legacy fallback only — runs for restored messages that have no `perCard`
 * field (saved before the schema refactor). New messages use the chip list.
 */
function formatInterpretationBody(text: string, question?: string): string[] {
    const normalized = text.replace(/\r\n/g, "\n").trim()
    if (!normalized) {
        return []
    }

    const baseParagraphs = normalized
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)

    const cleanedParagraphs = (
        baseParagraphs.length > 0 ? baseParagraphs : [normalized]
    )
        .map((paragraph, index) =>
            index === 0 ? trimInterpretationLead(paragraph) : paragraph.trim(),
        )
        .filter(Boolean)

    const allSentences = cleanedParagraphs.flatMap((paragraph) =>
        splitIntoSentences(paragraph),
    )
    const normalizedQuestion = normalizeComparisonText(question ?? "")
    const filteredSentences =
        normalizedQuestion.length > 12
            ? allSentences.filter((sentence) => {
                  const normalizedSentence = normalizeComparisonText(sentence)
                  return !normalizedSentence.includes(normalizedQuestion)
              })
            : allSentences
    const sentencesToShow = (
        filteredSentences.length > 0 ? filteredSentences : allSentences
    )
        .slice(0, 2)
        .filter(Boolean)

    if (sentencesToShow.length > 0) {
        return [sentencesToShow.join(" ")]
    }

    return cleanedParagraphs.slice(0, 1)
}

/** Stable fallback so `privacyAliases ?? …` does not allocate a new `[]` each render. */
const EMPTY_PRIVACY_ALIASES: PromptAliasEntry[] = []

export type TarotAssistantInterpretationProps = {
    message: ChatMessage
    messages: ChatMessage[]
    messageIndex: number
    consultingBase: string
    positionMeanings: Record<string, string[]>
    messageNotices: Record<string, string>
    onRegenerateTarot?: (messageId: string) => void
    onTarotInterpretationChange?: (messageId: string, text: string) => void
    onShare: (id: string, text: string) => void
    /**
     * Replaces session-scoped privacy placeholders (e.g. `[Person_0]`) with the
     * original PII the user typed, for every user-facing render and share.
     */
    unmask: (text?: string | null) => string
    /**
     * Session-scoped alias map used by {@link PrivacyHighlightedText} to render
     * resolved PII as emerald lock chips with the masked sentence in the
     * tooltip.
     */
    privacyAliases?: PromptAliasEntry[]
}

/**
 * Tarot card hero + AI interpretation (box variant): headline/subtitle box,
 * fanned hero card with active-card sync, per-card chip list,
 * up to four follow-up suggestion chips. Internal card markup (number badge, tag label,
 * name pill, italic quote) is preserved byte-for-byte; only the layout
 * wrappers around it change.
 */
export function TarotAssistantInterpretation({
    message,
    messages,
    messageIndex,
    consultingBase,
    positionMeanings,
    messageNotices,
    onRegenerateTarot,
    onTarotInterpretationChange,
    onShare,
    unmask,
    privacyAliases,
}: TarotAssistantInterpretationProps) {
    const tReading = useTranslations("ReadingPage.interpretation")

    const aliases = privacyAliases ?? EMPTY_PRIVACY_ALIASES
    const rawMessageText = message.text || ""
    const unmaskedMessageText = unmask(rawMessageText)
    const unmaskedKeyMessage = unmask(message.keyMessage)
    const unmaskedQuestion = unmask(message.question)
    const unmaskedHeadline = unmask(message.headline)
    const unmaskedSubtitle = unmask(message.subtitle)
    // Re-mask the question for the legacy paragraph filter so placeholder
    // tokens still match in the saved text.
    const maskedQuestionForFilter = applyAliasesToText(
        unmaskedQuestion ?? "",
        aliases,
    )

    const cards = message.cards ?? []
    const cardCount = cards.length
    const isMultiCard = cardCount > 1

    const [activeCardIndex, setActiveCardIndex] = useState(0)
    useEffect(() => {
        // Snap back to first card whenever the underlying spread changes
        // (e.g. when a new message streams or regenerate runs).
        setActiveCardIndex(0)
    }, [cardCount, message.id])
    const safeActiveIndex =
        cardCount > 0
            ? Math.min(Math.max(activeCardIndex, 0), cardCount - 1)
            : 0
    const activeCard = cards[safeActiveIndex]

    let spreadKey = "simple"
    if (cardCount === 1) spreadKey = "simple"
    else if (cardCount === 3) spreadKey = "general"
    else if (cardCount === 5) spreadKey = "detailed"
    else if (cardCount === 7) spreadKey = "expanded"
    else if (cardCount === 10) spreadKey = "celtic"
    else spreadKey = "unknown"

    const activeLabel =
        spreadKey !== "unknown"
            ? positionMeanings[spreadKey]?.[safeActiveIndex]
            : `Card ${safeActiveIndex + 1}`

    /** Any streamed token from the interpretation object (body or summary). */
    const hasInterpretationStream =
        Boolean(rawMessageText.trim()) ||
        Boolean(message.keyMessage?.trim()) ||
        Boolean(message.headline?.trim())

    /**
     * Streaming progress signals — the schema emits cardInsights → headline →
     * subtitle → keyMessage → detailedHtml → perCard → nextStep → keywords →
     * interpretation → conclusion → suggestions (declaration order in
     * `lib/tarot/schema.ts`), so each later field arriving means the
     * previous section is done.
     */
    const cardInsightsStreamingDone =
        !message.isLoading ||
        Boolean(message.headline?.trim()) ||
        Boolean(message.keyMessage?.trim())
    const interpretationBodyStreamingDone =
        !message.isLoading ||
        Boolean(message.followUpConclusion?.trim()) ||
        Boolean(message.nextStep?.trim())

    // Headline takes priority when it exists; legacy messages fall back to
    // keyMessage rendered headline-style at the same large size.
    const headlineText = unmaskedHeadline?.trim() || ""
    const subtitleText = unmaskedSubtitle?.trim() || ""
    const fallbackKeyMessage = unmaskedKeyMessage?.trim() || ""
    const showHeadlineBox =
        message.variant === "box" &&
        (Boolean(headlineText) ||
            (message.isLoading && Boolean(message.keyMessage?.trim())) ||
            // Legacy: only render when keyMessage is meaningfully different
            // from the body, matching the prior `shouldShowKeyMessage` gate.
            (Boolean(fallbackKeyMessage) &&
                normalizeComparisonText(fallbackKeyMessage) !==
                    normalizeComparisonText(unmaskedMessageText)))

    const showSensitiveDomainWarning = isSensitiveQuestionDomain(
        message.questionDomain,
    )

    const perCardItems = useMemo(() => {
        if (!Array.isArray(message.perCard)) return []
        return message.perCard.filter(
            (item): item is { cardName: string; sentence: string } =>
                Boolean(item?.cardName?.trim() && item?.sentence?.trim()),
        )
    }, [message.perCard])
    const hasPerCard = perCardItems.length > 0

    const hasDetailedHtmlBlock = Boolean(
        message.detailedHtml && message.detailedHtml.trim(),
    )

    const formattedTarotInterpretationLegacy =
        message.variant === "box" && !hasPerCard
            ? formatInterpretationBody(rawMessageText, maskedQuestionForFilter)
            : []

    const tarotShareText =
        message.variant === "box"
            ? [
                  unmaskedQuestion?.trim(),
                  headlineText || fallbackKeyMessage,
                  subtitleText,
                  hasPerCard
                      ? perCardItems
                            .map((p) => `${p.cardName}: ${unmask(p.sentence)}`)
                            .join("\n")
                      : unmaskedMessageText.trim(),
              ]
                  .filter((s): s is string => Boolean(s && s.trim()))
                  .join("\n\n")
            : ""

    // B. Hero card area: enlarged centered card with a soft purple halo.
    // Multi-card spreads fan around the active card; tapping a card lifts
    // and scales it. The internal markup (number badge, tag label, name
    // pill, italic "card say" quote) is unchanged byte-for-byte — only its
    // position in the box-variant layout changes (it now sits between the
    // key-message + detailed block above it and the perCard list below it).
    const heroCardSection =
        cardCount > 0 && activeCard ? (
            <div className='w-full md:max-w-[85%]'>
                <div className='relative mx-auto flex w-full max-w-md flex-col items-center px-2 py-6'>
                    <div
                        aria-hidden
                        className='pointer-events-none absolute left-1/2 top-[120px] -z-10 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#a78bfa]/25 blur-3xl'
                    />

                    {isMultiCard ? (
                        <div className='relative flex h-[300px] w-full items-end justify-center'>
                            {cards.map((card, index) => {
                                const offsetFromActive = index - safeActiveIndex
                                const isActive = index === safeActiveIndex
                                const rotateDeg = offsetFromActive * 8
                                const translateXPx = offsetFromActive * 56
                                const translateYPx = isActive
                                    ? -10
                                    : Math.abs(offsetFromActive) * 8
                                const scale = isActive ? 1.06 : 0.92
                                const zIndex = isActive
                                    ? 30
                                    : 20 - Math.abs(offsetFromActive)
                                return (
                                    <button
                                        key={`${message.id}-card-${card.id}-${index}`}
                                        type='button'
                                        onClick={() =>
                                            setActiveCardIndex(index)
                                        }
                                        aria-label={`Card ${index + 1}: ${card.meaning}`}
                                        aria-pressed={isActive}
                                        className='absolute bottom-0 left-1/2 -translate-x-1/2 outline-none transition-transform duration-300 ease-out focus-visible:ring-2 focus-visible:ring-[#a78bfa]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
                                        style={{
                                            transform: `translate(calc(-50% + ${translateXPx}px), ${translateYPx}px) rotate(${rotateDeg}deg) scale(${scale})`,
                                            zIndex,
                                        }}
                                    >
                                        <div className='w-36 sm:w-40 rounded-xl overflow-hidden border border-white/10 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)]'>
                                            <CardImage
                                                card={card}
                                                size='lg'
                                                showAura={false}
                                                showLabel={false}
                                            />
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    ) : (
                        <div className='w-fit rounded-2xl overflow-hidden border border-white/10 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.6)]'>
                            <CardImage
                                card={activeCard}
                                size='lg'
                                showAura={false}
                                showLabel={false}
                            />
                        </div>
                    )}

                    {/* Internal card markup — unchanged tag label,
                            name pill, italic quote — for the active card,
                            stacked vertically and centered. */}
                    <div className='mt-6 flex w-full flex-col items-center text-center'>
                        <div className='relative flex flex-col items-center'>
                            <p className='text-xs tracking-widest text-white/50 uppercase mb-1 opacity-80'>
                                {activeLabel}
                            </p>

                            <span>{activeCard.meaning}</span>
                        </div>
                        <div className='mt-3 w-fit max-w-md rounded-xl border-l-2 border-indigo-300/60 bg-indigo-400/[0.04] py-2 pr-3 pl-4 animate-fade-in'>
                            <p className='text-[11px] font-serif italic leading-relaxed text-indigo-200/76'>
                                &ldquo;
                                {message.isLoading &&
                                !message.insights?.[safeActiveIndex] ? (
                                    <span className='inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-2 py-1 backdrop-blur-xl shadow-[0_0_12px_-3px_rgba(56,189,248,0.3)] text-[10px] font-medium text-white/90'>
                                        <Loader2 className='h-2.5 w-2.5 animate-spin shrink-0' />
                                        <LoadingDotsText
                                            active={
                                                !!(
                                                    message.isLoading &&
                                                    !message.insights?.[
                                                        safeActiveIndex
                                                    ]
                                                )
                                            }
                                            getText={(d) =>
                                                `${consultingBase}${".".repeat(d)}`
                                            }
                                        />
                                    </span>
                                ) : (
                                    <PrivacyHighlightedText
                                        text={
                                            message.insights?.[
                                                safeActiveIndex
                                            ]?.trim()
                                                ? message.insights[
                                                      safeActiveIndex
                                                  ]!
                                                : `${consultingBase}...`
                                        }
                                        aliases={aliases}
                                        supportMarkdown={false}
                                    />
                                )}
                                &rdquo;
                            </p>
                        </div>

                        {isMultiCard && (
                            <div
                                className='mt-4 flex items-center gap-1.5'
                                role='tablist'
                                aria-label='Card position'
                            >
                                {cards.map((card, index) => {
                                    const isActive = index === safeActiveIndex
                                    return (
                                        <button
                                            key={`${message.id}-dot-${card.id}-${index}`}
                                            type='button'
                                            role='tab'
                                            aria-selected={isActive}
                                            aria-label={`Show card ${index + 1}`}
                                            onClick={() =>
                                                setActiveCardIndex(index)
                                            }
                                            className={`h-1.5 rounded-full transition-all ${
                                                isActive
                                                    ? "w-5 bg-[#a78bfa]"
                                                    : "w-1.5 bg-white/30 hover:bg-white/50"
                                            }`}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ) : null

    return (
        <>
            {/* Hero card / "card say" section sits at the top of the
                assistant message for every variant (box or otherwise). */}
            {heroCardSection}

            {/* Box variant: tarot interpretation with cards, insights, actions, share */}
            {message.variant === "box" ? (
                <>
                    <div className='w-full md:max-w-[85%] space-y-6'>
                        <InterpretationHeaderBar
                            isLoading={!!message.isLoading}
                            showActions={cardInsightsStreamingDone}
                            question={unmaskedQuestion}
                            cards={message.cards?.map((card) => card.meaning)}
                            interpretation={unmaskedMessageText}
                            messageId={message.id}
                            readingId={message.id}
                            onRegenerateTarot={onRegenerateTarot}
                            insights={message.insights?.map((i) => unmask(i))}
                            conclusion={unmask(message.followUpConclusion)}
                            spreadType={message.spreadType ?? undefined}
                            cardsFull={message.cards}
                            assistantText={unmask(
                                messages
                                    .slice(0, messageIndex)
                                    .reverse()
                                    .find(
                                        (m) =>
                                            m.role === "assistant" &&
                                            m.variant === "plain",
                                    )?.text,
                            )}
                            onInterpretationChange={
                                onTarotInterpretationChange
                                    ? (text: string) =>
                                          onTarotInterpretationChange(
                                              message.id,
                                              text,
                                          )
                                    : undefined
                            }
                        />
                        {!message.isLoading && messageNotices[message.id] && (
                            <p className='-mt-3 text-right text-[11px] text-white/45'>
                                {messageNotices[message.id]}
                            </p>
                        )}
                        <div className='space-y-5 text-white/90 leading-relaxed'>
                            {message.isLoading && !hasInterpretationStream ? (
                                <span className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_-5px_rgba(56,189,248,0.3)] text-sm font-medium text-white/90'>
                                    <Loader2 className='h-4 w-4 animate-spin shrink-0' />
                                    <LoadingDotsText
                                        active={
                                            !!(
                                                message.isLoading &&
                                                !hasInterpretationStream
                                            )
                                        }
                                        getText={(d) =>
                                            `${consultingBase}${".".repeat(d)}`
                                        }
                                    />
                                </span>
                            ) : (
                                <>
                                    {/* A. Headline + subtitle box. The
                                        existing share button stays inline on
                                        the right exactly as before. */}
                                    {showHeadlineBox && (
                                        <div
                                            className={cn(
                                                "rounded-2xl border px-4 py-4 animate-fade-in",
                                                showSensitiveDomainWarning
                                                    ? "border-orange-400/35 bg-gradient-to-br from-amber-950/55 via-[#2a0f08]/75 to-rose-950/45 shadow-[0_12px_40px_-18px_rgba(251,113,133,0.35),0_8px_28px_-14px_rgba(245,158,11,0.28)] ring-1 ring-orange-500/15"
                                                    : "border-indigo-300/20 bg-indigo-400/[0.07] shadow-[0_8px_24px_-18px_rgba(129,140,248,0.75)]",
                                            )}
                                        >
                                            {showSensitiveDomainWarning && (
                                                <SensitiveDomainAdviceBadge className='mb-3' />
                                            )}
                                            <div className='flex items-start justify-between gap-3'>
                                                <div className='min-w-0 flex-1'>
                                                    <h2 className='text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-snug'>
                                                        <PrivacyHighlightedText
                                                            text={
                                                                headlineText ||
                                                                fallbackKeyMessage
                                                            }
                                                            aliases={aliases}
                                                            supportMarkdown
                                                        />
                                                    </h2>
                                                    {subtitleText && (
                                                        <p className='mt-2 text-sm sm:text-[15px] leading-6 text-white/65'>
                                                            <PrivacyHighlightedText
                                                                text={
                                                                    subtitleText
                                                                }
                                                                aliases={
                                                                    aliases
                                                                }
                                                                supportMarkdown
                                                            />
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={() =>
                                                        onShare(
                                                            message.id,
                                                            tarotShareText ||
                                                                unmaskedMessageText ||
                                                                "",
                                                        )
                                                    }
                                                    className='group relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl text-white shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)] transition hover:scale-105 hover:border-accent/40 hover:shadow-[0_12px_32px_-10px_rgba(139,92,246,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'
                                                    aria-label={tReading(
                                                        "actions.share",
                                                    )}
                                                    title={tReading(
                                                        "actions.share",
                                                    )}
                                                >
                                                    <span
                                                        aria-hidden
                                                        className='pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400/45 via-purple-400/45 to-cyan-400/45 opacity-80 transition group-hover:opacity-0'
                                                    />
                                                    <Share className='relative z-10 h-4.5 w-4.5 shrink-0 drop-shadow-sm' />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* "Detailed" key-takeaways: sanitized,
                                        AI-authored HTML paragraphs (no
                                        headings — the headline box above
                                        already plays that role). The block
                                        sits directly BELOW the key message
                                        and ABOVE the perCard breakdown. */}
                                    {hasDetailedHtmlBlock && (
                                        <div className='rounded-2xl shadow-lg animate-fade-in relative overflow-hidden'>
                                            <div
                                                aria-hidden
                                                className='pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-yellow-400/10 blur-3xl'
                                            />
                                            <PrivacyDetailedHtml
                                                html={message.detailedHtml}
                                                aliases={aliases}
                                                stripCardLabelsFrom={
                                                    message.cards ?? undefined
                                                }
                                                extraStripLabels={perCardItems.map(
                                                    (p) => p.cardName,
                                                )}
                                                className='tarot-detailed-html text-white/90 leading-relaxed relative z-10'
                                            />
                                        </div>
                                    )}

                                    {/* C. Per-card chip list.
                                        Tapping a chip syncs activeCardIndex
                                        with the hero above. Falls back to the
                                        legacy single paragraph when perCard
                                        is missing (restored old messages). */}
                                    {hasPerCard ? (
                                        <div className='space-y-3'>
                                            <p className='text-[11px] font-semibold uppercase tracking-wider text-white/55'>
                                                {tReading(
                                                    isMultiCard
                                                        ? "perCard.multiHeader"
                                                        : "perCard.singleHeader",
                                                )}
                                            </p>
                                            <ul className='space-y-2.5'>
                                                {perCardItems.map(
                                                    (item, index) => {
                                                        const isActive =
                                                            isMultiCard &&
                                                            index ===
                                                                safeActiveIndex
                                                        const chipBase =
                                                            "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                                                        const chipState =
                                                            isActive
                                                                ? "border-[#a78bfa]/60 bg-[#a78bfa]/15 text-white"
                                                                : "border-white/15 bg-white/[0.06] text-white/80 hover:border-white/30 hover:text-white"
                                                        return (
                                                            <li
                                                                key={`${message.id}-percard-${index}`}
                                                            >
                                                                {isMultiCard ? (
                                                                    <button
                                                                        type='button'
                                                                        onClick={() =>
                                                                            setActiveCardIndex(
                                                                                index,
                                                                            )
                                                                        }
                                                                        aria-pressed={
                                                                            isActive
                                                                        }
                                                                        className={`${chipBase} ${chipState} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa]/50`}
                                                                    >
                                                                        {
                                                                            item.cardName
                                                                        }
                                                                    </button>
                                                                ) : (
                                                                    <span
                                                                        className={`${chipBase} ${chipState}`}
                                                                    >
                                                                        {
                                                                            item.cardName
                                                                        }
                                                                    </span>
                                                                )}
                                                                <p className='text-[15px] leading-7 text-white/85 mt-3'>
                                                                    <PrivacyHighlightedText
                                                                        text={
                                                                            item.sentence
                                                                        }
                                                                        aliases={
                                                                            aliases
                                                                        }
                                                                        supportMarkdown
                                                                    />
                                                                </p>
                                                            </li>
                                                        )
                                                    },
                                                )}
                                            </ul>
                                        </div>
                                    ) : (
                                        <div className='space-y-4 text-[15px] leading-8 text-white/84'>
                                            {formattedTarotInterpretationLegacy.map(
                                                (paragraph, paragraphIndex) => (
                                                    <p
                                                        key={`${message.id}-paragraph-${paragraphIndex}`}
                                                    >
                                                        <PrivacyHighlightedText
                                                            text={paragraph}
                                                            aliases={aliases}
                                                            supportMarkdown
                                                        />
                                                    </p>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        {interpretationBodyStreamingDone && (
                            <div className='pt-4 border-t border-white/5 space-y-4 animate-fade-up'>
                                <ShareSection
                                    variant='embedded'
                                    question={unmaskedQuestion}
                                    cards={message.cards?.map(
                                        (card) => card.meaning,
                                    )}
                                    interpretation={unmaskedMessageText}
                                />
                            </div>
                        )}
                    </div>
                    {/* Follow-up suggestions are now hosted EXCLUSIVELY in the
                        action-trigger composer (see <QuestionInput
                        composerFollowUps>). They never appear after the
                        conclusion section in the chat scrollback, regardless
                        of whether the user has sent a new question yet — the
                        composer hides them automatically once a new user
                        message arrives. The only thing kept here is the
                        legacy bottom-conclusion fallback for old messages
                        that pre-date the perCard/nextStep schema. */}
                    {message.followUpLoading ||
                    (!message.nextStep?.trim() &&
                        message.followUpConclusion) ? (
                        <div className='w-full md:max-w-[85%] space-y-3 pt-4'>
                            {message.followUpLoading && (
                                <p className='text-xs sm:text-sm text-white/60'>
                                    Thinking of a good next question...
                                </p>
                            )}
                            {!message.nextStep?.trim() &&
                                message.followUpConclusion && (
                                    <p className='text-white'>
                                        <PrivacyHighlightedText
                                            text={message.followUpConclusion}
                                            aliases={aliases}
                                            supportMarkdown
                                        />
                                    </p>
                                )}
                        </div>
                    ) : null}
                </>
            ) : null}
        </>
    )
}
