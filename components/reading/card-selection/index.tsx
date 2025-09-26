"use client"
import React, { useEffect, useMemo, useState } from "react"
import { TarotCard, useTarot } from "@/contexts/tarot-context"
import { Button } from "../../ui/button"
import { Card } from "../../ui/card"
import { Badge } from "../../ui/badge"
import { Pencil, RotateCw, Star } from "lucide-react"
import { ReadingConfig } from "../../../app/[locale]/reading/page"
import { CircularCardSpread } from "./circular-card-spread"
import LinearCardSpread from "./linear-card-spread"
import { useIsMobile } from "@/hooks/use-mobile"
import { getCleanQuestionText } from "@/lib/question-utils"
import { useTranslations } from "next-intl"
import { InlineQuestionEdit } from "../inline-question-edit"
// import AdDialog from "@/components/ads/ad-dialog"
import { useStars } from "@/contexts/stars-context"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function CardSelection({
    readingConfig,
}: {
    readingConfig: ReadingConfig
}) {
    // Ads disabled; proceed directly without ads
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
    const isMobile = useIsMobile()
    const { stars } = useStars()

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

    // Dialog state
    const [showNoStarsDialog, setShowNoStarsDialog] = useState(false)

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
        if (isFollowUp) {
            setFollowUpQuestion(newQuestion)
        } else {
            setQuestion(newQuestion)
        }
        setIsEditing(false)
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
    }

    const handleBackToReadingType = () => {
        setCurrentStep("reading-type")
        setSelectedCards([])
    }

    const handleCardsSelected = (
        cards: { name: string; isReversed: boolean }[]
    ) => {
        // If not enough stars, block and show dialog; do not mutate state
        if (stars < 1) {
            setShowNoStarsDialog(true)
            return
        }
        // Clear old interpretation state when new cards are selected
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
        // Clear interpretation cache for new reading (only for non-follow-up readings)
        if (!isFollowUp) {
            clearInterpretationCache()
        }

        // Go directly to interpretation
        setCurrentStep("interpretation")
    }

    // Clear interpretation cache for new readings - no-op
    const clearInterpretationCache = () => {}

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
            {/* No Stars Dialog */}
            <AlertDialog open={showNoStarsDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>No stars left</AlertDialogTitle>
                        <AlertDialogDescription>
                            You don’t have enough stars to continue. Please wait for refill or purchase more stars.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setShowNoStarsDialog(false)}>
                            Okay
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                            <p className='text-xs text-yellow-300 flex items-center justify-center gap-1'>
                                <Star className='w-3.5 h-3.5' fill='currentColor' />
                                {"Starting the interpretation will consume 1 star."}
                            </p>
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
                                                className='px-8 py-3 bg-gradient-to-r from-[#15a6ff] to-[#b56cff] text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'
                                            >
                                                {t("chooseCards.confirm", {
                                                    selected:
                                                        aggSelected.length,
                                                    total: cardsToSelect,
                                                    default: `Confirm Selection (${aggSelected.length}/${cardsToSelect})`,
                                                })}
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
