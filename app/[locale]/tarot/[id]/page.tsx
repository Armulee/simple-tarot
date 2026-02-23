import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { getTranslations } from "next-intl/server"
import { Sparkles } from "lucide-react"
import { CardImage } from "@/components/card-image"
import { getCleanQuestionText } from "@/lib/prompts/question-utils"
import SpreadLayout from "@/components/tarot/spread-layout"
import Interpretation from "@/components/tarot/interpretation"
import FollowUpBadge from "@/components/tarot/follow-up-badge"

import { getMetadataBase } from "@/lib/seo"
import type { Metadata } from "next"

async function getTarotReading(id: string) {
    const { data } = await supabase
        .from("tarot_readings")
        .select(
            "id, question, cards, interpretation, created_at, did, owner_user_id, parent_id, reading_type",
        )
        .eq("id", id)
        .maybeSingle()
    return data as typeof data & {
        did?: string | null
        owner_user_id?: string | null
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}): Promise<Metadata> {
    const { id, locale } = await params
    const data = await getTarotReading(id)
    const baseUrl = getMetadataBase().toString().replace(/\/$/, "")
    const ogImage = `${baseUrl}/${locale}/opengraph-image`
    const twitterImage = `${baseUrl}/${locale}/twitter-image`

    if (!data) {
        return {
            title: "Reading Not Found | Asking Fate",
        }
    }

    const question = getCleanQuestionText(data.question || "Tarot Reading")
    const title = `"${question}" - My Tarot Reading | Asking Fate`
    const description = `Discover the cosmic insights from this AI-powered tarot reading about "${question}".`

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "article",
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [twitterImage],
        },
    }
}

export default async function TarotReadingPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const data = await getTarotReading(id)
    if (!data) return notFound()

    // Parse cards data
    const selectedCards = Array.isArray(data.cards)
        ? data.cards.map((cardName: string, index: number) => {
              // Check if card is reversed by looking for "reversed" in the name
              const isReversed = cardName.toLowerCase().includes("reversed")

              // Clean the card name for image path (remove "reversed" and parentheses)
              const cleanCardName = cardName
                  .toLowerCase()
                  .replace(/\s*\(reversed\)/g, "")
                  .replace(/\s*reversed/g, "")
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, "")

              return {
                  id: index + 1,
                  name: cardName,
                  image: `assets/rider-waite-tarot/${cleanCardName}.png`,
                  meaning: cardName,
                  isReversed: isReversed,
                  slug: cleanCardName,
              }
          })
        : []

    const t = await getTranslations("ReadingPage")

    return (
        <div className='space-y-8 px-4 max-w-xl mx-auto h-full'>
            {/* Header */}
            <Card className='bg-transparent gap-0 m-0 px-0 pt-10 pb-6 border-0 relative overflow-hidden'>
                {/* Background card images with aura */}
                <div className='absolute inset-0 pointer-events-none'>
                    {selectedCards.map((card, index) => {
                        const positions = [
                            {
                                top: "10%",
                                left: "5%",
                                transform: "rotate(-15deg)",
                            },
                            {
                                top: "15%",
                                right: "8%",
                                transform: "rotate(20deg)",
                            },
                            {
                                bottom: "20%",
                                left: "10%",
                                transform: "rotate(-10deg)",
                            },
                            {
                                bottom: "15%",
                                right: "12%",
                                transform: "rotate(25deg)",
                            },
                            {
                                top: "50%",
                                left: "2%",
                                transform: "rotate(-5deg)",
                            },
                            {
                                top: "60%",
                                right: "5%",
                                transform: "rotate(15deg)",
                            },
                        ]
                        const position = positions[index % positions.length]

                        return (
                            <div
                                key={`bg-${index}`}
                                className='absolute opacity-20'
                                style={position}
                            >
                                <CardImage
                                    card={card}
                                    size='sm'
                                    showAura={true}
                                    showLabel={false}
                                    className='scale-75'
                                />
                            </div>
                        )
                    })}
                </div>

                <div className='text-center space-y-6 relative z-10'>
                    <div className='flex items-center justify-center space-x-2 relative'>
                        <Sparkles className='w-6 h-6 text-primary' />
                        <h1 className='font-serif font-bold text-2xl relative'>
                            {data.parent_id && <FollowUpBadge show={true} />}
                            &ldquo;
                            {getCleanQuestionText(data.question || "")}
                            &rdquo;
                        </h1>
                        <Sparkles className='w-6 h-6 text-primary' />
                    </div>

                    {/* Spread Layout based on reading type */}
                    <SpreadLayout
                        cards={selectedCards}
                        readingType={data.reading_type}
                        question={data.question}
                    />
                </div>
            </Card>

            {/* Interpretation component handles generation and display */}
            <Interpretation
                key={id}
                readingId={id}
                question={data.question}
                cards={data.cards}
                initialInterpretation={data.interpretation}
                ownerDid={data.did}
                ownerUserId={data.owner_user_id}
                readingType={data.reading_type}
            />
        </div>
    )
}
