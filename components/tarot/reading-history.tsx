"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Search, Calendar, X, Star, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations, useLocale } from 'next-intl'
import { cn } from "@/lib/utils"

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
    assistantText: string
}

type ReadingRow = {
    id: string
    question: string
    topic: string | null
    messages: ChatMessage[]
    decision: ChatDecision | null
    created_at: string
    updated_at: string
}

type CardData = { name: string; isReversed: boolean }

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


// CardStack component for visual spreading of cards
const CardStack = ({ cards }: { cards: CardData[] }) => {
    if (!cards || cards.length === 0) return null

    const cleanName = (card: CardData) => {
        const name = card.name || ''
        return cleanCardName(name)
    }

    const isReversed = (card: CardData) => {
        const name = card.name || ''
        return name.toLowerCase().includes("reversed") || card.isReversed
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

// ReadingCard component - moved outside functional component
const ReadingCard = ({
    reading,
    t,
    locale,
}: {
    reading: ReadingRow
    t: (key: string) => string
    locale: string
}) => {
    const { date, time } = formatDateForDisplay(reading.created_at)
    
    // Extract latest cards from messages
    const latestCardsMessage = [...reading.messages].reverse().find(m => m.cards && m.cards.length > 0)
    const latestCards = latestCardsMessage?.cards || []

    // Get last user question
    const lastUserMessage = [...reading.messages].reverse().find(m => m.role === "user")
    const lastQuestion = lastUserMessage?.text || reading.question

    return (
        <Link
            href={`/${locale}/${reading.id}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
        >
            <Card
                className={cn(
                    "group/card relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 bg-gradient-to-br from-slate-900/30 to-slate-800/20 z-10",
                    "bg-gradient-to-br from-card/60 to-card/30 backdrop-blur-sm border-border/30",
                    "cursor-pointer"
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
                        {/* Card Stack */}
                        <div className="flex-shrink-0 pt-1">
                            <CardStack cards={latestCards} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex flex-col gap-1 min-w-0">
                                    <h3 className="font-serif font-semibold text-lg leading-tight group-hover/card:text-primary transition-colors duration-300 line-clamp-1">
                                        {reading.topic || reading.question || t("noQuestion")}
                                    </h3>
                                    {lastQuestion && lastQuestion !== (reading.topic || reading.question) && (
                                        <p className="text-muted-foreground/60 text-xs line-clamp-1 italic">
                                            Last: {lastQuestion}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {latestCardsMessage?.text && (
                                <p className="text-muted-foreground/80 text-sm line-clamp-2 leading-relaxed">
                                    {latestCardsMessage.text}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

export default function ReadingHistory() {
    const { user } = useAuth()
    const t = useTranslations('ReadingHistory')
    const locale = useLocale()
    const [loading, setLoading] = useState(true)
    const [readings, setReadings] = useState<ReadingRow[]>([])
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [filteredReadings, setFilteredReadings] = useState<ReadingRow[]>([])
    const [displayedCount, setDisplayedCount] = useState(10)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [filterType, setFilterType] = useState<"all" | "today" | "week" | "month" | "custom">("all")
    const observerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let isMounted = true
        const load = async () => {
            if (!user) return
            console.log('test')
            setLoading(true)
            setError(null)
            const { data, error } = await supabase
                .from("chat_sessions")
                .select("id, question, topic, messages, decision, created_at, updated_at")
                .eq("owner_user_id", user.id)
                .order("created_at", { ascending: false })
            console.log(data)
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
                reading.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                reading.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
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

        setFilteredReadings(filtered)
    }, [readings, searchQuery, filterType, dateFrom, dateTo])

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

    // Keep hasMore in sync
    useEffect(() => {
        setHasMore(displayedCount < filteredReadings.length)
    }, [displayedCount, filteredReadings.length])

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

        const entries = filteredReadings.slice(0, displayedCount)

        return (
            <div className='space-y-6'>
                {entries.map((reading) => (
                    <ReadingCard
                        key={reading.id}
                        reading={reading}
                        t={t}
                        locale={locale}
                    />
                ))}
            </div>
        )
    }, [user, loading, filteredReadings, displayedCount, error, searchQuery, t, locale])

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
