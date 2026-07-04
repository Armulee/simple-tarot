import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import { getMetadataBase, getSocialImageUrls } from "@/lib/seo"
import SharedTarotView from "./shared-tarot-view"

type SharedTarotData = {
    id: string
    question: string
    cards: string[]
    interpretation: string
    assistant_text: string | null
    insights: string[] | null
    conclusion: string | null
    spread_type: string | null
    cards_full: Array<{
        id: number
        name: string
        image: string
        meaning: string
        isReversed: boolean
    }> | null
    created_at: string
}

async function getSharedTarot(id: string) {
    const { data } = await supabase
        .from("shared_tarot")
        .select(
            "id, question, cards, interpretation, assistant_text, insights, conclusion, spread_type, cards_full, created_at",
        )
        .eq("id", id)
        .maybeSingle()
    return data as SharedTarotData | null
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}): Promise<Metadata> {
    const { id, locale } = await params
    const data = await getSharedTarot(id)
    const baseUrl = getMetadataBase().toString().replace(/\/$/, "")
    // The rendered reading poster — link shares unfurl into the actual
    // cards and interpretation instead of the generic site image.
    const ogImage = data
        ? `${baseUrl}/api/share-image/${id}?style=og`
        : getSocialImageUrls(locale).ogImage

    const title = data?.question
        ? `${data.question.slice(0, 60)} — AskingFate`
        : "Shared Tarot Reading — AskingFate"

    return {
        title,
        description:
            data?.interpretation?.slice(0, 160) ??
            "A shared tarot reading on AskingFate",
        openGraph: {
            title,
            images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            images: [ogImage],
        },
    }
}

export default async function SharedTarotPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const data = await getSharedTarot(id)
    if (!data) return notFound()

    return <SharedTarotView data={data} />
}
