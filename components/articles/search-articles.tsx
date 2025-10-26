"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { Search, X } from "lucide-react"

export type ArticleItem = {
    href: string
    title: string
    description: string
    tags?: string[]
}

export function SearchArticles({
    articles,
    placeholder = "Search articles...",
    className,
    autoFocus = false,
}: {
    articles: ArticleItem[]
    placeholder?: string
    className?: string
    autoFocus?: boolean
}) {
    const [query, setQuery] = useState("")
    const results = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return [] as ArticleItem[]
        return articles
            .map((a) => ({
                item: a,
                score:
                    (a.title.toLowerCase().includes(q) ? 3 : 0) +
                    (a.description.toLowerCase().includes(q) ? 2 : 0) +
                    ((a.tags || []).some((t) => t.toLowerCase().includes(q))
                        ? 1
                        : 0),
            }))
            .filter((x) => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map((x) => x.item)
    }, [articles, query])

    return (
        <div className={className}>
            <div className='relative group'>
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200 z-10' />
                <Input
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className='pl-11 pr-10 h-12 bg-background/40 backdrop-blur-md border-2 border-border/50 focus:border-primary/60 focus:bg-background/60 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium'
                    autoFocus={autoFocus}
                />
                {query && (
                    <button
                        type='button'
                        aria-label='Clear search'
                        className='absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-all duration-200'
                        onClick={() => setQuery("")}
                    >
                        <X className='w-4 h-4' />
                    </button>
                )}
            </div>
            {results.length > 0 && (
                <Card className='mt-3 border-2 border-border/50 bg-background/60 backdrop-blur-md shadow-xl'>
                    <CardContent className='p-3'>
                        <ul className='space-y-1'>
                            {results.map((r) => (
                                <li key={r.href}>
                                    <Link
                                        href={r.href}
                                        className='block p-3 rounded-lg hover:bg-accent/20 hover:shadow-md transition-all duration-200 group'
                                    >
                                        <div className='text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200'>
                                            {r.title}
                                        </div>
                                        <div className='text-xs text-muted-foreground mt-1 line-clamp-2'>
                                            {r.description}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
