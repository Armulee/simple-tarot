import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { ArticleLayout, type ArticleSection } from "@/components/articles/article-layout"
import { HelpCircle, Shield, Star, BookOpen, MessageCircle, CheckCircle } from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Articles")
  const title = t("items.faq.title")
  const desc = t("subtitle")
  return { title: `${title} | Asking Fate`, description: desc }
}

export default async function FAQArticlePage() {
  const t = await getTranslations("Articles")

  const sections: ArticleSection[] = [
    {
      id: "general",
      title: "General Questions",
      content: (
        <div className="space-y-3">
          <p>
            <strong>Are readings accurate?</strong>
            <br />They’re guidance for reflection, not predictions. Use them to think clearly and act intentionally.
          </p>
          <p>
            <strong>Is my data private?</strong>
            <br />Yes. Readings and personal data are private. See the {" "}
            <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      ),
    },
    {
      id: "stars",
      title: "Stars & Rewards",
      content: (
        <div className="space-y-3">
          <p>
            <strong>How do I earn stars?</strong>
            <br />Purchase packs, share readings (up to 3/day), refer friends, or create content about us.
          </p>
          <p>
            <strong>Stars didn’t appear after payment?</strong>
            <br />Refresh the {" "}
            <Link href="/stars" className="text-primary hover:underline">Stars</Link> page. If still missing, contact support with your transaction ID.
          </p>
        </div>
      ),
    },
    {
      id: "readings",
      title: "Readings & Usage",
      content: (
        <div className="space-y-3">
          <p>
            <strong>Which reading type should I choose?</strong>
            <br />Start with Simple. Use Intermediate/Advanced when you want more context.
          </p>
          <p>
            <strong>Can I share my reading?</strong>
            <br />Yes—use the Share option after a reading to get a public link.
          </p>
        </div>
      ),
    },
  ]

  return (
    <ArticleLayout
      title={t("items.faq.title")}
      subtitle={t("items.faq.description")}
      backLabel={t("title")}
      onThisPageLabel="On this page"
      sections={sections}
    />
  )
}
