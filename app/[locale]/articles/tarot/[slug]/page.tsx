import type { Metadata } from "next"
import {
    buildCardMetadata,
    cardStaticParams,
    CardArticlePageView,
} from "./card-article-page"

export const dynamicParams = false

export function generateStaticParams() {
    return cardStaticParams()
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
    const { locale, slug } = await params
    return buildCardMetadata({ locale, slug, orientation: "upright" })
}

export default async function TarotCardArticlePage({
    params,
}: {
    params: Promise<{ locale: string; slug: string }>
}) {
    const { locale, slug } = await params
    return CardArticlePageView({ locale, slug, orientation: "upright" })
}
