"use client"

import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { useCompletion } from "@ai-sdk/react"
import QuestionInput from "../../question-input"
import { useTranslations } from "next-intl"
import { useAuth } from "@/hooks/use-auth"
import { useTarot } from "@/contexts/tarot-context"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import ShareSection from "./share"
import ActionSection from "./action"
//
import BrandLoader from "@/components/brand-loader"
import HardStarConsent from "@/components/hard-star-consent"

type ReadingProps = {
    readingId?: string
    question?: string
    cards?: string[]
    initialInterpretation?: string | null
    ownerDid?: string | null
    ownerUserId?: string | null
    isLargeScreen?: boolean
    onInterpretationChange?: (text: string | null) => void
}

export default function Interpretation({
    readingId,
    question,
    cards,
    initialInterpretation,
    ownerDid,
    ownerUserId,
    isLargeScreen = false,
    onInterpretationChange,
}: ReadingProps) {
    const t = useTranslations("ReadingPage.interpretation")
    const { user } = useAuth()
    const {
        isFollowUp,
        setInterpretation: setContextInterpretation,
        setQuestion: setContextQuestion,
    } = useTarot()
    const [interpretation, setInterpretationState] = useState<string | null>(
        initialInterpretation ?? null
    )
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        if (typeof onInterpretationChange === "function") {
            const normalized =
                interpretation && interpretation.trim().length > 0
                    ? interpretation
                    : null
            onInterpretationChange(normalized)
        }
    }, [interpretation, onInterpretationChange])
    const [error, setError] = useState<string | null>(null)
    const [showNoStarsDialog, setShowNoStarsDialog] = useState(false)
    const [isAuthLoading, setIsAuthLoading] = useState(true)
    const [showDIDConsent, setShowDIDConsent] = useState(false)
    const [, setHasDID] = useState<boolean | null>(null)
    const [hasAwardedStars, setHasAwardedStars] = useState(false)
    const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false)

    const { completion, complete } = useCompletion({
        api: "/api/interpret-cards/question",
        onFinish: async (_, completion) => {
            setInterpretationState(completion)
            setIsGenerating(false)
            try {
                const saveKey =
                    typeof window !== "undefined"
                        ? `reading:${readingId}:saved`
                        : null
                if (saveKey && sessionStorage.getItem(saveKey)) {
                } else {
                    if (saveKey) sessionStorage.setItem(saveKey, "1")
                    await fetch("/api/tarot/update", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            id: readingId,
                            interpretation: completion,
                        }),
                    })
                }
            } catch {}
        },
        onError: (e) => {
            setError(e.message)
            setIsGenerating(false)
            try {
                const genKey =
                    typeof window !== "undefined"
                        ? `reading:${readingId}:gen`
                        : null
                if (genKey) sessionStorage.removeItem(genKey)
            } catch {}
        },
    })

    useEffect(() => {
        if (typeof question === "string") {
            setContextQuestion(question)
        }
    }, [question, setContextQuestion])

    useEffect(() => {
        const normalizedCurrent =
            typeof interpretation === "string" &&
            interpretation.trim().length > 0
                ? interpretation
                : null
        const normalizedInitial =
            typeof initialInterpretation === "string" &&
            initialInterpretation.trim().length > 0
                ? initialInterpretation
                : null
        setContextInterpretation(normalizedCurrent ?? normalizedInitial ?? null)
    }, [interpretation, initialInterpretation, setContextInterpretation])

    useEffect(() => {
        const checkOwnership = async () => {
            try {
                const resp = await fetch("/api/did")
                const data = await resp.json()
                const did = data.did
                if (!did) {
                    setHasDID(false)
                    setShowDIDConsent(true)
                    setIsAuthLoading(false)
                    return
                }
                setHasDID(true)
            } catch {
                setHasDID(false)
                setShowDIDConsent(true)
            } finally {
                setIsAuthLoading(false)
            }
        }
        checkOwnership()
    }, [ownerDid, ownerUserId, user?.id])

    const awardStarsToOwner = useCallback(async () => {
        const awardKey =
            typeof window !== "undefined"
                ? `reading:${readingId}:awarded`
                : null
        if (hasAwardedStars) return
        if (awardKey && sessionStorage.getItem(awardKey)) return
        try {
            const response = await fetch("/api/stars/share-award", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user?.id || null,
                    owner_user_id: ownerUserId,
                    owner_did: ownerDid,
                    shared_id: readingId,
                }),
            })
            if (response.ok) {
                setHasAwardedStars(true)
                if (awardKey) sessionStorage.setItem(awardKey, "1")
            }
        } catch {}
    }, [ownerUserId, ownerDid, readingId, hasAwardedStars, user?.id])

    const handleDIDConsentAccept = () => {
        setShowDIDConsent(false)
        setHasDID(true)
        try {
            if (interpretation && !hasAwardedStars) void awardStarsToOwner()
        } catch {}
    }

    useEffect(() => {
        if (
            !interpretation &&
            !isGenerating &&
            !error &&
            !hasAttemptedGeneration
        ) {
            const genKey =
                typeof window !== "undefined"
                    ? `reading:${readingId}:gen`
                    : null
            if (genKey && sessionStorage.getItem(genKey)) return
            if (genKey) sessionStorage.setItem(genKey, "1")
            setHasAttemptedGeneration(true)

            setIsGenerating(true)
            setError(null)
            const cardNames = (cards ?? []).join(", ")

            // Try to include context from the previous reading when this is a follow-up
            let previousQuestion: string | null = null
            let previousInterpretation: string | null = null
            try {
                if (typeof window !== "undefined") {
                    const rawBackup = localStorage.getItem(
                        "reading-state-v1-backup"
                    )
                    if (rawBackup) {
                        const backup = JSON.parse(rawBackup) as {
                            question?: string
                            interpretation?: string
                        }
                        previousQuestion =
                            (backup?.question || "").trim() || null
                        previousInterpretation =
                            (backup?.interpretation || "").trim() || null
                    }
                }
            } catch {}

            const hasFollowUpContext =
                isFollowUp &&
                !!previousQuestion &&
                !!previousInterpretation &&
                previousQuestion !== (question ?? "")

            const prompt = hasFollowUpContext
                ? `Main question: "${previousQuestion}"

Previous interpretation:
${previousInterpretation}

Follow-up question: "${question ?? ""}"

Cards: ${cardNames}

Goal: Provide a direct, human-like answer to the follow-up.

Instructions:
1) Answer the specific follow-up question directly.
2) Sound like a real person (conversational, warm).
3) Double-check that the answer is readable and not robotic.

Output:
- 3 keywords (comma-separated).
- One paragraph, approx. 120 words.
- Natural and grounded.

Format:
Keywords
[Empty Line]
Answer`
                : `Question: "${question ?? ""}"

Cards: ${cardNames}

Goal: Provide a direct, human-like answer to the question with keywords.

Instructions:
1) Check the question type (Timing, Outcome, etc.) and answer it explicitly.
2) Ensure the response sounds like a real person talking, not an AI.
3) Verify the text is readable and directly addresses the specific concern.
4) Provide 3 keywords summarizing the answer at the top.

Output:
- 3 keywords (comma-separated).
- Natural, conversational tone.
- One paragraph, approx. 120 words.
- Direct and specific.

Format:
Keywords
[Empty Line]
Answer`
            complete(prompt).catch((e) => {
                setError(e.message)
                setIsGenerating(false)
                try {
                    const k =
                        typeof window !== "undefined"
                            ? `reading:${readingId}:gen`
                            : null
                    if (k) sessionStorage.removeItem(k)
                } catch {}
            })
        }
    }, [
        interpretation,
        isGenerating,
        error,
        hasAttemptedGeneration,
        cards,
        question,
        complete,
        readingId,
        isFollowUp,
    ])

    useEffect(() => {
        if (interpretation) void awardStarsToOwner()
    }, [interpretation, awardStarsToOwner])

    useEffect(() => {
        if (hasAwardedStars) {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("earned-stars-updated"))
            }
        }
    }, [hasAwardedStars])

    if (isAuthLoading) {
        return <BrandLoader label='Loading your reading...' />
    }

    return (
        <>
            <AlertDialog open={showNoStarsDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>No stars left</AlertDialogTitle>
                        <AlertDialogDescription>
                            You don’t have enough stars to view this
                            interpretation. Please wait for refill or purchase
                            more stars.
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
                            {/* Removed star consumption note */}
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
                                    onClick={() => {
                                        setIsGenerating(true)
                                        setError(null)
                                        setHasAttemptedGeneration(false)
                                    }}
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
                                {(() => {
                                    const text = interpretation || completion || ""
                                    // Split by double newline to find keywords
                                    const parts = text.split(/\n\n/)
                                    if (parts.length > 1) {
                                        const keywords = parts[0]
                                        const content = parts.slice(1).join("\n\n")
                                        return (
                                            <>
                                                <div className='flex flex-wrap gap-2 mb-4'>
                                                    {keywords
                                                        .split(",")
                                                        .map((k, i) => (
                                                            <span
                                                                key={i}
                                                                className='px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20'
                                                            >
                                                                {k.trim()}
                                                            </span>
                                                        ))}
                                                </div>
                                                {content}
                                            </>
                                        )
                                    }
                                    return text
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {!isLargeScreen && interpretation && !error && (
                <div className='w-full max-w-4xl space-y-6'>
                    <ActionSection
                        question={question || ""}
                        cards={cards || []}
                        interpretation={interpretation}
                        readingId={readingId!}
                        onInterpretationChange={(text) =>
                            setInterpretationState(text)
                        }
                        onGeneratingChange={(loading) =>
                            setIsGenerating(loading)
                        }
                    />
                    <ShareSection
                        question={question || ""}
                        cards={cards || []}
                        interpretation={interpretation}
                        readingId={readingId!}
                    />
                    <div className='border-t border-border/50 pt-4 flex justify-center'>
                        <div className='w-full max-w-2xl'>
                            <QuestionInput
                                followUp={true}
                                id='follow-up-question'
                                label={t("followUp.label")}
                                placeholder={t("followUp.placeholder")}
                                followUpParentId={readingId}
                            />
                        </div>
                    </div>
                </div>
            )}

            <HardStarConsent
                open={showDIDConsent}
                onAccept={handleDIDConsentAccept}
            />
        </>
    )
}
