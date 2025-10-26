import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { ArticlesIndex, type ArticleCardItem } from "@/components/articles/articles-index"
import { Sparkles } from "lucide-react"
import { SearchArticles } from "@/components/articles/search-articles"
import { ARTICLES } from "@/components/articles/data"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta.Articles")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function ArticlesIndexPage() {

  const items: ArticleCardItem[] = [
    {
      href: "/articles/create-content",
      title: "Create Content About Us",
      description: "Write, post, or film about Asking Fate and earn stars.",
      icon: (await import("lucide-react")).BookOpen,
      badge: "Earn stars",
    },
    {
      href: "/articles/share-reading",
      title: "Share a Reading",
      description: "Share your reading link and earn up to 3 stars/day.",
      icon: (await import("lucide-react")).Share2,
      badge: "Earn stars",
    },
    {
      href: "/articles/refer-a-friend",
      title: "Refer a Friend",
      description: "Invite friends. You both earn stars when they join.",
      icon: (await import("lucide-react")).Users,
      badge: "Earn stars",
    },
    {
      href: "/articles/how-to-play",
      title: "How to Play",
      description: "Ask a question, pick cards, and reflect—step-by-step.",
      icon: (await import("lucide-react")).Gamepad2,
      badge: "Basics",
    },
    {
      href: "/articles/help-support",
      title: "Help & Support",
      description: "Get help with your account, readings, or technical issues.",
      icon: (await import("lucide-react")).HelpCircle,
      badge: "Support",
    },
    {
      href: "/articles/faq",
      title: "Frequently Asked Questions",
      description: "Find answers to common questions about our services.",
      icon: (await import("lucide-react")).MessageCircleQuestion,
      badge: "FAQ",
    },
  ] as const

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <header className="relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-16 sm:pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-fadeInUp">
            <Sparkles className="w-4 h-4" />
            Knowledge Hub
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white leading-tight">
            <span className="relative inline-block">
              <span className="text-transparent bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text animate-gradient-x">
                Articles & Guides
              </span>
              {/* Animated underline */}
              <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse"></div>
            </span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mt-6">
            Helpful, documentation-style guides about Asking Fate.
          </p>

          {/* Search under header description */}
          <div className="mt-6 max-w-2xl mx-auto">
            <SearchArticles
              articles={ARTICLES}
              placeholder="Search articles..."
              autoFocus={false}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-8">
        <ArticlesIndex items={items} />
        <div className="text-center mt-16 animate-fadeInUp">
          <p className="text-muted-foreground text-sm sm:text-base">
            Can&apos;t find what you&apos;re looking for?{" "}
            <Link href="/contact" className="text-primary hover:underline font-medium">
              Contact support
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
