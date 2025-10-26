"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { ArrowRight, Star, X } from "lucide-react"

export type ArticleCardItem = {
  href: string
  title: string
  description: string
  badge: string
  icon: React.ComponentType<{ className?: string }>
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

export function ArticlesIndex({ items }: { items: ArticleCardItem[] }) {
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
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Input
            placeholder="Search articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-background/60 backdrop-blur pr-10"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">No related articles found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filtered.map(({ href, title, description, icon: Icon, badge }) => (
            <Link key={href} href={href} className="block group article-card">
              <Card className="h-full relative overflow-hidden bg-transparent border-border/30 hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 group-hover:scale-[1.02] group-hover:-translate-y-1">
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Animated border */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

                <CardHeader className="relative z-10 mb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300 icon-bounce">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge
                      variant="secondary"
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
                  <CardTitle className="text-lg sm:text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
                    {title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="relative z-10 pt-0">
                  <p className="text-muted-foreground leading-relaxed line-clamp-3 mb-4">{description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary group-hover:text-primary/80 transition-colors duration-300 flex items-center gap-1">
                      Read more
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                    {badge === "Earn stars" && (
                      <div className="flex items-center gap-1 text-xs text-yellow-500 font-medium">
                        <Star className="w-3 h-3" />
                        +Stars
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
