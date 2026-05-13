"use client"

import { useEffect, useMemo, useState, useCallback, useRef, useLayoutEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Search, Calendar, X, Star, Sparkles, Trash2, Loader2, MoreHorizontal, ExternalLink, Link2, Share2, BookOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useTranslations, useLocale } from 'next-intl'
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type ChatMessage = {
    id: string
    role: "user" | "assistant"
    text: string
    cards?: { name: string; isReversed: boolean }[]
}

type ChatDecision = {
    type: "chat" | "draw"
    spreadType: string
    cardCount: number
    assistantText?: string
}

type ReadingMeta = {
    id: string
    question: string
    topic: string | null
    created_at: string
    updated_at: string
}

type ReadingRow = ReadingMeta & {
    messages: ChatMessage[]
    decision: ChatDecision | null
}

type CardData = { name: string; isReversed: boolean }

type DetailStatus = "pending" | "loading" | "loaded" | "error"

const HISTORY_CACHE_VERSION = 1 as const
const MAX_CACHED_DETAILS = 80
const DETAIL_FETCH_CONCURRENCY = 4

type HistoryCachePayload = {
    v: typeof HISTORY_CACHE_VERSION
    userId: string
    list: ReadingMeta[]
    details: Record<string, ReadingRow>
    savedAt: number
}

function cacheKeyForUser(userId: string) {
    return `reading-history-cache:v${HISTORY_CACHE_VERSION}:${userId}`
}

function readHistoryCache(userId: string): HistoryCachePayload | null {
    if (typeof window === "undefined") return null
    try {
        const raw = sessionStorage.getItem(cacheKeyForUser(userId))
        if (!raw) return null
        const parsed = JSON.parse(raw) as HistoryCachePayload
        if (parsed.v !== HISTORY_CACHE_VERSION || parsed.userId !== userId || !Array.isArray(parsed.list)) {
            return null
        }
        return parsed
    } catch {
        return null
    }
}

function writeHistoryCache(payload: HistoryCachePayload) {
    if (typeof window === "undefined") return
    try {
        const nextDetails: Record<string, ReadingRow> = {}
        let n = 0
        for (const row of payload.list) {
            const d = payload.details[row.id]
            if (d && n < MAX_CACHED_DETAILS) {
                nextDetails[row.id] = d
                n++
            }
        }
        sessionStorage.setItem(
            cacheKeyForUser(payload.userId),
            JSON.stringify({
                ...payload,
                details: nextDetails,
            })
        )
    } catch {
        // ignore quota / private mode
    }
}

// Helper function to clean card name for image path
const cleanCardName = (cardName: string) => {
    return cardName
        .toLowerCase()
        .replace(/\s*\(reversed\)/g, "")
        .replace(/\s*reversed/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
}

// Helper function to format date like billing page
const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString)
    return {
        date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }),
        time: date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }),
    }
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayString = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
}


const CardStack = ({
    cards,
    showImages,
}: {
    cards: CardData[]
    showImages: boolean
}) => {
    if (!cards || cards.length === 0) return null

    const cleanName = (card: CardData) => {
        const name = card.name || ''
        return cleanCardName(name)
    }

    const isReversed = (card: CardData) => {
        const name = card.name || ''
        return name.toLowerCase().includes("reversed") || card.isReversed
    }

    if (!showImages) {
        if (cards.length === 1) {
            return <Skeleton className="w-12 h-[4.5rem] rounded-lg shrink-0" />
        }
        return (
            <div className="relative flex items-center h-16 w-20">
                {cards.slice(0, 3).map((_, index) => (
                    <Skeleton
                        key={index}
                        className="absolute top-0 rounded-md h-14 w-9"
                        style={{
                            left: `${index * 12}px`,
                            zIndex: index,
                            transform: `rotate(${(index - (Math.min(cards.length, 3) - 1) / 2) * 10}deg)`,
                            transformOrigin: 'bottom center'
                        }}
                    />
                ))}
            </div>
        )
    }

    if (cards.length === 1) {
        const card = cards[0]
        return (
            <div className="relative w-12 rounded-lg overflow-hidden border border-border/30 shadow-lg group-hover/card:scale-110 transition-transform duration-300">
                <Image
                    src={`/assets/rider-waite-tarot/${cleanName(card)}.png`}
                    alt="Tarot Card"
                    width={48}
                    height={0}
                    className={cn(
                        "w-full h-auto object-cover transition-transform duration-300",
                        isReversed(card) && "rotate-180"
                    )}
                />
            </div>
        )
    }

    return (
        <div className="relative flex items-center h-16 w-20">
            {cards.slice(0, 3).map((card, index) => (
                <div
                    key={index}
                    className="absolute top-0 rounded-md overflow-hidden border border-border/40 shadow-md transition-all duration-300 group-hover/card:scale-105"
                    style={{
                        width: '36px',
                        left: `${index * 12}px`,
                        zIndex: index,
                        transform: `rotate(${(index - (cards.length - 1) / 2) * 10}deg)`,
                        transformOrigin: 'bottom center'
                    }}
                >
                    <Image
                        src={`/assets/rider-waite-tarot/${cleanName(card)}.png`}
                        alt="Tarot Card"
                        width={36}
                        height={0}
                        className={cn(
                            "w-full h-auto object-cover",
                            isReversed(card) && "rotate-180"
                        )}
                    />
                </div>
            ))}
            {cards.length > 3 && (
                <div 
                    className="absolute right-0 bottom-0 bg-primary/80 text-[10px] text-white px-1 rounded-sm z-10 font-bold"
                    style={{ transform: 'translate(20%, 20%)' }}
                >
                    +{cards.length - 3}
                </div>
            )}
        </div>
    )
}

// ReadingCard component with swipe-to-delete functionality
const ReadingCard = ({
    reading,
    detailsLoaded,
    detailFetching,
    detailPending,
    detailError,
    t,
    locale,
    onDelete,
    session,
}: {
    reading: ReadingRow
    detailsLoaded: boolean
    detailFetching: boolean
    detailPending: boolean
    detailError: boolean
    t: (key: string) => string
    locale: string
    onDelete: (id: string) => void
    session: { access_token: string } | null
}) => {
    const { date, time } = formatDateForDisplay(reading.created_at)
    const [swipeX, setSwipeX] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showCardImages, setShowCardImages] = useState(false)
    const startXRef = useRef(0)
    const currentXRef = useRef(0)
    const cardRef = useRef<HTMLDivElement>(null)
    
    // Extract latest cards from messages
    const latestCardsMessage = detailsLoaded
        ? [...reading.messages].reverse().find(m => m.cards && m.cards.length > 0)
        : undefined
    const latestCards = latestCardsMessage?.cards || []

    // Get last user question
    const lastUserMessage = detailsLoaded
        ? [...reading.messages].reverse().find(m => m.role === "user")
        : undefined
    const lastQuestion = lastUserMessage?.text || reading.question

    useLayoutEffect(() => {
        if (!detailsLoaded) {
            setShowCardImages(false)
            return
        }
        let cancelled = false
        const id = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!cancelled) setShowCardImages(true)
            })
        })
        return () => {
            cancelled = true
            cancelAnimationFrame(id)
        }
    }, [detailsLoaded, reading.id])

    const DELETE_THRESHOLD = -80 // How far to swipe to reveal delete button
    const MAX_SWIPE = -100 // Maximum swipe distance

    const handleTouchStart = (e: React.TouchEvent) => {
        startXRef.current = e.touches[0].clientX
        currentXRef.current = swipeX
        setIsDragging(true)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return
        const deltaX = e.touches[0].clientX - startXRef.current
        const newX = Math.max(MAX_SWIPE, Math.min(0, currentXRef.current + deltaX))
        setSwipeX(newX)
    }

    const handleTouchEnd = () => {
        setIsDragging(false)
        // Snap to either open or closed position
        if (swipeX < DELETE_THRESHOLD / 2) {
            setSwipeX(DELETE_THRESHOLD)
        } else {
            setSwipeX(0)
        }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        startXRef.current = e.clientX
        currentXRef.current = swipeX
        setIsDragging(true)
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        const deltaX = e.clientX - startXRef.current
        const newX = Math.max(MAX_SWIPE, Math.min(0, currentXRef.current + deltaX))
        setSwipeX(newX)
    }

    const handleMouseUp = () => {
        if (!isDragging) return
        setIsDragging(false)
        if (swipeX < DELETE_THRESHOLD / 2) {
            setSwipeX(DELETE_THRESHOLD)
        } else {
            setSwipeX(0)
        }
    }

    const handleMouseLeave = () => {
        if (isDragging) {
            handleMouseUp()
        }
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (isDeleting) return
        setIsDeleting(true)

        try {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            }
            if (session?.access_token) {
                headers["Authorization"] = `Bearer ${session.access_token}`
            }

            const response = await fetch(`/api/chat-sessions/${reading.id}`, {
                method: "DELETE",
                headers,
            })

            if (response.ok) {
                toast.success(t("deleteSuccess") || "Reading deleted successfully")
                onDelete(reading.id)
            } else {
                const data = await response.json()
                toast.error(data.error || t("deleteError") || "Failed to delete reading")
                setIsDeleting(false)
                setSwipeX(0)
            }
        } catch {
            toast.error(t("deleteError") || "Failed to delete reading")
            setIsDeleting(false)
            setSwipeX(0)
        }
    }

    const resetSwipe = () => {
        setSwipeX(0)
    }

    const router = useRouter()

    const getReadingUrl = () =>
        typeof window !== "undefined"
            ? `${window.location.origin}/${locale}/${reading.id}`
            : ""

    const handleCopyLink = async () => {
        const url = getReadingUrl()
        try {
            await navigator.clipboard.writeText(url)
            toast.success(t("contextMenu.linkCopied") || "Link copied to clipboard")
        } catch {
            toast.error(t("contextMenu.shareError") || "Could not share")
        }
    }

    const handleShare = async () => {
        const url = getReadingUrl()
        const title = reading.topic || reading.question || "Tarot Reading"
        const text = `"${title}" — AI tarot reading`
        try {
            if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                await navigator.share({
                    title: "AskingFate",
                    text,
                    url,
                })
            } else {
                await handleCopyLink()
            }
        } catch {
            await handleCopyLink()
        }
    }

    const handleOpenInNewTab = () => {
        window.open(getReadingUrl(), "_blank", "noopener,noreferrer")
    }

    const handleOpenReading = () => {
        router.push(`/${locale}/${reading.id}`)
    }

    const handleContextDelete = (e: Event) => {
        e.preventDefault()
        handleDelete(e as unknown as React.MouseEvent)
    }

    const titleText = reading.topic || reading.question || t("noQuestion")
    const showLastQuestion =
        detailsLoaded &&
        lastQuestion &&
        lastQuestion !== (reading.topic || reading.question)

    return (
        <div 
            className="relative overflow-hidden rounded-xl"
            ref={cardRef}
            onMouseLeave={handleMouseLeave}
        >
            {/* Delete button background */}
            <div className="absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-red-600 to-red-500 rounded-r-xl">
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex flex-col items-center justify-center w-20 h-full text-white hover:bg-red-700 transition-colors"
                >
                    {isDeleting ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <>
                            <Trash2 className="w-6 h-6 mb-1" />
                            <span className="text-xs font-medium">{t("delete") || "Delete"}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Swipeable card content with context menu */}
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        className="relative transition-transform duration-200 ease-out"
                        style={{ 
                            transform: `translateX(${swipeX}px)`,
                            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                        }}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    >
                <Link
                    href={`/${locale}/${reading.id}`}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
                    onClick={(e) => {
                        // Prevent navigation if swiped
                        if (swipeX < -10) {
                            e.preventDefault()
                            resetSwipe()
                        }
                    }}
                >
                    <Card
                        className={cn(
                            "group/card relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 bg-slate-950 border-yellow-400/20 z-10",
                            "cursor-pointer",
                            swipeX < 0 && "hover:scale-100" // Disable hover scale when swiped
                        )}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

                        {/* Date and Time badges */}
                        <div className="absolute top-3 left-3 flex space-x-2">
                            <Badge
                                variant="outline"
                                className={"bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-200 border-yellow-400/40 text-xs font-medium shadow-lg shadow-yellow-400/20 backdrop-blur-sm hover:from-yellow-400/30 hover:to-orange-500/30 transition-all duration-300"}
                            >
                                {date}
                            </Badge>
                            <Badge
                                variant="outline"
                                className={"bg-gradient-to-r from-purple-400/20 to-pink-500/20 text-purple-200 border-purple-400/40 text-xs font-medium shadow-lg shadow-purple-400/20 backdrop-blur-sm hover:from-purple-400/30 hover:to-pink-500/30 transition-all duration-300"}
                            >
                                {time}
                            </Badge>
                        </div>

                        <CardContent className="relative px-4 pt-12 pb-4">
                            <div className="flex items-start gap-4">
                                {/* Card stack (left) — images still deferred via showCardImages */}
                                <div className="flex-shrink-0 pt-1">
                                    {detailsLoaded && latestCards.length > 0 ? (
                                        <CardStack cards={latestCards} showImages={showCardImages} />
                                    ) : detailFetching ? (
                                        <div className="flex h-16 w-20 items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : detailError ? (
                                        <div className="h-16 w-12 flex items-center justify-center" aria-hidden />
                                    ) : (
                                        <div className="h-16 w-12" aria-hidden />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <h3 className="font-serif font-semibold text-lg leading-tight group-hover/card:text-primary transition-colors duration-300 line-clamp-1">
                                                {titleText}
                                            </h3>
                                            {detailFetching && (
                                                <div className="space-y-2 mt-1">
                                                    <Skeleton className="h-3 w-2/3 max-w-xs" />
                                                    <Skeleton className="h-3 w-full max-w-md" />
                                                    <Skeleton className="h-3 w-5/6 max-w-sm" />
                                                </div>
                                            )}
                                            {showLastQuestion && (
                                                <p className="text-muted-foreground/60 text-xs line-clamp-1 italic">
                                                    Last: {lastQuestion}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {detailsLoaded && latestCardsMessage?.text && (
                                        <p className="text-muted-foreground/80 text-sm line-clamp-2 leading-relaxed">
                                            {latestCardsMessage.text}
                                        </p>
                                    )}
                                    {detailError && (
                                        <p className="text-muted-foreground/60 text-xs">
                                            {t("errorDesc")}
                                        </p>
                                    )}
                                    {detailPending && !detailFetching && !detailError && (
                                        <p className="text-muted-foreground/40 text-xs">
                                            {t("loading") || "Loading…"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* More options button */}
                <div className="absolute top-3 right-3 z-20">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                                onPointerDown={(e) => {
                                    e.stopPropagation()
                                }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                            className="w-32 p-1 bg-slate-900 border-slate-800 shadow-xl" 
                            align="end"
                            onPointerDown={(e) => {
                                e.stopPropagation()
                            }}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                            }}
                        >
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-colors text-left"
                            >
                                {isDeleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                <span>{t("delete") || "Delete"}</span>
                            </button>
                        </PopoverContent>
                    </Popover>
                </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48 bg-slate-900 border-slate-800 shadow-xl">
                    <ContextMenuItem onSelect={handleOpenReading} className="gap-2">
                        <BookOpen className="h-4 w-4" />
                        {t("contextMenu.openReading")}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handleOpenInNewTab} className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        {t("contextMenu.openInNewTab")}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handleCopyLink} className="gap-2">
                        <Link2 className="h-4 w-4" />
                        {t("contextMenu.copyLink")}
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handleShare} className="gap-2">
                        <Share2 className="h-4 w-4" />
                        {t("contextMenu.share")}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        onSelect={handleContextDelete}
                        disabled={isDeleting}
                        className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-500/10"
                    >
                        {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                        {t("delete")}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </div>
    )
}

function ReadingRowPlaceholder() {
    return (
        <Card className='p-6 bg-card/40 backdrop-blur-sm border-border/30'>
            <div className='flex items-start gap-4'>
                <Skeleton className='w-16 h-16 rounded-xl' />
                <div className='flex-1 space-y-3'>
                    <div className='flex items-start justify-between'>
                        <Skeleton className='h-5 w-3/4' />
                        <Skeleton className='h-4 w-20' />
                    </div>
                    <Skeleton className='h-4 w-1/2' />
                    <div className='flex gap-2'>
                        <Skeleton className='h-6 w-16 rounded-full' />
                        <Skeleton className='h-6 w-20 rounded-full' />
                    </div>
                </div>
            </div>
        </Card>
    )
}

export default function ReadingHistory() {
    const { user, session } = useAuth()
    const t = useTranslations('ReadingHistory')
    const locale = useLocale()
    const [listLoading, setListLoading] = useState(true)
    const [hydratedFromCache, setHydratedFromCache] = useState(false)
    const [listRows, setListRows] = useState<ReadingMeta[]>([])
    const [detailsById, setDetailsById] = useState<Record<string, ReadingRow>>({})
    const [detailStatus, setDetailStatus] = useState<Record<string, DetailStatus>>({})
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [filteredReadings, setFilteredReadings] = useState<ReadingMeta[]>([])
    const [displayedCount, setDisplayedCount] = useState(10)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [filterType, setFilterType] = useState<"all" | "today" | "week" | "month" | "custom">("all")
    const observerRef = useRef<HTMLDivElement>(null)
    const detailsByIdRef = useRef(detailsById)
    const listRowsRef = useRef(listRows)
    const detailStatusRef = useRef(detailStatus)

    useEffect(() => {
        detailsByIdRef.current = detailsById
    }, [detailsById])
    useEffect(() => {
        listRowsRef.current = listRows
    }, [listRows])
    useEffect(() => {
        detailStatusRef.current = detailStatus
    }, [detailStatus])

    const persistCache = useCallback(
        (list: ReadingMeta[], details: Record<string, ReadingRow>) => {
            if (!user) return
            writeHistoryCache({
                v: HISTORY_CACHE_VERSION,
                userId: user.id,
                list,
                details,
                savedAt: Date.now(),
            })
        },
        [user]
    )

    // Hydrate from session cache on client
    useEffect(() => {
        if (!user) {
            setHydratedFromCache(false)
            return
        }
        const cached = readHistoryCache(user.id)
        if (cached && cached.list.length > 0) {
            setListRows(cached.list)
            setDetailsById(cached.details)
            const nextStatus: Record<string, DetailStatus> = {}
            for (const row of cached.list) {
                nextStatus[row.id] = cached.details[row.id] ? "loaded" : "pending"
            }
            setDetailStatus(nextStatus)
            setHydratedFromCache(true)
            setListLoading(false)
        } else {
            setHydratedFromCache(false)
        }
    }, [user])

    // Load metadata list (lightweight)
    useEffect(() => {
        let isMounted = true
        const loadMeta = async () => {
            if (!user) return
            if (!hydratedFromCache) {
                setListLoading(true)
            }
            setError(null)
            const { data, error: err } = await supabase
                .from("chat_sessions")
                .select("id, question, topic, created_at, updated_at")
                .eq("owner_user_id", user.id)
                .order("created_at", { ascending: false })

            if (!isMounted) return
            if (err) {
                setError(err.message)
                setListRows([])
                setListLoading(false)
                return
            }

            const meta = (data as ReadingMeta[]) || []
            const prunedDetails: Record<string, ReadingRow> = { ...detailsByIdRef.current }
            for (const key of Object.keys(prunedDetails)) {
                if (!meta.some((r) => r.id === key)) delete prunedDetails[key]
            }
            setListRows(meta)
            setDetailStatus((prev) => {
                const next = { ...prev }
                for (const row of meta) {
                    if (next[row.id] === undefined) {
                        next[row.id] = prunedDetails[row.id] ? "loaded" : "pending"
                    }
                }
                const ids = new Set(meta.map((r) => r.id))
                for (const key of Object.keys(next)) {
                    if (!ids.has(key)) delete next[key]
                }
                return next
            })
            setDetailsById(prunedDetails)
            setListLoading(false)
            persistCache(meta, prunedDetails)
        }
        loadMeta()
        return () => {
            isMounted = false
        }
    }, [user, hydratedFromCache, persistCache])

    const mergeDetailIntoCache = useCallback(
        (row: ReadingRow) => {
            setDetailsById((prev) => {
                const next = { ...prev, [row.id]: row }
                persistCache(listRowsRef.current, next)
                return next
            })
            setDetailStatus((prev) => ({ ...prev, [row.id]: "loaded" }))
        },
        [persistCache]
    )

    const fetchDetail = useCallback(
        async (id: string) => {
            if (!user) return
            if (detailsByIdRef.current[id]) {
                setDetailStatus((prev) => ({ ...prev, [id]: "loaded" }))
                return
            }
            const cur = detailStatusRef.current[id]
            if (cur === "loading" || cur === "loaded") return

            setDetailStatus((prev) => ({ ...prev, [id]: "loading" }))

            const { data, error: err } = await supabase
                .from("chat_sessions")
                .select("id, question, topic, messages, decision, created_at, updated_at")
                .eq("id", id)
                .maybeSingle()

            if (err || !data) {
                setDetailStatus((prev) => ({ ...prev, [id]: "error" }))
                return
            }

            mergeDetailIntoCache(data as ReadingRow)
        },
        [user, mergeDetailIntoCache]
    )

    // Handle delete reading
    const handleDeleteReading = useCallback(
        (id: string) => {
            setListRows((prev) => {
                const next = prev.filter((r) => r.id !== id)
                setDetailsById((d) => {
                    const copy = { ...d }
                    delete copy[id]
                    persistCache(next, copy)
                    return copy
                })
                setDetailStatus((s) => {
                    const copy = { ...s }
                    delete copy[id]
                    return copy
                })
                return next
            })
        },
        [persistCache]
    )

    const readingForRow = useCallback(
        (meta: ReadingMeta): ReadingRow => {
            const full = detailsById[meta.id]
            if (full) return full
            return {
                ...meta,
                messages: [],
                decision: null,
            }
        },
        [detailsById]
    )

    // Filter readings based on search query and date filters
    useEffect(() => {
        let filtered = listRows

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter((reading) => {
                if (
                    reading.question?.toLowerCase().includes(q) ||
                    reading.topic?.toLowerCase().includes(q)
                ) {
                    return true
                }
                const detail = detailsById[reading.id]
                if (detail?.messages?.some((m) => m.text.toLowerCase().includes(q))) {
                    return true
                }
                return false
            })
        }

        if (filterType !== "all") {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            
            filtered = filtered.filter(reading => {
                const readingDate = new Date(reading.created_at)
                const readingDateOnly = new Date(readingDate.getFullYear(), readingDate.getMonth(), readingDate.getDate())
                
                switch (filterType) {
                    case "today":
                        return readingDateOnly.getTime() === today.getTime()
                    case "week": {
                        const weekAgo = new Date(today)
                        weekAgo.setDate(weekAgo.getDate() - 7)
                        return readingDateOnly >= weekAgo
                    }
                    case "month": {
                        const monthAgo = new Date(today)
                        monthAgo.setMonth(monthAgo.getMonth() - 1)
                        return readingDateOnly >= monthAgo
                    }
                    case "custom":
                        if (dateFrom) {
                            const fromDate = new Date(dateFrom)
                            if (readingDateOnly < fromDate) return false
                        }
                        if (dateTo) {
                            const toDate = new Date(dateTo)
                            toDate.setHours(23, 59, 59, 999)
                            if (readingDateOnly > toDate) return false
                        }
                        return true
                    default:
                        return true
                }
            })
        }

        setFilteredReadings(filtered)
    }, [listRows, searchQuery, filterType, dateFrom, dateTo, detailsById])

    // Reset pagination when filtered readings change
    useEffect(() => {
        setDisplayedCount(10)
    }, [filteredReadings])

    // Load more function
    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
        setTimeout(() => {
            setDisplayedCount((prev) => prev + 10)
            setLoadingMore(false)
        }, 500)
    }, [loadingMore, hasMore])

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMore()
                }
            },
            { threshold: 0.1 }
        )

        if (observerRef.current) {
            observer.observe(observerRef.current)
        }

        return () => observer.disconnect()
    }, [loadMore, hasMore, loadingMore])

    useEffect(() => {
        setHasMore(displayedCount < filteredReadings.length)
    }, [displayedCount, filteredReadings.length])

    const displayedSlice = useMemo(
        () => filteredReadings.slice(0, displayedCount),
        [filteredReadings, displayedCount]
    )

    // Queue detail fetches for visible slice with concurrency limit
    useEffect(() => {
        const pending = displayedSlice.filter((r) => detailStatus[r.id] === "pending")
        const loadingCount = Object.values(detailStatus).filter((s) => s === "loading").length
        const slots = Math.max(0, DETAIL_FETCH_CONCURRENCY - loadingCount)
        pending.slice(0, slots).forEach((r) => {
            fetchDetail(r.id)
        })
    }, [displayedSlice, detailStatus, fetchDetail])

    const content = useMemo(() => {
        if (!user) {
            return (
                <div className='flex flex-col items-center justify-center py-16 text-center'>
                    <div className='w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6'>
                        <Star className='w-12 h-12 text-primary' />
                    </div>
                    <h3 className='text-xl font-serif font-semibold mb-2'>Sign in to view your readings</h3>
                    <p className='text-muted-foreground max-w-md'>
                        Access your personal tarot reading history and discover insights from your spiritual journey.
                    </p>
                </div>
            )
        }
        if (listLoading && listRows.length === 0) {
            return (
                <div className='space-y-4'>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <ReadingRowPlaceholder key={i} />
                    ))}
                </div>
            )
        }
        if (error) {
            return (
                <div className='flex flex-col items-center justify-center py-16 text-center'>
                    <div className='w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center mb-6'>
                        <Sparkles className='w-12 h-12 text-destructive' />
                    </div>
                    <h3 className='text-xl font-serif font-semibold mb-2 text-destructive'>Failed to load readings</h3>
                    <p className='text-muted-foreground max-w-md'>{error}</p>
                </div>
            )
        }
        if (!filteredReadings.length) {
            if (searchQuery) {
                return (
                    <div className='flex flex-col items-center justify-center py-16 text-center'>
                        <div className='w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mb-6'>
                            <Search className='w-12 h-12 text-muted-foreground' />
                        </div>
                        <h3 className='text-xl font-serif font-semibold mb-2'>{t('noReadings')}</h3>
                        <p className='text-muted-foreground max-w-md'>
                            {t('noReadingsDesc')}
                        </p>
                    </div>
                )
            }
            return (
                <div className='flex flex-col items-center justify-center py-16 text-center'>
                    <div className='w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-8 relative'>
                        <div className='absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 animate-pulse'></div>
                        <Sparkles className='w-16 h-16 text-primary relative z-10' />
                    </div>
                    <h3 className='text-2xl font-serif font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'>
                        {t('noReadings')}
                    </h3>
                    <p className='text-muted-foreground max-w-md mb-8'>
                        {t('noReadingsDesc')}
                    </p>
                    <Link 
                        href="/tarot" 
                        className='inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl font-medium hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:scale-105'
                    >
                        <Star className='w-5 h-5' />
                        {t('startReading')}
                    </Link>
                </div>
            )
        }

        return (
            <div className='space-y-6'>
                {displayedSlice.map((meta) => {
                    const reading = readingForRow(meta)
                    const status = detailStatus[meta.id] ?? "pending"
                    const detailsLoaded = status === "loaded"
                    const detailFetching = status === "loading"
                    const detailPending = status === "pending"
                    const detailError = status === "error"
                    return (
                        <ReadingCard
                            key={meta.id}
                            reading={reading}
                            detailsLoaded={detailsLoaded}
                            detailFetching={detailFetching}
                            detailPending={detailPending}
                            detailError={detailError}
                            t={t}
                            locale={locale}
                            onDelete={handleDeleteReading}
                            session={session}
                        />
                    )
                })}
            </div>
        )
    }, [
        user,
        listLoading,
        listRows.length,
        filteredReadings,
        displayedSlice,
        error,
        searchQuery,
        t,
        locale,
        handleDeleteReading,
        session,
        readingForRow,
        detailStatus,
    ])

    return (
        <div className='max-w-4xl mx-auto w-full px-4 py-8'>
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className='text-4xl font-serif font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent'>
                    {t('title')}
                </h1>
                <p className='text-muted-foreground text-lg max-w-2xl mx-auto'>
                    {t('subtitle')}
                </p>
            </div>

            {/* Search and Filter Bar */}
            {user && !listLoading && listRows.length > 0 && (
                <div className="mb-8 space-y-4">
                    {/* Search Bar */}
                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-card/40 backdrop-blur-sm border-border/30 focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                        />
                    </div>

                    {/* Filter Controls */}
                    <div className="flex gap-3 items-center justify-center max-w-4xl mx-auto px-4">
                        <Select value={filterType} onValueChange={(value: "all" | "today" | "week" | "month" | "custom") => setFilterType(value)}>
                            <SelectTrigger className="flex-1 bg-card/40 backdrop-blur-sm border-border/30">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="all" className="text-white hover:bg-slate-800">{t('filters.allTime')}</SelectItem>
                                <SelectItem value="today" className="text-white hover:bg-slate-800">{t('filters.today')}</SelectItem>
                                <SelectItem value="week" className="text-white hover:bg-slate-800">{t('filters.thisWeek')}</SelectItem>
                                <SelectItem value="month" className="text-white hover:bg-slate-800">{t('filters.thisMonth')}</SelectItem>
                                <SelectItem value="custom" className="text-white hover:bg-slate-800">{t('filters.customRange')}</SelectItem>
                            </SelectContent>
                        </Select>

                        {filterType === "custom" && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        placeholder="From"
                                        className="w-36 bg-card/40 backdrop-blur-sm border-border/30"
                                        max={getTodayString()}
                                    />
                                </div>
                                <span className="text-muted-foreground">to</span>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        placeholder="To"
                                        className="w-36 bg-card/40 backdrop-blur-sm border-border/30"
                                        max={getTodayString()}
                                        min={dateFrom}
                                    />
                                </div>
                            </div>
                        )}

                        {(filterType !== "all" || searchQuery) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery("")
                                    setFilterType("all")
                                    setDateFrom("")
                                    setDateTo("")
                                }}
                                className="bg-card/40 backdrop-blur-sm border-border/30 hover:bg-card/60"
                            >
                                <X className="w-4 h-4 mr-1" />
                                {t('clearFilters')}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            {content}
            
            {/* Infinite scroll trigger and loading indicator */}
            {hasMore && filteredReadings.length > 0 && (
                <div ref={observerRef} className="flex justify-center py-8">
                    {loadingMore ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            <span>{t('loadingMore')}</span>
                        </div>
                    ) : (
                        <div className="text-muted-foreground text-sm">
                            {t('loadMore')}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
