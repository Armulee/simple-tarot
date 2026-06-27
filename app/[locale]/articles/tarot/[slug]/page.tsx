import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
    getCardBySlug,
    TAROT_ARTICLE_LOCALES,
    TAROT_CARDS,
} from "@/lib/tarot/cards"
import { getPathname } from "@/i18n/navigation"
type SectionMeaning = {
    keywords?: string[]
    text: string
    yesNo?: string
    zodiac?: string
    element?: string
}
type CardMeaning = {
    slug: string
    upright: {
        overview: SectionMeaning
        relationships: SectionMeaning
        work: SectionMeaning
        finance: SectionMeaning
        health: SectionMeaning
    }
    reversed: {
        overview: SectionMeaning
        relationships: SectionMeaning
        work: SectionMeaning
        finance: SectionMeaning
        health: SectionMeaning
    }
}
import {
    ArticleLayout,
    type ArticleSection,
} from "@/components/articles/article-layout"

export const dynamicParams = false

export async function generateStaticParams() {
    // Pre-render every card, but only for locales that ship translated
    // meaning JSON (en, th). Other locales lack content, so we don't emit
    // empty/404 pages for them. dynamicParams=false ⇒ those URLs 404.
    return TAROT_ARTICLE_LOCALES.flatMap((locale) =>
        TAROT_CARDS.map((c) => ({ locale, slug: c.slug }))
    )
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
    const { slug, locale } = await params
    setRequestLocale(locale)
    const card = getCardBySlug(slug)
    if (!card) return {}
    const title = `${card.name} — Tarot Meaning (Upright & Reversed)`
    const description = `Explore ${card.name} upright and reversed: overview, relationships, work & career, finance, and health.`
    const keywords = `${card.name}, tarot, ${card.arcana} arcana, meaning, upright, reversed`
    const href = `/articles/tarot/${card.slug}`
    const canonical = await getPathname({ locale, href })
    const languages: Record<string, string> = {}
    for (const l of TAROT_ARTICLE_LOCALES) {
        languages[l] = await getPathname({ locale: l, href })
    }
    return {
        title,
        description,
        keywords,
        alternates: { canonical, languages },
        openGraph: { title, description, type: "article", url: canonical },
        twitter: { card: "summary", title, description },
    }
}

export default async function TarotCardArticlePage({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>
}) {
    const { slug, locale } = await params
    setRequestLocale(locale)
    const t = await getTranslations("TarotArticle")
    const card = getCardBySlug(slug)
    if (!card) return notFound()

    const uprightImage = (
        <div className='mb-3'>
            <div className='relative w-28 h-44 rounded-xl border border-border/40 bg-gradient-to-br from-background/60 to-background/30 overflow-hidden'>
                <Image
                    src={`/assets/rider-waite-tarot/${card.slug}.png`}
                    alt={card.name}
                    fill
                    sizes='112px'
                    className='object-contain drop-shadow-xl'
                />
            </div>
        </div>
    )

    const reversedImage = (
        <div className='mb-3'>
            <div className='relative w-28 h-44 rounded-xl border border-border/40 bg-gradient-to-br from-background/60 to-background/30 overflow-hidden'>
                <Image
                    src={`/assets/rider-waite-tarot/${card.slug}.png`}
                    alt={`${card.name} (reversed)`}
                    fill
                    sizes='112px'
                    className='object-contain drop-shadow-xl rotate-180'
                />
            </div>
        </div>
    )

    const getTextAfterFirstSentence = (text: string): string => {
        const match = text.match(/^(.*?\.)\s*([\s\S]*)$/)
        return match ? match[2] : ""
    }

    const makeKeywords = (words: string[]) => (
        <div className='flex flex-wrap gap-2 mb-4'>
            {words.map((w) => (
                <span
                    key={w}
                    className='px-2.5 py-1 rounded-full text-[13px] sm:text-sm border border-border/40 bg-background/50 shadow-sm'
                >
                    {w}
                </span>
            ))}
        </div>
    )

    // Dynamic import per-card JSON, prefer locale file then fall back to the
    // English meaning (never the non-existent root path, which would throw).
    let meaning: CardMeaning | undefined
    try {
        const mod = await import(
            `@/lib/tarot/meanings/${locale}/${card.slug}.json`
        )
        meaning = mod.default as CardMeaning
    } catch {
        try {
            const mod = await import(
                `@/lib/tarot/meanings/en/${card.slug}.json`
            )
            meaning = mod.default as CardMeaning
        } catch {
            return notFound()
        }
    }
    if (
        !meaning?.upright?.overview?.text ||
        !meaning?.reversed?.overview?.text
    ) {
        return notFound()
    }

    const uprightOverview: ArticleSection = {
        id: "upright-overview",
        title: t("overviewUpright"),
        content: (
            <div className='space-y-3'>
                {uprightImage}
                {meaning.upright.overview.keywords?.length
                    ? makeKeywords(meaning.upright.overview.keywords)
                    : null}
                <div className='text-xs text-muted-foreground flex flex-wrap gap-3'>
                    {meaning.upright.overview.yesNo && (
                        <span>
                            <span className='font-medium'>{t("yesNo")}:</span>{" "}
                            {meaning.upright.overview.yesNo}
                        </span>
                    )}
                    {meaning.upright.overview.zodiac && (
                        <span>
                            <span className='font-medium'>{t("zodiac")}:</span>{" "}
                            {meaning.upright.overview.zodiac}
                        </span>
                    )}
                    {meaning.upright.overview.element && (
                        <span>
                            <span className='font-medium'>{t("element")}:</span>{" "}
                            {meaning.upright.overview.element}
                        </span>
                    )}
                </div>
                <blockquote className='italic opacity-90'>
                    “
                    {meaning.upright.overview.text
                        .split(". ")[0]
                        .replace(/^"|"$/g, "")}
                    ”
                </blockquote>
                {getTextAfterFirstSentence(meaning.upright.overview.text) && (
                    <p>
                        {getTextAfterFirstSentence(
                            meaning.upright.overview.text
                        )}
                    </p>
                )}
            </div>
        ),
    }

    const reversedOverview: ArticleSection = {
        id: "reversed-overview",
        title: t("overviewReversed"),
        content: (
            <div className='space-y-3'>
                {reversedImage}
                {meaning.reversed.overview.keywords?.length
                    ? makeKeywords(meaning.reversed.overview.keywords)
                    : null}
                <div className='text-xs text-muted-foreground flex flex-wrap gap-3'>
                    {meaning.reversed.overview.yesNo && (
                        <span>
                            <span className='font-medium'>{t("yesNo")}:</span>{" "}
                            {meaning.reversed.overview.yesNo}
                        </span>
                    )}
                    {meaning.reversed.overview.zodiac && (
                        <span>
                            <span className='font-medium'>{t("zodiac")}:</span>{" "}
                            {meaning.reversed.overview.zodiac}
                        </span>
                    )}
                    {meaning.reversed.overview.element && (
                        <span>
                            <span className='font-medium'>{t("element")}:</span>{" "}
                            {meaning.reversed.overview.element}
                        </span>
                    )}
                </div>
                <blockquote className='italic opacity-90'>
                    “
                    {meaning.reversed.overview.text
                        .split(". ")[0]
                        .replace(/^"|"$/g, "")}
                    ”
                </blockquote>
                {getTextAfterFirstSentence(meaning.reversed.overview.text) && (
                    <p>
                        {getTextAfterFirstSentence(
                            meaning.reversed.overview.text
                        )}
                    </p>
                )}
            </div>
        ),
    }
    const sections: ArticleSection[] = [uprightOverview]

    if (
        meaning.upright.relationships?.text &&
        meaning.reversed.relationships?.text
    ) {
        sections.push({
            id: "upright-relationships",
            title: `${t("relationships")} (${t("upright")})`,
            content: (
                <div className='space-y-3'>
                    {meaning.upright.relationships.keywords?.length
                        ? makeKeywords(meaning.upright.relationships.keywords)
                        : null}
                    <p>{meaning.upright.relationships.text}</p>
                </div>
            ),
        })
    }

    if (meaning.upright.work?.text && meaning.reversed.work?.text) {
        sections.push({
            id: "upright-work",
            title: `${t("work")} (${t("upright")})`,
            content: (
                <div className='space-y-3'>
                    {meaning.upright.work.keywords?.length
                        ? makeKeywords(meaning.upright.work.keywords)
                        : null}
                    <p>{meaning.upright.work.text}</p>
                </div>
            ),
        })
    }

    if (meaning.upright.finance?.text && meaning.reversed.finance?.text) {
        sections.push({
            id: "upright-finance",
            title: `${t("finance")} (${t("upright")})`,
            content: (
                <div className='space-y-3'>
                    {meaning.upright.finance.keywords?.length
                        ? makeKeywords(meaning.upright.finance.keywords)
                        : null}
                    <p>{meaning.upright.finance.text}</p>
                </div>
            ),
        })
    }

    if (meaning.upright.health?.text && meaning.reversed.health?.text) {
        sections.push({
            id: "upright-health",
            title: `${t("health")} (${t("upright")})`,
            content: (
                <div className='space-y-3'>
                    {meaning.upright.health.keywords?.length
                        ? makeKeywords(meaning.upright.health.keywords)
                        : null}
                    <p>{meaning.upright.health.text}</p>
                </div>
            ),
        })
    }

    sections.push(reversedOverview)

    if (meaning.reversed.relationships?.text) {
        sections.push({
            id: "reversed-relationships",
            title: `${t("relationships")} (${t("reversed")})`,
            content: (
                <div className='space-y-3'>
                    {meaning.reversed.relationships.keywords?.length
                        ? makeKeywords(meaning.reversed.relationships.keywords)
                        : null}
                    <p>{meaning.reversed.relationships.text}</p>
                </div>
            ),
        })
    }

    if (meaning.reversed.work?.text) {
        sections.push({
            id: "reversed-work",
            title: `${t("work")} (${t("reversed")})`,
            content: (
                <div className='space-y-3'>
                    {meaning.reversed.work.keywords?.length
                        ? makeKeywords(meaning.reversed.work.keywords)
                        : null}
                    <p>{meaning.reversed.work.text}</p>
                </div>
            ),
        })
    }

    if (meaning.reversed.finance?.text) {
        sections.push({
            id: "reversed-finance",
            title: `${t("finance")} (${t("reversed")})`,
            content: (
                <div className='space-y-3'>
                    {meaning.reversed.finance.keywords?.length
                        ? makeKeywords(meaning.reversed.finance.keywords)
                        : null}
                    <p>{meaning.reversed.finance.text}</p>
                </div>
            ),
        })
    }

    if (meaning.reversed.health?.text) {
        sections.push({
            id: "reversed-health",
            title: `${t("health")} (${t("reversed")})`,
            content: (
                <div className='space-y-3'>
                    {meaning.reversed.health.keywords?.length
                        ? makeKeywords(meaning.reversed.health.keywords)
                        : null}
                    <p>{meaning.reversed.health.text}</p>
                </div>
            ),
        })
    }

    const baseUrl = "https://askingfate.com"
    const pageUrl = `${baseUrl}${await getPathname({ locale, href: `/articles/tarot/${card.slug}` })}`
    const overviewText = meaning.upright.overview.text
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${card.name} — Tarot Meaning (Upright & Reversed)`,
        description: overviewText.split(". ")[0].replace(/^"|"$/g, ""),
        image: `${baseUrl}/assets/rider-waite-tarot/${card.slug}.png`,
        inLanguage: locale,
        articleSection: `${card.arcana === "major" ? "Major" : "Minor"} Arcana`,
        keywords: [
            card.name,
            "tarot",
            `${card.arcana} arcana`,
            "upright",
            "reversed",
        ],
        mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
        author: { "@type": "Organization", name: "AskingFate", url: baseUrl },
        publisher: {
            "@type": "Organization",
            name: "AskingFate",
            url: baseUrl,
            logo: {
                "@type": "ImageObject",
                url: `${baseUrl}/assets/logo.png`,
            },
        },
    }
    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "Tarot",
                item: `${baseUrl}${await getPathname({ locale, href: "/articles/tarot" })}`,
            },
            {
                "@type": "ListItem",
                position: 2,
                name: card.name,
                item: pageUrl,
            },
        ],
    }

    return (
        <>
            <script
                type='application/ld+json'
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type='application/ld+json'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbLd),
                }}
            />
            <ArticleLayout
                title={card.name}
                subtitle={`Upright and reversed meanings with practical guidance.`}
            tocIds={["upright-overview", "reversed-overview"]}
            backHref='/articles/tarot'
            backLabel='Tarot'
            onThisPageLabel='On this page'
            sections={sections}
            related={[
                {
                    href: "/articles/tarot",
                    title: "All Tarot Cards",
                    description: "Browse all 78 cards by arcana and suit.",
                },
                {
                    href: "/articles/how-to-play",
                    title: "How to Play",
                    description:
                        "Follow a simple flow for meaningful readings.",
                },
                {
                    href: "/articles/faq",
                    title: "FAQ",
                    description:
                        "Answers to common questions about readings and stars.",
                    },
                ]}
            />
        </>
    )
}
