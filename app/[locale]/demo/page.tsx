import type { Metadata } from "next"
import InteractiveDemo from "@/components/demo/interactive-demo"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { useTranslations } from "next-intl"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta.Demo")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function DemoPage() {
  const t = useTranslations("Demo")
  return (
    <div className='min-h-screen relative overflow-hidden'>
      <main className='relative z-10 max-w-6xl mx-auto px-6 py-16 space-y-10'>
        <div className='text-center space-y-4'>
          <h1 className='font-serif font-bold text-4xl md:text-5xl text-balance'>{t("hero.title")}</h1>
          <p className='text-muted-foreground max-w-2xl mx-auto'>{t("hero.subtitle")}</p>
          <div className='flex items-center justify-center gap-3'>
            <Link
              href='/about'
              className='text-sm text-primary hover:underline underline-offset-4'
            >
              {t("links.about")}
            </Link>
            <span className='text-gray-600'>•</span>
            <Link
              href='/tarot'
              className='text-sm text-primary hover:underline underline-offset-4'
            >
              {t("links.tryReading")}
            </Link>
          </div>
        </div>

        <InteractiveDemo />
      </main>
    </div>
  )
}
