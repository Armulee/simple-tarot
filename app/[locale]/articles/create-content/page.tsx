import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import {
    ArticleLayout,
    type ArticleSection,
} from "@/components/articles/article-layout"
import { ARTICLES } from "@/components/articles/data"
// import { PenTool, FileText, Image, Video, Star, Clock, CheckCircle, ExternalLink } from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Articles")
    const title = t("items.createContent.title")
    const desc = t("subtitle")
    return { title: `${title} | Asking Fate`, description: desc }
}

export default async function CreateContentArticlePage() {
    const t = await getTranslations("Articles")

    const sections: ArticleSection[] = [
        {
            id: "overview",
            title: "Overview",
            content: (
                <div className='space-y-3'>
                    <p>
                        Creating content about Asking Fate helps curious people
                        discover mindful reflection while you earn stars for
                        your effort. The most valuable posts share a real
                        experience—what you tried, what you noticed, and how
                        others can get started quickly—supported by clear
                        examples or screenshots.
                    </p>
                    <p>
                        Aim for clarity over hype. If a friend asked, “What is
                        it and how do I begin?” your content should answer in a
                        few confident, practical steps.
                    </p>
                </div>
            ),
        },
        {
            id: "formats",
            title: "Eligible formats",
            content: (
                <div className='space-y-2'>
                    <p>
                        Choose the medium you’re comfortable with. Keep it
                        accessible for a general audience and focus on helping
                        someone take their first step.
                    </p>
                    <ul className='list-disc pl-5 space-y-1 text-muted-foreground'>
                        <li>Text: blog post, article, newsletter</li>
                        <li>Image: social post with meaningful caption</li>
                        <li>Video: YouTube, TikTok, Reels, or Shorts</li>
                    </ul>
                </div>
            ),
        },
        {
            id: "quality",
            title: "Quality guidelines",
            content: (
                <div className='space-y-2'>
                    <p>
                        Specificity and sincerity beat length. Share what
                        worked, what didn’t, and who might benefit most. Link to
                        the right pages so readers can try it themselves.
                    </p>
                    <ul className='list-disc pl-5 space-y-1 text-muted-foreground'>
                        <li>
                            Be accurate and respectful; avoid misleading claims.
                        </li>
                        <li>
                            Include at least one screenshot or short clip if
                            possible.
                        </li>
                        <li>
                            Add a link to Asking Fate and tag us where relevant.
                        </li>
                    </ul>
                </div>
            ),
        },
        {
            id: "review",
            title: "Review & awards",
            content: (
                <div className='space-y-2'>
                    <p>
                        Every submission is reviewed to confirm quality and
                        usefulness. We look for clarity, helpful specifics, and
                        honest expectations.
                    </p>
                    <ul className='list-disc pl-5 space-y-1 text-muted-foreground'>
                        <li>
                            Reviews are usually completed within 24–48 business
                            hours.
                        </li>
                        <li>
                            Stars awarded depend on depth, clarity, and chosen
                            format.
                        </li>
                        <li>
                            Duplicate or low‑effort submissions may be rejected.
                        </li>
                    </ul>
                </div>
            ),
        },
        {
            id: "submit",
            title: "How to submit",
            content: (
                <div className='space-y-2'>
                    <p>
                        Once your content is live, share the link with us so we
                        can verify it and award stars if approved.
                    </p>
                    <ol className='list-decimal pl-5 space-y-1 text-muted-foreground'>
                        <li>Publish your content publicly.</li>
                        <li>Copy the public link.</li>
                        <li>
                            Send it via the contact form with subject “Content
                            Submission”.
                        </li>
                    </ol>
                    <p>
                        Tip: You can combine this with other ways to earn stars
                        on the{" "}
                        <Link
                            href='/stars'
                            className='text-primary hover:underline'
                        >
                            Stars
                        </Link>{" "}
                        page.
                    </p>
                </div>
            ),
        },
    ]

    return (
        <ArticleLayout
            title={t("items.createContent.title")}
            subtitle={t("items.createContent.description")}
            updated={undefined}
            backLabel={t("title")}
            onThisPageLabel='On this page'
            sections={sections}
            related={[ARTICLES[1], ARTICLES[2], ARTICLES[5]]}
        />
    )
}
