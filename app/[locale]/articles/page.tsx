import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
    },
    {
      href: "/articles/share-reading",
      title: t("items.shareReading.title"),
      description: t("items.shareReading.description"),
    },
    {
      href: "/articles/refer-a-friend",
      title: t("items.referFriend.title"),
      description: t("items.referFriend.description"),
    },
    {
      href: "/articles/how-to-play",
      title: t("items.howToPlay.title"),
      description: t("items.howToPlay.description"),
    },
    {
      href: "/articles/help-support",
      title: t("items.helpSupport.title"),
      description: t("items.helpSupport.description"),
    },
    {
      href: "/articles/faq",
      title: t("items.faq.title"),
      description: t("items.faq.description"),
    },
  ]

  return (
    <div className="relative overflow-hidden">
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-serif font-bold text-4xl">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="block">
                <Card className="h-full hover:border-primary/60 hover:shadow-md transition">
                  <CardHeader>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
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
