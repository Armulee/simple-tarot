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
  const t = await getTranslations("Articles")
  const items = [
    {
      href: "/articles/create-content",
      title: t("items.createContent.title"),
      description: t("items.createContent.description"),
      icon: BookOpen,
      badge: "Guide",
    },
    {
      href: "/articles/share-reading",
      title: t("items.shareReading.title"),
      description: t("items.shareReading.description"),
      icon: Share2,
      badge: "Earn stars",
    },
    {
      href: "/articles/refer-a-friend",
      title: t("items.referFriend.title"),
      description: t("items.referFriend.description"),
      icon: Users,
      badge: "Earn stars",
    },
    {
      href: "/articles/how-to-play",
      title: t("items.howToPlay.title"),
      description: t("items.howToPlay.description"),
      icon: Gamepad2,
      badge: "Basics",
    },
    {
      href: "/articles/help-support",
      title: t("items.helpSupport.title"),
      description: t("items.helpSupport.description"),
      icon: HelpCircle,
      badge: "Support",
    },
    {
      href: "/articles/faq",
      title: t("items.faq.title"),
      description: t("items.faq.description"),
      icon: MessageCircleQuestion,
      badge: "FAQ",
    },
  ] as const

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse floating-bg"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000 floating-bg"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse delay-2000 floating-bg"></div>
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 text-primary text-sm font-medium mb-4 animate-fadeInUp">
              <Sparkles className="w-4 h-4" />
              Knowledge Hub
            </div>
            <h1 className="font-serif font-bold text-4xl sm:text-5xl md:text-6xl gradient-text">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              {t("subtitle")}
            </p>
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {items.map(({ href, title, description, icon: Icon, badge }, index) => (
              <Link key={href} href={href} className="block group article-card">
                <Card className="h-full relative overflow-hidden bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border-border/50 hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 group-hover:scale-[1.02] group-hover:-translate-y-1">
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Animated border */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
                  
                  <CardHeader className="relative z-10 flex flex-row items-start gap-4 p-6">
                    <div className="relative">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary group-hover:from-primary/30 group-hover:to-purple-500/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 icon-bounce">
                        <Icon className="w-6 h-6" />
                      </div>
                      {/* Floating particles effect */}
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping"></div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors duration-300">
                          {title}
                        </CardTitle>
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] px-3 py-1 font-medium badge-glow ${
                            badge === "Earn stars" 
                              ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600 border-yellow-500/30" 
                              : badge === "Guide"
                              ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 border-blue-500/30"
                              : badge === "Basics"
                              ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 border-green-500/30"
                              : "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 border-purple-500/30"
                          }`}
                        >
                          {badge}
                        </Badge>
                      </div>
                      <CardDescription className="text-muted-foreground leading-relaxed">
                        {description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative z-10 p-6 pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary text-sm font-medium group-hover:gap-3 transition-all duration-300">
                        <span>Read more</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                      {badge === "Earn stars" && (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-xs font-medium">+Stars</span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center pt-8">
            <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 text-muted-foreground text-sm animate-fadeInUp">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Explore all guides to master your mystical journey</span>
              <span className="sm:hidden">Master your mystical journey</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
