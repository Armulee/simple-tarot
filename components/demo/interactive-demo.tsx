"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, PlayCircle, Send, Wand2 } from "lucide-react"
import { useTranslations } from "next-intl"

export default function InteractiveDemo() {
  const t = useTranslations("Demo")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    teamSize: "",
    goals: "",
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [previewQuestion, setPreviewQuestion] = useState(
    "What should I focus on this week?",
  )
  const [previewCard, setPreviewCard] = useState<{
    name: string
    emoji: string
    hint: string
  }>({ name: "The Star", emoji: "✨", hint: "Clarity and renewal" })

  const updateField = (key: string, value: string) =>
    setFormData((p) => ({ ...p, [key]: value }))

  const randomPreview = () => {
    const cards = [
      { name: "The Star", emoji: "✨", hint: "Clarity and renewal" },
      { name: "The Sun", emoji: "🌞", hint: "Momentum and confidence" },
      { name: "The Hermit", emoji: "🕯️", hint: "Step back, reflect" },
      { name: "Strength", emoji: "🦁", hint: "Steady courage" },
      { name: "Temperance", emoji: "⚖️", hint: "Balance and pacing" },
    ]
    setPreviewCard(cards[Math.floor(Math.random() * cards.length)])
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 1200))
    alert("Thanks! We’ll email you to schedule a quick walkthrough.")
    setFormData({ name: "", email: "", teamSize: "", goals: "", notes: "" })
    setSubmitting(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
      {/* Interactive preview */}
      <Card className="p-6 bg-card/10 backdrop-blur-sm border-border/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-serif font-semibold">{t("preview.title")}</h3>
              <p className="text-xs text-muted-foreground">{t("preview.subtitle")}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={randomPreview}>
            <PlayCircle className="w-4 h-4 mr-2" /> {t("preview.shuffle")}
          </Button>
        </div>

        <div className="space-y-3">
          <Label htmlFor="preview-question">{t("preview.questionLabel")}</Label>
          <Input
            id="preview-question"
            value={previewQuestion}
            onChange={(e) => setPreviewQuestion(e.target.value)}
            placeholder={t("preview.questionPlaceholder")}
            className="floating-input bg-input/20 backdrop-blur-sm border-border/30"
          />
        </div>

        <div className="grid grid-cols-[90px_1fr] gap-4 items-center">
          <div className="w-24 h-24 mx-auto rounded-xl bg-gradient-to-br from-primary/25 to-secondary/25 flex items-center justify-center text-3xl">
            {previewCard.emoji}
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{t("preview.cardLabel")}</div>
            <div className="text-lg font-semibold">{previewCard.name}</div>
            <div className="text-sm text-muted-foreground">{previewCard.hint}</div>
          </div>
        </div>
      </Card>

      {/* Request form */}
      <Card className="p-6 bg-card/10 backdrop-blur-sm border-border/20">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("form.name")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder={t("form.namePlaceholder")}
                className="floating-input bg-input/20 backdrop-blur-sm border-border/30"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("form.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder={t("form.emailPlaceholder")}
                className="floating-input bg-input/20 backdrop-blur-sm border-border/30"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teamSize">{t("form.teamSize")}</Label>
              <Input
                id="teamSize"
                value={formData.teamSize}
                onChange={(e) => updateField("teamSize", e.target.value)}
                placeholder={t("form.teamSizePlaceholder")}
                className="floating-input bg-input/20 backdrop-blur-sm border-border/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goals">{t("form.goals")}</Label>
              <Input
                id="goals"
                value={formData.goals}
                onChange={(e) => updateField("goals", e.target.value)}
                placeholder={t("form.goalsPlaceholder")}
                className="floating-input bg-input/20 backdrop-blur-sm border-border/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("form.notes")}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder={t("form.notesPlaceholder")}
              className="min-h-24 floating-input bg-input/20 backdrop-blur-sm border-border/30"
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Wand2 className="w-4 h-4 mr-2 animate-spin-slow" />
                {t("form.submitting")}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t("form.submit")}
              </>
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-3">{t("form.footer")}</p>
      </Card>
    </div>
  )
}
