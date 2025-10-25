import type { ReactNode } from "react"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react"

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
    <div className="relative min-h-screen">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent"></div>
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <header className="relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-12 sm:pb-16">
          <div className="mb-6">
            <Link 
              href={backHref} 
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium group transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              {backLabel}
            </Link>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 text-primary text-xs font-medium">
                <Sparkles className="w-3 h-3" />
                Guide
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white leading-tight">
              <span className="relative inline-block">
                <span className="text-transparent bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text animate-gradient-x">
                  {title}
                </span>
                {/* Animated underline */}
                <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse"></div>
              </span>
            </h1>
            
            {subtitle ? (
              <p className="text-muted-foreground text-base sm:text-lg max-w-4xl leading-relaxed">{subtitle}</p>
            ) : null}
            
            {updated ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Last updated: {updated}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Mobile TOC */}
        <div className="lg:hidden">
          <Card className="bg-transparent border-none">
            <Accordion type="single" collapsible defaultValue="toc">
              <AccordionItem value="toc" className="border-none">
                <AccordionTrigger className="text-sm font-medium hover:no-underline border-none">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    {onThisPageLabel}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <nav className="space-y-3 pt-2">
                    {sections.map((s, index) => (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all duration-200 group"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 flex items-center justify-center text-xs font-medium text-primary group-hover:from-primary/30 group-hover:to-purple-500/30 transition-all duration-200">
                          {index + 1}
                        </div>
                        {s.title}
                      </a>
                    ))}
                  </nav>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>

        <main className="lg:col-span-8">
          <article className="prose prose-invert max-w-none">
            {sections.map((s, index) => (
              <section key={s.id} id={s.id} className="scroll-mt-32 mb-16 last:mb-0 section-fade-in">
                <div className="relative">
                  {/* Section number */}
                  <div className="absolute -left-12 top-0 hidden lg:block">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                  </div>
                  
                  <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-foreground">
                    {s.title}
                  </h2>
                  
                  <div className="relative">
                    <div className="not-prose text-foreground/95 leading-relaxed text-sm sm:text-base space-y-4 p-4 sm:p-6 content-card">
                      {s.content}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </article>
        </main>

        {/* Desktop TOC */}
        <aside className="hidden lg:block lg:col-span-4">
          <Card className="sticky top-32 bg-transparent border-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                {onThisPageLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="space-y-3">
                {sections.map((s, index) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all duration-200 group p-2 rounded-lg hover:bg-primary/5 toc-item"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 flex items-center justify-center text-xs font-medium text-primary group-hover:from-primary/30 group-hover:to-purple-500/30 transition-all duration-200">
                      {index + 1}
                    </div>
                    <span className="group-hover:font-medium transition-all duration-200">{s.title}</span>
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
