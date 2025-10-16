"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getCleanQuestionText } from "@/lib/question-utils"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { ChevronDown } from "lucide-react"

type ReadingRow = {
    id: string
    question: string | null
    created_at: string
    interpretation: string | null
    cards: string[] | null
}

export default function ReadingHistory() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [readings, setReadings] = useState<ReadingRow[]>([])
    const [error, setError] = useState<string | null>(null)

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

    const content = useMemo(() => {
        if (!user) {
            return (
                <div className='text-center text-sm text-muted-foreground'>
                    Please sign in to view your reading history.
                </div>
            )
        }
        if (loading) {
            return (
                <div className='space-y-3'>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i} className='p-4'>
                            <div className='flex items-center justify-between'>
                                <Skeleton className='h-4 w-1/2' />
                                <Skeleton className='h-4 w-24' />
                            </div>
                            <div className='mt-2'>
                                <Skeleton className='h-3 w-3/4' />
                            </div>
                        </Card>
                    ))}
                </div>
            )
        }
        if (error) {
            return (
                <div className='text-center text-sm text-red-400'>
                    Failed to load history: {error}
                </div>
            )
        }
        if (!readings.length) {
            return (
                <div className='text-center text-sm text-muted-foreground'>
                    No readings yet. Start your first reading!
                </div>
            )
        }
        // Group follow-ups: assume main interpretations are those whose question text is not a follow-up marker; we group exact same question text together
        const groups = readings.reduce<Record<string, ReadingRow[]>>((acc, row) => {
            const key = getCleanQuestionText(row.question || "")
            if (!acc[key]) acc[key] = []
            acc[key].push(row)
            return acc
        }, {})

        const entries = Object.entries(groups)
        return (
            <div className='space-y-3'>
                {entries.map(([question, items]) => {
                    const sorted = items.slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
                    const main = sorted[0]
                    const followUps = sorted.slice(1)
                    const hasFollowUps = followUps.length > 0
                    const mainDate = new Date(main.created_at)
                    const mainDateStr = isNaN(mainDate.getTime()) ? "" : mainDate.toLocaleString()

                    return (
                        <div key={question} className='mb-3'>
                            {hasFollowUps ? (
                                <Accordion>
                                    <AccordionItem>
                                        <AccordionTrigger className='hover:no-underline'>
                                            <div className='flex items-start justify-between w-full gap-4'>
                                                <div className='min-w-0 text-left'>
                                                    <p className='text-sm font-medium truncate'>{question || "(No question)"}</p>
                                                    <p className='text-xs text-muted-foreground mt-1 truncate'>{main.cards?.join(", ") || ""}</p>
                                                </div>
                                                <div className='flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap'>
                                                    {mainDateStr}
                                                    <ChevronDown className='w-4 h-4' />
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className='space-y-2'>
                                                {followUps.map((fu) => {
                                                    const date = new Date(fu.created_at)
                                                    const dateStr = isNaN(date.getTime()) ? "" : date.toLocaleString()
                                                    return (
                                                        <Link key={fu.id} href={`/tarot/${fu.id}`}>
                                                            <Card className='p-3 hover:bg-card/60 transition-colors'>
                                                                <div className='flex items-start justify-between gap-4'>
                                                                    <div className='min-w-0 text-left'>
                                                                        <p className='text-sm font-medium truncate'>Follow-up</p>
                                                                        <p className='text-xs text-muted-foreground mt-1 truncate'>{fu.cards?.join(", ") || ""}</p>
                                                                    </div>
                                                                    <div className='text-xs text-muted-foreground whitespace-nowrap'>{dateStr}</div>
                                                                </div>
                                                            </Card>
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            ) : (
                                <Link href={`/tarot/${main.id}`}>
                                    <Card className='p-4 hover:bg-card/60 transition-colors'>
                                        <div className='flex items-start justify-between gap-4'>
                                            <div className='min-w-0'>
                                                <p className='text-sm font-medium truncate'>{question || "(No question)"}</p>
                                                <p className='text-xs text-muted-foreground mt-1 truncate'>{main.cards?.join(", ") || ""}</p>
                                            </div>
                                            <div className='text-xs text-muted-foreground whitespace-nowrap'>{mainDateStr}</div>
                                        </div>
                                    </Card>
                                </Link>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }, [user, loading, readings, error])

    return (
        <div className='max-w-2xl mx-auto w-full px-4'>
            <h1 className='text-xl font-serif font-bold mb-4'>Your Readings</h1>
            {content}
        </div>
    )
}
