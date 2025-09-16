"use client"
import { useState } from "react"
import { TarotCard, useTarot } from "@/contexts/tarot-context"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Badge } from "../../ui/badge"
import { Input } from "../../ui/input"
import { Pencil, Check, X, Circle, Minus } from "lucide-react"
import { ReadingConfig } from "../../../app/[locale]/reading/page"
import { LinearCardSpread } from "./linear-card-spread"
import { CircularCardSpread } from "./circular-card-spread"
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
        setQuestion,
        readingType,
        setSelectedCards,
        clearInterpretationState,
        isFollowUp,
        followUpQuestion,
        setFollowUpQuestion,
    } = useTarot()

    // State for inline editing
    const [isEditingQuestion, setIsEditingQuestion] = useState(false)
    const [editingQuestion, setEditingQuestion] = useState("")

    // State for spread type selection
    const [spreadType, setSpreadType] = useState<"circular" | "linear">(
        "circular"
    )

    const handleEditQuestion = () => {
        // Start inline editing
        const currentQuestion =
            isFollowUp && followUpQuestion ? followUpQuestion : question || ""
        setEditingQuestion(currentQuestion)
        setIsEditingQuestion(true)
    }

    const handleSaveQuestion = () => {
        if (isFollowUp) {
            setFollowUpQuestion(editingQuestion)
        } else {
            setQuestion(editingQuestion)
        }
        setIsEditingQuestion(false)
    }

    const handleCancelEdit = () => {
        setIsEditingQuestion(false)
        setEditingQuestion("")
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSaveQuestion()
        } else if (e.key === "Escape") {
            handleCancelEdit()
        }
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
                                {!isEditingQuestion && (
                                    <Button
                                        onClick={handleEditQuestion}
                                        variant='ghost'
                                        size='sm'
                                        className='h-8 w-8 p-0 hover:bg-primary/10'
                                    >
                                        <Pencil className='h-4 w-4 text-muted-foreground hover:text-primary' />
                                    </Button>
                                )}
                            </div>

                            {isEditingQuestion ? (
                                <div className='space-y-3'>
                                    <Input
                                        value={editingQuestion}
                                        onChange={(e) =>
                                            setEditingQuestion(e.target.value)
                                        }
                                        onKeyDown={handleKeyDown}
                                        className='text-center text-muted-foreground italic border-primary/50 focus:border-primary'
                                        placeholder='Enter your question...'
                                        autoFocus
                                    />
                                    <div className='flex justify-center gap-2'>
                                        <Button
                                            onClick={handleSaveQuestion}
                                            size='sm'
                                            className='h-8 px-3'
                                        >
                                            <Check className='h-4 w-4 mr-1' />
                                            Save
                                        </Button>
                                        <Button
                                            onClick={handleCancelEdit}
                                            variant='outline'
                                            size='sm'
                                            className='h-8 px-3'
                                        >
                                            <X className='h-4 w-4 mr-1' />
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className='text-muted-foreground italic'>
                                    &ldquo;
                                    {getCleanQuestionText(
                                        isFollowUp && followUpQuestion
                                            ? followUpQuestion
                                            : question || ""
                                    )}
                                    &rdquo;
                                </p>
                            )}
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
                        <div className='text-center space-y-4'>
                            <div className='space-y-2'>
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

                            {/* Spread Type Selection Buttons */}
                            <div className='flex justify-center'>
                                <div className='inline-flex items-center bg-card/50 rounded-lg p-1 border border-border/30'>
                                    <button
                                        onClick={() =>
                                            setSpreadType("circular")
                                        }
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                            spreadType === "circular"
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                        }`}
                                    >
                                        <Circle className='h-4 w-4' />
                                        Circular Spread
                                    </button>
                                    <button
                                        onClick={() => setSpreadType("linear")}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                            spreadType === "linear"
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                        }`}
                                    >
                                        <Minus className='h-4 w-4' />
                                        Linear Spread
                                    </button>
                                </div>
                            </div>
                        </div>

                        {readingType && (
                            <>
                                {spreadType === "circular" ? (
                                    <CircularCardSpread
                                        cardsToSelect={
                                            readingConfig[readingType].cards
                                        }
                                        onCardsSelected={handleCardsSelected}
                                    />
                                ) : (
                                    <LinearCardSpread
                                        cardsToSelect={
                                            readingConfig[readingType].cards
                                        }
                                        onCardsSelected={handleCardsSelected}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
