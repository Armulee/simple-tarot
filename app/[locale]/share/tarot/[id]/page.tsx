import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Home, ArrowRight, Sparkles, UserPlus } from "lucide-react"
import { CardImage } from "@/components/card-image"
import { getCleanQuestionText } from "@/lib/question-utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import StarCard from "@/components/star-card"
import ShareAwardClient from "@/components/tarot/share-award-client"

async function getShared(id: string) {
    const { data } = await supabase
        .from("shared_tarot")
        .select(
            "id, question, cards, interpretation, created_at, did, owner_user_id"
        )
        .eq("id", id)
        .maybeSingle()
    return data as typeof data & {
        did?: string | null
        owner_user_id?: string | null
    }
}

export default async function SharedTarotPage({
    params,
}: {
    params: { id: string }
}) {
    const id = (params?.id ?? "").toString()
    const data = await getShared(id)
    if (!data) return notFound()
    // Client will perform award and broadcast updates
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
              }
          })
        : []

    return (
        <div className='space-y-8 px-4'>
            {/* Client-side award & broadcast */}
            <ShareAwardClient
                sharedId={data.id}
                ownerUserId={data.owner_user_id ?? null}
                ownerDid={data.did ?? null}
            />
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
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* AI Interpretation */}
            <Card className='max-w-4xl mx-auto p-8 bg-card/10 backdrop-blur-sm border-border/20 card-glow overflow-hidden'>
                <div className='space-y-6'>
                    <div className='flex items-center space-x-3'>
                        <div
                            className='w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-fade-up'
                            style={{
                                animationDelay: "0ms",
                                animationDuration: "300ms",
                                animationFillMode: "both",
                            }}
                        >
                            <Sparkles className='w-5 h-5 text-primary' />
                        </div>
                        <div>
                            <h2
                                className='font-serif font-semibold text-xl animate-fade-up'
                                style={{
                                    animationDelay: "0ms",
                                    animationDuration: "300ms",
                                    animationFillMode: "both",
                                }}
                            >
                                AI Interpretation
                            </h2>
                            <p
                                className='text-sm text-muted-foreground animate-fade-up'
                                style={{
                                    animationDelay: "0ms",
                                    animationDuration: "300ms",
                                    animationFillMode: "both",
                                }}
                            >
                                The cards reveal their wisdom
                            </p>
                        </div>
                    </div>
                    <div
                        className='prose prose-invert max-w-none animate-expand-vertical'
                        style={{
                            animationDelay: "300ms",
                            animationDuration: "1s",
                            animationFillMode: "both",
                        }}
                    >
                        <div className='whitespace-pre-wrap leading-relaxed text-foreground/90 text-base'>
                            {data.interpretation}
                        </div>
                    </div>
                </div>
            </Card>

            {/* CTA Component */}
            <div className='w-full max-w-4xl mx-auto space-y-6'>
                {/* CTA Section */}
                <StarCard>
                    <div className='relative z-10 text-center space-y-10'>
                        {/* Header with enhanced styling */}
                        <div className='space-y-6'>
                            <div className='flex items-center justify-center gap-4'>
                                <Sparkles className='w-8 h-8 text-yellow-300 animate-pulse' />
                                <h2 className='font-serif font-bold text-4xl text-yellow-300'>
                                    Get your own reading
                                </h2>
                                <Sparkles
                                    className='w-8 h-8 text-yellow-300 animate-pulse'
                                    style={{ animationDelay: "0.5s" }}
                                />
                            </div>
                            <p className='text-white/75 max-w-3xl mx-auto leading-relaxed font-medium'>
                                The cards have spoken to you. Now let them
                                reveal the secrets of your own journey.
                                <span className='text-white font-bold'>
                                    {" "}
                                    Ask your question
                                </span>{" "}
                                and receive
                                <span className='text-white font-bold'>
                                    {" "}
                                    personalized guidance
                                </span>{" "}
                                from the ancient wisdom of tarot.
                            </p>
                        </div>

                        {/* Enhanced CTA Buttons */}
                        <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
                            <Link href='/'>
                                <Button
                                    size='lg'
                                    className='bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500 shadow-[0_12px_30px_-10px_rgba(234,179,8,0.45)] px-12 py-5 text-xl font-bold group transition-all duration-300 transform hover:scale-110'
                                >
                                    <div className='flex items-center gap-4'>
                                        <Home className='w-6 h-6' />
                                        <span>Ask Your Question</span>
                                        <ArrowRight className='w-6 h-6 group-hover:translate-x-2 transition-transform duration-300' />
                                    </div>
                                </Button>
                            </Link>

                            <Link href='/signup'>
                                <Button
                                    variant='outline'
                                    size='lg'
                                    className='px-3 py-2 rounded-md border border-white/20 text-white bg-primary hover:bg-white/10 px-12 py-5 text-xl font-bold group transition-all duration-300 transform hover:scale-110'
                                >
                                    <div className='flex items-center gap-4'>
                                        <UserPlus className='w-6 h-6' />
                                        <span>Create Account</span>
                                        <ArrowRight className='w-6 h-6 group-hover:translate-x-2 transition-transform duration-300' />
                                    </div>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </StarCard>
            </div>

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
