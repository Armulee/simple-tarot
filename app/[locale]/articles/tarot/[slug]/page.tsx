import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getCardBySlug, TAROT_CARDS } from "@/lib/tarot/cards"
import { getCardMeaning } from "@/lib/tarot/meanings"
import { routing } from "@/i18n/routing"
import {
    ArticleLayout,
    type ArticleSection,
} from "@/components/articles/article-layout"

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

export default async function TarotCardArticlePage({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>
}) {
    const { slug } = await params
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

    const makeKeywords = (words: string[]) => (
        <div className='flex flex-wrap gap-2 mb-3'>
            {words.map((w) => (
                <span
                    key={w}
                    className='px-2 py-0.5 rounded-full text-xs border border-border/40 bg-background/40'
                >
                    {w}
                </span>
            ))}
        </div>
    )

    const meaning = getCardMeaning(card.slug)
    if (!meaning?.upright?.overview?.text || !meaning?.reversed?.overview?.text) {
        return notFound()
    }

    const uprightOverview: ArticleSection = {
        id: "upright-overview",
        title: "Overview (Upright)",
        content: (
            <div className='space-y-3'>
                {uprightImage}
                {meaning.upright.overview.keywords?.length
                    ? makeKeywords(meaning.upright.overview.keywords)
                    : null}
                <div className='text-xs text-muted-foreground flex flex-wrap gap-3'>
                    {meaning.upright.overview.yesNo && (
                        <span>
                            <span className='font-medium'>Yes/No:</span>{" "}
                            {meaning.upright.overview.yesNo}
                        </span>
                    )}
                    {meaning.upright.overview.zodiac && (
                        <span>
                            <span className='font-medium'>Zodiac:</span>{" "}
                            {meaning.upright.overview.zodiac}
                        </span>
                    )}
                </div>
                <p>
                    {meaning.upright.overview.text}
                </p>
            </div>
        ),
    }

    const reversedOverview: ArticleSection = {
        id: "reversed-overview",
        title: "Overview (Reversed)",
        content: (
            <div className='space-y-3'>
                {reversedImage}
                {meaning.reversed.overview.keywords?.length
                    ? makeKeywords(meaning.reversed.overview.keywords)
                    : null}
                <div className='text-xs text-muted-foreground flex flex-wrap gap-3'>
                    {meaning.reversed.overview.yesNo && (
                        <span>
                            <span className='font-medium'>Yes/No:</span>{" "}
                            {meaning.reversed.overview.yesNo}
                        </span>
                    )}
                    {meaning.reversed.overview.zodiac && (
                        <span>
                            <span className='font-medium'>Zodiac:</span>{" "}
                            {meaning.reversed.overview.zodiac}
                        </span>
                    )}
                </div>
                <p>
                    {meaning.reversed.overview.text}
                </p>
            </div>
        ),
    }
    const sections: ArticleSection[] = [uprightOverview, reversedOverview]

    return (
        <ArticleLayout
            title={card.name}
            subtitle={`Upright and reversed meanings with practical guidance.`}
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
    )
}
