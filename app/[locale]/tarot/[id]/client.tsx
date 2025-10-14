"use client"

import { useState, useEffect, useCallback } from "react"
import { useCompletion } from "@ai-sdk/react"
import { Card } from "@/components/ui/card"
import { Sparkles, Stars, Home, ArrowRight, UserPlus } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
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
import StarCard from "@/components/star-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
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
    ownerDid: _ownerDid,
    ownerUserId: _ownerUserId,
}: TarotReadingClientProps) {
    const t = useTranslations("ReadingPage.interpretation")
    const [interpretation, setInterpretation] = useState<string | null>(initialInterpretation)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showNoStarsDialog, setShowNoStarsDialog] = useState(false)
    const [isOwner, setIsOwner] = useState(false)
    const { user } = useAuth()

    // Check if current user is the owner
    useEffect(() => {
        const checkOwnership = async () => {
            try {
                const did = await fetch("/api/did").then(res => res.json()).then(data => data.did).catch(() => null)
                const isOwnerByDid = did && _ownerDid && did === _ownerDid
                const isOwnerByUserId = user?.id && _ownerUserId && user.id === _ownerUserId
                setIsOwner(!!(isOwnerByDid || isOwnerByUserId))
            } catch (error) {
                console.error("Error checking ownership:", error)
                setIsOwner(false)
            }
        }
        checkOwnership()
    }, [user?.id, _ownerDid, _ownerUserId])

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
            // No star deduction here - stars are deducted during card selection
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
    }, [interpretation, isGenerating, cards, question, complete])

    // Auto-generate interpretation on first visit if not already present
    useEffect(() => {
        if (!interpretation && !isGenerating && !error) {
            generateInterpretation()
        }
    }, [interpretation, isGenerating, error, generateInterpretation])

    // Award stars to owner when visitor views the page
    useEffect(() => {
        const awardStarsToOwner = async () => {
            try {
                await fetch("/api/stars/share-award", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        owner_user_id: _ownerUserId,
                        owner_did: _ownerDid,
                        shared_id: readingId,
                    }),
                })
            } catch (error) {
                console.error("Failed to award stars to owner:", error)
            }
        }
        
        // Only award stars if there's an interpretation (meaning the reading is complete)
        if (interpretation) {
            awardStarsToOwner()
        }
    }, [interpretation, readingId, _ownerUserId, _ownerDid])

    return (
        <>
            {/* No Stars Dialog */}
            <AlertDialog open={showNoStarsDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>No stars left</AlertDialogTitle>
                        <AlertDialogDescription>
                            You don&apos;t have enough stars to view this interpretation.
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
                            {/* Only show star consumption text for owners */}
                            {isOwner && (
                                <div className='flex items-center justify-center gap-2 text-xs text-yellow-300 mt-2'>
                                    <Stars className='w-3.5 h-3.5' />
                                    <span>
                                        Consuming 1 star to reveal this interpretation.
                                    </span>
                                </div>
                            )}
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
                        {error ? (
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

            {/* Show different content based on ownership */}
            {interpretation && (
                <>
                    {isOwner ? (
                        <>
                            {/* Owner: Show Actions and Sharing (swapped positions) */}
                            <div className='w-full space-y-6'>
                                <ActionSection 
                                    question={question}
                                    cards={cards}
                                    interpretation={interpretation}
                                    readingId={readingId}
                                />
                                <ShareSection 
                                    question={question}
                                    cards={cards}
                                    interpretation={interpretation}
                                    readingId={readingId}
                                />
                            </div>

                            {/* Follow-up question for owners */}
                            <div className='border-t border-border/20 pt-4'>
                                <QuestionInput
                                    followUp={true}
                                    id='follow-up-question'
                                    label={t("followUp.label")}
                                    placeholder={t("followUp.placeholder")}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Non-owner: Show CTA Section */}
                            <div className='w-full space-y-6'>
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
                        </>
                    )}
                </>
            )}
        </>
    )
}