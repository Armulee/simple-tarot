import type { Metadata } from "next"
import {
    ArticleLayout,
    type ArticleSection,
} from "@/components/articles/article-layout"
import { Link } from "@/i18n/navigation"
import Image from "next/image"
import { getMajor, getMinorBySuit } from "@/lib/tarot/cards"

export async function generateMetadata(): Promise<Metadata> {
    const title = "Tarot Guide: What it is, History, Major & Minor Arcana"
    const desc =
        "Learn tarot fundamentals with a concise guide: history, Major Arcana meanings, Minor Arcana by suits, and links to all 78 cards."
    return {
        title: `${title} | Asking Fate`,
        description: desc,
        openGraph: { title, description: desc },
        twitter: { card: "summary_large_image", title, description: desc },
    }
}

export default async function TarotGuidePage() {
    const whatIs: ArticleSection = {
        id: "what-is",
        title: "What is Tarot?",
        content: (
            <div className='space-y-3'>
                <p>
                    Tarot is a reflective tool. Each card acts like a
                    symbol-rich mirror that helps you see a situation from new
                    angles, connect patterns, and choose next steps
                    intentionally.
                </p>
                <p>
                    Rather than predicting fate, tarot encourages mindful
                    decisions by pairing archetypes with your lived context. Use
                    it to clarify questions, not to surrender judgment.
                </p>
            </div>
        ),
    }

    const history: ArticleSection = {
        id: "history",
        title: "A brief history",
        content: (
            <div className='space-y-3'>
                <p>
                    Tarot originated as playing cards in 15th‑century Europe.
                    Over time, artists and mystics expanded their symbolic
                    language, culminating in modern decks like Rider‑Waite–Smith
                    that popularized the imagery used today.
                </p>
                <p>
                    Contemporary readers treat tarot as a language of
                    symbols—flexible enough to support journaling, coaching, and
                    personal reflection.
                </p>
            </div>
        ),
    }

    const major = getMajor()
    const majorSection: ArticleSection = {
        id: "major",
        title: "Major Arcana",
        content: (
            <div className='space-y-3'>
                <p>
                    The 22 Major Arcana describe pivotal themes—identity,
                    change, challenge, and integration. They map the Fool’s
                    Journey: cycles of learning that repeat at deeper levels.
                </p>
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
    const minorSection: ArticleSection = {
        id: "minor",
        title: "Minor Arcana",
        content: (
            <div className='space-y-5'>
                <p>
                    The 56 Minor Arcana zoom into everyday domains. Each suit
                    explores a different field: Wands (energy and action), Cups
                    (emotion and relationships), Swords (thought and truth), and
                    Pentacles (work and resources).
                </p>
                <div className='space-y-8'>
                    {suits.map((suit) => {
                        const cards = getMinorBySuit(suit)
                        const title =
                            suit.charAt(0).toUpperCase() + suit.slice(1)
                        return (
                            <div key={suit} className='space-y-3'>
                                <div className='flex items-center gap-3'>
                                    <div className='p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary'>
                                        <span className='text-xs font-semibold capitalize'>
                                            {title}
                                        </span>
                                    </div>
                                    <p className='text-xs sm:text-sm text-muted-foreground'>
                                        {suit === "wands" &&
                                            "Themes: energy, passion, creativity, action."}
                                        {suit === "cups" &&
                                            "Themes: emotion, intuition, connection, relationships."}
                                        {suit === "swords" &&
                                            "Themes: thought, clarity, conflict, truth."}
                                        {suit === "pentacles" &&
                                            "Themes: work, resources, stability, health."}
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
            title='Tarot'
            subtitle='Understand tarot foundations and explore links to every card.'
            backLabel='Articles'
            sections={sections}
            related={[
                {
                    href: "/articles/how-to-play",
                    title: "How to Play",
                    description:
                        "Learn the reading flow and get practical tips.",
                },
                {
                    href: "/articles/faq",
                    title: "FAQ",
                    description:
                        "Quick answers about readings, stars, and privacy.",
                },
                {
                    href: "/articles/help-support",
                    title: "Help & Support",
                    description: "Troubleshoot common issues and contact us.",
                },
            ]}
        />
    )
}
