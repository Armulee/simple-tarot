"use client"

import Image from "next/image"
import {
    type Dispatch,
    type ReactNode,
    type RefObject,
    type SetStateAction,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import ActionSection from "@/components/tarot/interpretation/action"
import ShareSection from "@/components/tarot/interpretation/share"
import InsufficientStarsBlock from "@/components/stars/insufficient-stars-block"
import { ConsultingBadge } from "@/components/consulting-badge"
import { ConsultingPhasesText } from "@/components/chat/consulting-phases-text"
import AutoHeightTextarea from "@/components/ui/auto-height-textarea"
import HoroscopeReadingTabs from "@/components/chat/horoscope-reading-tabs"
import HoroscopeCalendarTool from "@/components/chat/horoscope/calendar-tool"
import OracleHero from "@/components/chat/oracle/oracle-hero"
import OtherPersonReadingBadge from "@/components/chat/other-person-reading-badge"
import { TarotAssistantInterpretation } from "@/components/chat/tarot-interpretation"
import { HoroscopeAuthGateBlock } from "@/components/chat/horoscope-auth-gate-block"
import PaywallBlock from "@/components/chat/paywall-block"
import { SupportBlock } from "@/components/chat/support/support-block"
import GeneralReadingTabs from "@/components/chat/general/general-reading-tabs"
import {
    PrivacyHighlightedText,
    PrivacyHighlightedUserText,
} from "@/components/chat/privacy/privacy-highlighted-user-text"
import { PrivacyRedactedNoticeHover } from "@/components/chat/privacy/privacy-redacted-notice-hover"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"
import type { HoroscopeBirthData } from "@/types/horoscope"
import { PLANET_IMAGE_KEYS } from "@/lib/astrology/planet-images"
import type { ChatMessage, SourceAspectEvent } from "./types"
import { LoadingDotsText } from "./loading-dots-text"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
    ChevronDown,
    ChevronRight,
    Copy,
    Flag,
    Layers,
    Loader2,
    MoveHorizontal,
    Pencil,
    RotateCw,
    CornerDownRight,
    Send,
    Share2,
    Square,
    ThumbsDown,
    ThumbsUp,
    Triangle,
    Minus,
    MousePointerClick,
    X,
} from "lucide-react"

function formatHoroscopeLoadingText(
    _birth: HoroscopeBirthData | null | undefined,
    dots: number,
    consultingBase: string,
): string {
    return `${consultingBase}${".".repeat(dots)}`
}

function ChartDataCollapsible({
    chartData,
}: {
    chartData: Record<string, unknown>
}) {
    const [open, setOpen] = useState(false)
    const jsonStr = JSON.stringify(chartData, null, 2)
    return (
        <div className='rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden'>
            <button
                type='button'
                onClick={() => setOpen(!open)}
                className='w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors'
            >
                {open ? (
                    <ChevronDown className='h-3.5 w-3.5 shrink-0' />
                ) : (
                    <ChevronRight className='h-3.5 w-3.5 shrink-0' />
                )}
                <span>View Swiss Ephemeris data passed to AI</span>
            </button>
            {open && (
                <pre className='p-3 text-[10px] text-white/60 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap break-words border-t border-white/5'>
                    {jsonStr}
                </pre>
            )}
        </div>
    )
}

function getDisplayText(message: ChatMessage) {
    return message.displayText ?? message.text
}

function getDisplayQuestion(message: ChatMessage) {
    return message.displayQuestion ?? message.question
}

function AspectIcon({ aspectType }: { aspectType: string }) {
    if (aspectType === "conjunction") {
        return <Layers className='h-4 w-4 text-cyan-200' />
    }
    if (aspectType === "opposition") {
        return <MoveHorizontal className='h-4 w-4 text-cyan-200' />
    }
    if (aspectType === "square") {
        return <Square className='h-4 w-4 text-cyan-200' />
    }
    if (aspectType === "trine") {
        return <Triangle className='h-4 w-4 text-cyan-200' />
    }
    return <Minus className='h-4 w-4 text-cyan-200' />
}

function SourceAspectCard({
    event,
    tPanel,
}: {
    event: SourceAspectEvent
    tPanel: ReturnType<typeof useTranslations>
}) {
    const [hiddenImages, setHiddenImages] = useState<Record<string, boolean>>(
        {},
    )
    const normalizePositionText = (value: string | undefined) =>
        value
            ? value
                  .replace(/Â(?=[°·])/g, "")
                  .replace(/\s*[·]\s*/g, " · ")
                  .trim()
            : undefined
    const noPosition = tPanel("noChartPosition")

    function PlanetAvatar({ planet }: { planet: string }) {
        const key = planet.toLowerCase()
        const shouldTryImage = PLANET_IMAGE_KEYS.has(key)
        if (shouldTryImage && !hiddenImages[planet]) {
            return (
                <Image
                    src={`/assets/planetary/${key}.png`}
                    alt={planet}
                    width={42}
                    height={42}
                    className='h-[42px] w-[42px] rounded-full object-cover'
                    onError={() =>
                        setHiddenImages((prev) => ({
                            ...prev,
                            [planet]: true,
                        }))
                    }
                />
            )
        }

        return (
            <div className='h-10 w-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[11px] text-white/80'>
                {planet.slice(0, 2).toUpperCase()}
            </div>
        )
    }

    const transitPosition =
        normalizePositionText(event.transitPositionText) || noPosition
    const natalPosition =
        normalizePositionText(event.natalPositionText) || noPosition
    const transitAbsoluteText = event.transitAbsoluteText || "-"
    const natalAbsoluteText = event.natalAbsoluteText || "-"

    return (
        <div className='rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2 min-w-[260px]'>
            <div className='flex items-center justify-between gap-3'>
                <div className='inline-flex items-center gap-2'>
                    <PlanetAvatar planet={event.transitPlanet} />
                    <div className='flex flex-col'>
                        <span className='text-sm font-medium text-white'>
                            {(tPanel(`planets.${event.transitPlanet}`) ??
                                event.transitPlanet) + tPanel("transitSuffix")}
                        </span>
                        <span className='text-[10px] text-white/65'>
                            {transitPosition}
                        </span>
                        <span className='text-[10px] text-white/45'>
                            {transitAbsoluteText}
                        </span>
                    </div>
                </div>
                <div className='flex flex-col items-center'>
                    <AspectIcon aspectType={event.aspectType} />
                    <span className='text-[10px] text-white/70'>
                        {tPanel(`aspects.${event.aspectType}`) ??
                            event.aspectType}
                    </span>
                    <span className='text-[9px] text-white/50'>
                        orb: {event.orb}°
                    </span>
                </div>
                <div className='inline-flex items-center gap-2'>
                    <PlanetAvatar planet={event.natalPlanet} />
                    <div className='flex flex-col'>
                        <span className='text-sm font-medium text-white'>
                            {(tPanel(`planets.${event.natalPlanet}`) ??
                                event.natalPlanet) + tPanel("natalSuffix")}
                        </span>
                        <span className='text-[10px] text-white/65'>
                            {natalPosition}
                        </span>
                        <span className='text-[10px] text-white/45'>
                            {natalAbsoluteText}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

type MessageListProps = {
    hasMessages: boolean
    messages: ChatMessage[]
    editingMessageId: string | null
    editingDraft: string
    setEditingDraft: Dispatch<SetStateAction<string>>
    isChatLoading: boolean
    consulting: boolean
    isInterpreting: boolean
    positionMeanings: Record<string, string[]>
    hasInterpretation: boolean
    assistantReactions: Record<string, "like" | "dislike" | null>
    messageNotices: Record<string, string>
    isHoroscopeIntakeActive?: boolean
    isCheckingStars: boolean
    checkingStarsText: string
    showInsufficientStars: boolean
    insufficientStarsType?: "tarot" | "horoscope"
    cardDrawSection: ReactNode
    hasAssistantResponse: boolean
    disclaimerText: string
    onRegenerateAt: (messageIndex: number) => void
    onStartEditAt: (messageIndex: number) => void
    onCancelEdit: () => void
    onSendEditAt: (messageIndex: number) => void
    /**
     * Fires when the viewer taps a topic chip inside an inline horoscope
     * calendar tool (variant: "horoscope-calendar"). The session sends a
     * follow-up question for the chosen topic + date.
     */
    onCalendarChipClick?: (
        chipId: string,
        topicLabel: string,
        date: Date,
    ) => void
    /**
     * Fires whenever the viewer picks a date (or new DayData lands) in the
     * inline horoscope calendar tool. The session refreshes its
     * originContext so the AI sees that day on follow-up questions.
     */
    onCalendarSelectionChange?: (
        date: Date | null,
        dayData: import("@/lib/calendar-helper").DayData | null,
    ) => void
    /**
     * Bumped by the chat session to clear the inline calendar tool's
     * date selection — typically right after the viewer cancels the
     * originContext from the composer's OriginContextStrip.
     */
    calendarToolResetSignal?: number
    onAskAspectDetail?: (
        question: string,
        aspectKey: string,
        event: SourceAspectEvent,
    ) => void
    onPickTransitDate?: (messageId: string, datetimeIso: string) => void
    onHoroscopeAuthGateCardsSelected: (
        cards: { name: string; isReversed: boolean }[],
    ) => void
    /**
     * Triggered when the user clicks the "Draw a card instead" CTA on the
     * rejection paywall block (free-tier user asking about another
     * person's chart). The session flips interpretationMode horoscope→auto
     * and kicks off the regular tarot draw flow with the rejected
     * question.
     */
    onPaywallDrawCardInstead?: () => void
    onCancelHoroscopeLoading: () => void
    onRegenerateHoroscope?: (messageId: string) => void
    onRegenerateTarot?: (messageId: string) => void
    onTarotInterpretationChange?: (messageId: string, text: string) => void
    onRefetchHoroscopeWithSystem: (
        messageId: string,
        system: "western_tropical" | "vedic_sidereal",
    ) => void
    onToggleReaction: (id: string, next: "like" | "dislike") => void
    onReport: (id: string, text: string) => void
    onShare: (id: string, text: string) => void
    onReadingTextDownloaded?: (messageId: string) => void
    onReadingTextDownloadFailed?: (messageId: string) => void
    onReadAloud: (id: string, text: string) => void
    /**
     * Replaces session-scoped privacy placeholders (e.g. `[Person_0]`) with the
     * original PII the user typed. Applied at every user-facing render and at
     * call sites that leave the device (clipboard, share, TTS, report mailto).
     */
    unmask: (text?: string | null) => string
    /**
     * Session-scoped alias map used to highlight redacted PII inline in user
     * message bubbles and to render the masked sentence sent to the AI.
     */
    privacyAliases: PromptAliasEntry[]
    readAloudLoadingMessageId: string | null
    readAloudPlayingMessageId: string | null
    lastAssistantMessageRef: RefObject<HTMLDivElement | null>
    insufficientStarsRef: RefObject<HTMLDivElement | null>
    messagesEndRef: RefObject<HTMLDivElement | null>
    /** Ref to the fixed composer bar; used to subtract its height from the visible viewport when deciding whether the interpretation tail is still in view. */
    composerRef?: RefObject<HTMLElement | null>
    /** When set, notifies parent so a scroll-to-bottom control can live above the composer. */
    onComposerScrollDownChange?: (state: {
        visible: boolean
        scrollToBottom?: () => void
    }) => void
}

export default function MessageList({
    hasMessages,
    messages,
    editingMessageId,
    editingDraft,
    setEditingDraft,
    isChatLoading,
    consulting,
    isInterpreting,
    positionMeanings,
    hasInterpretation,
    assistantReactions,
    messageNotices,
    isHoroscopeIntakeActive = false,
    isCheckingStars,
    checkingStarsText,
    showInsufficientStars,
    insufficientStarsType = "tarot",
    cardDrawSection,
    hasAssistantResponse,
    disclaimerText,
    onRegenerateAt,
    onStartEditAt,
    onCancelEdit,
    onSendEditAt,
    onCalendarChipClick,
    onCalendarSelectionChange,
    calendarToolResetSignal,
    onAskAspectDetail,
    onPickTransitDate,
    onHoroscopeAuthGateCardsSelected,
    onPaywallDrawCardInstead,
    onCancelHoroscopeLoading,
    onRegenerateHoroscope,
    onRegenerateTarot,
    onTarotInterpretationChange,
    onRefetchHoroscopeWithSystem,
    onToggleReaction,
    onReport,
    onShare,
    onReadingTextDownloaded,
    onReadingTextDownloadFailed,
    unmask,
    privacyAliases,
    lastAssistantMessageRef,
    insufficientStarsRef,
    messagesEndRef,
    composerRef,
    onComposerScrollDownChange,
}: MessageListProps) {
    const t = useTranslations("Home")
    const tPanel = useTranslations("PlanetaryPanel")
    const tHoroscope = useTranslations("HoroscopeChat")
    const consultingBase = t("consulting")
    const loadingStep1Phrases = useMemo(
        () => (t.raw("loadingPhases.step1") as string[] | undefined) ?? [],
        [t],
    )
    const loadingStep2Phrases = useMemo(
        () => (t.raw("loadingPhases.step2") as string[] | undefined) ?? [],
        [t],
    )

    const askedAspectKeys = useMemo(() => {
        const map: Record<string, string> = {}
        for (const m of messages) {
            if (m.sourceAspectKey) map[m.sourceAspectKey] = m.id
        }
        return map
    }, [messages])

    const lastAssistantIndex = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            if (messages[i].role === "assistant") return i
        }
        return -1
    }, [messages])

    const scrollRootRef = useRef<HTMLDivElement | null>(null)
    const interpretationSentinelRef = useRef<HTMLDivElement | null>(null)
    const [showScrollToBottomFab, setShowScrollToBottomFab] = useState(false)

    const recomputeScrollToBottomFab = useCallback(() => {
        if (typeof window === "undefined") return
        if (!hasInterpretation) {
            setShowScrollToBottomFab(false)
            return
        }
        const sentinel = interpretationSentinelRef.current
        if (!sentinel) {
            setShowScrollToBottomFab(false)
            return
        }
        const doc = document.documentElement
        const fromThreadBottom =
            doc.scrollHeight - window.scrollY - window.innerHeight
        const notAtThreadBottom = fromThreadBottom > 72
        const composerInset = composerRef?.current?.offsetHeight ?? 0
        const viewportBottom = window.innerHeight - composerInset
        const sr = sentinel.getBoundingClientRect()
        const bandPx = 112
        const bandTop = viewportBottom - bandPx
        const interpretationTailInLowerBand =
            sr.bottom > bandTop && sr.top < viewportBottom
        setShowScrollToBottomFab(
            notAtThreadBottom && !interpretationTailInLowerBand,
        )
    }, [hasInterpretation, composerRef])

    useEffect(() => {
        if (typeof window === "undefined") return
        const onScroll = () => recomputeScrollToBottomFab()
        const ro = new ResizeObserver(() => recomputeScrollToBottomFab())
        ro.observe(document.documentElement)
        const composerEl = composerRef?.current
        if (composerEl) ro.observe(composerEl)
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll, { passive: true })
        recomputeScrollToBottomFab()
        return () => {
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onScroll)
            ro.disconnect()
        }
    }, [recomputeScrollToBottomFab, composerRef, messages, lastAssistantIndex])

    useLayoutEffect(() => {
        recomputeScrollToBottomFab()
    }, [recomputeScrollToBottomFab, messages, lastAssistantIndex])

    useEffect(() => {
        if (!onComposerScrollDownChange) return
        if (!hasMessages) {
            onComposerScrollDownChange({ visible: false })
            return
        }
        const scrollToBottom = () => {
            if (typeof window === "undefined") return
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: "smooth",
            })
        }
        onComposerScrollDownChange({
            visible: showScrollToBottomFab,
            scrollToBottom,
        })
    }, [
        hasMessages,
        showScrollToBottomFab,
        messages,
        lastAssistantIndex,
        onComposerScrollDownChange,
    ])

    if (!hasMessages) return null

    return (
        <div className='flex-1 min-h-0 relative flex flex-col'>
            <div
                ref={scrollRootRef}
                className='min-h-0 flex-1 overflow-y-auto px-4 pt-6'
            >
                <div className='mx-auto max-w-3xl space-y-6 text-left'>
                    {messages.map((message, messageIndex) => {
                        const displayText = getDisplayText(message)
                        const displayQuestion = getDisplayQuestion(message)

                        // --- User message: user's question with edit/regenerate actions ---
                        if (message.role === "user") {
                            const isEditing = editingMessageId === message.id

                            if (message.isSanitizing && !isEditing) {
                                return (
                                    <div
                                        key={message.id}
                                        id={`msg-${message.id}`}
                                        className='flex flex-col items-end gap-2'
                                    >
                                        <div className='flex max-w-[80%] justify-end'>
                                            <ConsultingBadge
                                                label={t("sanitizingPrompt")}
                                            />
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <div
                                    key={message.id}
                                    id={`msg-${message.id}`}
                                    className='flex flex-col items-end gap-2'
                                >
                                    {message.originContextSnapshot?.kind ===
                                    "calendar-day" ? (
                                        <div
                                            className='inline-flex max-w-[80%] items-center gap-1.5 text-xs text-amber-200/70'
                                            role='note'
                                            aria-label={
                                                message.originContextSnapshot
                                                    .label
                                            }
                                        >
                                            <CornerDownRight
                                                className='size-3.5 shrink-0'
                                                aria-hidden
                                            />
                                            <span className='truncate'>
                                                {
                                                    message
                                                        .originContextSnapshot
                                                        .label
                                                }
                                            </span>
                                        </div>
                                    ) : null}
                                    <div className='max-w-[80%] rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 px-4 py-3 text-white shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)]'>
                                        {isEditing ? (
                                            <div className='relative'>
                                                <AutoHeightTextarea
                                                    value={editingDraft}
                                                    onChange={(e) =>
                                                        setEditingDraft(
                                                            e.target.value,
                                                        )
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key !== "Enter")
                                                            return
                                                        if (
                                                            e.metaKey ||
                                                            e.ctrlKey ||
                                                            e.shiftKey
                                                        ) {
                                                            return
                                                        }
                                                        e.preventDefault()
                                                        onSendEditAt(
                                                            messageIndex,
                                                        )
                                                    }}
                                                    className='w-full bg-transparent text-white placeholder:text-white/60 outline-none border border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/30 rounded-xl px-3 py-2 pr-12'
                                                    placeholder='Edit your message...'
                                                    disabled={isChatLoading}
                                                />
                                                <div className='mt-2 flex items-center justify-end gap-2'>
                                                    <button
                                                        type='button'
                                                        className='inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/70 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40'
                                                        onClick={onCancelEdit}
                                                        disabled={isChatLoading}
                                                    >
                                                        <X className='h-3 w-3' />
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type='button'
                                                        className='inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/70 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40'
                                                        onClick={() =>
                                                            onSendEditAt(
                                                                messageIndex,
                                                            )
                                                        }
                                                        disabled={
                                                            isChatLoading ||
                                                            !editingDraft.trim()
                                                        }
                                                    >
                                                        <Send className='h-3 w-3' />
                                                        Send
                                                    </button>
                                                </div>
                                            </div>
                                        ) : message.privacyRedacted &&
                                          typeof displayText === "string" &&
                                          displayText.length > 0 &&
                                          typeof message.text === "string" &&
                                          message.text !== displayText &&
                                          privacyAliases.length > 0 ? (
                                            <PrivacyHighlightedUserText
                                                displayText={displayText}
                                                sanitizedText={message.text}
                                                aliases={privacyAliases}
                                            />
                                        ) : (
                                            displayText
                                        )}
                                    </div>
                                    {message.privacyRedacted ? (
                                        <PrivacyRedactedNoticeHover />
                                    ) : null}
                                    <div className='flex items-center gap-2 text-[11px] text-white/60'>
                                        <button
                                            type='button'
                                            className='flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40'
                                            onClick={async () => {
                                                const text =
                                                    displayText?.trim() ?? ""
                                                if (!text) return
                                                try {
                                                    if (
                                                        navigator.clipboard &&
                                                        window.isSecureContext
                                                    ) {
                                                        await navigator.clipboard.writeText(
                                                            text,
                                                        )
                                                        toast.success(
                                                            t(
                                                                "copyPromptSuccess",
                                                            ),
                                                        )
                                                    } else {
                                                        toast.error(
                                                            t(
                                                                "copyPromptUnavailable",
                                                            ),
                                                        )
                                                    }
                                                } catch {
                                                    toast.error(
                                                        t("copyPromptFailed"),
                                                    )
                                                }
                                            }}
                                            disabled={
                                                consulting ||
                                                isInterpreting ||
                                                isEditing ||
                                                !displayText?.trim()
                                            }
                                            aria-label={t("copyPrompt")}
                                            title={t("copyPrompt")}
                                        >
                                            <Copy className='w-3 h-3' />
                                        </button>
                                        <button
                                            type='button'
                                            className='flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40'
                                            onClick={() =>
                                                onRegenerateAt(messageIndex)
                                            }
                                            disabled={
                                                consulting ||
                                                isInterpreting ||
                                                isEditing
                                            }
                                            aria-label='Regenerate'
                                            title='Regenerate'
                                        >
                                            <RotateCw className='w-3 h-3' />
                                        </button>
                                        <button
                                            type='button'
                                            className='flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors'
                                            onClick={() =>
                                                onStartEditAt(messageIndex)
                                            }
                                            disabled={
                                                consulting || isInterpreting
                                            }
                                            aria-label='Edit'
                                            title='Edit'
                                        >
                                            <Pencil className='w-3 h-3' />
                                        </button>
                                    </div>
                                </div>
                            )
                        }

                        // --- Assistant message: cards, interpretation, actions ---
                        return (
                            <div
                                key={message.id}
                                id={`msg-${message.id}`}
                                ref={
                                    messageIndex === messages.length - 1
                                        ? (node) => {
                                              if (node)
                                                  lastAssistantMessageRef.current =
                                                      node
                                          }
                                        : undefined
                                }
                                className='flex flex-col items-start gap-4'
                            >
                                {message.horoscopeForOtherPerson && (
                                    <div className='w-full md:max-w-[85%]'>
                                        <OtherPersonReadingBadge
                                            info={
                                                message.horoscopeForOtherPerson
                                            }
                                        />
                                    </div>
                                )}
                                {((message.cards && message.cards.length > 0) ||
                                    message.variant === "box") && (
                                    <TarotAssistantInterpretation
                                        message={{
                                            ...message,
                                            question: displayQuestion,
                                        }}
                                        messages={messages}
                                        messageIndex={messageIndex}
                                        consultingBase={consultingBase}
                                        positionMeanings={positionMeanings}
                                        messageNotices={messageNotices}
                                        onRegenerateTarot={onRegenerateTarot}
                                        onTarotInterpretationChange={
                                            onTarotInterpretationChange
                                        }
                                        onShare={onShare}
                                        onReadingTextDownloaded={
                                            onReadingTextDownloaded
                                        }
                                        onReadingTextDownloadFailed={
                                            onReadingTextDownloadFailed
                                        }
                                        unmask={unmask}
                                        privacyAliases={privacyAliases}
                                    />
                                )}
                                {message.variant === "oracle" ? (
                                    <div className='w-full md:max-w-[85%]'>
                                        <OracleHero
                                            reading={message.oracleReading}
                                            isLoading={message.isLoading}
                                            privacyAliases={privacyAliases}
                                        />
                                    </div>
                                ) : null}
                                {message.variant === "horoscope-calendar" ? (
                                    <div className='w-full md:max-w-[85%]'>
                                        <HoroscopeCalendarTool
                                            onChipClick={(
                                                chipId,
                                                topicLabel,
                                                date,
                                            ) =>
                                                onCalendarChipClick?.(
                                                    chipId,
                                                    topicLabel,
                                                    date,
                                                )
                                            }
                                            onSelectionChange={(date, data) =>
                                                onCalendarSelectionChange?.(
                                                    date,
                                                    data,
                                                )
                                            }
                                            clearSelectionSignal={
                                                calendarToolResetSignal
                                            }
                                            responseLocale={
                                                message.responseLocale
                                            }
                                        />
                                    </div>
                                ) : message.variant === "box" ||
                                  message.variant ===
                                      "oracle" ? null : message.variant ===
                                  "horoscope" ? (
                                    <>
                                        {message.sourceAspectEvent && (
                                            <div className='w-full md:max-w-[85%] animate-fade-in'>
                                                <SourceAspectCard
                                                    event={
                                                        message.sourceAspectEvent
                                                    }
                                                    tPanel={tPanel}
                                                />
                                            </div>
                                        )}
                                        <div className='w-full md:max-w-[85%]'>
                                            <HoroscopeReadingTabs
                                                message={{
                                                    ...message,
                                                    question: displayQuestion,
                                                }}
                                                privacyAliases={privacyAliases}
                                                onAskAspectDetail={
                                                    onAskAspectDetail
                                                }
                                                askedAspectKeys={
                                                    askedAspectKeys
                                                }
                                                onPickTransitDate={
                                                    onPickTransitDate
                                                }
                                                loadingNode={
                                                    message.isLoading ? (
                                                        <button
                                                            type='button'
                                                            onClick={
                                                                onCancelHoroscopeLoading
                                                            }
                                                            title='Click to cancel and edit birth details'
                                                            className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-4 py-2 text-sm font-medium text-white/90 shadow-[0_0_20px_-5px_rgba(56,189,248,0.3)] backdrop-blur-xl transition-colors hover:text-white'
                                                        >
                                                            <Square className='h-3.5 w-3.5 shrink-0 fill-current' />
                                                            <Loader2 className='h-4 w-4 shrink-0 animate-spin' />
                                                            <LoadingDotsText
                                                                active={
                                                                    !!message.isLoading
                                                                }
                                                                getText={(d) =>
                                                                    formatHoroscopeLoadingText(
                                                                        message.horoscopeBirthData,
                                                                        d,
                                                                        consultingBase,
                                                                    )
                                                                }
                                                            />
                                                        </button>
                                                    ) : undefined
                                                }
                                                footerActions={
                                                    !message.isLoading ? (
                                                        <div className='space-y-4'>
                                                            {message.followUpConclusion && (
                                                                <p className='text-sm leading-7 text-white/78'>
                                                                    <PrivacyHighlightedText
                                                                        text={
                                                                            message.followUpConclusion
                                                                        }
                                                                        aliases={
                                                                            privacyAliases
                                                                        }
                                                                        supportMarkdown
                                                                    />
                                                                </p>
                                                            )}
                                                            <ShareSection
                                                                variant='embedded'
                                                                question={
                                                                    displayQuestion
                                                                }
                                                                interpretation={unmask(
                                                                    message.text,
                                                                )}
                                                            />
                                                            <div className='space-y-2'>
                                                                <p className='text-[11px] uppercase tracking-[0.2em] text-white/50'>
                                                                    Actions
                                                                </p>
                                                                <ActionSection
                                                                    variant='embedded'
                                                                    mode='horoscope'
                                                                    question={
                                                                        displayQuestion
                                                                    }
                                                                    interpretation={unmask(
                                                                        message.text,
                                                                    )}
                                                                    messageId={
                                                                        message.id
                                                                    }
                                                                    onRegenerateHoroscope={
                                                                        onRegenerateHoroscope
                                                                    }
                                                                />
                                                            </div>
                                                            {message.chartData && (
                                                                <ChartDataCollapsible
                                                                    chartData={
                                                                        message.chartData
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    ) : undefined
                                                }
                                            />
                                        </div>
                                    </>
                                ) : message.horoscopeAuthGate ? (
                                    /* Anonymous horoscope: show sign-in CTA + tarot fallback teaser */
                                    <HoroscopeAuthGateBlock
                                        data={message.horoscopeAuthGate}
                                        onCardsSelected={
                                            onHoroscopeAuthGateCardsSelected
                                        }
                                    />
                                ) : message.variant === "paywall" &&
                                  message.paywall ? (
                                    /* Free-tier user asked about someone else's chart */
                                    <div className='w-full md:max-w-[85%] space-y-3'>
                                        <p className='text-[13px] leading-[1.75] text-white/85'>
                                            {tHoroscope.rich(
                                                "paywallOtherPersonAssistantText",
                                                {
                                                    drawPill: (chunks) => (
                                                        <button
                                                            type='button'
                                                            onClick={
                                                                onPaywallDrawCardInstead
                                                            }
                                                            disabled={
                                                                !onPaywallDrawCardInstead
                                                            }
                                                            className='mx-0.5 inline-flex items-center gap-1.5 align-middle rounded-full border border-amber-300/45 bg-gradient-to-r from-amber-400/25 via-amber-300/15 to-orange-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-50 shadow-[0_6px_24px_-8px_rgba(251,191,36,0.4)] transition hover:scale-[1.02] hover:border-amber-200/55 hover:from-amber-400/35 hover:shadow-[0_10px_32px_-8px_rgba(251,191,36,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0a14] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs'
                                                        >
                                                            <MousePointerClick
                                                                aria-hidden
                                                                className='size-3 shrink-0 opacity-95'
                                                            />
                                                            {chunks}
                                                        </button>
                                                    ),
                                                },
                                            )}
                                        </p>
                                        <PaywallBlock data={message.paywall} />
                                    </div>
                                ) : message.variant === "plain" &&
                                  message.generalReply !== undefined ? (
                                    /* General reply strategy: inner-energy reflection hero */
                                    <>
                                        {message.sourceAspectEvent && (
                                            <div className='w-full md:max-w-[85%] mb-2 animate-fade-in'>
                                                <SourceAspectCard
                                                    event={
                                                        message.sourceAspectEvent
                                                    }
                                                    tPanel={tPanel}
                                                />
                                            </div>
                                        )}
                                        <div className='w-full md:max-w-[85%]'>
                                            <GeneralReadingTabs
                                                message={message}
                                                privacyAliases={privacyAliases}
                                                onAskAspectDetail={
                                                    onAskAspectDetail
                                                }
                                                askedAspectKeys={
                                                    askedAspectKeys
                                                }
                                            />
                                        </div>
                                    </>
                                ) : (
                                    /* Plain variant: simple assistant text (bridge message, support ack) */
                                    <>
                                        {message.sourceAspectEvent && (
                                            <div className='w-full md:max-w-[85%] mb-2 animate-fade-in'>
                                                <SourceAspectCard
                                                    event={
                                                        message.sourceAspectEvent
                                                    }
                                                    tPanel={tPanel}
                                                />
                                            </div>
                                        )}
                                        <div className='w-full md:max-w-[85%] text-white/90 leading-relaxed whitespace-pre-wrap'>
                                            {message.isLoading &&
                                            !message.text?.trim() ? (
                                                <span className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_-5px_rgba(56,189,248,0.3)] text-sm font-medium text-white/90'>
                                                    <Loader2 className='h-4 w-4 animate-spin shrink-0' />
                                                    <ConsultingPhasesText
                                                        step1Phrases={
                                                            loadingStep1Phrases
                                                        }
                                                        step2Phrases={
                                                            loadingStep2Phrases
                                                        }
                                                        fallback={consultingBase}
                                                    />
                                                </span>
                                            ) : (
                                                <PrivacyHighlightedText
                                                    text={message.text || ""}
                                                    aliases={privacyAliases}
                                                    supportMarkdown
                                                />
                                            )}
                                        </div>
                                        {!message.isLoading &&
                                            message.supportBlock && (
                                                <div className='w-full md:max-w-[85%] animate-fade-in'>
                                                    <SupportBlock
                                                        payload={
                                                            message.supportBlock
                                                        }
                                                    />
                                                </div>
                                            )}
                                    </>
                                )}
                                {message.role === "assistant" &&
                                    messageIndex === lastAssistantIndex && (
                                        <div
                                            ref={interpretationSentinelRef}
                                            className='h-0 w-full shrink-0 overflow-hidden pointer-events-none'
                                            aria-hidden
                                        />
                                    )}
                                {message.role === "assistant" &&
                                    message.streamStopped && (
                                        <div className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_-5px_rgba(56,189,248,0.3)] text-sm font-medium text-white/90'>
                                            <Square className='h-3.5 w-3.5 shrink-0 fill-current' />
                                            {t("streamStopped")}
                                        </div>
                                    )}
                                {/* Assistant actions: like/dislike/report/share (plain only) */}
                                {message.role === "assistant" && (
                                        <div className='flex items-center gap-2 text-[11px] text-white/60'>
                                            {!isChatLoading &&
                                                message.variant === "plain" &&
                                                !hasInterpretation &&
                                                !message.horoscopeAuthGate && (
                                                    <>
                                                        <button
                                                            type='button'
                                                            className={`flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors ${
                                                                assistantReactions[
                                                                    message.id
                                                                ] === "like"
                                                                    ? "text-white"
                                                                    : ""
                                                            }`}
                                                            onClick={() =>
                                                                onToggleReaction(
                                                                    message.id,
                                                                    "like",
                                                                )
                                                            }
                                                            aria-label='Like'
                                                            title='Like'
                                                        >
                                                            <ThumbsUp className='w-3 h-3' />
                                                        </button>
                                                        <button
                                                            type='button'
                                                            className={`flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors ${
                                                                assistantReactions[
                                                                    message.id
                                                                ] === "dislike"
                                                                    ? "text-white"
                                                                    : ""
                                                            }`}
                                                            onClick={() =>
                                                                onToggleReaction(
                                                                    message.id,
                                                                    "dislike",
                                                                )
                                                            }
                                                            aria-label='Dislike'
                                                            title='Dislike'
                                                        >
                                                            <ThumbsDown className='w-3 h-3' />
                                                        </button>
                                                        <button
                                                            type='button'
                                                            className='flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors'
                                                            onClick={() =>
                                                                onReport(
                                                                    message.id,
                                                                    unmask(
                                                                        message.text,
                                                                    ),
                                                                )
                                                            }
                                                            aria-label='Report'
                                                            title='Report'
                                                        >
                                                            <Flag className='w-3 h-3' />
                                                        </button>
                                                        <button
                                                            type='button'
                                                            className='flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors'
                                                            onClick={() =>
                                                                onShare(
                                                                    message.id,
                                                                    unmask(
                                                                        message.text,
                                                                    ),
                                                                )
                                                            }
                                                            aria-label='Share'
                                                            title='Share'
                                                        >
                                                            <Share2 className='w-3 h-3' />
                                                        </button>
                                                    </>
                                                )}
                                            {messageNotices[message.id] && (
                                                <span className='text-white/40'>
                                                    {messageNotices[message.id]}
                                                </span>
                                            )}
                                        </div>
                                    )}
                            </div>
                        )
                    })}
                    {(consulting || isHoroscopeIntakeActive) &&
                        messages.length > 0 &&
                        !messages.some(
                            (m) => m.variant === "horoscope" && m.isLoading,
                        ) &&
                        !messages.some(
                            (m) => m.variant === "plain" && m.isLoading,
                        ) && (
                            <div className='flex flex-col items-start gap-4'>
                                {isHoroscopeIntakeActive ? (
                                    <ConsultingBadge
                                        label={t("enterBirthDate")}
                                    />
                                ) : (
                                    <ConsultingBadge multiStep />
                                )}
                            </div>
                        )}

                    {isCheckingStars && (
                        <div className='flex flex-col items-start gap-4 animate-fade-in'>
                            <div className='w-full md:max-w-[85%] text-white/90'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0'>
                                        <Loader2 className='w-4 h-4 text-yellow-300 animate-spin' />
                                    </div>
                                    <p className='text-white/70'>
                                        {checkingStarsText}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {showInsufficientStars && (
                        <div
                            ref={insufficientStarsRef}
                            className='flex flex-col items-start gap-4 animate-fade-in'
                        >
                            <div className='w-full md:max-w-[85%] text-white/90 space-y-4'>
                                <InsufficientStarsBlock
                                    type={insufficientStarsType}
                                />
                            </div>
                        </div>
                    )}

                    {cardDrawSection}

                    {!isChatLoading && hasAssistantResponse && (
                        <p className='text-[11px] leading-relaxed text-white/40 text-center animate-fade-in py-4 text-left'>
                            {disclaimerText}
                        </p>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
        </div>
    )
}
