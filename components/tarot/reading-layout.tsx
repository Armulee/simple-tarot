"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { CardImage } from "@/components/card-image"
import Interpretation from "./interpretation"
import ActionSection from "./interpretation/action"
import ShareSection from "./interpretation/share"
import QuestionInput from "../question-input"
import { useTranslations } from "next-intl"
import type { TarotInterpretation } from "@/lib/tarot/schema"

type TarotCard = {
    id: number
    name: string
    image: string
    meaning: string
    isReversed: boolean
    slug: string
}

type TarotReadingLayoutProps = {
    readingId: string
    question?: string
    cards?: string[]
    initialInterpretation?: string | null
    ownerDid?: string | null
    ownerUserId?: string | null
    selectedCards: TarotCard[]
}

export default function TarotReadingLayout({
    readingId,
    question,
    cards,
    initialInterpretation,
    ownerDid,
    ownerUserId,
    selectedCards,
}: TarotReadingLayoutProps) {
    const t = useTranslations("ReadingPage.interpretation")
    const [interpretation, setInterpretation] = useState<string | null>(
        initialInterpretation ?? null
    )
    const [streamingObject, setStreamingObject] = useState<
        Partial<TarotInterpretation> | null
    >(null)
    const [isInterpretationFieldDone, setIsInterpretationFieldDone] = useState(
        !!initialInterpretation
    )
    return (
        <div className="hidden lg:block space-y-8">
            {/* Row 1: Cards (left) + Interpretation (right) */}
            <div className="grid grid-cols-2 gap-8">
                {/* Left Column: Cards */}
                <div className="space-y-8">
                    <Card className="px-6 pt-6 pb-6 border-0 relative overflow-hidden">
                        <div className="space-y-6">
                            <h2 className="font-serif font-semibold text-xl text-center">
                                Your Cards
                            </h2>
                            <div className="flex flex-wrap gap-8 justify-center">
                                {selectedCards.map((card, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col items-center gap-4 relative animate-slide-up"
                                        style={{
                                            animationDelay: `${index * 150}ms`,
                                            animationFillMode: "both",
                                        }}
                                    >
                                        {/* Glow effect behind card */}
                                        <div
                                            className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/30 via-sky-500/30 to-primary/30 blur-xl opacity-50 scale-110 animate-pulse"
                                            style={{
                                                animationDelay: `${index * 150 + 500}ms`,
                                            }}
                                        />

                                        {/* Badge on top */}
                                        <Badge
                                            variant="secondary"
                                            className="bg-primary/20 text-primary border-primary/30"
                                        >
                                            {card.meaning}
                                        </Badge>

                                        {/* Card Image - Larger size */}
                                        <CardImage
                                            card={card}
                                            size="lg"
                                            showAura={true}
                                            showLabel={false}
                                            className="hover:scale-105 transition-transform duration-200"
                                        />
                                        {/* Deep meaning link */}
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="ghost"
                                            className="mt-2 shadow-md text-xs underline underline-offset-2 text-yellow-500 opacity-60 hover:opacity-100 hover:bg-transparent ease duration-300"
                                        >
                                            <Link
                                                href={`/articles/tarot/${card.slug}${card.isReversed ? "#reversed-overview" : ""}`}
                                            >
                                                View full details
                                                <ArrowRight className="ml-0.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Interpretation */}
                <div className="space-y-8">
                    <Interpretation
                        readingId={readingId}
                        question={question}
                        cards={cards}
                        initialInterpretation={interpretation ?? initialInterpretation ?? null}
                        ownerDid={ownerDid}
                        ownerUserId={ownerUserId}
                        isLargeScreen={true}
                        onInterpretationChange={(text) => {
                            setInterpretation(text)
                        }}
                        onInterpretationFieldDone={setIsInterpretationFieldDone}
                        streamingObject={streamingObject}
                    />
                </div>
            </div>

            {/* Row 2: Share (left) + Actions (right) */}
            {(interpretation || isInterpretationFieldDone) && (
                <div className="grid grid-cols-2 gap-8">
                    {/* Left Column: Share */}
                    <div className="space-y-8">
                        <ShareSection
                            question={question || ""}
                            cards={cards || []}
                            interpretation={interpretation ?? undefined}
                            readingId={readingId}
                        />
                    </div>

                    {/* Right Column: Actions */}
                    <div className="space-y-8">
                        <ActionSection
                            question={question || ""}
                            cards={cards || []}
                            interpretation={interpretation ?? undefined}
                            readingId={readingId}
                            onInterpretationChange={(text) => {
                                setInterpretation(text)
                            }}
                            onStreamingObjectChange={(obj) => {
                                setStreamingObject(obj)
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Row 3: Follow-up Input Centered */}
            {(interpretation || isInterpretationFieldDone) && (
                <div className="flex justify-center">
                    <div className="w-full max-w-2xl">
                        <div className="border-t border-border/50 pt-4">
                            <QuestionInput
                                followUp={true}
                                id="follow-up-question"
                                label={t("followUp.label")}
                                placeholder={t("followUp.placeholder")}
                                followUpParentId={readingId}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

