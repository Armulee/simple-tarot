import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { Sparkles } from "lucide-react"
import { CardImage } from "@/components/card-image"
import { getCleanQuestionText } from "@/lib/question-utils"
import Interpretation from "@/components/tarot/interpretation"
import FollowUpBadge from "@/components/tarot/follow-up-badge"

async function getTarotReading(id: string) {
    const { data } = await supabase
        .from("tarot_readings")
        .select(
            "id, question, cards, interpretation, created_at, did, owner_user_id, parent_id"
        )
        .eq("id", id)
        .maybeSingle()
    return data as typeof data & {
        did?: string | null
        owner_user_id?: string | null
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

    return (
        <div className='space-y-8 px-4 max-w-xl mx-auto h-full'>
            {/* Header */}
            <Card className='px-6 pt-10 pb-6 border-0 relative overflow-hidden'>
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
                            <FollowUpBadge show={!!data.parent_id} />
                            &ldquo;
                            {getCleanQuestionText(data.question || "")}
                            &rdquo;
                        </h1>
                        <Sparkles className='w-6 h-6 text-primary' />
                    </div>

                    {/* Card Images with Badges on Top */}
                    <div className='flex flex-wrap gap-6 justify-center'>
                        {selectedCards.map((card, index) => (
                            <div
                                key={index}
                                className='flex flex-col items-center gap-3 relative animate-slide-up'
                                style={{
                                    animationDelay: `${index * 150}ms`,
                                    animationFillMode: "both",
                                }}
                            >
                                {/* Glow effect behind card */}
                                <div
                                    className='absolute inset-0 -z-10 bg-gradient-to-br from-primary/30 via-accent/30 to-primary/30 blur-xl opacity-50 scale-110 animate-pulse'
                                    style={{
                                        animationDelay: `${index * 150 + 500}ms`,
                                    }}
                                />

                                {/* Badge on top */}
                                <Badge
                                    variant='secondary'
                                    className='bg-accent/20 text-accent border-accent/30'
                                >
                                    {card.meaning}
                                </Badge>

                                {/* Card Image */}
                                <CardImage
                                    card={card}
                                    size='md'
                                    showAura={true}
                                    showLabel={false}
                                    className='hover:scale-105 transition-transform duration-200'
                                />
                                {/* Deep meaning link */}
                                <Button
                                    asChild
                                    size='sm'
                                    variant='ghost'
                                    className='mt-2 shadow-md text-xs underline underline-offset-2 text-yellow-500 opacity-60 hover:opacity-100 hover:bg-transparent ease duration-300'
                                >
                                    <Link
                                        href={`/articles/tarot/${card.slug}${card.isReversed ? "#reversed-overview" : ""}`}
                                    >
                                        View full details
                                        <ArrowRight className='ml-0.5' />
                                    </Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Interpretation component handles generation and display */}
            <Interpretation
                readingId={id}
                question={data.question}
                cards={data.cards}
                initialInterpretation={data.interpretation}
                ownerDid={data.did}
                ownerUserId={data.owner_user_id}
            />

            {/* Disclaimer */}
            <Card className='p-4 bg-card/5 backdrop-blur-sm border-border/10'>
                <p className='text-xs text-muted-foreground text-center'>
                    Tarot readings are for entertainment purposes only. The
                    interpretations provided are generated by AI and should not
                    be considered as professional advice. Always consult with
                    qualified professionals for important life decisions.
                </p>
            </Card>
        </div>
    )
}
