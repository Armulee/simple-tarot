import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Articles")
  const title = t("items.helpSupport.title")
  const desc = t("subtitle")
  return { title: `${title} | Asking Fate`, description: desc }
}

export default async function HelpSupportArticlePage() {
  const t = await getTranslations("Articles")

  return (
    <div className="min-h-screen relative overflow-hidden">
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="space-y-8">
          <div className="space-y-2">
            <Link href="/articles" className="text-primary/80 hover:text-primary">← {t("title")}</Link>
            <h1 className="font-serif font-bold text-4xl">{t("items.helpSupport.title")}</h1>
            <p className="text-muted-foreground">{t("items.helpSupport.description")}</p>
          </div>

          <section className="space-y-4 prose prose-invert max-w-none">
            <h2>Get help fast</h2>
            <ul>
              <li>Check <Link href="/articles/faq" className="text-primary hover:underline">FAQ</Link> for quick answers.</li>
              <li>Use the <Link href="/contact" className="text-primary hover:underline">contact form</Link> for account or billing issues.</li>
              <li>Email support: support@askingfate.com (24–48h response on business days).</li>
            </ul>
            <h2>Troubleshooting</h2>
            <ul>
              <li>Didn’t receive stars? Refresh the <Link href="/stars" className="text-primary hover:underline">Stars</Link> page and check history.</li>
              <li>Ad not loading? Try again or switch network; ensure any ad blockers allow our domain.</li>
              <li>App feels slow? Clear cache and reload; try another browser/mobile network.</li>
            </ul>
            <h2>Privacy & safety</h2>
            <ul>
              <li>We keep readings private. See our <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.</li>
              <li>We never sell personal data.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
