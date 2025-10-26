import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import {
    ArticleLayout,
    type ArticleSection,
} from "@/components/articles/article-layout"
import { ARTICLES } from "@/components/articles/data"
// import { Play, Target, Heart, Eye, Share2, Lightbulb, CheckCircle, ArrowRight } from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Articles")
    const title = t("items.howToPlay.title")
    const desc = t("subtitle")
    return { title: `${title} | Asking Fate`, description: desc }
}

export default async function HowToPlayArticlePage() {
    const t = await getTranslations("Articles")

    const sections: ArticleSection[] = [
        {
            id: "q",
            title: "Step 1 — Ask a clear question",
            content: (
                <div className='space-y-2'>
                    <p>
                        A clear question invites a clearer reflection. Focus on
                        the decision or perspective you want to explore—not
                        predicting a fixed outcome.
                    </p>
                    <p>
                        Choose a specific, honest question you’re curious about.
                    </p>
                </div>
            ),
        },
        {
            id: "type",
            title: "Step 2 — Choose your reading type",
            content: (
                <div className='space-y-2'>
                    <p>
                        Reading types balance depth and speed. Start simpler if
                        you’re new, and move up when you want more context or
                        nuance.
                    </p>
                    <p>
                        Select Simple, Intermediate, or Advanced depending on
                        depth desired.
                    </p>
                </div>
            ),
        },
        {
            id: "cards",
            title: "Step 3 — Pick your cards",
            content: (
                <div className='space-y-2'>
                    <p>
                        Don’t overthink the choice—your first instinct is often
                        enough. The aim is to prompt reflection, not perfection.
                    </p>
                    <p>
                        Trust your intuition. Select the number shown for your
                        chosen reading.
                    </p>
                </div>
            ),
        },
        {
            id: "reflect",
            title: "Step 4 — Read & reflect",
            content: (
                <div className='space-y-2'>
                    <p>
                        As you read, notice what resonates and what surprises
                        you. Translating insights into small next steps makes
                        the guidance useful.
                    </p>
                    <p>
                        Review the AI interpretation. Note what resonates and
                        any actions you’ll take.
                    </p>
                </div>
            ),
        },
        {
            id: "save",
            title: "Step 5 — Save or share",
            content: (
                <div className='space-y-2'>
                    <p>
                        Saving builds a personal archive you can revisit.
                        Sharing can inspire friends and earns stars when unique
                        visitors view your reading.
                    </p>
                    <p>
                        Save readings for later reflection or share a link to
                        earn stars.
                    </p>
                </div>
            ),
        },
        {
            id: "tips",
            title: "Tips",
            content: (
                <div className='space-y-2'>
                    <p>
                        These habits make readings more insightful without
                        adding complexity. Use them when you want a little more
                        depth.
                    </p>
                    <ul className='list-disc pl-5 space-y-1 text-muted-foreground'>
                        <li>
                            Use present-focused questions (e.g., “What should I
                            consider about…?”).
                        </li>
                        <li>
                            Revisit with a follow-up question if you need more
                            clarity.
                        </li>
                        <li>
                            Keep entries in a personal journal for patterns over
                            time.
                        </li>
                    </ul>
                </div>
            ),
        },
    ]

    return (
        <ArticleLayout
            title={t("items.howToPlay.title")}
            subtitle={t("items.howToPlay.description")}
            backLabel={t("title")}
            onThisPageLabel='On this page'
            sections={sections}
            related={[ARTICLES[5], ARTICLES[4], ARTICLES[1]]}
        />
    )
}
