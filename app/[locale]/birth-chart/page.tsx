import type { Metadata } from "next"
import { Card } from "@/components/ui/card"
import BirthChartForm from "@/components/birth-chart/birth-chart-form"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Meta.BirthChart")
    return {
        title: t("title"),
        description: t("description"),
        keywords: t("keywords"),
        openGraph: {
            title: t("ogTitle"),
            description: t("ogDescription"),
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: t("twitterTitle"),
            description: t("twitterDescription"),
        },
    }
}

export default async function BirthChartPage() {
    const t = await getTranslations("BirthChart")
    
    return (
        <div className='min-h-screen relative overflow-hidden'>
            <main className='relative z-10 max-w-3xl mx-auto px-6 py-16'>
                <div className='text-center space-y-6 mb-10'>
                    <h1 className='font-serif font-bold text-4xl md:text-5xl text-balance'>
                        {t("title")}
                        <span className='block text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                            {t("subtitle")}
                        </span>
                    </h1>
                    <p className='text-lg text-muted-foreground max-w-2xl mx-auto text-pretty'>
                        {t("description")}
                    </p>
                </div>

                <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                    <BirthChartForm />
                </Card>
            </main>
        </div>
    )
}
