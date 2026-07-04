import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import {
    getCardBySlug,
    TAROT_ARTICLE_LOCALES,
    TAROT_CARDS,
} from "@/lib/tarot/cards"
import { getPathname } from "@/i18n/navigation"
import { buildTarotCardOriginContext } from "@/lib/chat/origin-context"
import { CardArticle, type AreaView, type OrientationView } from "./card-article"

export type Orientation = "upright" | "reversed"

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

const BASE_URL = "https://askingfate.com"

function hrefFor(slug: string, orientation: Orientation) {
    return orientation === "reversed"
        ? `/articles/tarot/${slug}/reversed`
        : `/articles/tarot/${slug}`
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

async function loadMeaning(
    locale: string,
    slug: string,
): Promise<CardMeaning | undefined> {
    try {
        const mod = await import(`@/lib/tarot/meanings/${locale}/${slug}.json`)
        return mod.default as CardMeaning
    } catch {
        try {
            const mod = await import(`@/lib/tarot/meanings/en/${slug}.json`)
            return mod.default as CardMeaning
        } catch {
            return undefined
        }
    }
}

/** Shared static params for both the upright and reversed routes. */
export function cardStaticParams() {
    return TAROT_ARTICLE_LOCALES.flatMap((locale) =>
        TAROT_CARDS.map((c) => ({ locale, slug: c.slug })),
    )
}

/** Per-orientation metadata: distinct title/description/canonical so the
 *  reversed page can rank for "<card> reversed" without cannibalizing base. */
export async function buildCardMetadata({
    locale,
    slug,
    orientation,
}: {
    locale: string
    slug: string
    orientation: Orientation
}): Promise<Metadata> {
    setRequestLocale(locale)
    const card = getCardBySlug(slug)
    if (!card) return {}

    const reversed = orientation === "reversed"
    const title = reversed
        ? `${card.name} Reversed — Tarot Card Meaning`
        : `${card.name} — Tarot Meaning (Upright & Reversed)`
    const description = reversed
        ? `${card.name} reversed: what it means for love, relationships, work & career, finance, and health.`
        : `Explore ${card.name} upright and reversed: overview, relationships, work & career, finance, and health.`
    const keywords = reversed
        ? `${card.name} reversed, ${card.name} reversed meaning, ${card.name}, tarot, ${card.arcana} arcana`
        : `${card.name}, tarot, ${card.arcana} arcana, meaning, upright, reversed`

    const href = hrefFor(card.slug, orientation)
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

/** Shared page renderer for both orientations. */
export async function CardArticlePageView({
    locale,
    slug,
    orientation,
}: {
    locale: string
    slug: string
    orientation: Orientation
}) {
    setRequestLocale(locale)
    const t = await getTranslations("TarotArticle")
    const card = getCardBySlug(slug)
    if (!card) return notFound()

    const meaning = await loadMeaning(locale, card.slug)
    if (!meaning?.upright?.overview?.text || !meaning?.reversed?.overview?.text) {
        return notFound()
    }

    const areaTitles: Record<AreaView["key"], string> = {
        relationships: t("relationships"),
        work: t("work"),
        finance: t("finance"),
        health: t("health"),
    }

    // Keyword model: core keywords live ONCE on the overview (deduped); each
    // life area carries only its 3 specific keywords.
    const buildView = (o: OrientationMeaning): OrientationView => {
        const areas: AreaView[] = (
            ["relationships", "work", "finance", "health"] as const
        ).map((key) => ({
            key,
            title: areaTitles[key],
            keys: (o[key].keywords ?? []).slice(0, 3),
            body: o[key].text,
        }))
        return {
            overview: o.overview.text,
            core: dedupe(o.overview.keywords ?? []),
            areas,
        }
    }

    const eyebrow =
        card.arcana === "major" ? t("majorArcana") : t("minorArcana")

    const originContext = buildTarotCardOriginContext({
        name: card.name,
        slug: card.slug,
        arcanaLabel: eyebrow,
        uprightLine: splitFirstSentence(meaning.upright.overview.text).first,
        reversedLine: splitFirstSentence(meaning.reversed.overview.text).first,
    })

    const year = new Date().getFullYear()
    const reversed = orientation === "reversed"

    const uprightHref = await getPathname({
        locale,
        href: hrefFor(card.slug, "upright"),
    })
    const reversedHref = await getPathname({
        locale,
        href: hrefFor(card.slug, "reversed"),
    })

    // Structured data — reflects the orientation of this page.
    const pageUrl = `${BASE_URL}${reversed ? reversedHref : uprightHref}`
    const activeOverview = reversed
        ? meaning.reversed.overview
        : meaning.upright.overview
    const displayName = reversed ? `${card.name} (Reversed)` : card.name
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: reversed
            ? `${card.name} Reversed — Tarot Card Meaning`
            : `${card.name} — Tarot Meaning (Upright & Reversed)`,
        description: activeOverview.text.split(". ")[0].replace(/^"|"$/g, ""),
        image: `${BASE_URL}/assets/rider-waite-tarot/${card.slug}.png`,
        inLanguage: locale,
        articleSection: `${card.arcana === "major" ? "Major" : "Minor"} Arcana`,
        keywords: [
            card.name,
            ...(reversed ? [`${card.name} reversed`] : []),
            "tarot",
            `${card.arcana} arcana`,
            reversed ? "reversed" : "upright",
        ],
        mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
        author: { "@type": "Organization", name: "AskingFate", url: BASE_URL },
        publisher: {
            "@type": "Organization",
            name: "AskingFate",
            url: BASE_URL,
            logo: {
                "@type": "ImageObject",
                url: `${BASE_URL}/assets/logo.png`,
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
                item: `${BASE_URL}${await getPathname({ locale, href: "/articles/tarot" })}`,
            },
            {
                "@type": "ListItem",
                position: 2,
                name: displayName,
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
                originContext={originContext}
                suggestions={t.raw("askSuggestions") as string[]}
                imageSrc={`/assets/rider-waite-tarot/${card.slug}.png`}
                initialOrientation={orientation}
                uprightHref={uprightHref}
                reversedHref={reversedHref}
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
                    askPlaceholder: t("askPlaceholder"),
                    askEyebrow: t("askEyebrow"),
                    askHint: t("askHint"),
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
