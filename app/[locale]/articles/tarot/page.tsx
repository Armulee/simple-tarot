import type { Metadata } from "next"
import {
    ArticleLayout,
    type ArticleSection,
} from "@/components/articles/article-layout"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import { getTranslations, setRequestLocale } from "next-intl/server"
import {
    getMajor,
    getMinorBySuit,
    TAROT_ARTICLE_LOCALES,
} from "@/lib/tarot/cards"

export function generateStaticParams() {
    return TAROT_ARTICLE_LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "TarotGuide" })
    const title = t("metaTitle")
    const desc = t("metaDescription")
    return {
        title: `${title} | AskingFate`,
        description: desc,
        openGraph: { title, description: desc },
        twitter: { card: "summary_large_image", title, description: desc },
    }
}

export default async function TarotGuidePage({
    params,
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    setRequestLocale(locale)
    const t = await getTranslations("TarotGuide")

    const whatIs: ArticleSection = {
        id: "what-is",
        title: t("whatIsTitle"),
        content: (
            <div className='space-y-3'>
                <p>{t("whatIsP1")}</p>
                <p>{t("whatIsP2")}</p>
            </div>
        ),
    }

    const history: ArticleSection = {
        id: "history",
        title: t("historyTitle"),
        content: (
            <div className='space-y-3'>
                <p>{t("historyP1")}</p>
                <p>{t("historyP2")}</p>
            </div>
        ),
    }

    const major = getMajor()
    const majorSection: ArticleSection = {
        id: "major",
        title: t("majorTitle"),
        content: (
            <div className='space-y-3'>
                <p>{t("majorIntro")}</p>
                <div className='not-prose grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'>
                    {major.map((c) => (
                        <Link
                            key={c.slug}
                            href={`/articles/tarot/${c.slug}`}
                            className='group block rounded-xl border border-border/40 bg-gradient-to-br from-background/60 to-background/30 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden'
                        >
                            <div className='p-4 flex flex-col items-center text-center'>
                                <div className='relative w-20 h-32 mb-3'>
                                    <Image
                                        src={`/assets/rider-waite-tarot/${c.slug}.png`}
                                        alt={c.name}
                                        fill
                                        sizes='80px'
                                        className='object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-105'
                                    />
                                </div>
                                <div className='text-xs text-muted-foreground mb-0.5'>
                                    {String(c.number).padStart(2, "0")}
                                </div>
                                <div className='text-sm font-medium group-hover:text-primary transition-colors'>
                                    {c.name}
                                </div>
                            </div>
                            <div className='h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
                        </Link>
                    ))}
                </div>
            </div>
        ),
    }

    const suits: ("wands" | "cups" | "swords" | "pentacles")[] = [
        "wands",
        "cups",
        "swords",
        "pentacles",
    ]
    const suitNameKey = {
        wands: "suitWandsName",
        cups: "suitCupsName",
        swords: "suitSwordsName",
        pentacles: "suitPentaclesName",
    } as const
    const suitThemeKey = {
        wands: "suitWands",
        cups: "suitCups",
        swords: "suitSwords",
        pentacles: "suitPentacles",
    } as const
    const minorSection: ArticleSection = {
        id: "minor",
        title: t("minorTitle"),
        content: (
            <div className='space-y-5'>
                <p>{t("minorIntro")}</p>
                <div className='space-y-8'>
                    {suits.map((suit) => {
                        const cards = getMinorBySuit(suit)
                        return (
                            <div key={suit} className='space-y-3'>
                                <div className='flex items-center gap-3'>
                                    <div className='p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary'>
                                        <span className='text-xs font-semibold capitalize'>
                                            {t(suitNameKey[suit])}
                                        </span>
                                    </div>
                                    <p className='text-xs sm:text-sm text-muted-foreground'>
                                        {t(suitThemeKey[suit])}
                                    </p>
                                </div>
                                <div className='not-prose grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
                                    {cards.map((c) => (
                                        <Link
                                            key={c.slug}
                                            href={`/articles/tarot/${c.slug}`}
                                            className='group block rounded-xl border border-border/40 bg-gradient-to-br from-background/60 to-background/30 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden'
                                        >
                                            <div className='p-4 flex flex-col items-center text-center'>
                                                <div className='relative w-20 h-32 mb-3'>
                                                    <Image
                                                        src={`/assets/rider-waite-tarot/${c.slug}.png`}
                                                        alt={c.name}
                                                        fill
                                                        sizes='80px'
                                                        className='object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-105'
                                                    />
                                                </div>
                                                <div className='text-sm font-medium group-hover:text-primary transition-colors'>
                                                    {c.name}
                                                </div>
                                            </div>
                                            <div className='h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        ),
    }

    const sections: ArticleSection[] = [
        whatIs,
        history,
        majorSection,
        minorSection,
    ]

    return (
        <ArticleLayout
            title={t("title")}
            subtitle={t("subtitle")}
            backLabel={t("backLabel")}
            sections={sections}
            related={[
                {
                    href: "/articles/how-to-play",
                    title: t("relatedHowToPlayTitle"),
                    description: t("relatedHowToPlayDesc"),
                },
                {
                    href: "/articles/faq",
                    title: t("relatedFaqTitle"),
                    description: t("relatedFaqDesc"),
                },
                {
                    href: "/articles/help-support",
                    title: t("relatedHelpTitle"),
                    description: t("relatedHelpDesc"),
                },
            ]}
        />
    )
}
