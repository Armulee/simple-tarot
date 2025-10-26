import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import {
    ArticleLayout,
    type ArticleSection,
} from "@/components/articles/article-layout"
import { ARTICLES } from "@/components/articles/data"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Articles")
    const title = t("items.referFriend.title")
    const desc = t("subtitle")
    return { title: `${title} | Asking Fate`, description: desc }
}

export default async function ReferFriendArticlePage() {
    const t = await getTranslations("Articles")

    const sections: ArticleSection[] = [
        {
            id: "overview",
            title: "Overview",
            content: (
                <div className='space-y-2'>
                    <p>
                        Referring friends is the fastest way to introduce
                        mindful reflection to people you care about—while
                        earning stars together. Share your link with a short
                        note about why you use Asking Fate and how it helps you
                        decide thoughtfully.
                    </p>
                    <p>
                        When a friend signs up through your link, rewards are
                        applied automatically. No manual steps required.
                    </p>
                </div>
            ),
        },
        {
            id: "find-link",
            title: "Where to find your link",
            content: (
                <div className='space-y-2'>
                    <p>
                        Your referral link is always available on the Referral
                        page. Copy it and share anywhere your friends are most
                        likely to see it.
                    </p>
                    <ol className='list-decimal pl-5 space-y-1 text-muted-foreground'>
                        <li>
                            Go to{" "}
                            <Link
                                href='/referral'
                                className='text-primary hover:underline'
                            >
                                Referral
                            </Link>
                            .
                        </li>
                        <li>Copy your unique referral link.</li>
                        <li>Share it with friends.</li>
                    </ol>
                </div>
            ),
        },
        {
            id: "rewards",
            title: "Rewards",
            content: (
                <div className='space-y-2'>
                    <p>
                        Rewards encourage genuine introductions—not spam. Share
                        thoughtfully with people who will appreciate reflective
                        tools.
                    </p>
                    <ul className='list-disc pl-5 space-y-1 text-muted-foreground'>
                        <li>
                            Both you and your friend earn stars after
                            registration completes.
                        </li>
                        <li>Weekly cap and bonus rules may apply.</li>
                        <li>Fraudulent or automated signups will be voided.</li>
                    </ul>
                </div>
            ),
        },
    ]

    return (
        <ArticleLayout
            title={t("items.referFriend.title")}
            subtitle={t("items.referFriend.description")}
            backLabel={t("title")}
            onThisPageLabel='On this page'
            sections={sections}
            related={[ARTICLES[1], ARTICLES[0], ARTICLES[5]]}
        />
    )
}
