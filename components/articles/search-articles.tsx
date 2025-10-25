"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"

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
          ((a.tags || []).some((t) => t.toLowerCase().includes(q)) ? 1 : 0),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.item)
  }, [articles, query])

  return (
    <div className={className}>
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-background/60 backdrop-blur"
          autoFocus={autoFocus}
        />
      </div>
      {results.length > 0 && (
        <Card className="mt-3">
          <CardContent className="p-2">
            <ul className="divide-y divide-border/30">
              {results.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="block p-3 hover:bg-white/5 rounded-md">
                    <div className="text-sm font-medium text-foreground">{r.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{r.description}</div>
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
