import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Articles")
  const title = t("items.faq.title")
  const desc = t("subtitle")
  return { title: `${title} | Asking Fate`, description: desc }
}

export default async function FAQArticlePage() {
  const t = await getTranslations("Articles")

  return (
    <div className="min-h-screen relative overflow-hidden">
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="space-y-8">
          <div className="space-y-2">
            <Link href="/articles" className="text-primary/80 hover:text-primary">← {t("title")}</Link>
            <h1 className="font-serif font-bold text-4xl">{t("items.faq.title")}</h1>
            <p className="text-muted-foreground">{t("items.faq.description")}</p>
          </div>

          <section className="space-y-4 prose prose-invert max-w-none">
            <h2>General</h2>
            <p><strong>Are readings accurate?</strong><br />They’re guidance for reflection, not predictions. Use them to think clearly and act intentionally.</p>
            <p><strong>Is my data private?</strong><br />Yes. Readings and personal data are private. See the <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.</p>

            <h2>Stars</h2>
            <p><strong>How do I earn stars?</strong><br />Purchase packs, share readings (up to 3/day), refer friends, or create content about us.</p>
            <p><strong>Stars didn’t appear after payment?</strong><br />Refresh the <Link href="/stars" className="text-primary hover:underline">Stars</Link> page. If still missing, contact support with your transaction ID.</p>

            <h2>Readings</h2>
            <p><strong>Which reading type should I choose?</strong><br />Start with Simple. Use Intermediate/Advanced when you want more context.</p>
            <p><strong>Can I share my reading?</strong><br />Yes—use the Share option after a reading to get a public link.</p>
          </section>
        </div>
      </main>
    </div>
  )
}
