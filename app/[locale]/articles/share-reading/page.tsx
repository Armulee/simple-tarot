import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Articles")
  const title = t("items.shareReading.title")
  const desc = t("subtitle")
  return { title: `${title} | Asking Fate`, description: desc }
}

export default async function ShareReadingArticlePage() {
  const t = await getTranslations("Articles")

  return (
    <div className="min-h-screen relative overflow-hidden">
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="space-y-8">
          <div className="space-y-2">
            <Link href="/articles" className="text-primary/80 hover:text-primary">← {t("title")}</Link>
            <h1 className="font-serif font-bold text-4xl">{t("items.shareReading.title")}</h1>
            <p className="text-muted-foreground">{t("items.shareReading.description")}</p>
          </div>

          <section className="space-y-4 prose prose-invert max-w-none">
            <p>
              Share any completed reading to earn stars from unique visitors (up to 3 per day). This is automatic—no submission required.
            </p>
            <h2>How it works</h2>
            <ol>
              <li>Finish a reading and tap Share.</li>
              <li>Copy the link and share it publicly.</li>
              <li>Each unique visitor counts toward your daily cap.</li>
            </ol>
            <h2>Eligibility</h2>
            <ul>
              <li>Visitors must open the shared link.</li>
              <li>Limit: 3 stars/day per account.</li>
              <li>Abuse or spam voids eligibility.</li>
            </ul>
            <p>
              See other ways to earn on the <Link href="/stars" className="text-primary hover:underline">Stars</Link> page.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
