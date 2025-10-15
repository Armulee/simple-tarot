"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getCleanQuestionText } from "@/lib/question-utils"

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
        return (
            <div className='space-y-3'>
                {readings.map((r) => {
                    const question = getCleanQuestionText(r.question || "")
                    const date = new Date(r.created_at)
                    const dateStr = isNaN(date.getTime())
                        ? ""
                        : date.toLocaleString()
                    return (
                        <Link key={r.id} href={`/tarot/${r.id}`}>
                            <Card className='p-4 hover:bg-card/60 transition-colors'>
                                <div className='flex items-start justify-between gap-4'>
                                    <div className='min-w-0'>
                                        <p className='text-sm font-medium truncate'>
                                            {question || "(No question)"}
                                        </p>
                                        <p className='text-xs text-muted-foreground mt-1 truncate'>
                                            {r.cards?.join(", ") || ""}
                                        </p>
                                    </div>
                                    <div className='text-xs text-muted-foreground whitespace-nowrap'>
                                        {dateStr}
                                    </div>
                                </div>
                            </Card>
                        </Link>
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
