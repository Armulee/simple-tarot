"use client"

import { Card } from "@/components/ui/card"
import { Sparkles, Stars } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import HardStarConsent from "@/components/hard-star-consent"

type ReadingProps = {
    readingId?: string
    question?: string
    cards?: string[]
    initialInterpretation?: string | null
    ownerDid?: string | null
    ownerUserId?: string | null
}

export default function Interpretation({
    readingId,
    question,
    cards,
    initialInterpretation,
    ownerDid,
    ownerUserId,
}: ReadingProps) {
    const t = useTranslations("ReadingPage.interpretation")
    const tPage = useTranslations("ReadingPage")
    const { user } = useAuth()
    const { isFollowUp } = useTarot()
    const [interpretation, setInterpretation] = useState<string | null>(
        initialInterpretation ?? null
    )
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showNoStarsDialog, setShowNoStarsDialog] = useState(false)
    const [isOwner, setIsOwner] = useState(false)
    const [isAuthLoading, setIsAuthLoading] = useState(true)
    const [showDIDConsent, setShowDIDConsent] = useState(false)
    const [, setHasDID] = useState<boolean | null>(null)
    const [hasAwardedStars, setHasAwardedStars] = useState(false)
    const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false)

    const { completion, complete } = useCompletion({
        api: "/api/interpret-cards/question",
        onFinish: async (_, completion) => {
            setInterpretation(completion)
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
                const isOwnerByDid = did && ownerDid && did === ownerDid
                const isOwnerByUserId =
                    user?.id && ownerUserId && user.id === ownerUserId
                setIsOwner(!!(isOwnerByDid || isOwnerByUserId))
            } catch {
                setIsOwner(false)
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
        const isOwnerByUserId =
            user?.id && ownerUserId && user.id === ownerUserId
        setIsOwner(!!isOwnerByUserId)
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
                        previousQuestion = (backup?.question || "").trim() || null
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

Goal: Provide a concise follow-up interpretation that directly answers the follow-up while staying consistent with the previous interpretation.

Guidance:
- Build on the earlier reading; reference it briefly (do not repeat it).
- If the follow-up shifts focus, explain the link in a short phrase, then answer directly.
- Do not fetch or cite external sources. Use only the provided card names (and reversed markers) as context.

Output:
- One short paragraph, <= 100 words.
- Clear, grounded. Mention cards only if essential.`
                : `Question: "${question ?? ""}"

Cards: ${cardNames}

Goal: Provide a concise interpretation that directly answers the question.

Silent steps (do not reveal):
1) Classify the question intent into: love/relationships, work/career, finances, health/wellbeing, personal growth, spiritual, or general.
2) Map the listed cards to that intent and emphasize the most relevant angles.
3) Do not fetch or cite external sources. Use only the provided card names (and reversed markers) as context.

Output:
- One short paragraph, <= 100 words.
- Clear, grounded. Mention cards only if essential.`
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
                        <div className='flex items-center gap-2 flex-wrap'>
                            <h2
                                className='font-serif font-semibold text-xl animate-fade-up relative'
                                style={{
                                    animationDelay: "0ms",
                                    animationDuration: "300ms",
                                    animationFillMode: "both",
                                }}
                            >
                                {isFollowUp && (
                                    <Badge
                                        variant='secondary'
                                        className='absolute -top-6 -left-8 -rotate-12 bg-primary/20 text-white border-white/30'
                                    >
                                        {tPage("followUp.badge")}
                                    </Badge>
                                )}
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
                            {isOwner && !error && (
                                <div className='flex items-center justify-center gap-2 text-xs text-yellow-300 mt-2'>
                                    <Stars className='w-3.5 h-3.5' />
                                    <span>
                                        Consuming 1 star to reveal this
                                        interpretation.
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
                                {interpretation || completion}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {interpretation && !error && (
                <div className='w-full max-w-4xl space-y-6'>
                    <ActionSection
                        question={question || ""}
                        cards={cards || []}
                        interpretation={interpretation}
                        readingId={readingId!}
                        onInterpretationChange={(text) =>
                            setInterpretation(text)
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
                    <div className='border-t border-border/50 pt-4'>
                        <QuestionInput
                            followUp={true}
                            id='follow-up-question'
                            label={t("followUp.label")}
                            placeholder={t("followUp.placeholder")}
                        />
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
