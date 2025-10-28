import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import Articles, { type ArticleCardItem } from "@/components/articles"
import { Sparkles } from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Meta.Articles")
    return {
        title: t("title"),
        description: t("description"),
    }
}

export default async function ArticlesPage() {
    const t = await getTranslations("Articles")

    const items: ArticleCardItem[] = [
        {
            href: "/articles/tarot",
            title: t("items.tarot.title"),
            description: t("items.tarot.description"),
            iconId: "book",
            badge: t("badges.basics"),
        },
        {
            href: "/articles/create-content",
            title: t("items.createContent.title"),
            description: t("items.createContent.description"),
            iconId: "book",
            badge: t("badges.earn"),
        },
        {
            href: "/articles/share-reading",
            title: t("items.shareReading.title"),
            description: t("items.shareReading.description"),
            iconId: "share",
            badge: t("badges.earn"),
        },
        {
            href: "/articles/refer-a-friend",
            title: t("items.referFriend.title"),
            description: t("items.referFriend.description"),
            iconId: "users",
            badge: t("badges.earn"),
        },
        {
            href: "/articles/how-to-play",
            title: t("items.howToPlay.title"),
            description: t("items.howToPlay.description"),
            iconId: "gamepad",
            badge: t("badges.basics"),
        },
        {
            href: "/articles/help-support",
            title: t("items.helpSupport.title"),
            description: t("items.helpSupport.description"),
            iconId: "help",
            badge: t("badges.support"),
        },
        {
            href: "/articles/faq",
            title: t("items.faq.title"),
            description: t("items.faq.description"),
            iconId: "faq",
            badge: t("badges.faq"),
        },
    ] as const

    return (
        <div className='relative min-h-screen'>
            {/* Header */}
            <header className='relative'>
                <div className='max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-16 sm:pb-20 text-center'>
                    {/* Badge */}
                    <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-fadeInUp'>
                        <Sparkles className='w-4 h-4' />
                        {t("knowledgeHub")}
                    </div>

                    {/* Title */}
                    <h1 className='text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white leading-tight'>
                        <span className='relative inline-block'>
                            <span className='text-transparent bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text animate-gradient-x'>
                                {t("title")}
                            </span>
                            {/* Animated underline */}
                            <div className='absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse'></div>
                        </span>
                    </h1>
                    <p className='text-gray-300 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mt-6'>
                        {t("subtitle")}
                    </p>
                </div>
            </header>

            {/* Main Content */}
            <main className='relative max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-8'>
                <Articles items={items} />
                <div className='text-center mt-16 animate-fadeInUp'>
                    <p className='text-muted-foreground text-sm sm:text-base'>
                        {t("cantFind")} {""}
                        <Link
                            href='/contact'
                            className='text-primary hover:underline font-medium'
                        >
                            {t("contactSupport")}
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    )
}
