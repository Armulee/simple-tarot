import type { ReactNode } from "react"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export type ArticleSection = {
  id: string
  title: string
  content: ReactNode
}

export function ArticleLayout({
  title,
  subtitle,
  updated,
  backHref = "/articles",
  backLabel = "Back",
  onThisPageLabel = "On this page",
  sections,
}: {
  title: string
  subtitle?: string
  updated?: string
  backHref?: string
  backLabel?: string
  onThisPageLabel?: string
  sections: ArticleSection[]
}) {
  return (
    <div className="relative">
      <header className="bg-gradient-to-b from-primary/15 to-transparent border-b border-border/30">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-10">
          <div className="mb-3">
            <Link href={backHref} className="text-primary hover:text-primary/80 text-sm">
              ← {backLabel}
            </Link>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="text-cosmic-light mt-3 max-w-3xl">{subtitle}</p>
          ) : null}
          {updated ? (
            <p className="text-muted-foreground text-xs mt-3">{updated}</p>
          ) : null}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Mobile TOC */}
        <div className="lg:hidden">
          <Accordion type="single" collapsible>
            <AccordionItem value="toc">
              <AccordionTrigger className="text-sm">{onThisPageLabel}</AccordionTrigger>
              <AccordionContent>
                <nav className="space-y-2">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block text-sm text-muted-foreground hover:text-foreground"
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <main className="lg:col-span-8">
          <article className="prose prose-invert max-w-none">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-3">{s.title}</h2>
                <div className="not-prose text-foreground/95 leading-relaxed">
                  {s.content}
                </div>
              </section>
            ))}
          </article>
        </main>

        {/* Desktop TOC */}
        <aside className="hidden lg:block lg:col-span-4">
          <Card className="sticky top-28">
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">{onThisPageLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="space-y-2">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm text-muted-foreground hover:text-foreground"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
