import type { ReactNode } from "react"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { SearchSheet } from "@/components/articles/search-sheet"
import { ARTICLES } from "@/components/articles/data"
import { ArrowLeft, BookOpen, Sparkles, ArrowRight } from "lucide-react"
import { Separator } from "../ui/separator"

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
    tocIds,
    sections,
    related,
}: {
    title: string
    subtitle?: string
    updated?: string
    backHref?: string
    backLabel?: string
    onThisPageLabel?: string
    tocIds?: string[]
    sections: ArticleSection[]
    related?: { href: string; title: string; description: string }[]
}) {
    const tocSections = tocIds && tocIds.length > 0
        ? sections.filter((s) => tocIds.includes(s.id))
        : sections
    return (
        <div className='relative min-h-screen'>
            {/* Animated background */}
            <div className='absolute inset-0 -z-10'>
                <div className='absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-accent/10 via-purple-500/5 to-transparent'></div>
                <div className='absolute top-20 right-10 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse'></div>
                <div className='absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000'></div>
            </div>

            <header className='relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-2 sm:pb-3'>
                <div className='mb-6'>
                    <Link
                        href={backHref}
                        className='inline-flex items-center gap-2 text-accent hover:text-accent/80 text-sm font-medium group transition-colors duration-200'
                    >
                        <ArrowLeft className='w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200' />
                        {backLabel}
                    </Link>
                </div>
                {/* Search trigger just below back button */}
                <div className='max-w-xl mb-6'>
                    <SearchSheet
                        articles={ARTICLES}
                        placeholder='Search articles...'
                    />
                </div>

                <div className='space-y-4'>
                    <div className='flex items-center gap-3 mb-3'>
                        <div className='p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary'>
                            <BookOpen className='w-6 h-6' />
                        </div>
                        <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 text-primary text-xs font-medium'>
                            <Sparkles className='w-3 h-3' />
                            Guide
                        </div>
                    </div>

                    <h1 className='text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white leading-tight'>
                        <span className='relative inline-block'>
                            <span className='text-white'>{title}</span>
                            {/* Animated underline */}
                            <div className='absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-accent to-accent/80 rounded-full animate-pulse'></div>
                        </span>
                    </h1>

                    {subtitle ? (
                        <p className='text-muted-foreground text-base sm:text-lg max-w-4xl leading-relaxed mt-2'>
                            {subtitle}
                        </p>
                    ) : null}

                    {updated ? (
                        <div className='flex items-center gap-2 text-muted-foreground text-sm'>
                            <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                            Last updated: {updated}
                        </div>
                    ) : null}
                </div>
            </header>

            {/* Content */}
            <div className='max-w-6xl mx-auto px-4 pt-6 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12'>
                {/* Mobile TOC */}
                <div className='lg:hidden'>
                    <Card className='bg-transparent border-none py-0'>
                        <Accordion defaultValue='toc'>
                            <AccordionItem defaultOpen className='border-none'>
                                <AccordionTrigger className='text-sm font-medium hover:no-underline border-none'>
                                    <div className='flex items-center gap-2'>
                                        <BookOpen className='w-4 h-4 text-primary' />
                                        {onThisPageLabel}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <nav className='space-y-3 pt-2'>
                                        {tocSections.map((s, index) => (
                                            <a
                                                key={s.id}
                                                href={`#${s.id}`}
                                                className='flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all duration-200 group'
                                            >
                                                <div className='w-6 h-6 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 flex items-center justify-center text-xs font-medium text-primary group-hover:from-primary/30 group-hover:to-purple-500/30 transition-all duration-200'>
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

                <main className='lg:col-span-8 pb-10'>
                    <article className='prose prose-invert max-w-none'>
                        {sections.map((s, index) => (
                            <section
                                key={s.id}
                                id={s.id}
                                className='scroll-mt-32 mb-8 last:mb-0 section-fade-in'
                            >
                                <div className='relative'>
                                    {/* Section number */}
                                    <div className='absolute -left-12 top-0 hidden lg:block'>
                                        <div className='w-8 h-8 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-primary'>
                                            {index + 1}
                                        </div>
                                    </div>

                                    <h2 className='font-serif text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-foreground'>
                                        {s.title}
                                    </h2>

                                    <div className='relative'>
                                        <div className='not-prose text-foreground/95 leading-relaxed text-sm sm:text-base space-y-4 p-4 sm:p-6 content-card'>
                                            {s.content}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        ))}
                    </article>

                    {related && related.length > 0 && (
                        <div className='mt-16 mb-8 lg:hidden'>
                            {/* Section Header */}
                            <div className='flex items-center gap-2 mb-6'>
                                <div className='p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20'>
                                    <Sparkles className='w-4 h-4 text-primary' />
                                </div>
                                <h3 className='font-serif text-2xl font-bold text-foreground'>
                                    Suggested articles
                                </h3>
                            </div>

                            {/* Cards Grid */}
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                                {related.slice(0, 3).map((article) => (
                                    <Link
                                        key={article.href}
                                        href={article.href}
                                        className='block group suggested-article-card'
                                    >
                                        <Card className='h-full relative overflow-hidden bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm border-2 border-border/40 hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 group-hover:scale-[1.02] group-hover:-translate-y-1'>
                                            {/* Animated gradient overlay on hover */}
                                            <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500' />

                                            <CardContent className='px-4 relative z-10'>
                                                {/* Article Icon */}
                                                <div className='mb-4 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300'>
                                                    <BookOpen className='w-6 h-6' />
                                                </div>

                                                {/* Title */}
                                                <h4 className='text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300 mb-2 line-clamp-2'>
                                                    {article.title}
                                                </h4>

                                                {/* Description */}
                                                <p className='text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4'>
                                                    {article.description}
                                                </p>

                                                {/* Read More Link */}
                                                <div className='flex items-center gap-2 text-primary text-sm font-medium transition-opacity duration-300'>
                                                    <span>Read article</span>
                                                    <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform duration-300' />
                                                </div>
                                            </CardContent>

                                            {/* Bottom accent line */}
                                            <div className='absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </main>

                {/* Desktop TOC */}
                <aside className='hidden lg:block lg:col-span-4'>
                    <Card className='sticky top-16 bg-transparent border-none py-10 overflow-y-scroll max-h-screen'>
                        <CardHeader className='pb-4'>
                            <CardTitle className='text-base font-semibold flex items-center gap-2'>
                                <BookOpen className='w-4 h-4 text-primary' />
                                {onThisPageLabel}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <nav className='space-y-3 pb-4'>
                                {tocSections.map((s, index) => (
                                    <a
                                        key={s.id}
                                        href={`#${s.id}`}
                                        className='flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all duration-200 group p-2 rounded-lg hover:bg-primary/5 toc-item'
                                    >
                                        <div className='w-6 h-6 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 flex items-center justify-center text-xs font-medium text-primary group-hover:from-primary/30 group-hover:to-purple-500/30 transition-all duration-200'>
                                            {index + 1}
                                        </div>
                                        <span className='group-hover:font-medium transition-all duration-200'>
                                            {s.title}
                                        </span>
                                    </a>
                                ))}
                            </nav>
                            <Separator className='opacity-50' />
                            {related && related.length > 0 ? (
                                <div className='mt-6'>
                                    <div className='flex items-center gap-2 mb-4'>
                                        <div className='p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20'>
                                            <Sparkles className='w-4 h-4 text-primary' />
                                        </div>
                                        <h3 className='text-sm font-semibold text-foreground'>
                                            Suggested articles
                                        </h3>
                                    </div>
                                    <div className='space-y-3'>
                                        {related.slice(0, 3).map((a) => (
                                            <Link
                                                key={a.href}
                                                href={a.href}
                                                className='block group'
                                            >
                                                <Card className='relative overflow-hidden bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm border-2 border-border/40 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300'>
                                                    <CardContent className='p-4'>
                                                        <div className='text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2'>
                                                            {a.title}
                                                        </div>
                                                        <div className='text-xs text-muted-foreground mt-1 line-clamp-2'>
                                                            {a.description}
                                                        </div>
                                                        <div className='mt-2 inline-flex items-center gap-1 text-primary text-xs font-medium'>
                                                            Read article
                                                            <ArrowRight className='w-3 h-3 group-hover:translate-x-0.5 transition-transform' />
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    )
}
