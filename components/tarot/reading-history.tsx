"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getCleanQuestionText } from "@/lib/question-utils"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { ChevronDown, Clock, Star, Sparkles, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

type ReadingRow = {
    id: string
    question: string | null
    created_at: string
    interpretation: string | null
    cards: string[] | null
}

// Helper functions moved outside component to avoid dependency issues
const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ""
    
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
}

const getCardPreview = (cards: string[] | null) => {
    if (!cards || cards.length === 0) return "No cards"
    if (cards.length <= 3) return cards.join(", ")
    return `${cards.slice(0, 3).join(", ")} +${cards.length - 3} more`
}

export default function ReadingHistory() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [readings, setReadings] = useState<ReadingRow[]>([])
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [filteredReadings, setFilteredReadings] = useState<ReadingRow[]>([])

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
                .limit(100)
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

    // Filter readings based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredReadings(readings)
        } else {
            const filtered = readings.filter(reading => 
                reading.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                reading.cards?.some(card => card.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            setFilteredReadings(filtered)
        }
    }, [readings, searchQuery])

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
        const groups = filteredReadings.reduce<Record<string, ReadingRow[]>>((acc, row) => {
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
    }, [user, loading, filteredReadings, error, searchQuery])

    // ReadingCard component - moved outside useMemo to avoid hoisting issues
    const ReadingCard = ({ reading, question, isMain, hasFollowUps }: { 
        reading: ReadingRow, 
        question: string, 
        isMain: boolean, 
        hasFollowUps: boolean 
    }) => {
        const cardPreview = getCardPreview(reading.cards)
        const formattedDate = formatDate(reading.created_at)
        
        return (
            <Link href={`/tarot/${reading.id}`} className="block">
                <Card className={`
                    group/card relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10
                    ${isMain ? 'bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/30' : 'bg-card/60 backdrop-blur-sm border-border/20'}
                    ${hasFollowUps ? 'cursor-pointer' : ''}
                `}>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                    <CardContent className="relative p-6">
                        <div className="flex items-start gap-4">
                            {/* Card Preview */}
                            <div className="flex-shrink-0">
                                <div className="w-16 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-300">
                                    <Star className="w-8 h-8 text-primary/80" />
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <h3 className="font-serif font-semibold text-lg leading-tight group-hover/card:text-primary transition-colors duration-300">
                                        {question || "(No question)"}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                                        <Clock className="w-4 h-4" />
                                        <span>{formattedDate}</span>
                                    </div>
                                </div>
                                
                                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                                    {cardPreview}
                                </p>
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                    {reading.cards?.slice(0, 3).map((card, index) => (
                                        <Badge 
                                            key={index} 
                                            variant="secondary" 
                                            className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                                        >
                                            {card}
                                        </Badge>
                                    ))}
                                    {reading.cards && reading.cards.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{reading.cards.length - 3} more
                                        </Badge>
                                    )}
                                </div>
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

            {/* Search Bar */}
            {user && !loading && readings.length > 0 && (
                <div className="mb-8">
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
                </div>
            )}

            {/* Content */}
            {content}
        </div>
    )
}
