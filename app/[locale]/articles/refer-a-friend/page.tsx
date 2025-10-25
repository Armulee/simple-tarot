import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { ArticleLayout, type ArticleSection } from "@/components/articles/article-layout"
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
        <p>
          Invite friends with your referral link. When they register, both of you earn stars. Weekly bonuses may apply for multiple successful invites.
        </p>
      ),
    },
    {
      id: "find-link",
      title: "Where to find your link",
      content: (
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
          <li>
            Go to <Link href="/referral" className="text-primary hover:underline">Referral</Link>.
          </li>
          <li>Copy your unique referral link.</li>
          <li>Share it with friends.</li>
        </ol>
      ),
    },
    {
      id: "rewards",
      title: "Rewards",
      content: (
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Both you and your friend earn stars after registration completes.</li>
          <li>Weekly cap and bonus rules may apply.</li>
          <li>Fraudulent signups will be voided.</li>
        </ul>
      ),
    },
  ]

  return (
    <ArticleLayout
      title={t("items.referFriend.title")}
      subtitle={t("items.referFriend.description")}
      backLabel={t("title")}
      onThisPageLabel="On this page"
      sections={sections}
      related={[ARTICLES[1], ARTICLES[0]]}
    />
  )
}
