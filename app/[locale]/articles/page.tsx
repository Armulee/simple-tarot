import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Share2, Users, HelpCircle, Gamepad2, MessageCircleQuestion, Sparkles, ArrowRight, Star } from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta.Articles")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function ArticlesIndexPage() {

  const items = [
    {
      href: "/articles/create-content",
      title: "Create Content About Us",
      description: "Write, post, or film about Asking Fate and earn stars.",
      icon: BookOpen,
      badge: "Guide",
    },
    {
      href: "/articles/share-reading",
      title: "Share a Reading",
      description: "Share your reading link and earn up to 3 stars/day.",
      icon: Share2,
      badge: "Earn stars",
    },
    {
      href: "/articles/refer-a-friend",
      title: "Refer a Friend",
      description: "Invite friends. You both earn stars when they join.",
      icon: Users,
      badge: "Earn stars",
    },
    {
      href: "/articles/how-to-play",
      title: "How to Play",
      description: "Ask a question, pick cards, and reflect—step-by-step.",
      icon: Gamepad2,
      badge: "Basics",
    },
    {
      href: "/articles/help-support",
      title: "Help & Support",
      description: "Get help with your account, readings, or technical issues.",
      icon: HelpCircle,
      badge: "Support",
    },
    {
      href: "/articles/faq",
      title: "Frequently Asked Questions",
      description: "Find answers to common questions about our services.",
      icon: MessageCircleQuestion,
      badge: "FAQ",
    },
  ] as const

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <header className="relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-8 sm:pb-12 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Knowledge Hub
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-foreground leading-tight">
            <span className="relative inline-block">
              <span className="text-transparent bg-gradient-to-r from-accent via-accent/80 to-accent bg-clip-text animate-gradient-x">
                Articles & Guides
              </span>
              {/* Animated underline */}
              <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-accent to-accent/80 rounded-full animate-pulse"></div>
            </span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mt-3">
            Helpful, documentation-style guides about Asking Fate.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Articles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {items.map(({ href, title, description, icon: Icon, badge }) => (
            <Link key={href} href={href} className="block group article-card">
              <Card className="h-full relative overflow-hidden bg-transparent border-border/30 hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/10 transition-all duration-500 group-hover:scale-[1.02] group-hover:-translate-y-1">
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Animated border */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent/20 via-accent/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
                
                <CardHeader className="relative z-10 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors duration-300 icon-bounce">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs font-medium px-2 py-1 badge-glow ${
                        badge === "Earn stars" 
                          ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" 
                          : badge === "Guide"
                          ? "bg-blue-500/20 text-blue-700 border-blue-500/30"
                          : badge === "Basics"
                          ? "bg-green-500/20 text-green-700 border-green-500/30"
                          : "bg-purple-500/20 text-purple-700 border-purple-500/30"
                      }`}
                    >
                      {badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-semibold text-foreground group-hover:text-accent transition-colors duration-300 line-clamp-2">
                    {title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="relative z-10 pt-0">
                  <CardDescription className="text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                    {description}
                  </CardDescription>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-accent group-hover:text-accent/80 transition-colors duration-300 flex items-center gap-1">
                      Read more
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                    {badge === "Earn stars" && (
                      <div className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
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

        {/* Call to Action */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground text-sm sm:text-base">
            Can&apos;t find what you&apos;re looking for?{" "}
            <Link href="/contact" className="text-accent hover:underline font-medium">
              Contact support
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
