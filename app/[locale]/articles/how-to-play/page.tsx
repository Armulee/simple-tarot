import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Articles")
  const title = t("items.howToPlay.title")
  const desc = t("subtitle")
  return { title: `${title} | Asking Fate`, description: desc }
}

export default async function HowToPlayArticlePage() {
  const t = await getTranslations("Articles")

  return (
    <div className="min-h-screen relative overflow-hidden">
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="space-y-8">
          <div className="space-y-2">
            <Link href="/articles" className="text-primary/80 hover:text-primary">← {t("title")}</Link>
            <h1 className="font-serif font-bold text-4xl">{t("items.howToPlay.title")}</h1>
            <p className="text-muted-foreground">{t("items.howToPlay.description")}</p>
          </div>

          <section className="space-y-4 prose prose-invert max-w-none">
            <h2>Step 1 — Ask a clear question</h2>
            <p>Choose a specific, honest question you’re curious about.</p>
            <h2>Step 2 — Choose your reading type</h2>
            <p>Select Simple, Intermediate, or Advanced depending on depth desired.</p>
            <h2>Step 3 — Pick your cards</h2>
            <p>Trust your intuition. Select the number shown for your chosen reading.</p>
            <h2>Step 4 — Read & reflect</h2>
            <p>Review the AI interpretation. Note what resonates and any actions you’ll take.</p>
            <h2>Step 5 — Save or share</h2>
            <p>Save readings for later reflection or share a link to earn stars.</p>

            <h3>Tips</h3>
            <ul>
              <li>Use present-focused questions (e.g., “What should I consider about…?”).</li>
              <li>Revisit with a follow-up question if you need more clarity.</li>
              <li>Keep entries in a personal journal for patterns over time.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
