import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
// import { Link } from "@/i18n/navigation"
import {
    ArticleLayout,
    type ArticleSection,
} from "@/components/articles/article-layout"
import { ARTICLES } from "@/components/articles/data"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Articles")
    const title = t("items.shareReading.title")
    const desc = t("subtitle")
    return { title: `${title} | Asking Fate`, description: desc }
}

export default async function ShareReadingArticlePage() {
    const t = await getTranslations("Articles")
    const sections: ArticleSection[] = [
        {
            id: "overview",
            title: "Overview",
            content: (
                <div className='space-y-2'>
                    <p>
                        Sharing your reading helps more people explore
                        reflective guidance—and you earn stars when unique
                        visitors open your link. It’s a lightweight way to
                        support the community while documenting insights you’re
                        proud of.
                    </p>
                    <p>
                        There’s no manual submission needed. Just share a valid
                        reading link and we’ll handle the rest in the
                        background.
                    </p>
                </div>
            ),
        },
        {
            id: "how",
            title: "How it works",
            content: (
                <div className='space-y-2'>
                    <p>
                        Progress is counted automatically using unique visits.
                        To maximize reach, choose channels where people are
                        already curious.
                    </p>
                    <ol className='list-decimal pl-5 space-y-1 text-muted-foreground'>
                        <li>Finish a reading and tap Share.</li>
                        <li>Copy the link and share it publicly.</li>
                        <li>
                            Each unique visitor counts toward your daily cap.
                        </li>
                    </ol>
                </div>
            ),
        },
        {
            id: "eligibility",
            title: "Eligibility",
            content: (
                <div className='space-y-2'>
                    <p>
                        To keep things fair, we count genuine interest—not bots
                        or repeated refreshes. Share naturally with your
                        audience.
                    </p>
                    <ul className='list-disc pl-5 space-y-1 text-muted-foreground'>
                        <li>Visitors must open the shared link.</li>
                        <li>Limit: 3 stars/day per account.</li>
                        <li>Abuse or spam voids eligibility.</li>
                    </ul>
                </div>
            ),
        },
    ]

    return (
        <ArticleLayout
            title={t("items.shareReading.title")}
            subtitle={t("items.shareReading.description")}
            backLabel={t("title")}
            onThisPageLabel='On this page'
            sections={sections}
            related={[ARTICLES[0], ARTICLES[2], ARTICLES[5]]}
        />
    )
}
