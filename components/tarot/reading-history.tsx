"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getCleanQuestionText } from "@/lib/question-utils"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { ChevronDown, Star, Sparkles, Search, Calendar, Filter, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ReadingRow = {
    id: string
    question: string | null
    created_at: string
    interpretation: string | null
    cards: string[] | null
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
const ReadingCard = ({ reading, question, isMain, hasFollowUps }: { 
    reading: ReadingRow, 
    question: string, 
    isMain: boolean, 
    hasFollowUps: boolean 
}) => {
    const { date, time } = formatDateForDisplay(reading.created_at)
    const readingType = getReadingType(reading.cards)
    const typeInfo = getReadingTypeInfo(readingType)
    
    return (
        <Link href={`/tarot/${reading.id}`} className="block">
            <Card className={`
                group/card relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10
                ${isMain ? 'bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/30' : 'bg-card/60 backdrop-blur-sm border-border/20'}
                ${hasFollowUps ? 'cursor-pointer' : ''}
            `}>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                
                {/* Date and Time badges positioned at top left (billing page style) */}
                <div className="absolute top-3 left-3 flex space-x-2">
                    <Badge
                        variant="outline"
                        className={`bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-200 border-yellow-400/40 text-xs font-medium shadow-lg shadow-yellow-400/20 backdrop-blur-sm hover:from-yellow-400/30 hover:to-orange-500/30 transition-all duration-300`}
                    >
                        {date}
                    </Badge>
                    <Badge
                        variant="outline"
                        className={`bg-gradient-to-r from-purple-400/20 to-pink-500/20 text-purple-200 border-purple-400/40 text-xs font-medium shadow-lg shadow-purple-400/20 backdrop-blur-sm hover:from-purple-400/30 hover:to-pink-500/30 transition-all duration-300`}
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
                
                <CardContent className="relative p-4 pt-12 pb-2">
                    <div className="flex items-start gap-4">
                        {/* Real card images */}
                        <div className="flex-shrink-0 flex gap-2">
                            {reading.cards?.slice(0, 2).map((card, index) => {
                                const cleanName = cleanCardName(card)
                                const isReversed = card.toLowerCase().includes('reversed')
                                
                                return (
                                    <div 
                                        key={index}
                                        className="relative w-12 h-16 rounded-lg overflow-hidden border border-border/30 shadow-lg group-hover/card:scale-110 transition-transform duration-300"
                                    >
                                        <Image
                                            src={`/assets/rider-waite-tarot/${cleanName}.png`}
                                            alt={card}
                                            width={48}
                                            height={64}
                                            className={`w-full h-full object-cover transition-transform duration-300 ${
                                                isReversed ? "rotate-180" : ""
                                            }`}
                                        />
                                        {isReversed && (
                                            <div className="absolute top-1 right-1">
                                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {reading.cards && reading.cards.length > 2 && (
                                <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-muted/30 to-muted/20 border border-muted/40 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300 shadow-lg">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        +{reading.cards.length - 2}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            {/* Card badges above the question */}
                            {reading.cards && reading.cards.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {reading.cards.slice(0, 3).map((card, index) => (
                                        <Badge 
                                            key={index} 
                                            variant="secondary" 
                                            className="text-xs bg-white/90 text-gray-800 border-white/50 hover:bg-white transition-colors shadow-lg backdrop-blur-sm"
                                        >
                                            {card}
                                        </Badge>
                                    ))}
                                    {reading.cards.length > 3 && (
                                        <Badge 
                                            variant="outline" 
                                            className="text-xs bg-white/80 text-gray-700 border-white/40 hover:bg-white transition-colors shadow-lg backdrop-blur-sm"
                                        >
                                            +{reading.cards.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            )}
                            
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <h3 className="font-serif font-semibold text-lg leading-tight group-hover/card:text-primary transition-colors duration-300">
                                    {question || "(No question)"}
                                </h3>
                            </div>
                            
                            {/* Interpretation preview */}
                            {reading.interpretation && (
                                <p className="text-muted-foreground/80 text-sm mb-2 line-clamp-2 leading-relaxed">
                                    {reading.interpretation}
                                </p>
                            )}
                        </div>
                        
                        {/* Arrow for accordion */}
                        {hasFollowUps && (
                            <div className="flex-shrink-0 self-center">
                                <ChevronDown className="w-5 h-5 text-muted-foreground group-hover/card:text-primary transition-colors duration-300" />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

export default function ReadingHistory() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [readings, setReadings] = useState<ReadingRow[]>([])
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [filteredReadings, setFilteredReadings] = useState<ReadingRow[]>([])
    const [displayedReadings, setDisplayedReadings] = useState<ReadingRow[]>([])
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
            setLoading(true)
            setError(null)
            const { data, error } = await supabase
                .from("tarot_readings")
                .select("id, question, created_at, interpretation, cards")
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

        setFilteredReadings(filtered)
    }, [readings, searchQuery, filterType, dateFrom, dateTo])

    // Reset displayed readings when filtered readings change
    useEffect(() => {
        setDisplayedReadings(filteredReadings.slice(0, 10))
        setHasMore(filteredReadings.length > 10)
    }, [filteredReadings])

    // Load more readings function
    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return
        
        setLoadingMore(true)
        const currentLength = displayedReadings.length
        const nextBatch = filteredReadings.slice(currentLength, currentLength + 10)
        
        setTimeout(() => {
            setDisplayedReadings(prev => [...prev, ...nextBatch])
            setHasMore(currentLength + 10 < filteredReadings.length)
            setLoadingMore(false)
        }, 500) // Small delay for better UX
    }, [displayedReadings.length, filteredReadings, loadingMore, hasMore])

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
        if (!displayedReadings.length) {
            if (searchQuery) {
                return (
                    <div className='flex flex-col items-center justify-center py-16 text-center'>
                        <div className='w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mb-6'>
                            <Search className='w-12 h-12 text-muted-foreground' />
                        </div>
                        <h3 className='text-xl font-serif font-semibold mb-2'>No readings found</h3>
                        <p className='text-muted-foreground max-w-md'>
                            Try adjusting your search terms or browse all your readings.
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
                        Begin Your Journey
                    </h3>
                    <p className='text-muted-foreground max-w-md mb-8'>
                        Your tarot reading history will appear here. Start your first reading to unlock cosmic insights and guidance.
                    </p>
                    <Link 
                        href="/tarot" 
                        className='inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl font-medium hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:scale-105'
                    >
                        <Star className='w-5 h-5' />
                        Start Reading
                    </Link>
                </div>
            )
        }

        // Group follow-ups: assume main interpretations are those whose question text is not a follow-up marker; we group exact same question text together
        const groups = displayedReadings.reduce<Record<string, ReadingRow[]>>((acc, row) => {
            const key = getCleanQuestionText(row.question || "")
            if (!acc[key]) acc[key] = []
            acc[key].push(row)
            return acc
        }, {})

        const entries = Object.entries(groups)
        return (
            <div className='space-y-6'>
                {entries.map(([question, items]) => {
                    const sorted = items.slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
                    const main = sorted[0]
                    const followUps = sorted.slice(1)
                    const hasFollowUps = followUps.length > 0

                    return (
                        <div key={question} className='group'>
                            {hasFollowUps ? (
                                <Accordion className="w-full">
                                    <AccordionItem className="border-none">
                                        <AccordionTrigger className="hover:no-underline p-0">
                                            <ReadingCard 
                                                reading={main} 
                                                question={question}
                                                isMain={true}
                                                hasFollowUps={true}
                                            />
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-4">
                                            <div className='space-y-3 pl-4 border-l-2 border-primary/20'>
                                                {followUps.map((fu) => (
                                                    <ReadingCard 
                                                        key={fu.id} 
                                                        reading={fu} 
                                                        question="Follow-up"
                                                        isMain={false}
                                                        hasFollowUps={false}
                                                    />
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            ) : (
                                <ReadingCard 
                                    reading={main} 
                                    question={question}
                                    isMain={true}
                                    hasFollowUps={false}
                                />
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }, [user, loading, displayedReadings, error, searchQuery])

    return (
        <div className='max-w-4xl mx-auto w-full px-4 py-8'>
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className='text-4xl font-serif font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent'>
                    Your Reading History
                </h1>
                <p className='text-muted-foreground text-lg max-w-2xl mx-auto'>
                    Explore your spiritual journey through the cosmic wisdom of tarot
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
                            placeholder="Search readings or cards..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-card/40 backdrop-blur-sm border-border/30 focus:border-primary/50 focus:ring-primary/20"
                        />
                    </div>

                    {/* Date Filter Controls */}
                    <div className="flex flex-wrap gap-3 items-center justify-center max-w-4xl mx-auto px-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Filter by date:</span>
                        </div>
                        
                        <Select value={filterType} onValueChange={(value: "all" | "today" | "week" | "month" | "custom") => setFilterType(value)}>
                            <SelectTrigger className="w-32 bg-card/40 backdrop-blur-sm border-border/30">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This week</SelectItem>
                                <SelectItem value="month">This month</SelectItem>
                                <SelectItem value="custom">Custom range</SelectItem>
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
                                Clear filters
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
                            <span>Loading more readings...</span>
                        </div>
                    ) : (
                        <div className="text-muted-foreground text-sm">
                            Scroll to load more
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
