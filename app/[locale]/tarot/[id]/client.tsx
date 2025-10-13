"use client"

import { useState, useEffect, useCallback } from "react"
import { useCompletion } from "@ai-sdk/react"
import { Card } from "@/components/ui/card"
import { Sparkles, Stars } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
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
import ShareSection from "@/components/tarot/interpretation/share"
import ActionSection from "@/components/tarot/interpretation/action"
import QuestionInput from "@/components/question-input"
import { useTranslations } from "next-intl"

interface TarotReadingClientProps {
    readingId: string
    question: string
    cards: string[]
    initialInterpretation: string | null
    ownerDid: string | null
    ownerUserId: string | null
}

export default function TarotReadingClient({
    readingId,
    question,
    cards,
    initialInterpretation,
    ownerDid,
    ownerUserId,
}: TarotReadingClientProps) {
    const t = useTranslations("ReadingPage.interpretation")
    const [interpretation, setInterpretation] = useState<string | null>(initialInterpretation)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [insufficientStars, setInsufficientStars] = useState(false)
    const [showNoStarsDialog, setShowNoStarsDialog] = useState(false)
    const { user } = useAuth()
    const { spendStars, stars } = useStars()

    const { completion, complete } = useCompletion({
        api: "/api/interpret-cards/question",
        onFinish: async (_, completion) => {
            setInterpretation(completion)
            setIsGenerating(false)
            
            // Save the interpretation to the database
            try {
                await fetch("/api/tarot/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: readingId,
                        interpretation: completion,
                    }),
                })
            } catch (error) {
                console.error("Failed to save interpretation:", error)
            }
        },
        onError: (error) => {
            setError(error.message)
            setIsGenerating(false)
        },
    })

    const generateInterpretation = useCallback(async () => {
        if (!interpretation && !isGenerating) {
            // Check if user has enough stars
            if (!Number.isFinite(stars as number) || (stars as number) < 1) {
                setInsufficientStars(true)
                return
            }

            // Spend a star
            const success = spendStars(1)
            if (!success) {
                setInsufficientStars(true)
                return
            }

            setIsGenerating(true)
            setError(null)

            // Build the prompt for interpretation
            const cardNames = cards.join(", ")
            const prompt = `Question: "${question}"

Cards: ${cardNames}

Goal: Provide a concise interpretation that directly answers the question.

Silent steps (do not reveal):
1) Classify the question intent into: love/relationships, work/career, finances, health/wellbeing, personal growth, spiritual, or general.
2) Map the listed cards to that intent and emphasize the most relevant angles.
3) Do not fetch or cite external sources (e.g., thetarotguide.com). Use only the provided card names (and reversed markers) as context.

Output:
- One short paragraph, <= 100 words.
- Clear, grounded. Mention cards only if essential.
- Answer directly to the question. ground it; if vague, add specificity; if too long, trim; if too short, enrich with specifics.`

            // Generate interpretation
            await complete(prompt)
        }
    }, [interpretation, isGenerating, stars, spendStars, cards, question, complete])

    // Auto-generate interpretation on first visit if not already present
    useEffect(() => {
        if (!interpretation && !isGenerating && !error) {
            generateInterpretation()
        }
    }, [interpretation, isGenerating, error, generateInterpretation])

    return (
        <>
            {/* No Stars Dialog */}
            <AlertDialog open={showNoStarsDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>No stars left</AlertDialogTitle>
                        <AlertDialogDescription>
                            You don't have enough stars to view this interpretation.
                            Please wait for refill or purchase more stars.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={() => setShowNoStarsDialog(false)}
                        >
                            Okay
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AI Interpretation */}
            <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20 card-glow overflow-hidden'>
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
                                {t("sectionTitle")}
                            </h2>
                            <p
                                className='text-sm text-muted-foreground animate-fade-up'
                                style={{
                                    animationDelay: "0ms",
                                    animationDuration: "300ms",
                                    animationFillMode: "both",
                                }}
                            >
                                {t("sectionSubtitle")}
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
                        {insufficientStars ? (
                            <div className='text-center space-y-6 py-8'>
                                <div className='flex items-center justify-center space-x-3'>
                                    <Stars className='w-6 h-6 text-yellow-300' />
                                    <span className='text-muted-foreground'>
                                        You need 1 star to view this interpretation.
                                        Current balance: {stars}.
                                    </span>
                                </div>
                            </div>
                        ) : error ? (
                            <div className='text-center space-y-4'>
                                <p className='text-destructive'>{error}</p>
                                <button
                                    onClick={generateInterpretation}
                                    className='px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90'
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : isGenerating ? (
                            <div className='text-center space-y-4 py-8'>
                                <div className='flex items-center justify-center space-x-3'>
                                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
                                    <span className='text-muted-foreground'>
                                        Generating interpretation...
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div
                                className='text-foreground leading-relaxed whitespace-pre-wrap mb-4 animate-fade-up'
                                style={{
                                    animationDelay: "600ms",
                                    animationDuration: "500ms",
                                    animationFillMode: "both",
                                }}
                            >
                                {interpretation ?? completion}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Show action buttons and sharing when interpretation is complete */}
            {interpretation && (
                <>
                    {/* Sharing and Actions */}
                    <div className='w-full max-w-4xl space-y-6'>
                        <ShareSection 
                            question={question}
                            cards={cards}
                            interpretation={interpretation}
                            readingId={readingId}
                        />
                        <ActionSection 
                            question={question}
                            cards={cards}
                            interpretation={interpretation}
                            readingId={readingId}
                        />
                    </div>

                    {/* Follow-up question */}
                    <div className='border-t border-border/20 pt-4'>
                        <QuestionInput
                            followUp={true}
                            id='follow-up-question'
                            label={t("followUp.label")}
                            placeholder={t("followUp.placeholder")}
                        />
                    </div>
                </>
            )}
        </>
    )
}