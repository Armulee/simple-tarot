"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, RefreshCcw, Loader2, Stars } from "lucide-react"
import { FaShareNodes, FaCopy, FaDownload, FaCheck } from "react-icons/fa6"
import { useEffect, useRef, useState, useCallback } from "react"
import { useCompletion } from "@ai-sdk/react"
import { TarotCard, useTarot } from "@/contexts/tarot-context"
import { useRouter } from "next/navigation"
import QuestionInput from "../question-input"
import { CardImage } from "../card-image"
import { isFollowUpQuestion, getCleanQuestionText } from "@/lib/question-utils"

export default function Interpretation() {
    const router = useRouter()
    const [finish, setFinish] = useState(false)
    const [copied, setCopied] = useState(false)
    const [followUpData, setFollowUpData] = useState<{
        lastQuestion: string
        lastCards: TarotCard[]
        lastInterpretation: string
        pureQuestion: string
    } | null>(null)
    const {
        currentStep,
        question,
        selectedCards,
        interpretation,
        setInterpretation,
    } = useTarot()
    const { completion, isLoading, error, complete } = useCompletion({
        // api: "/api/interpret-cards/mockup",
        api: "/api/interpret-cards/question",
        onFinish: (_, completion) => {
            setFinish(true)
            setInterpretation(completion)
        },
    })

    const getInterpretation = useCallback(
        async (question: string, selectedCards: TarotCard[]) => {
            let prompt: string

            // Check if this is a follow-up question
            if (question.startsWith("[Follow up question]:")) {
                const pureQuestion = question
                    .replace("[Follow up question]:", "")
                    .trim()

                if (followUpData) {
                    prompt = `From last question: ${followUpData.lastQuestion}
last cards: ${followUpData.lastCards.map((c) => c.meaning).join(", ")} 
last interpretation: ${followUpData.lastInterpretation}

Answer this follow up question: ${pureQuestion}
The user picked up cards: ${selectedCards.map((c) => c.meaning).join(", ")}

Provide a concise interpretation that addresses the follow-up question while considering the previous reading context. Keep it positive and uplifting. Answer as a paragraph. No more than 100 words.`
                } else {
                    // Fallback if followUpData is not available
                    prompt = `Question: "${pureQuestion}"
Cards: ${selectedCards.map((c) => c.meaning).join(", ")}

From this information, provide a concise interpretation of the cards that directly addresses the user's question. If the interpretation is harm user's feeling, tone it down to be more positive and uplifting. Answer it as paragraph. No more than 100 words.`
                }
            } else {
                // Regular interpretation
                prompt = `Question: "${question}"
Cards: ${selectedCards.map((c) => c.meaning).join(", ")}

From this information, provide a concise interpretation of the cards that directly addresses the user's question. If the interpretation is harm user's feeling, tone it down to be more positive and uplifting. Answer it as paragraph. No more than 100 words.

If the interpretation is too negative, tone it down to be more positive and uplifting.

If the interpretation is too positive, tone it down to be more realistic and down to earth.

If the interpretation is too vague, add more details to make it more specific.

If the interpretation is too long, shorten it to be more concise.

If the interpretation is too short, add more details to make it more specific.

If the interpretation is too generic, add more details to make it more specific.
`
            }

            await complete(prompt)
        },
        [complete, followUpData]
    )

    const shareImage = async () => {
        try {
            const res = await fetch("/api/share-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    cards: selectedCards.map((c) => c.meaning),
                    interpretation: interpretation ?? completion,
                    width: 1080,
                    height: 1350,
                }),
            })
            const blob = await res.blob()
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
            const filename = `reading-${timestamp}.png`
            const file = new File([blob], filename, { type: "image/png" })
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: "Asking Fate Reading",
                })
                return
            }
            // Fallback to download if files can't be shared
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error(e)
        }
    }

    const handleCopy = async () => {
        const textOnly = (interpretation ?? completion) || ""
        await navigator.clipboard.writeText(textOnly)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
    }

    const handleDownload = async () => {
        try {
            const res = await fetch("/api/share-image", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    question,
                    cards: selectedCards.map((c) => c.meaning),
                    interpretation: interpretation ?? completion,
                    width: 1080,
                    height: 1350,
                }),
            })
            const blob = await res.blob()
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
            const filename = `reading-${timestamp}.png`
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error(e)
        }
    }

    const handleRegenerate = () => {
        if (isLoading) return
        setFinish(false)
        setInterpretation(null)
        hasInitiated.current = false
    }

    const shareButtons = [
        {
            id: "share",
            Icon: FaShareNodes,
            label: "Share",
            className:
                "border-white/20 text-white bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 hover:from-indigo-500/30 hover:via-purple-500/30 hover:to-cyan-500/30",
            onClick: shareImage,
        },
        {
            id: "copy",
            Icon: copied ? FaCheck : FaCopy,
            label: copied ? "Copied" : "Copy",
            className:
                "border-white/20 text-white bg-white/10 hover:bg-white/20",
            onClick: handleCopy,
        },
        {
            id: "download",
            Icon: FaDownload,
            label: "Download",
            className:
                "border-cyan-400/30 text-white bg-cyan-400/15 hover:bg-cyan-400/25",
            onClick: handleDownload,
        },
    ]

    const hasInitiated = useRef(false)
    useEffect(() => {
        // Auto-submit when we have question and cards, but only once
        if (
            question &&
            selectedCards.length > 0 &&
            !interpretation &&
            !hasInitiated.current
        ) {
            getInterpretation(question, selectedCards)
            hasInitiated.current = true
        }
    }, [question, selectedCards, interpretation, getInterpretation])

    // Effect to capture follow-up data when a follow-up question is detected
    useEffect(() => {
        if (question && question.startsWith("[Follow up question]:")) {
            // This is a follow-up question, we need to capture the previous reading data
            const STORAGE_KEY = "reading-state-v1"
            try {
                const raw = localStorage.getItem(STORAGE_KEY + "-backup")
                if (raw) {
                    const data = JSON.parse(raw)
                    setFollowUpData({
                        lastQuestion: data.question || "",
                        lastCards: data.selectedCards || [],
                        lastInterpretation: data.interpretation || "",
                        pureQuestion: question
                            .replace("[Follow up question]:", "")
                            .trim(),
                    })
                    // Clean up the backup data after using it
                    localStorage.removeItem(STORAGE_KEY + "-backup")
                }
            } catch (e) {
                console.error("Failed to load follow-up data:", e)
            }
            // Reset the hasInitiated flag for follow-up questions
            hasInitiated.current = false
        }
    }, [question])

    return (
        <>
            {currentStep === "interpretation" && (
                <div className='space-y-8'>
                    {/* Header */}
                    <Card className='px-6 pt-10 pb-6 border-0 relative overflow-hidden'>
                        {/* Background card images with aura */}
                        <div className='absolute inset-0 pointer-events-none'>
                            {selectedCards.map((card, index) => {
                                const positions = [
                                    {
                                        top: "10%",
                                        left: "5%",
                                        transform: "rotate(-15deg)",
                                    },
                                    {
                                        top: "15%",
                                        right: "8%",
                                        transform: "rotate(20deg)",
                                    },
                                    {
                                        bottom: "20%",
                                        left: "10%",
                                        transform: "rotate(-10deg)",
                                    },
                                    {
                                        bottom: "15%",
                                        right: "12%",
                                        transform: "rotate(25deg)",
                                    },
                                    {
                                        top: "50%",
                                        left: "2%",
                                        transform: "rotate(-5deg)",
                                    },
                                    {
                                        top: "60%",
                                        right: "5%",
                                        transform: "rotate(15deg)",
                                    },
                                ]
                                const position =
                                    positions[index % positions.length]

                                return (
                                    <div
                                        key={`bg-${index}`}
                                        className='absolute opacity-20'
                                        style={position}
                                    >
                                        <CardImage
                                            card={card}
                                            size='sm'
                                            showAura={true}
                                            showLabel={false}
                                            className='scale-75'
                                        />
                                    </div>
                                )
                            })}
                        </div>

                        <div className='text-center space-y-6 relative z-10'>
                            <div className='flex items-center justify-center space-x-2'>
                                <Sparkles className='w-6 h-6 text-primary' />
                                <h1 className='font-serif font-bold text-2xl'>
                                    Your Cosmic Interpretation
                                </h1>
                                <Sparkles className='w-6 h-6 text-primary' />
                            </div>
                            {isFollowUpQuestion(question) && (
                                <Badge
                                    variant='secondary'
                                    className='bg-primary/20 text-primary border-primary/30'
                                >
                                    Follow up
                                </Badge>
                            )}
                            <p className='text-muted-foreground italic'>
                                &ldquo;{getCleanQuestionText(question)}&rdquo;
                            </p>

                            {/* Card Images with Badges on Top */}
                            <div className='flex flex-wrap gap-6 justify-center'>
                                {selectedCards.map((card, index) => (
                                    <div
                                        key={index}
                                        className='flex flex-col items-center gap-3'
                                    >
                                        {/* Badge on top */}
                                        <Badge
                                            variant='secondary'
                                            className='bg-secondary/20 text-secondary border-secondary/30'
                                        >
                                            {card.meaning}
                                        </Badge>

                                        {/* Card Image */}
                                        <CardImage
                                            card={card}
                                            size='md'
                                            showAura={true}
                                            showLabel={false}
                                            className='hover:scale-105 transition-transform duration-200'
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* AI Interpretation */}
                    <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20 card-glow'>
                        <div className='space-y-6'>
                            <div className='flex items-center space-x-3'>
                                <div className='w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center'>
                                    <Sparkles className='w-5 h-5 text-primary' />
                                </div>
                                <div>
                                    <h2 className='font-serif font-semibold text-xl'>
                                        Cosmic Guidance
                                    </h2>
                                    <p className='text-sm text-muted-foreground'>
                                        Generated by AI with ancient wisdom
                                    </p>
                                </div>
                            </div>
                            <div className='prose prose-invert max-w-none'>
                                {error ? (
                                    <div className='text-center space-y-4'>
                                        <p className='text-destructive'>
                                            Failed to generate interpretation.
                                            Please try again.
                                        </p>
                                    </div>
                                ) : isLoading ? (
                                    <div className='text-center space-y-6 py-8'>
                                        <div className='flex items-center justify-center space-x-3'>
                                            <Loader2 className='w-6 h-6 text-primary animate-spin' />
                                            <span className='text-muted-foreground'>
                                                Consulting the cosmic realm...
                                            </span>
                                        </div>
                                        <div className='space-y-2'>
                                            <div className='flex justify-center space-x-1'>
                                                <div
                                                    className='w-2 h-2 bg-primary rounded-full animate-bounce'
                                                    style={{
                                                        animationDelay: "0ms",
                                                    }}
                                                ></div>
                                                <div
                                                    className='w-2 h-2 bg-primary rounded-full animate-bounce'
                                                    style={{
                                                        animationDelay: "150ms",
                                                    }}
                                                ></div>
                                                <div
                                                    className='w-2 h-2 bg-primary rounded-full animate-bounce'
                                                    style={{
                                                        animationDelay: "300ms",
                                                    }}
                                                ></div>
                                            </div>
                                            <p className='text-sm text-muted-foreground'>
                                                The cards are revealing their
                                                secrets...
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Interpretation */}
                                        <div className='text-foreground leading-relaxed whitespace-pre-wrap mb-4'>
                                            {interpretation ?? completion}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>

                    {(interpretation || finish || error) && (
                        <>
                            {/* Sharing - only show when not error */}
                            {!error && (
                                <div className='flex flex-wrap items-center justify-center gap-3'>
                                    {shareButtons.map(
                                        ({
                                            id,
                                            Icon,
                                            className,
                                            onClick,
                                            label,
                                        }) => (
                                            <Button
                                                key={id}
                                                type='button'
                                                onClick={onClick}
                                                className={`relative group h-11 px-4 rounded-full border backdrop-blur-md shadow-[0_10px_20px_-10px_rgba(56,189,248,0.35)] transition-all ${className}`}
                                            >
                                                <span className='pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-white/10 blur-[1.5px] transition-opacity'></span>
                                                <span className='relative z-10 flex items-center gap-2'>
                                                    <Icon className='w-4 h-4' />
                                                    <span className='text-sm font-medium'>
                                                        {label}
                                                    </span>
                                                </span>
                                            </Button>
                                        )
                                    )}
                                </div>
                            )}

                            {/* Action buttons - show when error, finished, or has interpretation (not while loading) */}
                            {(error || finish || interpretation) && (
                                <div className='flex flex-wrap items-center justify-center gap-3'>
                                    <Button
                                        type='button'
                                        onClick={handleRegenerate}
                                        disabled={isLoading}
                                        size='lg'
                                        className='bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/30 text-white px-8 rounded-full shadow-sm'
                                    >
                                        <RefreshCcw className='w-4 h-4 mr-2' />
                                        Regenerate Reading
                                    </Button>
                                    <Button
                                        type='button'
                                        onClick={() => router.push("/")}
                                        size='lg'
                                        className='bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/30 text-white px-8 rounded-full shadow-sm'
                                    >
                                        <Stars className='w-4 h-4 mr-2' />
                                        New Reading
                                    </Button>
                                </div>
                            )}

                            {/* Follow-up question - only show when not error */}
                            {!error && (
                                <div className='border-t border-border/20 pt-4'>
                                    <QuestionInput
                                        followUp={true}
                                        id='follow-up-question'
                                        label='Ask a follow up question'
                                        placeholder='Type your follow up question here...'
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Disclaimer */}
                    <Card className='p-4 bg-card/5 backdrop-blur-sm border-border/10'>
                        <p className='text-xs text-muted-foreground text-center'>
                            This interpretation is generated by AI for
                            entertainment and guidance purposes. Trust your
                            intuition and use this reading as one perspective on
                            your journey.
                        </p>
                    </Card>
                </div>
            )}
        </>
    )
}
