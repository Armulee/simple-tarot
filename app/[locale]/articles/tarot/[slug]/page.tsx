import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { getCardBySlug, TAROT_CARDS } from "@/lib/tarot/cards"
import { routing } from "@/i18n/routing"
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
    // Generate all tarot article paths for each supported locale
    return routing.locales.flatMap((locale) =>
        TAROT_CARDS.map((c) => ({ locale, slug: c.slug }))
    )
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
    const { slug } = await params
    const card = getCardBySlug(slug)
    if (!card) return {}
    const title = `${card.name} — Tarot Meaning (Upright & Reversed)`
    const description = `Explore ${card.name} upright and reversed: overview, relationships, work & career, finance, and health.`
    const keywords = `${card.name}, tarot, ${card.arcana} arcana, meaning, upright, reversed`
    return {
        title,
        description,
        keywords,
        openGraph: { title, description },
        twitter: { card: "summary", title, description },
    }
}

const ROMAN = [
    "0",
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
    "XIII",
    "XIV",
    "XV",
    "XVI",
    "XVII",
    "XVIII",
    "XIX",
    "XX",
    "XXI",
]

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
    const t = await getTranslations("TarotArticle")
    const card = getCardBySlug(slug)
    if (!card) return notFound()

    // Dynamic import per-card JSON, prefer locale file then fallback
    let meaning: CardMeaning | undefined
    try {
        const mod = await import(
            `@/lib/tarot/meanings/${locale}/${card.slug}.json`
        )
        meaning = mod.default as CardMeaning
    } catch {
        const mod = await import(`@/lib/tarot/meanings/${card.slug}.json`)
        meaning = mod.default as CardMeaning
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

    const breadcrumb =
        card.arcana === "major"
            ? `${t("tarot")} · ${t("majorArcana")} · ${ROMAN[card.number ?? 0]}`
            : `${t("tarot")} · ${t("minorArcana")} · ${card.rank ?? ""}`

    const eyebrow =
        card.arcana === "major" ? t("majorArcana") : t("minorArcana")

    const year = new Date().getFullYear()

    return (
        <CardArticle
            cardName={card.name}
            eyebrow={eyebrow}
            breadcrumb={breadcrumb}
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
                brand: "AskingFate",
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
    )
}
