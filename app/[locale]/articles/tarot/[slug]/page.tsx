import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import {
    getCardBySlug,
    TAROT_ARTICLE_LOCALES,
    TAROT_CARDS,
} from "@/lib/tarot/cards"
import { getPathname } from "@/i18n/navigation"
import { CardArticle, type AreaView, type OrientationView } from "./card-article"

type SectionMeaning = {
    keywords?: string[]
    text: string
    yesNo?: string
    zodiac?: string
    element?: string
}
type OrientationMeaning = {
    overview: SectionMeaning
    relationships: SectionMeaning
    work: SectionMeaning
    finance: SectionMeaning
    health: SectionMeaning
}
type CardMeaning = {
    slug: string
    upright: OrientationMeaning
    reversed: OrientationMeaning
}

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

// First sentence becomes the lede / pull-quote; the remainder is the overview body.
function splitFirstSentence(text: string): { first: string; rest: string } {
    const match = text.match(/^(.*?\.)\s*([\s\S]*)$/)
    if (!match) return { first: text.trim(), rest: "" }
    return {
        first: match[1].replace(/^["“]|["”]$/g, "").trim(),
        rest: match[2].trim(),
    }
}

function dedupe(words: string[]): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const w of words) {
        const key = w.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push(w)
    }
    return out
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

    const areaTitles: Record<AreaView["key"], string> = {
        relationships: t("relationships"),
        work: t("work"),
        finance: t("finance"),
        health: t("health"),
    }

    // Build the orientation view-model. Keyword model:
    //   • core keywords live ONCE on the overview (deduped),
    //   • each life area carries only its 3 specific keywords.
    const buildView = (o: OrientationMeaning): OrientationView => {
        const { first, rest } = splitFirstSentence(o.overview.text)
        const areas: AreaView[] = (
            ["relationships", "work", "finance", "health"] as const
        ).map((key) => ({
            key,
            title: areaTitles[key],
            keys: (o[key].keywords ?? []).slice(0, 3),
            body: o[key].text,
        }))
        return {
            lede: first,
            quote: first,
            overview: rest || o.overview.text,
            core: dedupe(o.overview.keywords ?? []),
            areas,
        }
    }

    const eyebrow =
        card.arcana === "major" ? t("majorArcana") : t("minorArcana")

    const year = new Date().getFullYear()

    // Structured data for SEO (Article + Breadcrumb).
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
            <CardArticle
                cardName={card.name}
                eyebrow={eyebrow}
                topHint={t("tapToFlip")}
                imageSrc={`/assets/rider-waite-tarot/${card.slug}.png`}
                badges={{
                    yesNo: meaning.upright.overview.yesNo,
                    zodiac: meaning.upright.overview.zodiac,
                    element: meaning.upright.overview.element,
                }}
                upright={buildView(meaning.upright)}
                reversed={buildView(meaning.reversed)}
                related={[
                    {
                        href: "/articles/tarot",
                        title: t("allTarotCards"),
                        description: t("allTarotCardsDesc"),
                    },
                    {
                        href: "/articles/how-to-play",
                        title: t("howToPlay"),
                        description: t("howToPlayDesc"),
                    },
                    {
                        href: "/articles/faq",
                        title: t("faq"),
                        description: t("faqDesc"),
                    },
                ]}
                labels={{
                    upright: t("upright"),
                    reversed: t("reversed"),
                    lightGathers: t("lightGathers"),
                    lightRecedes: t("lightRecedes"),
                    theReading: t("theReading"),
                    continue: t("continue"),
                    readArticle: t("readArticle"),
                    orientationGroup: t("orientationGroup"),
                    yesNo: t("yesNo"),
                    zodiac: t("zodiac"),
                    element: t("element"),
                    rights: `© ${year} AskingFate, LLC`,
                }}
            />
        </>
    )
}
