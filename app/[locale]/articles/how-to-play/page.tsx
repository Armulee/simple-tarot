import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { ArticleLayout, type ArticleSection } from "@/components/articles/article-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Target, Heart, Eye, Share2, Lightbulb, CheckCircle, ArrowRight } from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Articles")
  const title = t("items.howToPlay.title")
  const desc = t("subtitle")
  return { title: `${title} | Asking Fate`, description: desc }
}

export default async function HowToPlayArticlePage() {
  const t = await getTranslations("Articles")

  const sections: ArticleSection[] = [
    { id: "q", title: "Step 1 — Ask a clear question", content: (<p>Choose a specific, honest question you’re curious about.</p>) },
    { id: "type", title: "Step 2 — Choose your reading type", content: (<p>Select Simple, Intermediate, or Advanced depending on depth desired.</p>) },
    { id: "cards", title: "Step 3 — Pick your cards", content: (<p>Trust your intuition. Select the number shown for your chosen reading.</p>) },
    { id: "reflect", title: "Step 4 — Read & reflect", content: (<p>Review the AI interpretation. Note what resonates and any actions you’ll take.</p>) },
    { id: "save", title: "Step 5 — Save or share", content: (<p>Save readings for later reflection or share a link to earn stars.</p>) },
    { id: "tips", title: "Tips", content: (
      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
        <li>Use present-focused questions (e.g., “What should I consider about…?”).</li>
        <li>Revisit with a follow-up question if you need more clarity.</li>
        <li>Keep entries in a personal journal for patterns over time.</li>
      </ul>
    ) },
  ]

  return (
    <ArticleLayout
      title={t("items.howToPlay.title")}
      subtitle={t("items.howToPlay.description")}
      backLabel={t("title")}
      onThisPageLabel="On this page"
      sections={sections}
    />
  )
}
