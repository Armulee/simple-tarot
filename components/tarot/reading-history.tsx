"use client"

import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getCleanQuestionText } from "@/lib/question-utils"
import { ChevronDown, Star, Sparkles, Search, Calendar, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
import { useTranslations } from 'next-intl'
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

type ReadingRow = {
    id: string
    question: string | null
    created_at: string
    interpretation: string | null
    cards: string[] | null
    parent_id?: string | null
}

type ReadingType = "simple" | "intermediate" | "advanced"

// Helper functions moved outside component to avoid dependency issues

// Helper function to clean card name for image path
const cleanCardName = (cardName: string) => {
    return cardName
        .toLowerCase()
        .replace(/\s*\(reversed\)/g, "")
        .replace(/\s*reversed/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
}

// Helper function to determine reading type from number of cards
const getReadingType = (cards: string[] | null): ReadingType => {
    if (!cards) return "simple"
    const cardCount = cards.length
    if (cardCount === 1) return "simple"
    if (cardCount === 2) return "intermediate"
    return "advanced"
}

// Helper function to get reading type display info
const getReadingTypeInfo = (readingType: ReadingType) => {
    const typeInfo = {
        simple: { label: "Simple", color: "from-green-400/20 to-emerald-500/20", textColor: "text-green-200", borderColor: "border-green-400/40" },
        intermediate: { label: "Intermediate", color: "from-blue-400/20 to-cyan-500/20", textColor: "text-blue-200", borderColor: "border-blue-400/40" },
        advanced: { label: "Advanced", color: "from-purple-400/20 to-pink-500/20", textColor: "text-purple-200", borderColor: "border-purple-400/40" }
    }
    return typeInfo[readingType]
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


// ReadingCard component - moved outside functional component
const ReadingCard = ({
    reading,
    question,
    isMain,
    hasFollowUps,
    t,
    clickableHref,
    onCardClick,
    onToggleFollowUps,
    isFollowUpsOpen = false,
}: {
    reading: ReadingRow
    question: string
    isMain: boolean
    hasFollowUps: boolean
    t: (key: string) => string
    clickableHref?: string | null
    onCardClick?: () => void
    onToggleFollowUps?: () => void
    isFollowUpsOpen?: boolean
}) => {
    const { date, time } = formatDateForDisplay(reading.created_at)
    const readingType = getReadingType(reading.cards)
    const typeInfo = getReadingTypeInfo(readingType)
    const showChevronControl = hasFollowUps && typeof onToggleFollowUps === "function"

    const handleKeyboardActivate = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onCardClick?.()
        }
    }

    const Wrapper = ({ children }: { children: ReactNode }) => {
        if (clickableHref && !onCardClick) {
            return (
                <Link
                    href={clickableHref}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
                >
                    {children}
                </Link>
            )
        }

        if (onCardClick) {
            return (
                <div
                    role="link"
                    tabIndex={0}
                    onClick={() => onCardClick()}
                    onKeyDown={handleKeyboardActivate}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
                >
                    {children}
                </div>
            )
        }

        return <div className="block">{children}</div>
    }

    const handleToggleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        onToggleFollowUps?.()
    }

    return (
        <Wrapper>
            <Card
                className={cn(
                    "group/card relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 bg-gradient-to-br from-slate-900/30 to-slate-800/20 z-10",
                    isMain
                        ? "bg-gradient-to-br from-card/60 to-card/30 backdrop-blur-sm border-border/30"
                        : "bg-card/40 backdrop-blur-sm border-border/20",
                    (hasFollowUps || clickableHref || onCardClick) && "cursor-pointer",
                    isFollowUpsOpen && "border-primary/40 shadow-primary/10"
                )}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

                {/* Date and Time badges positioned at top left (billing page style) */}
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

                {/* Reading Type badge positioned at top right */}
                <div className="absolute top-3 right-3">
                    <Badge
                        variant="outline"
                        className={`bg-gradient-to-r ${typeInfo.color} ${typeInfo.textColor} ${typeInfo.borderColor} text-xs font-medium shadow-lg backdrop-blur-sm hover:opacity-80 transition-all duration-300`}
                    >
                        {typeInfo.label}
                    </Badge>
                </div>

                <CardContent className="relative px-4 pt-8 pb-2">
                    <div className="flex items-start gap-4">
                        {/* Single card image */}
                        <div className="flex-shrink-0">
                            {reading.cards && reading.cards.length > 0 && (() => {
                                const firstCard = reading.cards[0]
                                const cleanName = cleanCardName(firstCard)
                                const isReversed = firstCard.toLowerCase().includes("reversed")

                                return (
                                    <div className="relative w-12 rounded-lg overflow-hidden border border-border/30 shadow-lg group-hover/card:scale-110 transition-transform duration-300">
                                        <Image
                                            src={`/assets/rider-waite-tarot/${cleanName}.png`}
                                            alt={firstCard}
                                            width={48}
                                            height={0}
                                            className={cn(
                                                "w-full h-auto object-cover transition-transform duration-300",
                                                isReversed && "rotate-180"
                                            )}
                                        />
                                    </div>
                                )
                            })()}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            {/* Card badges above the question - Swiper */}
                            {reading.cards && reading.cards.length > 0 && (
                                <div className="mb-2 w-full">
                                    <Swiper modules={[FreeMode]} freeMode={true} slidesPerView="auto" spaceBetween={4} className="w-full">
                                        {reading.cards.map((card, index) => (
                                            <SwiperSlide key={index} className="!w-auto">
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs bg-white/90 text-gray-800 border-white/50 hover:bg-white transition-colors shadow-lg backdrop-blur-sm whitespace-nowrap"
                                                >
                                                    {card}
                                                </Badge>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}

                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <h3 className="font-serif font-semibold text-lg leading-tight group-hover/card:text-primary transition-colors duration-300 line-clamp-1">
                                        {question || t("noQuestion")}
                                    </h3>
                                </div>
                                {showChevronControl && (
                                    <button
                                        type="button"
                                        onClick={handleToggleClick}
                                        aria-label="Toggle follow-up interpretations"
                                        aria-expanded={isFollowUpsOpen}
                                        className="flex-shrink-0 self-center rounded-full p-1 text-muted-foreground transition-colors duration-300 hover:bg-white/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                    >
                                        <ChevronDown
                                            className={cn(
                                                "w-5 h-5 transition-transform duration-300",
                                                isFollowUpsOpen && "rotate-180 text-primary"
                                            )}
                                        />
                                    </button>
                                )}
                            </div>

                            {reading.interpretation && (
                                <p className="text-muted-foreground/80 text-sm line-clamp-2 leading-relaxed">
                                    {reading.interpretation}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Wrapper>
    )
}

export default function ReadingHistory() {
    const { user } = useAuth()
    const t = useTranslations('ReadingHistory')
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [readings, setReadings] = useState<ReadingRow[]>([])
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [filteredReadings, setFilteredReadings] = useState<ReadingRow[]>([])
    const [displayedGroupCount, setDisplayedGroupCount] = useState(10)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [filterType, setFilterType] = useState<"all" | "today" | "week" | "month" | "custom">("all")
    const [readingTypeFilter, setReadingTypeFilter] = useState<"all" | "simple" | "intermediate" | "advanced">("all")
    const observerRef = useRef<HTMLDivElement>(null)
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

    const toggleGroup = useCallback((groupKey: string) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [groupKey]: !prev[groupKey],
        }))
    }, [])

    const navigateToReading = useCallback((id: string) => {
        router.push(`/tarot/${id}`)
    }, [router])

    useEffect(() => {
        let isMounted = true
        const load = async () => {
            if (!user) return
            setLoading(true)
            setError(null)
            const { data, error } = await supabase
                .from("tarot_readings")
                .select("id, question, created_at, interpretation, cards, parent_id")
                .eq("owner_user_id", user.id)
                .order("created_at", { ascending: false })
            if (!isMounted) return
            if (error) {
                setError(error.message)
                setReadings([])
            } else {
                setReadings((data as ReadingRow[]) || [])
            }
            setLoading(false)
        }
        load()
        return () => {
            isMounted = false
        }
    }, [user])

    // Filter readings based on search query and date filters
    useEffect(() => {
        let filtered = readings

        // Apply search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(reading => 
                reading.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                reading.cards?.some(card => card.toLowerCase().includes(searchQuery.toLowerCase()))
            )
        }

        // Apply date filters
        if (filterType !== "all") {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            
            filtered = filtered.filter(reading => {
                const readingDate = new Date(reading.created_at)
                const readingDateOnly = new Date(readingDate.getFullYear(), readingDate.getMonth(), readingDate.getDate())
                
                switch (filterType) {
                    case "today":
                        return readingDateOnly.getTime() === today.getTime()
                    case "week":
                        const weekAgo = new Date(today)
                        weekAgo.setDate(weekAgo.getDate() - 7)
                        return readingDateOnly >= weekAgo
                    case "month":
                        const monthAgo = new Date(today)
                        monthAgo.setMonth(monthAgo.getMonth() - 1)
                        return readingDateOnly >= monthAgo
                    case "custom":
                        if (dateFrom) {
                            const fromDate = new Date(dateFrom)
                            if (readingDateOnly < fromDate) return false
                        }
                        if (dateTo) {
                            const toDate = new Date(dateTo)
                            toDate.setHours(23, 59, 59, 999) // End of day
                            if (readingDateOnly > toDate) return false
                        }
                        return true
                    default:
                        return true
                }
            })
        }

        // Apply reading type filter
        if (readingTypeFilter !== "all") {
            filtered = filtered.filter(reading => {
                const readingType = getReadingType(reading.cards)
                return readingType === readingTypeFilter
            })
        }

        setFilteredReadings(filtered)
    }, [readings, searchQuery, filterType, dateFrom, dateTo, readingTypeFilter])

    // Reset pagination when filtered readings change
    useEffect(() => {
        setDisplayedGroupCount(10)
    }, [filteredReadings])

    useEffect(() => {
        setExpandedGroups({})
    }, [filteredReadings])

    // Load more groups function
    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
        setTimeout(() => {
            setDisplayedGroupCount((prev) => prev + 10)
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

    // Compute total group count for pagination state
    const totalGroupCount = useMemo(() => {
        if (!filteredReadings.length) return 0
        const tokenize = (text: string) =>
            (text || "")
                .toLowerCase()
                .replace(/[^a-z0-9\sก-๙]/gi, " ")
                .split(/\s+/)
                .filter((w) => w.length >= 3)
        const jaccard = (a: string, b: string) => {
            const ta = new Set(tokenize(getCleanQuestionText(a)))
            const tb = new Set(tokenize(getCleanQuestionText(b)))
            if (ta.size === 0 && tb.size === 0) return 1
            const inter = new Set([...ta].filter((x) => tb.has(x)))
            const union = new Set([...ta, ...tb])
            return inter.size / union.size
        }
        const sortedAll = [...filteredReadings].sort((a, b) =>
            a.created_at.localeCompare(b.created_at)
        )
        const groups: Array<{ main: ReadingRow; latestAt: string }> = []
        const TIME_WINDOW_MS = 1000 * 60 * 60 * 4
        for (const r of sortedAll) {
            const idx = groups.findIndex((g) => {
                const sim = jaccard(g.main.question || "", r.question || "")
                const timeDelta = Math.abs(
                    new Date(r.created_at).getTime() -
                        new Date(g.latestAt).getTime()
                )
                return (
                    getCleanQuestionText(g.main.question || "") ===
                        getCleanQuestionText(r.question || "") ||
                    sim >= 0.65 ||
                    (sim >= 0.4 && timeDelta <= TIME_WINDOW_MS)
                )
            })
            if (idx >= 0) {
                const g = groups[idx]
                if (new Date(r.created_at) > new Date(g.latestAt)) {
                    g.latestAt = r.created_at
                }
            } else {
                groups.push({ main: r, latestAt: r.created_at })
            }
        }
        return groups.length
    }, [filteredReadings])

    // Keep hasMore in sync with group count
    useEffect(() => {
        setHasMore(displayedGroupCount < totalGroupCount)
    }, [displayedGroupCount, totalGroupCount])

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
        if (loading) {
            return (
                <div className='space-y-4'>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i} className='p-6 bg-card/40 backdrop-blur-sm border-border/30'>
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

        // Build grouped threads across all filtered readings
        // Prefer exact database linkage via parent_id when present
        const groupsByKey = new Map<string, ReadingRow[]>()
        const withParent = filteredReadings.filter((r) => r.parent_id)
        const withoutParent = filteredReadings.filter((r) => !r.parent_id)

        // Group those with explicit parent linkage
        for (const r of withParent) {
            const key = (r.parent_id as string) || r.id
            const list = groupsByKey.get(key) || []
            list.push(r)
            groupsByKey.set(key, list)
        }
        // Ensure mains exist in map
        for (const r of withoutParent) {
            const key = r.id
            const list = groupsByKey.get(key) || []
            list.push(r)
            groupsByKey.set(key, list)
        }

        // If some follow-ups reference a main not in current filter (unlikely), we still create the group
        // Now, heuristically merge remaining unlinked by similarity/time where parent_id is missing
        const tokenize = (text: string) =>
            (text || "")
                .toLowerCase()
                .replace(/[^a-z0-9\sก-๙]/gi, " ")
                .split(/\s+/)
                .filter((w) => w.length >= 3)

        const jaccard = (a: string, b: string) => {
            const ta = new Set(tokenize(getCleanQuestionText(a)))
            const tb = new Set(tokenize(getCleanQuestionText(b)))
            if (ta.size === 0 && tb.size === 0) return 1
            const inter = new Set([...ta].filter((x) => tb.has(x)))
            const union = new Set([...ta, ...tb])
            return inter.size / union.size
        }

        type Group = {
            key: string
            items: ReadingRow[]
            main: ReadingRow
            latestAt: string
            question: string
        }

        // Merge groupsByKey values into Group objects
        const groups: Group[] = []
        for (const [key, items] of groupsByKey) {
            const sorted = items.slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
            // Find main: if any item has id===key, use it; otherwise earliest
            const main = sorted.find((it) => it.id === key) || sorted[0]
            groups.push({
                key,
                items: sorted,
                main,
                latestAt: sorted[sorted.length - 1].created_at,
                question: getCleanQuestionText(main.question || ""),
            })
        }

        // Normalize each group: main is earliest by time, follow-ups are the rest
        groups.forEach((g) => {
            g.items.sort((a, b) => a.created_at.localeCompare(b.created_at))
            // Ensure main stays as the DB main when parent linkage exists
            const dbMain = g.items.find((it) => it.id === g.key)
            g.main = dbMain || g.items[0]
            g.question = getCleanQuestionText(g.main.question || "")
            g.latestAt = g.items[g.items.length - 1].created_at
        })

        // Sort groups by most recent activity desc
        const groupList = groups.sort((a, b) =>
            b.latestAt.localeCompare(a.latestAt)
        )

        const entries = groupList
            .slice(0, displayedGroupCount)
            .map((g) => ({
                key: g.key,
                question: g.question,
                items: g.items,
            }))

        return (
            <div className='space-y-6'>
                {entries.map(({ key: groupKey, question, items }) => {
                    const sorted = items.slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
                    const main = sorted[0]
                    const followUps = sorted.slice(1)
                    const hasFollowUps = followUps.length > 0
                    const isExpanded = !!expandedGroups[groupKey]

                    return (
                        <div key={groupKey} className='group space-y-4'>
                            <ReadingCard
                                reading={main}
                                question={question}
                                isMain={true}
                                hasFollowUps={hasFollowUps}
                                t={t}
                                clickableHref={hasFollowUps ? null : `/tarot/${main.id}`}
                                onCardClick={hasFollowUps ? () => navigateToReading(main.id) : undefined}
                                onToggleFollowUps={hasFollowUps ? () => toggleGroup(groupKey) : undefined}
                                isFollowUpsOpen={hasFollowUps ? isExpanded : false}
                            />

                            {hasFollowUps && isExpanded && (
                                <div className="pt-4">
                                    <div className='space-y-3 pl-4 border-l-2 border-primary/20'>
                                        {followUps.map((fu) => (
                                            <ReadingCard
                                                key={fu.id}
                                                reading={fu}
                                                question={fu.question ? getCleanQuestionText(fu.question) : ""}
                                                isMain={false}
                                                hasFollowUps={false}
                                                t={t}
                                                clickableHref={`/tarot/${fu.id}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }, [user, loading, filteredReadings, displayedGroupCount, error, searchQuery, t, expandedGroups, navigateToReading, toggleGroup])

    return (
        <div className='max-w-4xl mx-auto w-full px-4 py-8'>
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className='text-4xl font-serif font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent'>
                    {t('title')}
                </h1>
                <p className='text-muted-foreground text-lg max-w-2xl mx-auto'>
                    {t('subtitle')}
                </p>
            </div>

            {/* Search and Filter Bar */}
            {user && !loading && readings.length > 0 && (
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

                        <Select value={readingTypeFilter} onValueChange={(value: "all" | "simple" | "intermediate" | "advanced") => setReadingTypeFilter(value)}>
                            <SelectTrigger className="flex-1 bg-card/40 backdrop-blur-sm border-border/30">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="all" className="text-white hover:bg-slate-800">{t('filters.allTypes')}</SelectItem>
                                <SelectItem value="simple" className="text-white hover:bg-slate-800">{t('filters.simple')}</SelectItem>
                                <SelectItem value="intermediate" className="text-white hover:bg-slate-800">{t('filters.intermediate')}</SelectItem>
                                <SelectItem value="advanced" className="text-white hover:bg-slate-800">{t('filters.advanced')}</SelectItem>
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

                        {(filterType !== "all" || readingTypeFilter !== "all" || searchQuery) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery("")
                                    setFilterType("all")
                                    setDateFrom("")
                                    setDateTo("")
                                    setReadingTypeFilter("all")
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
            {hasMore && (
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
