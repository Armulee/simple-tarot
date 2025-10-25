import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Articles")
  const title = t("items.createContent.title")
  const desc = t("subtitle")
  return { title: `${title} | Asking Fate`, description: desc }
}

export default async function CreateContentArticlePage() {
  const t = await getTranslations("Articles")

  return (
    <div className="min-h-screen relative overflow-hidden">
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="space-y-8">
          <div className="space-y-2">
            <Link href="/articles" className="text-primary/80 hover:text-primary">← {t("title")}</Link>
            <h1 className="font-serif font-bold text-4xl">{t("items.createContent.title")}</h1>
            <p className="text-muted-foreground">{t("items.createContent.description")}</p>
          </div>

          <section className="space-y-4 prose prose-invert max-w-none">
            <p>
              Share your perspective on Asking Fate and earn stars for approved content. You can create in any format — text, image, or video — and submit a public link for review.
            </p>
            <h2>Eligible formats</h2>
            <ul>
              <li>Text: blog post, article, newsletter</li>
              <li>Image: social post with meaningful caption</li>
              <li>Video: YouTube, TikTok, Reels, or Shorts</li>
            </ul>
            <h2>Quality guidelines</h2>
            <ul>
              <li>Be accurate and respectful; avoid misleading claims.</li>
              <li>Include at least one screenshot or short clip if possible.</li>
              <li>Add a link to Asking Fate and tag us where relevant.</li>
            </ul>
            <h2>Review & awards</h2>
            <ul>
              <li>We review within 24–48 hours (business days).</li>
              <li>Stars awarded depend on depth and format.</li>
              <li>Duplicate/low-effort submissions may be rejected.</li>
            </ul>
            <h2>How to submit</h2>
            <ol>
              <li>Publish your content publicly.</li>
              <li>Copy the public link.</li>
              <li>Send it via the contact form with subject “Content Submission”.</li>
            </ol>
            <p>
              Tip: You can combine this with other ways to earn stars on the <Link href="/stars" className="text-primary hover:underline">Stars</Link> page.
            </p>
          </section>

          <div className="pt-2">
            <Link href="/contact" className="text-primary hover:underline">Submit content →</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
