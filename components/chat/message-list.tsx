"use client"

import Image from "next/image"
import {
    type Dispatch,
    type ReactNode,
    type RefObject,
    type SetStateAction,
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { Badge } from "@/components/ui/badge"
import { CardImage } from "@/components/card-image"
import ActionSection, {
    type ActionSectionProps,
} from "@/components/tarot/interpretation/action"
import ShareSection from "@/components/tarot/interpretation/share"
import InsufficientStarsBlock from "@/components/stars/insufficient-stars-block"
import { ConsultingBadge } from "@/components/consulting-badge"
import { hasCompleteBirthData, loadBirthFromStorage } from "@/lib/birth-storage"
import InlineUserDateForm from "@/components/astrology/inline-user-date-form"
import { BirthChartCard } from "@/components/astrology/birth-chart-card"
import RealtimePlanetaryPanel from "@/components/astrology/realtime-planetary-panel"
import AutoHeightTextarea from "@/components/ui/auto-height-textarea"
import HoroscopeReadingTabs from "@/components/chat/horoscope-reading-tabs"
import type { HoroscopeBirthData } from "@/types/horoscope"
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
    Send,
    Share2,
    Square,
    ThumbsDown,
    ThumbsUp,
    Triangle,
    Minus,
    X,
    Sparkle,
    Share,
} from "lucide-react"

function formatHoroscopeLoadingText(
    _birth: HoroscopeBirthData | null | undefined,
    dots: number,
    consultingBase: string,
): string {
    return `${consultingBase}${".".repeat(dots)}`
}

function renderInlineBoldMarkdown(text: string): ReactNode[] {
    if (!text.includes("**")) return [text]

    const nodes: ReactNode[] = []
    let cursor = 0
    let key = 0

    while (cursor < text.length) {
        const open = text.indexOf("**", cursor)
        if (open === -1) {
            nodes.push(text.slice(cursor))
            break
        }

        const close = text.indexOf("**", open + 2)
        if (close === -1) {
            nodes.push(text.slice(cursor))
            break
        }

        if (open > cursor) {
            nodes.push(text.slice(cursor, open))
        }

        const boldText = text.slice(open + 2, close)
        if (boldText.trim().length === 0) {
            nodes.push("**" + boldText + "**")
        } else {
            nodes.push(<strong key={`bold-${key++}`}>{boldText}</strong>)
        }

        cursor = close + 2
    }

    return nodes
}

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

const TAROT_AI_HEADER_ROW_GAP_PX = 12
const TAROT_AI_HEADER_MEASURE_PAD_PX = 2
const TAROT_AI_HEADER_SCREEN_EDGE_PAD_PX = 12

function TarotInterpretationHeaderBar({
    isLoading,
    ...actionSectionProps
}: {
    isLoading: boolean
} & Omit<ActionSectionProps, "variant" | "compactAvailableWidthPx">) {
    const headerRowRef = useRef<HTMLDivElement>(null)
    const pillRef = useRef<HTMLDivElement>(null)
    const [compactAvailableWidthPx, setCompactAvailableWidthPx] = useState<
        number | undefined
    >(undefined)

    const measureAvailability = useCallback(() => {
        const rowEl = headerRowRef.current
        const pillEl = pillRef.current
        if (!rowEl || !pillEl || isLoading) return
        const rowRect = rowEl.getBoundingClientRect()
        const pillRect = pillEl.getBoundingClientRect()
        const fromFlexRow =
            rowRect.width -
            pillRect.width -
            TAROT_AI_HEADER_ROW_GAP_PX -
            TAROT_AI_HEADER_MEASURE_PAD_PX
        const screenW =
            typeof window !== "undefined" ? window.innerWidth : rowRect.width
        const fromScreenRight =
            screenW - pillRect.right - TAROT_AI_HEADER_SCREEN_EDGE_PAD_PX
        const next = Math.max(
            0,
            Math.min(fromFlexRow, fromScreenRight),
        )
        setCompactAvailableWidthPx((prev) =>
            prev !== undefined && Math.abs(prev - next) < 0.5 ? prev : next,
        )
    }, [isLoading])

    useLayoutEffect(() => {
        if (isLoading) return
        const run = () => {
            requestAnimationFrame(() => measureAvailability())
        }
        run()
        const ro = new ResizeObserver(run)
        const row = headerRowRef.current
        const pill = pillRef.current
        if (row) ro.observe(row)
        if (pill) ro.observe(pill)
        window.addEventListener("resize", run)
        window.visualViewport?.addEventListener("resize", run)
        return () => {
            ro.disconnect()
            window.removeEventListener("resize", run)
            window.visualViewport?.removeEventListener("resize", run)
        }
    }, [isLoading, measureAvailability])

    return (
        <div
            ref={headerRowRef}
            className='flex min-w-0 items-center justify-between gap-3'
        >
            <div
                ref={pillRef}
                className='flex w-fit shrink-0 items-center space-x-3 rounded-full bg-primary/20 px-4 py-2'
            >
                <Sparkle
                    fill='currentColor'
                    className='h-4 w-4 shrink-0 text-accent'
                />
                <div>
                    <p className='whitespace-nowrap text-sm text-accent'>
                        AI Interpretation
                    </p>
                </div>
            </div>
            {!isLoading && (
                <ActionSection
                    variant='compact'
                    compactAvailableWidthPx={compactAvailableWidthPx}
                    {...actionSectionProps}
                />
            )}
        </div>
    )
}

const PLANET_IMAGE_KEYS = new Set([
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "rahu",
    "ketu",
])

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
    horoscopeBirth: HoroscopeBirthData | null
    currentLocationFallback: {
        country?: string
        state?: string
        lat?: number
        lng?: number
        timezone?: number
    } | null
    isHoroscopeIntakeActive?: boolean
    isCheckingStars: boolean
    checkingStarsText: string
    showInsufficientStars: boolean
    insufficientStarsType?: "tarot" | "horoscope"
    cardDrawSection: ReactNode
    hasAssistantResponse: boolean
    disclaimerText: string
    birthFormTitle: string
    birthFormSubmit: string
    onRegenerateAt: (messageIndex: number) => void
    onStartEditAt: (messageIndex: number) => void
    onCancelEdit: () => void
    onSendEditAt: (messageIndex: number) => void
    onApplySuggestedQuestion: (value: string) => void
    onAskAspectDetail?: (
        question: string,
        aspectKey: string,
        event: SourceAspectEvent,
    ) => void
    onUserDateFormSubmit: (value: HoroscopeBirthData) => Promise<void>
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
    onReadAloud: (id: string, text: string) => void
    readAloudLoadingMessageId: string | null
    readAloudPlayingMessageId: string | null
    lastAssistantMessageRef: RefObject<HTMLDivElement | null>
    insufficientStarsRef: RefObject<HTMLDivElement | null>
    messagesEndRef: RefObject<HTMLDivElement | null>
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
    horoscopeBirth,
    currentLocationFallback,
    isHoroscopeIntakeActive = false,
    isCheckingStars,
    checkingStarsText,
    showInsufficientStars,
    insufficientStarsType = "tarot",
    cardDrawSection,
    hasAssistantResponse,
    disclaimerText,
    birthFormTitle,
    birthFormSubmit,
    onRegenerateAt,
    onStartEditAt,
    onCancelEdit,
    onSendEditAt,
    onApplySuggestedQuestion,
    onAskAspectDetail,
    onUserDateFormSubmit,
    onCancelHoroscopeLoading,
    onRegenerateHoroscope,
    onRegenerateTarot,
    onTarotInterpretationChange,
    onRefetchHoroscopeWithSystem,
    onToggleReaction,
    onReport,
    onShare,
    lastAssistantMessageRef,
    insufficientStarsRef,
    messagesEndRef,
}: MessageListProps) {
    const t = useTranslations("Home")
    const tReading = useTranslations("ReadingPage.interpretation")
    const tPanel = useTranslations("PlanetaryPanel")
    const consultingBase = t("consulting")
    const [panelDetailToggles, setPanelDetailToggles] = useState<
        Record<string, { birth: boolean; transit: boolean }>
    >({})

    const askedAspectKeys = useMemo(() => {
        const map: Record<string, string> = {}
        for (const m of messages) {
            if (m.sourceAspectKey) map[m.sourceAspectKey] = m.id
        }
        return map
    }, [messages])

    if (!hasMessages) return null

    return (
        <div className='flex-1 overflow-y-auto px-4 pt-6'>
            <div className='mx-auto max-w-3xl space-y-6 text-left'>
                {messages.map((message, messageIndex) => {
                    const detailToggle = panelDetailToggles[message.id] ?? {
                        birth: false,
                        transit: false,
                    }
                    const formattedTarotInterpretation =
                        message.variant === "box"
                            ? formatInterpretationBody(
                                  message.text || "",
                                  message.question,
                              )
                            : []
                    const showKeyMessage =
                        message.variant === "box" &&
                        shouldShowKeyMessage(
                            message.keyMessage,
                            message.text || "",
                        )
                    const tarotShareText =
                        message.variant === "box"
                            ? [
                                  message.question?.trim(),
                                  message.keyMessage?.trim(),
                                  message.text?.trim(),
                              ]
                                  .filter((s): s is string => Boolean(s))
                                  .join("\n\n")
                            : ""

                    // --- User message: user's question with edit/regenerate actions ---
                    if (message.role === "user") {
                        const isEditing = editingMessageId === message.id

                        return (
                            <div
                                key={message.id}
                                id={`msg-${message.id}`}
                                className='flex flex-col items-end gap-2'
                            >
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
                                                    onSendEditAt(messageIndex)
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
                                    ) : (
                                        message.text
                                    )}
                                </div>
                                <div className='flex items-center gap-2 text-[11px] text-white/60'>
                                    <button
                                        type='button'
                                        className='flex items-center justify-center h-6 w-6 rounded-full hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40'
                                        onClick={async () => {
                                            const text =
                                                message.text?.trim() ?? ""
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
                                                        t("copyPromptSuccess"),
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
                                            !message.text?.trim()
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
                                        disabled={consulting || isInterpreting}
                                        aria-label='Edit'
                                        title='Edit'
                                    >
                                        <Pencil className='w-3 h-3' />
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    // --- Tool message (birth/transit form): hide once horoscope result exists ---
                    if (
                        message.variant === "tool" &&
                        (message.toolType === "user-date-form" ||
                            message.toolType === "transit-date-form")
                    ) {
                        const hasHoroscopeResultAfter = messages
                            .slice(messageIndex + 1)
                            .some(
                                (m) =>
                                    m.variant === "horoscope" && !m.isLoading,
                            )
                        if (hasHoroscopeResultAfter) {
                            return null
                        }
                        // Hide birth form when we have saved data, unless user clicked loading to edit
                        if (
                            message.toolType === "user-date-form" &&
                            !message.toolFromCancel &&
                            hasCompleteBirthData(loadBirthFromStorage())
                        ) {
                            return null
                        }
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
                            {/* Tarot cards: shown for box variant when cards are drawn */}
                            {message.cards && message.cards.length > 0 && (
                                <div className='flex flex-wrap gap-6 w-full md:max-w-[85%]'>
                                    {message.cards.map((card, index) => {
                                        const cardCount =
                                            message.cards?.length || 0
                                        let spreadKey = "simple"
                                        if (cardCount === 1)
                                            spreadKey = "simple"
                                        else if (cardCount === 3)
                                            spreadKey = "general"
                                        else if (cardCount === 5)
                                            spreadKey = "detailed"
                                        else if (cardCount === 7)
                                            spreadKey = "expanded"
                                        else if (cardCount === 10)
                                            spreadKey = "celtic"
                                        else spreadKey = "unknown"

                                        const label =
                                            spreadKey !== "unknown"
                                                ? positionMeanings[spreadKey]?.[
                                                      index
                                                  ]
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
                                                                showLabel={
                                                                    false
                                                                }
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
                                                                !message
                                                                    .insights?.[
                                                                    index
                                                                ] ? (
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
                                                                            getText={(
                                                                                d,
                                                                            ) =>
                                                                                `${consultingBase}${".".repeat(d)}`
                                                                            }
                                                                        />
                                                                    </span>
                                                                ) : (
                                                                    message
                                                                        .insights?.[
                                                                        index
                                                                    ] ||
                                                                    `${consultingBase}...`
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
                                        <TarotInterpretationHeaderBar
                                            isLoading={!!message.isLoading}
                                            question={message.question}
                                            cards={message.cards?.map(
                                                (card) => card.meaning,
                                            )}
                                            interpretation={message.text}
                                            messageId={message.id}
                                            readingId={message.id}
                                            onRegenerateTarot={onRegenerateTarot}
                                            insights={message.insights}
                                            conclusion={
                                                message.followUpConclusion
                                            }
                                            spreadType={
                                                message.spreadType ?? undefined
                                            }
                                            cardsFull={message.cards}
                                            assistantText={
                                                messages
                                                    .slice(0, messageIndex)
                                                    .reverse()
                                                    .find(
                                                        (m) =>
                                                            m.role ===
                                                                "assistant" &&
                                                            m.variant ===
                                                                "plain",
                                                    )?.text
                                            }
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
                                        {!message.isLoading &&
                                            messageNotices[message.id] && (
                                                <p className='-mt-3 text-right text-[11px] text-white/45'>
                                                    {messageNotices[message.id]}
                                                </p>
                                            )}
                                        <div className='space-y-5 text-white/90 leading-relaxed'>
                                            {/* {!message.isLoading &&
                                                !!message.text?.trim() && (
                                                    <button
                                                        type='button'
                                                        className='inline-flex items-center justify-center h-5 w-5 rounded-full hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 align-middle mr-2'
                                                        onClick={() =>
                                                            onReadAloud(
                                                                message.id,
                                                                message.text,
                                                            )
                                                        }
                                                        disabled={
                                                            readAloudLoadingMessageId ===
                                                            message.id
                                                        }
                                                        aria-label={
                                                            readAloudPlayingMessageId ===
                                                            message.id
                                                                ? t(
                                                                      "readAloud.stop",
                                                                  )
                                                                : t(
                                                                      "readAloud.play",
                                                                  )
                                                        }
                                                        title={
                                                            readAloudPlayingMessageId ===
                                                            message.id
                                                                ? t(
                                                                      "readAloud.stop",
                                                                  )
                                                                : t(
                                                                      "readAloud.play",
                                                                  )
                                                        }
                                                    >
                                                        {readAloudLoadingMessageId ===
                                                        message.id ? (
                                                            <Loader2 className='w-3 h-3 animate-spin' />
                                                        ) : readAloudPlayingMessageId ===
                                                          message.id ? (
                                                            <Square className='w-3 h-3 fill-current' />
                                                        ) : (
                                                            <Volume2 className='w-3 h-3' />
                                                        )}
                                                    </button>
                                                )} */}
                                            {message.isLoading &&
                                            !message.text?.trim() ? (
                                                <span className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_-5px_rgba(56,189,248,0.3)] text-sm font-medium text-white/90'>
                                                    <Loader2 className='h-4 w-4 animate-spin shrink-0' />
                                                    <LoadingDotsText
                                                        active={
                                                            !!(
                                                                message.isLoading &&
                                                                !message.text?.trim()
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
                                                                        {
                                                                            message.keyMessage
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type='button'
                                                                    onClick={() =>
                                                                        onShare(
                                                                            message.id,
                                                                            tarotShareText ||
                                                                                message.text ||
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
                                                            (
                                                                paragraph,
                                                                paragraphIndex,
                                                            ) => (
                                                                <p
                                                                    key={`${message.id}-paragraph-${paragraphIndex}`}
                                                                >
                                                                    {renderInlineBoldMarkdown(
                                                                        paragraph,
                                                                    )}
                                                                </p>
                                                            ),
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {!message.isLoading && (
                                            <div className='pt-4 border-t border-white/5 space-y-4'>
                                                {/* <div className='grid grid-cols-3 gap-2'>
                                                    <button
                                                        type='button'
                                                        onClick={() =>
                                                            handleCopyReading(
                                                                message.id,
                                                                message.text ||
                                                                    "",
                                                            )
                                                        }
                                                        className='inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-transparent px-3 text-[13px] font-medium text-white/78 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white'
                                                    >
                                                        {copiedReadingId ===
                                                        message.id
                                                            ? tReading(
                                                                  "actions.copiedLink",
                                                              )
                                                            : tReading(
                                                                  "actions.copyResult",
                                                              )}
                                                    </button>
                                                    <button
                                                        type='button'
                                                        onClick={() =>
                                                            onShare(
                                                                message.id,
                                                                message.text ||
                                                                    "",
                                                            )
                                                        }
                                                        className='inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-transparent px-3 text-[13px] font-medium text-white/78 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white'
                                                    >
                                                        {tReading(
                                                            "actions.share",
                                                        )}
                                                    </button>
                                                    <button
                                                        type='button'
                                                        onClick={() =>
                                                            onApplySuggestedQuestion(
                                                                tarotFollowUpPrompt,
                                                            )
                                                        }
                                                        className='inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-transparent px-3 text-[13px] font-medium text-white/78 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white'
                                                    >
                                                        {tReading(
                                                            "actions.askFollowUp",
                                                        )}
                                                    </button>
                                                </div> */}
                                                <ShareSection
                                                    variant='embedded'
                                                    question={message.question}
                                                    cards={message.cards?.map(
                                                        (card) => card.meaning,
                                                    )}
                                                    interpretation={
                                                        message.text
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {(message.followUpConclusion ||
                                        (Array.isArray(
                                            message.followUpSuggestions,
                                        ) &&
                                            message.followUpSuggestions.length >
                                                0)) && (
                                        <div className='w-full md:max-w-[85%] space-y-2 pt-4'>
                                            {message.followUpLoading && (
                                                <p className='text-xs sm:text-sm text-white/60'>
                                                    Thinking of a good next
                                                    question...
                                                </p>
                                            )}
                                            {message.followUpConclusion && (
                                                <p className='text-white'>
                                                    {renderInlineBoldMarkdown(
                                                        message.followUpConclusion,
                                                    )}
                                                </p>
                                            )}
                                            {Array.isArray(
                                                message.followUpSuggestions,
                                            ) &&
                                                message.followUpSuggestions
                                                    .length > 0 && (
                                                    <div className='flex flex-wrap gap-2'>
                                                        {message.followUpSuggestions.map(
                                                            (s) => (
                                                                <button
                                                                    key={s}
                                                                    type='button'
                                                                    onClick={() =>
                                                                        onApplySuggestedQuestion(
                                                                            s,
                                                                        )
                                                                    }
                                                                    className='rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-1.5 text-xs text-left text-white/80 hover:text-white'
                                                                >
                                                                    {s}
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                </>
                            ) : /* Horoscope variant: birth chart, astrology interpretation, actions, share */
                            message.variant === "horoscope" ? (
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
                                            message={message}
                                            onApplySuggestedQuestion={
                                                onApplySuggestedQuestion
                                            }
                                            aspectPanel={
                                                <RealtimePlanetaryPanel
                                                    chartData={
                                                        message.chartData
                                                    }
                                                    personalizedTransitAspects={
                                                        message.personalizedTransitAspects
                                                    }
                                                    personalizedTransitAspectsMerged={
                                                        message.personalizedTransitAspectsMerged
                                                    }
                                                    aspectInsights={
                                                        message.aspectInsights
                                                    }
                                                    onAskAspectDetail={
                                                        onAskAspectDetail
                                                    }
                                                    askedAspectKeys={
                                                        askedAspectKeys
                                                    }
                                                    showBirthDetails={
                                                        detailToggle.birth
                                                    }
                                                    showTransitDetails={
                                                        detailToggle.transit
                                                    }
                                                    onToggleBirthDetails={() =>
                                                        setPanelDetailToggles(
                                                            (prev) => ({
                                                                ...prev,
                                                                [message.id]: {
                                                                    birth: !(
                                                                        prev[
                                                                            message
                                                                                .id
                                                                        ]
                                                                            ?.birth ??
                                                                        false
                                                                    ),
                                                                    transit:
                                                                        prev[
                                                                            message
                                                                                .id
                                                                        ]
                                                                            ?.transit ??
                                                                        false,
                                                                },
                                                            }),
                                                        )
                                                    }
                                                    onToggleTransitDetails={() =>
                                                        setPanelDetailToggles(
                                                            (prev) => ({
                                                                ...prev,
                                                                [message.id]: {
                                                                    birth:
                                                                        prev[
                                                                            message
                                                                                .id
                                                                        ]
                                                                            ?.birth ??
                                                                        false,
                                                                    transit: !(
                                                                        prev[
                                                                            message
                                                                                .id
                                                                        ]
                                                                            ?.transit ??
                                                                        false
                                                                    ),
                                                                },
                                                            }),
                                                        )
                                                    }
                                                    birthDetailsContent={
                                                        message.chartData &&
                                                        !message.isLoading ? (
                                                            <BirthChartCard
                                                                chartData={
                                                                    message.chartData as Parameters<
                                                                        typeof BirthChartCard
                                                                    >[0]["chartData"]
                                                                }
                                                                question={
                                                                    message.question
                                                                }
                                                                planetMeanings={
                                                                    message.planetMeanings ??
                                                                    undefined
                                                                }
                                                                houseMeanings={
                                                                    message.houseMeanings ??
                                                                    undefined
                                                                }
                                                                onRefetchWithSystem={(
                                                                    system,
                                                                ) =>
                                                                    onRefetchHoroscopeWithSystem(
                                                                        message.id,
                                                                        system,
                                                                    )
                                                                }
                                                                showBirthDetails
                                                                renderFromPanel
                                                            />
                                                        ) : undefined
                                                    }
                                                    transitDetailsContent={
                                                        message.chartData &&
                                                        !message.isLoading ? (
                                                            <BirthChartCard
                                                                chartData={
                                                                    message.chartData as Parameters<
                                                                        typeof BirthChartCard
                                                                    >[0]["chartData"]
                                                                }
                                                                question={
                                                                    message.question
                                                                }
                                                                planetMeanings={
                                                                    message.planetMeanings ??
                                                                    undefined
                                                                }
                                                                houseMeanings={
                                                                    message.houseMeanings ??
                                                                    undefined
                                                                }
                                                                onRefetchWithSystem={(
                                                                    system,
                                                                ) =>
                                                                    onRefetchHoroscopeWithSystem(
                                                                        message.id,
                                                                        system,
                                                                    )
                                                                }
                                                                showTransitDetails
                                                                renderFromPanel
                                                            />
                                                        ) : undefined
                                                    }
                                                />
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
                                                                {renderInlineBoldMarkdown(
                                                                    message.followUpConclusion,
                                                                )}
                                                            </p>
                                                        )}
                                                        <ShareSection
                                                            variant='embedded'
                                                            question={
                                                                message.question
                                                            }
                                                            interpretation={
                                                                message.text
                                                            }
                                                        />
                                                        <div className='space-y-2'>
                                                            <p className='text-[11px] uppercase tracking-[0.2em] text-white/50'>
                                                                Actions
                                                            </p>
                                                            <ActionSection
                                                                variant='embedded'
                                                                mode='horoscope'
                                                                question={
                                                                    message.question
                                                                }
                                                                interpretation={
                                                                    message.text
                                                                }
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
                            ) : /* Tool variant: inline birth/transit date form */
                            message.variant === "tool" &&
                              message.toolType ===
                                  "user-date-form" ? null : message.variant ===
                              "tool" ? (
                                <InlineUserDateForm
                                    initial={
                                        message.toolBirthPrefill ||
                                        horoscopeBirth
                                    }
                                    currentLocation={currentLocationFallback}
                                    onSubmit={onUserDateFormSubmit}
                                    title={birthFormTitle}
                                    submitLabel={birthFormSubmit}
                                    variant='inlineSticky'
                                />
                            ) : (
                                /* Plain variant: simple assistant text (chat decision, bridge message) */
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
                                        {/* {!message.isLoading &&
                                        !!message.text?.trim() && (
                                            <button
                                                type='button'
                                                className='inline-flex items-center justify-center h-5 w-5 rounded-full hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 align-middle mr-1'
                                                onClick={() =>
                                                    onReadAloud(
                                                        message.id,
                                                        message.text,
                                                    )
                                                }
                                                disabled={
                                                    readAloudLoadingMessageId ===
                                                    message.id
                                                }
                                                aria-label={
                                                    readAloudPlayingMessageId ===
                                                    message.id
                                                        ? t("readAloud.stop")
                                                        : t("readAloud.play")
                                                }
                                                title={
                                                    readAloudPlayingMessageId ===
                                                    message.id
                                                        ? t("readAloud.stop")
                                                        : t("readAloud.play")
                                                }
                                            >
                                                {readAloudLoadingMessageId ===
                                                message.id ? (
                                                    <Loader2 className='w-3 h-3 animate-spin' />
                                                ) : readAloudPlayingMessageId ===
                                                  message.id ? (
                                                    <Square className='w-3 h-3 fill-current' />
                                                ) : (
                                                    <Volume2 className='w-3 h-3' />
                                                )}
                                            </button>
                                        )} */}
                                        {message.isLoading &&
                                        !message.text?.trim() ? (
                                            <span className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_-5px_rgba(56,189,248,0.3)] text-sm font-medium text-white/90'>
                                                <Loader2 className='h-4 w-4 animate-spin shrink-0' />
                                                <LoadingDotsText
                                                    active={
                                                        !!(
                                                            message.isLoading &&
                                                            !message.text?.trim()
                                                        )
                                                    }
                                                    getText={(d) =>
                                                        `${consultingBase}${".".repeat(d)}`
                                                    }
                                                />
                                            </span>
                                        ) : (
                                            renderInlineBoldMarkdown(
                                                message.text || "",
                                            )
                                        )}
                                    </div>
                                </>
                            )}
                            {message.role === "assistant" &&
                                message.variant !== "tool" &&
                                message.streamStopped && (
                                    <div className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_-5px_rgba(56,189,248,0.3)] text-sm font-medium text-white/90'>
                                        <Square className='h-3.5 w-3.5 shrink-0 fill-current' />
                                        {t("streamStopped")}
                                    </div>
                                )}
                            {/* Assistant actions: like/dislike/report/share (plain only) */}
                            {message.role === "assistant" &&
                                message.variant !== "tool" && (
                                    <div className='flex items-center gap-2 text-[11px] text-white/60'>
                                        {!isChatLoading &&
                                            message.variant === "plain" &&
                                            !hasInterpretation && (
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
                                                                message.text,
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
                                                                message.text,
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
                            <ConsultingBadge
                                label={
                                    isHoroscopeIntakeActive
                                        ? t("enterBirthDate")
                                        : consultingBase
                                }
                            />
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
    )
}
