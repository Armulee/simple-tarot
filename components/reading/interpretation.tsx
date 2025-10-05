"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, RefreshCcw, Loader2, Stars, Star } from "lucide-react"
import { FaShareNodes, FaCopy, FaDownload, FaCheck } from "react-icons/fa6"
import { useEffect, useRef, useState, useCallback } from "react"
import { useCompletion } from "@ai-sdk/react"
import { useTarot } from "@/contexts/tarot-context"
import { useRouter } from "next/navigation"
import QuestionInput from "../question-input"
import { CardImage } from "../card-image"
import { getCleanQuestionText } from "@/lib/question-utils"
import { useTranslations } from "next-intl"
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

export default function Interpretation() {
    const t = useTranslations("ReadingPage.interpretation")
    const router = useRouter()
    const [finish, setFinish] = useState(false)
    const [copied, setCopied] = useState(false)
    const [isFollowUpMode, setIsFollowUpMode] = useState(false)

    const [insufficientStars, setInsufficientStars] = useState(false)
    const [showNoStarsDialog, setShowNoStarsDialog] = useState(false)

    const {
        currentStep,
        question,
        selectedCards,
        interpretation,
        setInterpretation,
        isFollowUp,
        followUpQuestion,
        paidForInterpretation,
        setPaidForInterpretation,
    } = useTarot()
    const { completion, isLoading, error, complete } = useCompletion({
        // api: "/api/interpret-cards/mockup",
        api: "/api/interpret-cards/question",
        onFinish: (_, completion) => {
            setFinish(true)
            setInterpretation(completion)
            // Last run finished successfully
            lastRunHadErrorRef.current = false
        },
    })

    const { spendStars, stars } = useStars()

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
        // If previous run errored, don't charge next run
        if (!error) {
            // Will cost 1 star; block if none
            if (
                !paidForInterpretation &&
                (!Number.isFinite(stars as number) || (stars as number) < 1)
            ) {
                setShowNoStarsDialog(true)
                return
            }
        }

        setFinish(false)
        setInterpretation(null)
        hasInitiated.current = false
        chargedThisRunRef.current = false
        setInsufficientStars(false)
        if (error) {
            waiveChargeOnceRef.current = true
        } else {
            setPaidForInterpretation(false)
        }
    }

    const shareButtons = [
        {
            id: "share",
            Icon: FaShareNodes,
            label: t("actions.share"),
            className:
                "border-white/20 text-white bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 hover:from-indigo-500/30 hover:via-purple-500/30 hover:to-cyan-500/30",
            onClick: shareImage,
        },
        {
            id: "copy",
            Icon: copied ? FaCheck : FaCopy,
            label: copied ? t("actions.copied") : t("actions.copy"),
            className:
                "border-white/20 text-white bg-white/10 hover:bg-white/20",
            onClick: handleCopy,
        },
        {
            id: "download",
            Icon: FaDownload,
            label: t("actions.download"),
            className:
                "border-cyan-400/30 text-white bg-cyan-400/15 hover:bg-cyan-400/25",
            onClick: handleDownload,
        },
    ]

    const hasInitiated = useRef(false)
    const lastRunHadErrorRef = useRef(false)
    const waiveChargeOnceRef = useRef(false)
    const chargedThisRunRef = useRef(false)

    // No localStorage usage

    const getInterpretationAsync = useCallback(async (): Promise<string> => {
        const currentQuestion =
            isFollowUp && followUpQuestion ? followUpQuestion : question

        if (!currentQuestion || selectedCards.length === 0) {
            throw new Error("Missing question or cards")
        }

        // Charge 1 star once per run (skip if previously paid or waived due to prior error)
        if (!chargedThisRunRef.current && !paidForInterpretation) {
            if (waiveChargeOnceRef.current) {
                // Waive once after an error-triggered regenerate
                chargedThisRunRef.current = true
                waiveChargeOnceRef.current = false
            } else {
                const ok = spendStars(1)
                if (!ok) {
                    setInsufficientStars(true)
                    throw new Error("INSUFFICIENT_STARS")
                }
                chargedThisRunRef.current = true
                setPaidForInterpretation(true)
            }
        }

        const prompt = `Question: "${currentQuestion}"
Cards: ${selectedCards.map((c) => c.meaning).join(", ")}

From this information, provide a concise interpretation of the cards that directly addresses the user's question. If the interpretation is harm user's feeling, tone it down to be more positive and uplifting. Answer it as paragraph. No more than 100 words.

If the interpretation is too negative, tone it down to be more positive and uplifting.
If the interpretation is too positive, tone it down to be more realistic and down to earth.
If the interpretation is too vague, add more details to make it more specific.
If the interpretation is too long, shorten it to be more concise.
If the interpretation is too short, add more details to make it more specific.
If the interpretation is too generic, add more details to make it more specific.`

        const result = await complete(prompt)

        setInterpretation(result || "")
        return result || ""
    }, [
        complete,
        isFollowUp,
        followUpQuestion,
        question,
        selectedCards,
        setInterpretation,
        spendStars,
        paidForInterpretation,
        setPaidForInterpretation,
    ])

    useEffect(() => {
        if (currentStep === "interpretation" && !hasInitiated.current) {
            // Don't fetch if interpretation already exists (e.g., from localStorage)
            if (interpretation) {
                hasInitiated.current = true
                return
            }

            hasInitiated.current = true
            // Reset charge gate for a brand-new interpretation run
            chargedThisRunRef.current = false

            if (
                !paidForInterpretation &&
                !waiveChargeOnceRef.current &&
                (!Number.isFinite(stars as number) || (stars as number) < 1)
            ) {
                setInsufficientStars(true)
                return
            }
            getInterpretationAsync()
                .then((value) => {
                    setInterpretation(value)
                })
                .catch(() => {})
        }
    }, [
        currentStep,
        getInterpretationAsync,
        setInterpretation,
        stars,
        paidForInterpretation,
        interpretation,
    ])

    // Reset component state for follow-up interpretations
    useEffect(() => {
        if (isFollowUp && followUpQuestion) {
            // Reset all component states for follow-up
            hasInitiated.current = false
            setIsFollowUpMode(true)
            // Ensure next interpretation charges a star
            chargedThisRunRef.current = false
        } else if (!isFollowUp && hasInitiated.current) {
            // Reset follow-up mode when not in follow-up
            setIsFollowUpMode(false)
        }
    }, [isFollowUp, followUpQuestion])

    // Reset follow-up mode when we have a new interpretation
    useEffect(() => {
        if (interpretation && isFollowUpMode) {
            setIsFollowUpMode(false)
        }
    }, [interpretation, isFollowUpMode])

    return (
        <>
            {currentStep === "interpretation" && (
                <div className='space-y-8'>
                    <AlertDialog open={showNoStarsDialog}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    No stars left
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    You don’t have enough stars to regenerate.
                                    Please wait for refill or purchase more
                                    stars.
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
                    {insufficientStars && (
                        <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                            <div className='text-center space-y-3'>
                                <div className='flex items-center justify-center gap-2'>
                                    <Stars className='w-5 h-5 text-yellow-300' />
                                    <h2 className='font-serif font-semibold text-lg'>
                                        Not enough stars
                                    </h2>
                                </div>
                                <p className='text-sm text-muted-foreground'>
                                    You need 1 star to get an interpretation.
                                    Current balance: {stars}.
                                </p>
                                <div className='flex items-center justify-center gap-3'>
                                    <Button
                                        type='button'
                                        onClick={() => router.push("/")}
                                    >
                                        Back to Home
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}

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
                            <div className='flex items-center justify-center space-x-2 relative'>
                                <Sparkles className='w-6 h-6 text-primary' />
                                <h1 className='font-serif font-bold text-2xl relative'>
                                    {isFollowUp && (
                                        <Badge
                                            variant='secondary'
                                            className='absolute -top-6 -left-8 -rotate-12 bg-accent/20 text-white border-white/30'
                                        >
                                            {t("followUp.badge")}
                                        </Badge>
                                    )}
                                    {t("title")}
                                </h1>
                                <Sparkles className='w-6 h-6 text-primary' />
                            </div>
                            <div className='flex items-center justify-center gap-2 text-xs text-yellow-300'>
                                <Stars className='w-3.5 h-3.5' />
                                <span>
                                    Consuming 1 star to reveal this
                                    interpretation.
                                </span>
                            </div>
                            <p className='text-muted-foreground italic'>
                                &ldquo;
                                {getCleanQuestionText(
                                    isFollowUp && followUpQuestion
                                        ? followUpQuestion
                                        : question || ""
                                )}
                                &rdquo;
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
                                            className='bg-accent/20 text-accent border-accent/30'
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
                                        {t("sectionTitle")}
                                    </h2>
                                    <p className='text-sm text-muted-foreground'>
                                        {t("sectionSubtitle")}
                                    </p>
                                </div>
                            </div>
                            <div className='prose prose-invert max-w-none'>
                                {insufficientStars ? (
                                    <div className='text-center space-y-6 py-8'>
                                        <div className='flex items-center justify-center space-x-3'>
                                            <Stars className='w-6 h-6 text-yellow-300' />
                                            <span className='text-muted-foreground'>
                                                You need 1 star to view an
                                                interpretation.
                                            </span>
                                        </div>
                                    </div>
                                ) : error ? (
                                    <div className='text-center space-y-4'>
                                        <p className='text-destructive'>
                                            {t("error")}
                                        </p>
                                    </div>
                                ) : isLoading ? (
                                    <div className='text-center space-y-6 py-8'>
                                        <div className='flex items-center justify-center space-x-3'>
                                            <Loader2 className='w-6 h-6 text-primary animate-spin' />
                                            <span className='text-muted-foreground'>
                                                {t("loading.title")}
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
                                                {t("loading.subtitle")}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Interpretation */}
                                        <div className='text-foreground leading-relaxed whitespace-pre-wrap mb-4'>
                                            {interpretation ??
                                                (isFollowUpMode
                                                    ? ""
                                                    : completion)}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Show action buttons and sharing when interpretation is complete or there's an error */}
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
                            <div className='flex flex-wrap items-center justify-center gap-3'>
                                <Button
                                    type='button'
                                    onClick={handleRegenerate}
                                    disabled={isLoading}
                                    size='lg'
                                    className='bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/30 text-white px-8 rounded-full shadow-sm'
                                >
                                    <RefreshCcw className='w-4 h-4 mr-2' />
                                    {t("buttons.regenerate")}{" "}
                                    {!error && (
                                        <span className='ml-1 text-xs text-yellow-300 font-semibold inline-flex items-center gap-1'>
                                            (
                                            <Star
                                                className='w-3.5 h-3.5'
                                                fill='currentColor'
                                            />
                                            1)
                                        </span>
                                    )}
                                </Button>
                                <Button
                                    type='button'
                                    onClick={() => router.push("/")}
                                    size='lg'
                                    className='bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/30 text-white px-8 rounded-full shadow-sm'
                                >
                                    <Stars className='w-4 h-4 mr-2' />
                                    {t("buttons.newReading")}
                                </Button>
                            </div>

                            {/* Follow-up question - only show when not error */}
                            {!error && (
                                <div className='border-t border-border/20 pt-4'>
                                    <QuestionInput
                                        followUp={true}
                                        id='follow-up-question'
                                        label={t("followUp.label")}
                                        placeholder={t("followUp.placeholder")}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Disclaimer */}
                    <Card className='p-4 bg-card/5 backdrop-blur-sm border-border/10'>
                        <p className='text-xs text-muted-foreground text-center'>
                            {t("disclaimer")}
                        </p>
                    </Card>
                </div>
            )}
        </>
    )
}
