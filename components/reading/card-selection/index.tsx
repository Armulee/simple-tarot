"use client"
import { TarotCard, useTarot } from "@/contexts/tarot-context"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Badge } from "../../ui/badge"
import { Pencil } from "lucide-react"
import { ReadingConfig } from "../../../app/[locale]/reading/page"
import { CircularCardSpread } from "./circular-card-spread"
import { useRouter } from "next/navigation"
import { isFollowUpQuestion, getCleanQuestionText } from "@/lib/question-utils"
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
        setInterpretation,
        clearInterpretationState,
        isFollowUp,
    } = useTarot()
    const router = useRouter()

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
    return (
        <>
            {currentStep === "card-selection" && (
                <div className='space-y-8 animate-fade-in'>
                    <Card className='px-6 pt-12 border-0'>
                        <div className='text-center space-y-2'>
                            <div className='flex items-center justify-center gap-2 relative'>
                                <h2 className='font-serif font-semibold text-xl relative'>
                                    {isFollowUpQuestion(question || "", {
                                        isFollowUp,
                                    }) && (
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
                                &ldquo;{getCleanQuestionText(question || "")}
                                &rdquo;
                            </p>
                            <Badge
                                className={`text-sm text-primary bg-transparent border-primary/50 ${
                                    isFollowUpQuestion(question || "")
                                        ? "cursor-default"
                                        : "cursor-pointer hover:bg-primary/10 transition-colors"
                                }`}
                                onClick={
                                    isFollowUpQuestion(question || "")
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
