"use client"
import { TarotCard, useTarot } from "@/contexts/tarot-context"
import { Card } from "../../ui/card"
import { Badge } from "../../ui/badge"
import { ReadingConfig } from "../reading-page-client"
import { CircularCardSpread } from "./circular-card-spread"
import { isFollowUpQuestion } from "@/lib/question-utils"
import EditableQuestion from "../editable-question"

export default function CardSelection({
    readingConfig,
}: {
    readingConfig: ReadingConfig
}) {
    const {
        currentStep,
        setCurrentStep,
        question,
        setQuestion,
        readingType,
        setSelectedCards,
    } = useTarot()

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
                    <Card className='px-6 pt-12 border-0'>
                        <div className='space-y-4'>
                            <EditableQuestion
                                question={question}
                                onQuestionChange={setQuestion}
                            />
                            <div className='flex justify-center'>
                                <Badge
                                    className={`text-sm text-primary bg-transparent border-primary/50 ${
                                        isFollowUpQuestion(question)
                                            ? "cursor-default"
                                            : "cursor-pointer hover:bg-primary/10 transition-colors"
                                    }`}
                                    onClick={
                                        isFollowUpQuestion(question)
                                            ? undefined
                                            : handleBackToReadingType
                                    }
                                >
                                    {readingType &&
                                        readingConfig[readingType].title}
                                </Badge>
                            </div>
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
