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

    const uprightOverview: ArticleSection = {
        id: "upright-overview",
        title: "Overview (Upright)",
        content: (
            <div className='space-y-3'>
                {uprightImage}
                {makeKeywords(
                    meaning?.upright.overview.keywords || card.uprightKeywords
                )}
                <div className='text-xs text-muted-foreground flex flex-wrap gap-3'>
                    {meaning?.upright.overview.yesNo && (
                        <span>
                            <span className='font-medium'>Yes/No:</span>{" "}
                            {meaning.upright.overview.yesNo}
                        </span>
                    )}
                    {meaning?.upright.overview.zodiac && (
                        <span>
                            <span className='font-medium'>Zodiac:</span>{" "}
                            {meaning.upright.overview.zodiac}
                        </span>
                    )}
                </div>
                <p>
                    {meaning?.upright.overview.text ||
                        `${card.name} upright supports steady, intentional action.`}
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
                {makeKeywords(
                    meaning?.reversed.overview.keywords || card.reversedKeywords
                )}
                <div className='text-xs text-muted-foreground flex flex-wrap gap-3'>
                    {meaning?.reversed.overview.yesNo && (
                        <span>
                            <span className='font-medium'>Yes/No:</span>{" "}
                            {meaning.reversed.overview.yesNo}
                        </span>
                    )}
                    {meaning?.reversed.overview.zodiac && (
                        <span>
                            <span className='font-medium'>Zodiac:</span>{" "}
                            {meaning.reversed.overview.zodiac}
                        </span>
                    )}
                </div>
                <p>
                    {meaning?.reversed.overview.text ||
                        `${card.name} reversed asks for recalibration and lighter travel.`}
                </p>
            </div>
        ),
    }

    const uprightRelationships: ArticleSection = {
        id: "upright-relationships",
        title: "Relationships (Upright)",
        content: (
            <div className='space-y-3'>
                {makeKeywords(
                    meaning?.upright.relationships.keywords || [
                        "communication",
                        "trust",
                        "presence",
                    ]
                )}
                <p>
                    {meaning?.upright.relationships.text ||
                        `Practical kindness and honest dialogue strengthen bonds.`}
                </p>
            </div>
        ),
    }

    const reversedRelationships: ArticleSection = {
        id: "reversed-relationships",
        title: "Relationships (Reversed)",
        content: (
            <div className='space-y-3'>
                {makeKeywords(
                    meaning?.reversed.relationships.keywords || [
                        "boundaries",
                        "repair",
                        "honesty",
                    ]
                )}
                <p>
                    {meaning?.reversed.relationships.text ||
                        `Name one truth, reset a boundary, and take a small step.`}
                </p>
            </div>
        ),
    }

    const uprightWork: ArticleSection = {
        id: "upright-work",
        title: "Work & Career (Upright)",
        content: (
            <div className='space-y-3'>
                {makeKeywords(
                    meaning?.upright.work.keywords || [
                        "focus",
                        "leverage",
                        "iteration",
                    ]
                )}
                <p>
                    {meaning?.upright.work.text ||
                        `Reduce scope, ship sooner, and let feedback guide iteration.`}
                </p>
            </div>
        ),
    }

    const reversedWork: ArticleSection = {
        id: "reversed-work",
        title: "Work & Career (Reversed)",
        content: (
            <div className='space-y-3'>
                {makeKeywords(
                    meaning?.reversed.work.keywords || [
                        "scope",
                        "friction",
                        "alignment",
                    ]
                )}
                <p>
                    {meaning?.reversed.work.text ||
                        `Clarify scope, sequence work, and realign to the core objective.`}
                </p>
            </div>
        ),
    }

    const uprightFinance: ArticleSection = {
        id: "upright-finance",
        title: "Finance (Upright)",
        content: (
            <div className='space-y-3'>
                {makeKeywords(
                    meaning?.upright.finance.keywords || [
                        "values",
                        "consistency",
                        "runway",
                    ]
                )}
                <p>
                    {meaning?.upright.finance.text ||
                        `Align spending with values and automate steady contributions.`}
                </p>
            </div>
        ),
    }

    const reversedFinance: ArticleSection = {
        id: "reversed-finance",
        title: "Finance (Reversed)",
        content: (
            <div className='space-y-3'>
                {makeKeywords(
                    meaning?.reversed.finance.keywords || [
                        "stability",
                        "risk",
                        "clarity",
                    ]
                )}
                <p>
                    {meaning?.reversed.finance.text ||
                        `Stabilize, pause non‑essentials, and decide from clear numbers.`}
                </p>
            </div>
        ),
    }

    const uprightHealth: ArticleSection = {
        id: "upright-health",
        title: "Health (Upright)",
        content: (
            <div className='space-y-3'>
                {makeKeywords(
                    meaning?.upright.health.keywords || [
                        "routine",
                        "rest",
                        "awareness",
                    ]
                )}
                <p>
                    {meaning?.upright.health.text ||
                        `Prioritize steady, gentle routines and compassionate awareness.`}
                </p>
            </div>
        ),
    }

    const reversedHealth: ArticleSection = {
        id: "reversed-health",
        title: "Health (Reversed)",
        content: (
            <div className='space-y-3'>
                {makeKeywords(
                    meaning?.reversed.health.keywords || [
                        "overload",
                        "recovery",
                        "support",
                    ]
                )}
                <p>
                    {meaning?.reversed.health.text ||
                        `Scale back, choose recovery, and seek appropriate support.`}
                </p>
            </div>
        ),
    }

    const sections: ArticleSection[] = [
        uprightOverview,
        uprightRelationships,
        uprightWork,
        uprightFinance,
        uprightHealth,
        reversedOverview,
        reversedRelationships,
        reversedWork,
        reversedFinance,
        reversedHealth,
    ]

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
