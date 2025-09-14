"use client"
import { TarotCard, useTarot } from "@/contexts/tarot-context"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Pencil } from "lucide-react"
import { ReadingConfig } from "../reading-page-content"
import { CircularCardSpread } from "./circular-card-spread"

export default function CardSelection({
    readingConfig,
}: {
    readingConfig: ReadingConfig
}) {
    const {
        currentStep,
        setCurrentStep,
        question,
        readingType,
        setSelectedCards,
    } = useTarot()

    const handleEditQuestion = () => {
        setCurrentStep("question")
    }

    const handleBackToReadingType = () => {
        setCurrentStep("reading-type")
        setSelectedCards([])
    }

    const handleCardsSelected = (
        cards: { name: string; isReversed: boolean }[]
    ) => {
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
    return (
        <>
            {currentStep === "card-selection" && (
                <div className='space-y-8 animate-fade-in'>
                    <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                        <div className='text-center space-y-2'>
                            <div className='flex items-center justify-center gap-2'>
                                <h2 className='font-serif font-semibold text-xl'>
                                    Your Question
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
                                &ldquo;{question}&rdquo;
                            </p>
                            <p className='text-sm text-primary'>
                                {readingType &&
                                    readingConfig[readingType].title}
                            </p>
                        </div>
                    </Card>

                    <div className='space-y-6'>
                        <div className='text-center space-y-2'>
                            <h2 className='font-serif font-bold text-2xl'>
                                Choose Your Cards
                            </h2>
                            <p className='text-muted-foreground'>
                                Trust your intuition and select from the cosmic
                                spread
                            </p>
                        </div>

                        <div className='flex justify-center'>
                            <Button
                                onClick={handleBackToReadingType}
                                variant='outline'
                                className='border-primary/30 hover:bg-primary/10 bg-transparent'
                            >
                                ← Back to Reading Types
                            </Button>
                        </div>

                        {readingType && (
                            <CircularCardSpread
                                cardsToSelect={readingConfig[readingType].cards}
                                onCardsSelected={handleCardsSelected}
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
