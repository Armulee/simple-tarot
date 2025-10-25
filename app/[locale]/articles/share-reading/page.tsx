import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
// import { Link } from "@/i18n/navigation"
import { ArticleLayout, type ArticleSection } from "@/components/articles/article-layout"

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
        <p>
          Share any completed reading to earn stars from unique visitors (up to 3 per day). This is automatic—no submission required.
        </p>
      ),
    },
    {
      id: "how",
      title: "How it works",
      content: (
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
          <li>Finish a reading and tap Share.</li>
          <li>Copy the link and share it publicly.</li>
          <li>Each unique visitor counts toward your daily cap.</li>
        </ol>
      ),
    },
    {
      id: "eligibility",
      title: "Eligibility",
      content: (
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Visitors must open the shared link.</li>
          <li>Limit: 3 stars/day per account.</li>
          <li>Abuse or spam voids eligibility.</li>
        </ul>
      ),
    },
  ]

  return (
    <ArticleLayout
      title={t("items.shareReading.title")}
      subtitle={t("items.shareReading.description")}
      backLabel={t("title")}
      onThisPageLabel="On this page"
      sections={sections}
    />
  )
}
