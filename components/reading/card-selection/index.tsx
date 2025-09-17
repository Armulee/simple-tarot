"use client"
import React, { useMemo, useState } from "react"
import { TarotCard, useTarot } from "@/contexts/tarot-context"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Badge } from "../../ui/badge"
import { Pencil } from "lucide-react"
import { ReadingConfig } from "../../../app/[locale]/reading/page"
import { CircularCardSpread } from "./circular-card-spread"
import LinearCardSpread from "./linear-card-spread"
import { useIsMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"
import { getCleanQuestionText } from "@/lib/question-utils"
import { useTranslations } from "next-intl"

export default function CardSelection({
    readingConfig,
}: {
    readingConfig: ReadingConfig
}) {
    const t = useTranslations("ReadingPage")
    const {
        currentStep,
        setCurrentStep,
        question,
        readingType,
        setSelectedCards,
        clearInterpretationState,
        isFollowUp,
        followUpQuestion,
    } = useTarot()
    const router = useRouter()
    const isMobile = useIsMobile()

    // Desktop-only spread mode selection; mobile is forced to linear
    const [spreadMode, setSpreadMode] = useState<"circular" | "linear">("circular")

    // Aggregated selection for dual circular spreads
    const [aggSelected, setAggSelected] = useState<{ name: string; isReversed: boolean }[]>([])
    const cardsToSelect = readingType ? readingConfig[readingType].cards : 1

    const handleEditQuestion = () => {
        // Navigate to homepage - the question is already in context
        router.push("/")
    }

    const handleBackToReadingType = () => {
        setCurrentStep("reading-type")
        setSelectedCards([])
    }

    const handleCardsSelected = (
        cards: { name: string; isReversed: boolean }[]
    ) => {
        // Clear old interpretation state and localStorage when new cards are selected
        clearInterpretationState()
        
        // Convert to TarotCard format
        const tarotCards: TarotCard[] = cards.map((card, index) => ({
            id: index + 1,
            name: card.name,
            image: `assets/rider-waite-tarot/${card.name
                .toLowerCase()
                .replace(/\s+/g, "-")}.png`,
            meaning: card.isReversed ? `${card.name} (Reversed)` : card.name,
            isReversed: card.isReversed,
        }))

        setSelectedCards(tarotCards)
        setCurrentStep("interpretation")
    }

    const externalNames = useMemo(
        () => aggSelected.map((c) => c.name),
        [aggSelected]
    )

    const handlePartialSelect = (
        card: { name: string; isReversed: boolean },
        action: "add" | "remove"
    ) => {
        setAggSelected((prev) => {
            let next = prev
            if (action === "add") {
                if (!prev.find((c) => c.name === card.name)) {
                    next = [...prev, card]
                }
            } else {
                next = prev.filter((c) => c.name !== card.name)
            }
            if (next.length === cardsToSelect) {
                // finalize automatically
                handleCardsSelected(next)
            }
            return next
        })
    }
    return (
        <>
            {currentStep === "card-selection" && (
                <div className='space-y-8 animate-fade-in'>
                    <Card className='px-6 pt-12 border-0'>
                        <div className='text-center space-y-2'>
                            <div className='flex items-center justify-center gap-2 relative'>
                                <h2 className='font-serif font-semibold text-xl relative'>
                                    {isFollowUp && (
                                        <Badge
                                            variant='secondary'
                                            className='absolute -top-6 -left-8 -rotate-12 bg-primary/20 text-white border-white/30'
                                        >
                                            {t("followUp.badge")}
                                        </Badge>
                                    )}
                                    {t("questionHeading")}
                                </h2>
                                <Button
                                    onClick={handleEditQuestion}
                                    variant='ghost'
                                    size='sm'
                                    className='h-8 w-8 p-0 hover:bg-primary/10'
                                >
                                    <Pencil className='h-4 w-4 text-muted-foreground hover:text-primary' />
                                </Button>
                            </div>
                            <p className='text-muted-foreground italic'>
                                &ldquo;{getCleanQuestionText(isFollowUp && followUpQuestion ? followUpQuestion : question || "")}
                                &rdquo;
                            </p>
                            <Badge
                                className={`text-sm text-primary bg-transparent border-primary/50 ${
                                    isFollowUp
                                        ? "cursor-default"
                                        : "cursor-pointer hover:bg-primary/10 transition-colors"
                                }`}
                                onClick={
                                    isFollowUp
                                        ? undefined
                                        : handleBackToReadingType
                                }
                            >
                                {readingType &&
                                    readingConfig[readingType].title}
                            </Badge>
                        </div>
                    </Card>

                    <div className='space-y-6'>
                        <div className='text-center space-y-2'>
                            <h2 className='font-serif font-bold text-2xl'>
                                {t("chooseCards.title", {
                                    default: "Choose Your Cards",
                                })}
                            </h2>
                            <p className='text-muted-foreground'>
                                {t("chooseCards.desc", {
                                    default:
                                        "Trust your intuition and select from the cosmic spread",
                                })}
                            </p>
                        </div>

                        {readingType && (
                            <>
                                {/* Spread type selector - desktop only */}
                                {!isMobile && (
                                    <div className='flex items-center justify-center gap-2'>
                                        <Button
                                            variant={spreadMode === "circular" ? "default" : "outline"}
                                            onClick={() => setSpreadMode("circular")}
                                            className='rounded-full'
                                        >
                                            {t("chooseCards.circular", { default: "Circular" })}
                                        </Button>
                                        <Button
                                            variant={spreadMode === "linear" ? "default" : "outline"}
                                            onClick={() => setSpreadMode("linear")}
                                            className='rounded-full'
                                        >
                                            {t("chooseCards.linear", { default: "Linear" })}
                                        </Button>
                                    </div>
                                )}

                                {/* Mobile: force linear */}
                                {isMobile || spreadMode === "linear" ? (
                                    <LinearCardSpread
                                        cardsToSelect={readingConfig[readingType].cards}
                                        onCardsSelected={handleCardsSelected}
                                    />
                                ) : (
                                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                                        <CircularCardSpread
                                            deferFinalization
                                            cardsToSelect={readingConfig[readingType].cards}
                                            onCardsSelected={handleCardsSelected}
                                            onPartialSelect={(c, action) => handlePartialSelect(c, action)}
                                            externalSelectedNames={externalNames}
                                        />
                                        <CircularCardSpread
                                            deferFinalization
                                            cardsToSelect={readingConfig[readingType].cards}
                                            onCardsSelected={handleCardsSelected}
                                            onPartialSelect={(c, action) => handlePartialSelect(c, action)}
                                            externalSelectedNames={externalNames}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
