import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Share2, Users, HelpCircle, Gamepad2, MessageCircleQuestion } from "lucide-react"

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
    <div className="relative overflow-hidden">
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-serif font-bold text-4xl">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map(({ href, title, description, icon: Icon, badge }) => (
              <Link key={href} href={href} className="block group">
                <Card className="h-full hover:border-primary/60 hover:shadow-md transition bg-card/60 backdrop-blur">
                  <CardHeader className="flex flex-row items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/15 text-primary group-hover:bg-primary/20">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl">{title}</CardTitle>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{badge}</Badge>
                      </div>
                      <CardDescription>{description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-primary text-sm">Read more →</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
