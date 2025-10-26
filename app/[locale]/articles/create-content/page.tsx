import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { ArticleLayout, type ArticleSection } from "@/components/articles/article-layout"
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
        <div className="space-y-3">
          <p>
            Share your perspective on Asking Fate and earn stars for approved content. You can create in any format — text, image, or video — and submit a public link for review.
          </p>
        </div>
      ),
    },
    {
      id: "formats",
      title: "Eligible formats",
      content: (
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Text: blog post, article, newsletter</li>
          <li>Image: social post with meaningful caption</li>
          <li>Video: YouTube, TikTok, Reels, or Shorts</li>
        </ul>
      ),
    },
    {
      id: "quality",
      title: "Quality guidelines",
      content: (
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Be accurate and respectful; avoid misleading claims.</li>
          <li>Include at least one screenshot or clip if possible.</li>
          <li>Add a link to Asking Fate and tag us where relevant.</li>
        </ul>
      ),
    },
    {
      id: "review",
      title: "Review & awards",
      content: (
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>We review within 24–48 hours (business days).</li>
          <li>Stars awarded depend on depth and format.</li>
          <li>Duplicate/low-effort submissions may be rejected.</li>
        </ul>
      ),
    },
    {
      id: "submit",
      title: "How to submit",
      content: (
        <div className="space-y-2">
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Publish your content publicly.</li>
            <li>Copy the public link.</li>
            <li>Send it via the contact form with subject “Content Submission”.</li>
          </ol>
          <p>
            Tip: You can combine this with other ways to earn stars on the <Link href="/stars" className="text-primary hover:underline">Stars</Link> page.
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
      onThisPageLabel="On this page"
      sections={sections}
      related={[ARTICLES[1], ARTICLES[2]]}
    />
  )
}
