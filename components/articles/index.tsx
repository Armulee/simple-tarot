"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import {
    ArrowRight,
    Star,
    X,
    Search,
    BookOpen,
    Share2,
    Users,
    HelpCircle,
    Gamepad2,
    MessageCircleQuestion,
} from "lucide-react"

export type ArticleCardItem = {
    href: string
    title: string
    description: string
    badge: string
    iconId: "book" | "share" | "users" | "gamepad" | "help" | "faq"
    tags?: string[]
}

function scoreItem(q: string, it: ArticleCardItem) {
    const qq = q.toLowerCase()
    let score = 0
    if (it.title.toLowerCase().includes(qq)) score += 3
    if (it.description.toLowerCase().includes(qq)) score += 2
    if ((it.tags || []).some((t) => t.toLowerCase().includes(qq))) score += 1
    return score
}

export default function Articles({ items }: { items: ArticleCardItem[] }) {
    const [query, setQuery] = useState("")

    const filtered = useMemo(() => {
        const q = query.trim()
        if (!q) return items
        return items
            .map((it) => ({ it, s: scoreItem(q, it) }))
            .filter(({ s }) => s > 0)
            .sort((a, b) => b.s - a.s)
            .map(({ it }) => it)
    }, [items, query])

    return (
        <div>
            {/* Search input with clear */}
            <div className='max-w-2xl mx-auto mb-8'>
                <div className='relative group'>
                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200 z-10' />
                    <Input
                        placeholder='Search articles...'
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className='pl-11 pr-10 h-12 bg-background/40 backdrop-blur-md border-2 border-border/50 focus:border-primary/60 focus:bg-background/60 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium'
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
            </div>

            {/* Cards grid */}
            {filtered.length === 0 ? (
                <div className='text-center text-muted-foreground py-12'>
                    No related articles found
                </div>
            ) : (
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8'>
                    {filtered.map(
                        ({ href, title, description, iconId, badge }) => {
                            const Icon =
                                iconId === "book"
                                    ? BookOpen
                                    : iconId === "share"
                                      ? Share2
                                      : iconId === "users"
                                        ? Users
                                        : iconId === "gamepad"
                                          ? Gamepad2
                                          : iconId === "help"
                                            ? HelpCircle
                                            : MessageCircleQuestion
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className='block group article-card'
                                >
                                    <Card className='h-full relative overflow-hidden bg-transparent border-border/30 hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 group-hover:scale-[1.02] group-hover:-translate-y-1'>
                                        {/* Gradient overlay on hover */}
                                        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500' />

                                        {/* Animated border */}
                                        <div className='absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm' />

                                        <CardHeader className='relative z-10 mb-2'>
                                            <div className='flex items-center justify-between mb-3'>
                                                <div className='p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300 icon-bounce'>
                                                    <Icon className='w-5 h-5' />
                                                </div>
                                                <Badge
                                                    variant='secondary'
                                                    className={`text-xs font-medium px-2 py-1 badge-glow ${
                                                        badge === "Earn stars"
                                                            ? "bg-yellow-400/20 text-yellow-600 border-yellow-400/30"
                                                            : badge === "Basics"
                                                              ? "bg-green-500/20 text-green-700 border-green-500/30"
                                                              : "bg-purple-500/20 text-purple-700 border-purple-500/30"
                                                    }`}
                                                >
                                                    {badge}
                                                </Badge>
                                            </div>
                                            <CardTitle className='text-lg sm:text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2'>
                                                {title}
                                            </CardTitle>
                                        </CardHeader>

                                        <CardContent className='relative z-10 pt-0'>
                                            <p className='text-muted-foreground leading-relaxed line-clamp-3 mb-4'>
                                                {description}
                                            </p>
                                            <div className='flex items-center justify-between'>
                                                <span className='text-sm font-medium text-primary group-hover:text-primary/80 transition-colors duration-300 flex items-center gap-1'>
                                                    Read more
                                                    <ArrowRight className='w-3 h-3 group-hover:translate-x-1 transition-transform duration-300' />
                                                </span>
                                                {badge === "Earn stars" && (
                                                    <div className='flex items-center gap-1 text-xs text-yellow-500 font-medium'>
                                                        <Star className='w-3 h-3' />
                                                        +Stars
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        }
                    )}
                </div>
            )}
        </div>
    )
}
