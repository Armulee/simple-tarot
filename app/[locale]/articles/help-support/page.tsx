import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { ArticleLayout, type ArticleSection } from "@/components/articles/article-layout"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Articles")
  const title = t("items.helpSupport.title")
  const desc = t("subtitle")
  return { title: `${title} | Asking Fate`, description: desc }
}

export default async function HelpSupportArticlePage() {
  const t = await getTranslations("Articles")

  const sections: ArticleSection[] = [
    {
      id: "help",
      title: "Get help fast",
      content: (
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            Check <Link href="/articles/faq" className="text-primary hover:underline">FAQ</Link> for quick answers.
          </li>
          <li>
            Use the <Link href="/contact" className="text-primary hover:underline">contact form</Link> for account or billing issues.
          </li>
          <li>Email support: support@askingfate.com (24–48h response on business days).</li>
        </ul>
      ),
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      content: (
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            Didn’t receive stars? Refresh the <Link href="/stars" className="text-primary hover:underline">Stars</Link> page and check history.
          </li>
          <li>Ad not loading? Try again or switch network; allow ads for our domain.</li>
          <li>App feels slow? Clear cache and reload; try another browser/network.</li>
        </ul>
      ),
    },
    {
      id: "privacy",
      title: "Privacy & safety",
      content: (
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            We keep readings private. See our <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
          </li>
          <li>We never sell personal data.</li>
        </ul>
      ),
    },
  ]

  return (
    <ArticleLayout
      title={t("items.helpSupport.title")}
      subtitle={t("items.helpSupport.description")}
      backLabel={t("title")}
      onThisPageLabel="On this page"
      sections={sections}
    />
  )
}
