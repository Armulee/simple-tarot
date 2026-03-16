"use client"

import Image from "next/image"
import {
    type Dispatch,
    type ReactNode,
    type RefObject,
    type SetStateAction,
    useMemo,
    useState,
} from "react"
import { Badge } from "@/components/ui/badge"
import { CardImage } from "@/components/card-image"
import ActionSection from "@/components/tarot/interpretation/action"
import ShareSection from "@/components/tarot/interpretation/share"
import InsufficientStarsBlock from "@/components/stars/insufficient-stars-block"
import { ConsultingBadge } from "@/components/consulting-badge"
import { hasCompleteBirthData, loadBirthFromStorage } from "@/lib/birth-storage"
import InlineUserDateForm from "@/components/astrology/inline-user-date-form"
import { BirthChartCard } from "@/components/astrology/birth-chart-card"
import RealtimePlanetaryPanel from "@/components/astrology/realtime-planetary-panel"
import AutoHeightTextarea from "@/components/ui/auto-height-textarea"
import type { HoroscopeBirthData } from "@/types/horoscope"
import type { ChatMessage, SourceAspectEvent } from "./types"
import { useTranslations } from "next-intl"
import {
    ChevronDown,
    ChevronRight,
    Flag,
    Layers,
    Loader2,
    MoveHorizontal,
    Pencil,
    RotateCw,
    Send,
    Share2,
    Sparkles,
    Square,
    ThumbsDown,
    ThumbsUp,
    Triangle,
    Minus,
    X,
} from "lucide-react"

function formatHoroscopeLoadingText(
    birth: HoroscopeBirthData | null | undefined,
    dots: number,
    consultingBase: string,
): string {
    if (!birth?.day || !birth?.month || !birth?.year) {
        return `${consultingBase}${".".repeat(dots)}`
    }
    const date = new Date(birth.year, birth.month - 1, birth.day)
    const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
    let suffix = ""
    if (birth.hour != null && birth.minute != null) {
        const h = birth.hour
        const ampm = h >= 12 ? "PM" : "AM"
        const displayHour = h % 12 || 12
        suffix = `, ${displayHour}:${String(birth.minute).padStart(2, "0")} ${ampm}`
    } else if (birth.timeHint === "day") {
        suffix = " (daytime)"
    } else if (birth.timeHint === "night") {
        suffix = " (nighttime)"
    }
    return `${dateStr}${suffix}${".".repeat(dots)}`
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
    loadingDots: number
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
    isCheckingStars: boolean
    checkingStarsText: string
    showInsufficientStars: boolean
    insufficientStarsType?: "tarot" | "horoscope"
    cardDrawSection: ReactNode
    hasAssistantResponse: boolean
    disclaimerText: string
    birthFormTitle: string
    birthFormSubmit: string
    birthFormSecondaryActionLabel?: string
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
    onBirthFormSecondaryAction?: () => void
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
    loadingDots,
    positionMeanings,
    hasInterpretation,
    assistantReactions,
    messageNotices,
    horoscopeBirth,
    currentLocationFallback,
    isCheckingStars,
    checkingStarsText,
    showInsufficientStars,
    insufficientStarsType = "tarot",
    cardDrawSection,
    hasAssistantResponse,
    disclaimerText,
    birthFormTitle,
    birthFormSubmit,
    birthFormSecondaryActionLabel,
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
    onBirthFormSecondaryAction,
    lastAssistantMessageRef,
    insufficientStarsRef,
    messagesEndRef,
}: MessageListProps) {
    const t = useTranslations("Home")
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
                                                                className='bg-white/20 text-white/90 border-primary/30 truncate block max-w-full text-[10px]'
                                                            >
                                                                {card.meaning}
                                                            </Badge>
                                                        </div>
                                                        <div className='w-fit px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md relative group/insight animate-fade-in shadow-lg'>
                                                            <div className='absolute -top-1 -left-1 w-2 h-2 border-t border-l border-primary/40 rounded-tl-sm' />
                                                            <div className='absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-primary/40 rounded-br-sm' />
                                                            <p className='text-[10px] font-serif italic text-indigo-100 leading-relaxed'>
                                                                &ldquo;
                                                                {message.isLoading &&
                                                                !message
                                                                    .insights?.[
                                                                    index
                                                                ] ? (
                                                                    <span className='inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-2 py-1 backdrop-blur-xl shadow-[0_0_12px_-3px_rgba(56,189,248,0.3)] text-[10px] font-medium text-white/90'>
                                                                        <Loader2 className='h-2.5 w-2.5 animate-spin shrink-0' />
                                                                        {`${consultingBase}${".".repeat(
                                                                            loadingDots,
                                                                        )}`}
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
                                    <div className='w-full md:max-w-[85%] rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg space-y-6'>
                                        <div className='flex items-center space-x-3'>
                                            <div className='w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center'>
                                                <Sparkles className='w-5 h-5 text-primary' />
                                            </div>
                                            <div>
                                                <h2 className='font-serif font-semibold text-xl text-white'>
                                                    Interpretation
                                                </h2>
                                                <p className='text-sm text-white/40'>
                                                    AI-powered tarot reading
                                                </p>
                                            </div>
                                        </div>
                                        <div className='text-white/90 leading-relaxed whitespace-pre-wrap'>
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
                                                    {`${consultingBase}${".".repeat(
                                                        loadingDots,
                                                    )}`}
                                                </span>
                                            ) : (
                                                renderInlineBoldMarkdown(
                                                    message.text || "",
                                                )
                                            )}
                                        </div>
                                        {!message.isLoading && (
                                            <div className='pt-4 border-t border-white/5 space-y-4'>
                                                <div className='space-y-2'>
                                                    <p className='text-[11px] uppercase tracking-[0.2em] text-white/50'>
                                                        Actions
                                                    </p>
                                                    <ActionSection
                                                        variant='embedded'
                                                        question={
                                                            message.question
                                                        }
                                                        cards={message.cards?.map(
                                                            (card) =>
                                                                card.meaning,
                                                        )}
                                                        interpretation={
                                                            message.text
                                                        }
                                                        messageId={message.id}
                                                        readingId={message.id}
                                                        onRegenerateTarot={
                                                            onRegenerateTarot
                                                        }
                                                        insights={
                                                            message.insights
                                                        }
                                                        conclusion={
                                                            message.followUpConclusion
                                                        }
                                                        spreadType={
                                                            message.spreadType ??
                                                            undefined
                                                        }
                                                        cardsFull={
                                                            message.cards
                                                        }
                                                        assistantText={
                                                            messages
                                                                .slice(
                                                                    0,
                                                                    messageIndex,
                                                                )
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
                                                                ? (
                                                                      text: string,
                                                                  ) =>
                                                                      onTarotInterpretationChange(
                                                                          message.id,
                                                                          text,
                                                                      )
                                                                : undefined
                                                        }
                                                    />
                                                </div>
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
                                    <div className='w-full md:max-w-[85%] space-y-6'>
                                        <RealtimePlanetaryPanel
                                            chartData={message.chartData}
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
                                            askedAspectKeys={askedAspectKeys}
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
                                                                prev[message.id]
                                                                    ?.birth ??
                                                                false
                                                            ),
                                                            transit:
                                                                prev[message.id]
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
                                                                prev[message.id]
                                                                    ?.birth ??
                                                                false,
                                                            transit: !(
                                                                prev[message.id]
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
                                        <div className='rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg space-y-6'>
                                            <div className='flex items-center space-x-3'>
                                                <div className='w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center'>
                                                    <Sparkles className='w-5 h-5 text-primary' />
                                                </div>
                                                <div>
                                                    <h2 className='font-serif font-semibold text-xl text-white'>
                                                        Interpretation
                                                    </h2>
                                                    <p className='text-sm text-white/40'>
                                                        AI-powered astrology
                                                        reading
                                                    </p>
                                                </div>
                                            </div>
                                            <div className='text-white/90 leading-relaxed whitespace-pre-wrap'>
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
                                                {renderInlineBoldMarkdown(
                                                    message.text || "",
                                                )}
                                                {message.isLoading && (
                                                    <div className='mt-3'>
                                                        <button
                                                            type='button'
                                                            onClick={
                                                                onCancelHoroscopeLoading
                                                            }
                                                            title='Click to cancel and edit birth details'
                                                            className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_-5px_rgba(56,189,248,0.3)] text-sm font-medium text-white/90 hover:text-white transition-colors cursor-pointer'
                                                        >
                                                            <Square className='h-3.5 w-3.5 shrink-0 fill-current' />
                                                            <Loader2 className='h-4 w-4 animate-spin shrink-0' />
                                                            {formatHoroscopeLoadingText(
                                                                message.horoscopeBirthData,
                                                                loadingDots,
                                                                consultingBase,
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {!message.isLoading && (
                                                <div className='pt-4 border-t border-white/5 space-y-4'>
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
                                                    <ShareSection
                                                        variant='embedded'
                                                        question={
                                                            message.question
                                                        }
                                                        interpretation={
                                                            message.text
                                                        }
                                                    />
                                                    {message.chartData && (
                                                        <ChartDataCollapsible
                                                            chartData={
                                                                message.chartData
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {!message.isLoading &&
                                        (message.followUpConclusion ||
                                            (Array.isArray(
                                                message.followUpSuggestions,
                                            ) &&
                                                message.followUpSuggestions
                                                    .length > 0)) && (
                                            <div className='w-full md:max-w-[85%] space-y-2 pt-4'>
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
                            ) : /* Tool variant: inline birth/transit date form */
                            message.variant === "tool" ? (
                                <InlineUserDateForm
                                    initial={
                                        message.toolBirthPrefill ||
                                        horoscopeBirth
                                    }
                                    currentLocation={currentLocationFallback}
                                    onSubmit={onUserDateFormSubmit}
                                    title={birthFormTitle}
                                    submitLabel={birthFormSubmit}
                                    secondaryActionLabel={
                                        birthFormSecondaryActionLabel
                                    }
                                    onSecondaryAction={
                                        onBirthFormSecondaryAction
                                    }
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
                                                {`${consultingBase}${".".repeat(
                                                    loadingDots,
                                                )}`}
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
                {consulting &&
                    messages.length > 0 &&
                    !messages.some(
                        (m) => m.variant === "horoscope" && m.isLoading,
                    ) &&
                    !messages.some(
                        (m) => m.variant === "plain" && m.isLoading,
                    ) && (
                        <div className='flex flex-col items-start gap-4'>
                            <ConsultingBadge />
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
                            <InsufficientStarsBlock type={insufficientStarsType} />
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
