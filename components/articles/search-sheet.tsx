"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/navigation"
import { Search, X, ArrowRight } from "lucide-react"

export type SearchSheetItem = {
    href: string
    title: string
    description: string
    tags?: string[]
}

export function SearchSheet({
    articles,
    placeholder = "Search articles...",
    triggerClassName,
}: {
    articles: SearchSheetItem[]
    placeholder?: string
    triggerClassName?: string
}) {
    const t = useTranslations("Articles")
    const [query, setQuery] = useState("")
    const [activeBadgeKey, setActiveBadgeKey] = useState<
        "earn" | "basics" | "support" | "faq" | null
    >(null)

    function getBadgeKeyForHref(
        href: string
    ): "earn" | "basics" | "support" | "faq" {
        if (
            href.includes("create-content") ||
            href.includes("share-reading") ||
            href.includes("refer-a-friend")
        )
            return "earn"
        if (href.includes("how-to-play")) return "basics"
        if (href.includes("help-support")) return "support"
        return "faq"
    }

    const results = useMemo(() => {
        const q = query.trim().toLowerCase()
        const list = articles.map((a) => ({
            item: a,
            badgeKey: getBadgeKeyForHref(a.href),
            score:
                (a.title.toLowerCase().includes(q) ? 3 : 0) +
                (a.description.toLowerCase().includes(q) ? 2 : 0) +
                ((a.tags || []).some((t) => t.toLowerCase().includes(q))
                    ? 1
                    : 0),
        }))
        const filteredByBadge = activeBadgeKey
            ? list.filter((x) => x.badgeKey === activeBadgeKey)
            : list
        if (!q) return filteredByBadge.map((x) => x.item)
        return filteredByBadge
            .filter((x) => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((x) => x.item)
    }, [articles, query, activeBadgeKey])

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    type='button'
                    className={`w-full h-12 text-left rounded-xl bg-background/40 backdrop-blur-md border-2 border-border/50 hover:border-primary/60 hover:bg-background/60 transition-all duration-300 shadow-lg hover:shadow-xl pl-11 pr-3 relative group ${triggerClassName || ""}`}
                    aria-label='Open search'
                >
                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-200' />
                    <span className='text-muted-foreground'>{placeholder}</span>
                </button>
            </SheetTrigger>

            <SheetContent side='bottom' className='p-0'>
                <SheetTitle className='sr-only'>{placeholder}</SheetTitle>
                <div className='p-4 sm:p-6 max-w-3xl mx-auto w-full'>
                    {/* Badge filter row */}
                    <div className='flex flex-wrap items-center gap-2 mb-3'>
                        <button
                            type='button'
                            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                activeBadgeKey === null
                                    ? "bg-primary/20 text-primary border-primary/30"
                                    : "bg-background/60 border-border/50 text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={() => setActiveBadgeKey(null)}
                        >
                            {t("badges.earn")} / {t("badges.basics")} /{" "}
                            {t("badges.support")} / {t("badges.faq")}
                        </button>
                        <Badge
                            variant='secondary'
                            className={`px-3 py-1 text-xs cursor-pointer transition-colors ${
                                activeBadgeKey === "earn"
                                    ? "bg-yellow-400/20 text-yellow-600 border border-yellow-400/30"
                                    : ""
                            }`}
                            onClick={() => setActiveBadgeKey("earn")}
                        >
                            {t("badges.earn")}
                        </Badge>
                        <Badge
                            variant='secondary'
                            className={`px-3 py-1 text-xs cursor-pointer transition-colors ${
                                activeBadgeKey === "basics"
                                    ? "bg-green-500/20 text-green-700 border border-green-500/30"
                                    : ""
                            }`}
                            onClick={() => setActiveBadgeKey("basics")}
                        >
                            {t("badges.basics")}
                        </Badge>
                        <Badge
                            variant='secondary'
                            className={`px-3 py-1 text-xs cursor-pointer transition-colors ${
                                activeBadgeKey === "support"
                                    ? "bg-purple-500/20 text-purple-700 border border-purple-500/30"
                                    : ""
                            }`}
                            onClick={() => setActiveBadgeKey("support")}
                        >
                            {t("badges.support")}
                        </Badge>
                        <Badge
                            variant='secondary'
                            className={`px-3 py-1 text-xs cursor-pointer transition-colors ${
                                activeBadgeKey === "faq"
                                    ? "bg-blue-500/20 text-blue-700 border border-blue-500/30"
                                    : ""
                            }`}
                            onClick={() => setActiveBadgeKey("faq")}
                        >
                            {t("badges.faq")}
                        </Badge>
                    </div>

                    <div className='relative group'>
                        <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200 z-10' />
                        <Input
                            placeholder={placeholder}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className='pl-11 pr-10 h-12 bg-background/40 backdrop-blur-md border-2 border-border/50 focus:border-primary/60 focus:bg-background/60 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium'
                            autoFocus
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

                    <div className='mt-4 divide-y divide-border/40 rounded-lg border border-border/40 overflow-hidden'>
                        {results.map((r) => (
                            <Link
                                key={r.href}
                                href={r.href}
                                className='flex items-start gap-3 p-4 hover:bg-accent/20 transition-colors group'
                            >
                                <div className='flex-1 min-w-0'>
                                    <div className='text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-1'>
                                        {r.title}
                                    </div>
                                    <div className='text-xs text-muted-foreground mt-1 line-clamp-2'>
                                        {r.description}
                                    </div>
                                </div>
                                <ArrowRight className='w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors' />
                            </Link>
                        ))}
                        {results.length === 0 && (
                            <div className='p-6 text-sm text-muted-foreground text-center'>
                                No related articles found
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
