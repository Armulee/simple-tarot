"use client"

import { Badge } from "@/components/ui/badge"
import { CardImage } from "@/components/card-image"
import ShareSection from "@/components/tarot/interpretation/share"
import { InterpretationHeaderBar } from "@/components/chat/interpretation-header-bar"
import type { ChatMessage } from "@/components/chat/types"
import { LoadingDotsText } from "@/components/chat/loading-dots-text"
import { PrivacyHighlightedText } from "@/components/chat/privacy-highlighted-user-text"
import {
    applyAliasesToText,
    type PromptAliasEntry,
} from "@/lib/privacy/prompt-redaction"
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

function shouldShowKeyMessage(
    keyMessage: string | undefined,
    detail: string,
): boolean {
    const summary = normalizeComparisonText(keyMessage ?? "")
    const body = normalizeComparisonText(detail)

    if (!summary || !body) return false
    if (summary === body) return false

    const openingSentences = splitIntoSentences(detail).slice(0, 2).join(" ")
    return normalizeComparisonText(openingSentences) !== summary
}

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
    onApplySuggestedQuestion: (value: string) => void
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
 * Tarot card strip + AI interpretation (box variant): header, key message, body, share, follow-ups.
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
    onApplySuggestedQuestion,
    unmask,
    privacyAliases,
}: TarotAssistantInterpretationProps) {
    const tReading = useTranslations("ReadingPage.interpretation")

    const aliases = privacyAliases ?? []
    const rawMessageText = message.text || ""
    const unmaskedMessageText = unmask(rawMessageText)
    const unmaskedKeyMessage = unmask(message.keyMessage)
    const unmaskedQuestion = unmask(message.question)
    // Run paragraph-splitting over the still-masked text so placeholder tokens
    // survive into <PrivacyHighlightedText/>; re-mask the question so the
    // de-duplication filter still matches sentences that reference it.
    const maskedQuestionForFilter = applyAliasesToText(
        unmaskedQuestion ?? "",
        aliases,
    )

    const formattedTarotInterpretation =
        message.variant === "box"
            ? formatInterpretationBody(rawMessageText, maskedQuestionForFilter)
            : []

    /** Any streamed token from the interpretation object (body or summary). */
    const hasInterpretationStream =
        Boolean(rawMessageText.trim()) ||
        Boolean(message.keyMessage?.trim())

    /**
     * Streaming progress signals — the schema emits cardInsights → keyMessage
     * → keywords → interpretation → conclusion → suggestions, so each later
     * field arriving means the previous section is done.
     */
    const cardInsightsStreamingDone =
        !message.isLoading || Boolean(message.keyMessage?.trim())
    const interpretationBodyStreamingDone =
        !message.isLoading || Boolean(message.followUpConclusion?.trim())

    const showKeyMessage =
        message.variant === "box" &&
        (message.isLoading && Boolean(message.keyMessage?.trim())
            ? true
            : shouldShowKeyMessage(unmaskedKeyMessage, unmaskedMessageText))

    const tarotShareText =
        message.variant === "box"
            ? [
                  unmaskedQuestion?.trim(),
                  unmaskedKeyMessage?.trim(),
                  unmaskedMessageText.trim(),
              ]
                  .filter((s): s is string => Boolean(s))
                  .join("\n\n")
            : ""

    return (
        <>
            {/* Tarot cards: shown when cards are drawn */}
            {message.cards && message.cards.length > 0 && (
                <div className='flex flex-wrap gap-6 w-full md:max-w-[85%]'>
                    {message.cards.map((card, index) => {
                        const cardCount = message.cards?.length || 0
                        let spreadKey = "simple"
                        if (cardCount === 1) spreadKey = "simple"
                        else if (cardCount === 3) spreadKey = "general"
                        else if (cardCount === 5) spreadKey = "detailed"
                        else if (cardCount === 7) spreadKey = "expanded"
                        else if (cardCount === 10) spreadKey = "celtic"
                        else spreadKey = "unknown"

                        const label =
                            spreadKey !== "unknown"
                                ? positionMeanings[spreadKey]?.[index]
                                : `Card ${index + 1}`

                        return (
                            <div
                                key={`${message.id}-card-${card.id}`}
                                className='bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/5 group hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-300 w-full md:max-w-sm'
                            >
                                <div className='flex flex-row items-start gap-4 p-4 '>
                                    <div className='shrink-0 flex flex-col items-center relative'>
                                        <div className='absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-white z-10 shadow-lg border border-white/10'>
                                            {index + 1}
                                        </div>
                                        <div className='w-16 h-28 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500'>
                                            <CardImage
                                                card={card}
                                                size='sm'
                                                showAura={false}
                                                showLabel={false}
                                            />
                                        </div>
                                    </div>

                                    <div className='flex-1 min-w-0 flex flex-col h-full py-0.5'>
                                        <div className='text-left mb-2'>
                                            <p className='text-[10px] text-white/50 font-bold uppercase tracking-wider mb-0.5 opacity-80'>
                                                {label}
                                            </p>
                                            <Badge
                                                variant='secondary'
                                                className='block max-w-full truncate rounded-full border border-amber-200/30 bg-amber-300/12 px-2.5 py-1 text-[10px] font-medium text-amber-100'
                                            >
                                                {card.meaning}
                                            </Badge>
                                        </div>
                                        <div className='mt-0.5 w-full rounded-r-xl border-l-2 border-indigo-300/60 bg-indigo-400/[0.04] py-2 pr-3 pl-4 animate-fade-in'>
                                            <p className='text-[10px] font-serif italic leading-relaxed text-white/76'>
                                                &ldquo;
                                                {message.isLoading &&
                                                !message.insights?.[index] ? (
                                                    <span className='inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-2 py-1 backdrop-blur-xl shadow-[0_0_12px_-3px_rgba(56,189,248,0.3)] text-[10px] font-medium text-white/90'>
                                                        <Loader2 className='h-2.5 w-2.5 animate-spin shrink-0' />
                                                        <LoadingDotsText
                                                            active={
                                                                !!(
                                                                    message.isLoading &&
                                                                    !message
                                                                        .insights?.[
                                                                        index
                                                                    ]
                                                                )
                                                            }
                                                            getText={(d) =>
                                                                `${consultingBase}${".".repeat(d)}`
                                                            }
                                                        />
                                                    </span>
                                                ) : (
                                                    unmask(
                                                        message.insights?.[
                                                            index
                                                        ],
                                                    ) || `${consultingBase}...`
                                                )}
                                                &rdquo;
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

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
                                    {showKeyMessage && (
                                        <div className='rounded-2xl border border-indigo-300/20 bg-indigo-400/[0.07] px-4 py-3 shadow-[0_8px_24px_-18px_rgba(129,140,248,0.75)]'>
                                            <div className='mb-1 flex items-start justify-between gap-3'>
                                                <div>
                                                    <p className='min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-100/70'>
                                                        {tReading(
                                                            "actions.keyMessage",
                                                        )}
                                                    </p>
                                                    <p className='text-sm leading-7 text-white/92'>
                                                        <PrivacyHighlightedText
                                                            text={
                                                                message.keyMessage ??
                                                                ""
                                                            }
                                                            aliases={aliases}
                                                            supportMarkdown
                                                        />
                                                    </p>
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
                                    <div className='space-y-4 text-[15px] leading-8 text-white/84'>
                                        {formattedTarotInterpretation.map(
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
                    {(message.followUpConclusion ||
                        (Array.isArray(message.followUpSuggestions) &&
                            message.followUpSuggestions.length > 0)) && (
                        <div className='w-full md:max-w-[85%] space-y-2 pt-4'>
                            {message.followUpLoading && (
                                <p className='text-xs sm:text-sm text-white/60'>
                                    Thinking of a good next question...
                                </p>
                            )}
                            {message.followUpConclusion && (
                                <p className='text-white'>
                                    <PrivacyHighlightedText
                                        text={message.followUpConclusion}
                                        aliases={aliases}
                                        supportMarkdown
                                    />
                                </p>
                            )}
                            {Array.isArray(message.followUpSuggestions) &&
                                message.followUpSuggestions.length > 0 && (
                                    <div className='flex flex-wrap gap-2'>
                                        {message.followUpSuggestions.map(
                                            (s) => {
                                                const unmaskedSuggestion =
                                                    unmask(s)
                                                return (
                                                    <button
                                                        key={s}
                                                        type='button'
                                                        onClick={() =>
                                                            onApplySuggestedQuestion(
                                                                unmaskedSuggestion,
                                                            )
                                                        }
                                                        className='rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-1.5 text-xs text-left text-white/80 hover:text-white'
                                                    >
                                                        <PrivacyHighlightedText
                                                            text={s}
                                                            aliases={aliases}
                                                        />
                                                    </button>
                                                )
                                            },
                                        )}
                                    </div>
                                )}
                        </div>
                    )}
                </>
            ) : null}
        </>
    )
}
