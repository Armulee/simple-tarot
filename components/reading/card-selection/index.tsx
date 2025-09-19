"use client"
import React, { useEffect, useMemo, useState } from "react"
import { TarotCard, useTarot } from "@/contexts/tarot-context"
import { useStars } from "@/contexts/stars-context"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Badge } from "../../ui/badge"
import { Pencil, RotateCw, Star, AlertCircle } from "lucide-react"
import { ReadingConfig } from "../../../app/[locale]/reading/page"
import { CircularCardSpread } from "./circular-card-spread"
import LinearCardSpread from "./linear-card-spread"
import { useIsMobile } from "@/hooks/use-mobile"
import { getCleanQuestionText } from "@/lib/question-utils"
import { useTranslations } from "next-intl"
import { InlineQuestionEdit } from "../inline-question-edit"

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
        canAffordReading,
        readingCost,
        processReading,
    } = useTarot()
    const { stars } = useStars()
    const isMobile = useIsMobile()

    // Desktop-only spread mode selection; mobile is forced to linear
    const [spreadMode, setSpreadMode] = useState<"circular" | "linear">(
        "circular"
    )
    const [isEditing, setIsEditing] = useState(false)
    const linearShuffleRef = React.useRef<(() => void) | null>(null)
    const circularShuffleRef = React.useRef<(() => void) | null>(null)

    // Aggregated selection for dual circular spreads
    const [aggSelected, setAggSelected] = useState<
        { name: string; isReversed: boolean }[]
    >([])
    const [spreadResetKey, setSpreadResetKey] = useState(0)
    const cardsToSelect = readingType ? readingConfig[readingType].cards : 1

    // Clear previous selections whenever we enter the card selection step (including follow-up)
    useEffect(() => {
        if (currentStep === "card-selection") {
            setSelectedCards([])
            setAggSelected([])
            setSpreadResetKey((k) => k + 1)
        }
    }, [currentStep, setSelectedCards])

    const handleEditQuestion = () => {
        setIsEditing(true)
    }

    const handleSaveQuestion = (newQuestion: string) => {
        setQuestion(newQuestion)
        setIsEditing(false)
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
    }

    const handleBackToReadingType = () => {
        setCurrentStep("reading-type")
        setSelectedCards([])
    }

    const handleCardsSelected = async (
        cards: { name: string; isReversed: boolean }[]
    ) => {
        // Check if user can afford the reading
        if (!canAffordReading) {
            // Show error or redirect to stars dashboard
            return
        }

        // Process the reading (deduct stars)
        const result = await processReading()
        if (!result.success) {
            // Handle error - maybe show a toast or modal
            return
        }

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
            // Don't auto-finalize - let the circular spread handle confirmation
            return next
        })
    }
    const handleShuffle = () => {
        const useLinear = isMobile || spreadMode === "linear"
        if (useLinear) {
            linearShuffleRef.current?.()
        } else {
            circularShuffleRef.current?.()
        }
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
                                {!isEditing && (
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

                            {isEditing ? (
                                <InlineQuestionEdit
                                    currentQuestion={
                                        isFollowUp && followUpQuestion
                                            ? followUpQuestion
                                            : question || ""
                                    }
                                    onSave={handleSaveQuestion}
                                    onCancel={handleCancelEdit}
                                />
                            ) : (
                                <>
                                    <p className='text-muted-foreground italic'>
                                        &ldquo;
                                        {getCleanQuestionText(
                                            isFollowUp && followUpQuestion
                                                ? followUpQuestion
                                                : question || ""
                                        )}
                                        &rdquo;
                                    </p>
                                    <Badge
                                        className={`text-sm text-accent bg-transparent border-accent/50 ${
                                            isFollowUp
                                                ? "cursor-default"
                                                : "cursor-pointer hover:bg-accent/10 transition-colors"
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
                                </>
                            )}
                        </div>
                    </Card>

                    <div className='space-y-6'>
                        <div className='text-center space-y-2'>
                            <div className='flex items-center justify-center gap-4'>
                                <h2 className='font-serif font-bold text-2xl'>
                                    {t("chooseCards.title", {
                                        default: "Choose Your Cards",
                                    })}
                                </h2>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='gap-2'
                                    onClick={handleShuffle}
                                >
                                    <RotateCw className='w-4 h-4' />{" "}
                                    {t("chooseCards.shuffle", {
                                        default: "Shuffle",
                                    })}
                                </Button>
                            </div>
                            <p className='text-muted-foreground'>
                                {t("chooseCards.desc", {
                                    amount: `(${aggSelected.length}/${cardsToSelect})`,
                                    default: `Trust your intuition and select ${cardsToSelect} from the cosmic spread`,
                                })}
                            </p>
                            
                            {/* Stars Cost Information */}
                            <div className='flex items-center justify-center gap-2 mt-4'>
                                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
                                    canAffordReading 
                                        ? 'bg-yellow-500/20 border border-yellow-500/30' 
                                        : 'bg-red-500/20 border border-red-500/30'
                                }`}>
                                    <Star className={`w-4 h-4 ${canAffordReading ? 'text-yellow-400' : 'text-red-400'}`} />
                                    <span className={`text-sm font-semibold ${canAffordReading ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {readingCost} stars
                                    </span>
                                </div>
                                <div className='text-sm text-muted-foreground'>
                                    (You have {stars} stars)
                                </div>
                            </div>
                            
                            {!canAffordReading && (
                                <div className='flex items-center justify-center gap-2 mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg'>
                                    <AlertCircle className='w-4 h-4 text-red-400' />
                                    <span className='text-sm text-red-400'>
                                        Not enough stars for this reading. You need {readingCost} stars but have {stars}.
                                    </span>
                                </div>
                            )}
                        </div>

                        {readingType && (
                            <>
                                {/* Spread type selector - desktop only */}
                                {!isMobile &&
                                    aggSelected.length !== cardsToSelect && (
                                        <div className='flex items-center justify-center gap-2'>
                                            <Button
                                                variant={
                                                    spreadMode === "circular"
                                                        ? "default"
                                                        : "outline"
                                                }
                                                onClick={() => {
                                                    setSpreadMode("circular")
                                                    setAggSelected([])
                                                    setSpreadResetKey(
                                                        (k) => k + 1
                                                    )
                                                }}
                                                className='rounded-full'
                                            >
                                                {t("chooseCards.circular", {
                                                    default: "Circular",
                                                })}
                                            </Button>
                                            <Button
                                                variant={
                                                    spreadMode === "linear"
                                                        ? "default"
                                                        : "outline"
                                                }
                                                onClick={() => {
                                                    setSpreadMode("linear")
                                                    setAggSelected([])
                                                    setSpreadResetKey(
                                                        (k) => k + 1
                                                    )
                                                }}
                                                className='rounded-full'
                                            >
                                                {t("chooseCards.linear", {
                                                    default: "Linear",
                                                })}
                                            </Button>
                                        </div>
                                    )}

                                {/* Replace the style-switch buttons with confirm when ready */}
                                {!isMobile &&
                                    aggSelected.length === cardsToSelect && (
                                        <div className='flex items-center justify-center'>
                                            <Button
                                                onClick={() =>
                                                    handleCardsSelected(
                                                        aggSelected
                                                    )
                                                }
                                                disabled={!canAffordReading}
                                                className={`px-8 py-3 font-semibold rounded-full shadow-lg transition-all duration-300 ${
                                                    canAffordReading
                                                        ? 'bg-gradient-to-r from-[#15a6ff] to-[#b56cff] text-white hover:shadow-xl hover:scale-105'
                                                        : 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                                                }`}
                                            >
                                                {canAffordReading ? (
                                                    t("chooseCards.confirm", {
                                                        selected: aggSelected.length,
                                                        total: cardsToSelect,
                                                        default: `Confirm Selection (${aggSelected.length}/${cardsToSelect})`,
                                                    })
                                                ) : (
                                                    `Need ${readingCost} stars (You have ${stars})`
                                                )}
                                            </Button>
                                        </div>
                                    )}

                                {/* Mobile: force linear */}
                                {isMobile || spreadMode === "linear" ? (
                                    <LinearCardSpread
                                        cardsToSelect={
                                            readingConfig[readingType].cards
                                        }
                                        onCardsSelected={handleCardsSelected}
                                        onProvideShuffle={(fn) =>
                                            (linearShuffleRef.current = fn)
                                        }
                                    />
                                ) : (
                                    <div className='flex justify-center'>
                                        <CircularCardSpread
                                            deckId={`single-${spreadResetKey}`}
                                            cardsToSelect={
                                                readingConfig[readingType].cards
                                            }
                                            onCardsSelected={
                                                handleCardsSelected
                                            }
                                            onPartialSelect={(c, action) =>
                                                handlePartialSelect(c, action)
                                            }
                                            externalSelectedNames={
                                                externalNames
                                            }
                                            onProvideShuffle={(fn) =>
                                                (circularShuffleRef.current =
                                                    fn)
                                            }
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
