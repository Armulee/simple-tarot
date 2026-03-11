"use client"

import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import {
    tarotInterpretationSchema,
    type TarotInterpretation,
} from "@/lib/tarot/schema"

type PartialTarotInterpretation = Partial<TarotInterpretation>
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
import NoStarsUpsell from "@/components/stars/no-stars-upsell"

import { supabase } from "@/lib/supabase"

type ReadingProps = {
    readingId?: string
    question?: string
    cards?: string[]
    initialInterpretation?: string | null
    ownerDid?: string | null
    ownerUserId?: string | null
    isLargeScreen?: boolean
    readingType?: string | null
    onInterpretationChange?: (text: string | null) => void
    onInterpretationFieldDone?: (done: boolean) => void
    /** Streaming object from sibling ActionSection (e.g. reading-layout regenerate) */
    streamingObject?: PartialTarotInterpretation | null
}

export default function Interpretation({
    readingId,
    question,
    cards,
    initialInterpretation,
    ownerDid,
    ownerUserId,
    isLargeScreen = false,
    readingType: propReadingType,
    onInterpretationChange,
    onInterpretationFieldDone,
    streamingObject: streamingObjectProp,
}: ReadingProps) {
    const t = useTranslations("ReadingPage.interpretation")
    const { user, session } = useAuth()
    const {
        isFollowUp,
        setInterpretation: setContextInterpretation,
        setCardInsights: setContextCardInsights,
        setQuestion: setContextQuestion,
        readingType,
    } = useTarot()

    // --- State Declarations ---
    const [interpretation, setInterpretationState] = useState<string | null>(
        initialInterpretation ?? null,
    )
    const [isGenerating, setIsGenerating] = useState(false)
    const [streamingObjectFromAction, setStreamingObjectFromAction] =
        useState<PartialTarotInterpretation | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showNoStarsDialog, setShowNoStarsDialog] = useState(false)
    const [isAuthLoading, setIsAuthLoading] = useState(true)
    const [showDIDConsent, setShowDIDConsent] = useState(false)
    const [, setHasDID] = useState<boolean | null>(null)
    const [hasAwardedStars, setHasAwardedStars] = useState(false)
    const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false)
    const [hasCheckedDB, setHasCheckedDB] = useState(false)

    // Sync local state with prop if prop changes (important for navigation/history)
    useEffect(() => {
        if (initialInterpretation && interpretation !== initialInterpretation) {
            setInterpretationState(initialInterpretation)
        }
    }, [initialInterpretation, interpretation])

    // Handle back navigation / stale cache: if interpretation is missing, check DB on client
    useEffect(() => {
        const checkInterpretation = async () => {
            if (
                !interpretation &&
                !isGenerating &&
                readingId &&
                !hasCheckedDB
            ) {
                setHasCheckedDB(true)
                try {
                    const { data, error } = await supabase
                        .from("tarot_readings")
                        .select("interpretation")
                        .eq("id", readingId)
                        .maybeSingle()

                    if (!error && data?.interpretation) {
                        setInterpretationState(data.interpretation)
                    }
                } catch (err) {
                    console.error("Error checking interpretation:", err)
                }
            }
        }

        if (
            readingId &&
            !initialInterpretation &&
            !interpretation &&
            !hasCheckedDB
        ) {
            checkInterpretation()
        }
    }, [
        interpretation,
        isGenerating,
        readingId,
        initialInterpretation,
        hasCheckedDB,
    ])

    const { object, submit } = useObject({
        api: "/api/interpret-cards/question",
        schema: tarotInterpretationSchema,
        onFinish: async ({
            object,
        }: {
            object: TarotInterpretation | undefined
        }) => {
            if (object) {
                try {
                    const mainText = `${object.keywords}\n\n${object.interpretation}`
                    setInterpretationState(mainText)
                    if (object.cardInsights) {
                        setContextCardInsights(object.cardInsights as string[])
                    }
                    setIsGenerating(false)

                    const saveKey =
                        typeof window !== "undefined"
                            ? `reading:${readingId}:saved`
                            : null
                    if (saveKey && sessionStorage.getItem(saveKey)) {
                    } else {
                        if (saveKey) sessionStorage.setItem(saveKey, "1")

                        const headers: Record<string, string> = {
                            "Content-Type": "application/json",
                        }
                        if (session?.access_token) {
                            headers["Authorization"] =
                                `Bearer ${session.access_token}`
                        }

                        await fetch("/api/tarot/update", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                id: readingId,
                                interpretation: mainText,
                            }),
                        })

                        await fetch("/api/tarot/versions", {
                            method: "POST",
                            headers,
                            body: JSON.stringify({
                                reading_id: readingId,
                                content: mainText,
                            }),
                        })
                    }
                } catch (err) {
                    console.error("Failed to process interpretation:", err)
                    setIsGenerating(false)
                }
            }
        },
        onError: (e: Error) => {
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

    const isInterpretationFieldDone =
        !!interpretation ||
        !!object?.conclusion ||
        !!streamingObjectProp?.conclusion ||
        !!streamingObjectFromAction?.conclusion

    useEffect(() => {
        onInterpretationFieldDone?.(isInterpretationFieldDone)
    }, [isInterpretationFieldDone, onInterpretationFieldDone])

    useEffect(() => {
        if (typeof onInterpretationChange === "function") {
            const normalized =
                interpretation && interpretation.trim().length > 0
                    ? interpretation
                    : null
            onInterpretationChange(normalized)
        }
    }, [interpretation, onInterpretationChange])

    // Sync card insights to context while streaming
    useEffect(() => {
        if (object?.cardInsights) {
            // Filter out null/undefined values and ensure it's a string array
            const insights = object.cardInsights.filter(
                (insight): insight is string => typeof insight === "string",
            )
            if (insights.length > 0) {
                setContextCardInsights(insights)
            }
        }
    }, [object?.cardInsights, setContextCardInsights])

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
            !hasAttemptedGeneration &&
            (hasCheckedDB || initialInterpretation)
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
            // Try to include context from the previous reading when this is a follow-up
            let previousQuestion: string | null = null
            let previousInterpretation: string | null = null
            try {
                if (typeof window !== "undefined") {
                    const rawBackup = localStorage.getItem(
                        "reading-state-v1-backup",
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

            const cardArray = (cards ?? []).map((c) =>
                typeof c === "string" ? c : String(c),
            )
            submit({
                question: question ?? "",
                cards: cardArray,
                readingType: propReadingType || readingType || null,
                isFollowUp,
                previousQuestion,
                previousInterpretation,
            })
        }
    }, [
        interpretation,
        isGenerating,
        error,
        hasAttemptedGeneration,
        cards,
        question,
        submit,
        readingId,
        isFollowUp,
        propReadingType,
        readingType,
        hasCheckedDB,
        initialInterpretation,
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
                <AlertDialogContent className='max-w-md w-[92vw] border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.35)]'>
                    <div className='pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-gradient-to-br from-yellow-300/25 via-yellow-500/15 to-transparent blur-3xl' />
                    <div className='pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-gradient-to-tl from-yellow-400/20 via-yellow-600/10 to-transparent blur-[100px]' />

                    <AlertDialogHeader className='space-y-1 text-center'>
                        <AlertDialogTitle className='text-yellow-200 font-serif text-xl'>
                            No stars left
                        </AlertDialogTitle>
                        <AlertDialogDescription className='text-white/80 text-sm leading-snug'>
                            You don’t have enough stars to view this
                            interpretation. Please wait for refill or purchase
                            more stars.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <NoStarsUpsell />
                    <AlertDialogFooter className='sm:justify-center'>
                        <AlertDialogAction
                            onClick={() => setShowNoStarsDialog(false)}
                            className='min-w-28'
                        >
                            Okay
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card className='bg-white/[0.03] backdrop-blur-sm rounded-2xl p-8 border border-white/5 group hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-300 overflow-hidden relative'>
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
                        ) : isGenerating &&
                          !interpretation &&
                          !object &&
                          !streamingObjectProp &&
                          !streamingObjectFromAction ? (
                            <div className='flex justify-center py-6 text-sm text-muted-foreground'>
                                Generating interpretation...
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
                                    // If we have a saved interpretation, display it
                                    if (interpretation) {
                                        const parts =
                                            interpretation.split("\n\n")
                                        const keywords = parts[0] || ""
                                        const content = parts
                                            .slice(1)
                                            .join("\n\n")

                                        return (
                                            <>
                                                {keywords && (
                                                    <div className='flex flex-wrap gap-2 mb-4'>
                                                        {keywords
                                                            .split(",")
                                                            .map(
                                                                (
                                                                    k: string,
                                                                    i: number,
                                                                ) => {
                                                                    const trimmed =
                                                                        k.trim()
                                                                    if (
                                                                        !trimmed
                                                                    )
                                                                        return null
                                                                    return (
                                                                        <span
                                                                            key={
                                                                                i
                                                                            }
                                                                            className='px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-white border border-white/20'
                                                                        >
                                                                            {trimmed
                                                                                .charAt(
                                                                                    0,
                                                                                )
                                                                                .toUpperCase() +
                                                                                trimmed.slice(
                                                                                    1,
                                                                                )}
                                                                        </span>
                                                                    )
                                                                },
                                                            )}
                                                    </div>
                                                )}
                                                {content}

                                                {/* Disclaimer at the bottom */}
                                                <div className='mt-8 pt-6 border-t border-white/5'>
                                                    <p className='text-[11px] leading-relaxed text-yellow-300 italic font-light tracking-wide'>
                                                        {t("disclaimer")}
                                                    </p>
                                                </div>
                                            </>
                                        )
                                    }

                                    // If we are currently generating, display the streaming object
                                    const displayObject =
                                        object ??
                                        streamingObjectProp ??
                                        streamingObjectFromAction
                                    if (displayObject) {
                                        return (
                                            <>
                                                {displayObject.keywords && (
                                                    <div className='flex flex-wrap gap-2 mb-4'>
                                                        {displayObject.keywords
                                                            .split(",")
                                                            .map(
                                                                (
                                                                    k: string,
                                                                    i: number,
                                                                ) => {
                                                                    const trimmed =
                                                                        k.trim()
                                                                    if (
                                                                        !trimmed
                                                                    )
                                                                        return null
                                                                    return (
                                                                        <span
                                                                            key={
                                                                                i
                                                                            }
                                                                            className='px-3 py-1 text-xs font-medium rounded-full bg-white/10 text-white border border-white/20'
                                                                        >
                                                                            {trimmed
                                                                                .charAt(
                                                                                    0,
                                                                                )
                                                                                .toUpperCase() +
                                                                                trimmed.slice(
                                                                                    1,
                                                                                )}
                                                                        </span>
                                                                    )
                                                                },
                                                            )}
                                                    </div>
                                                )}
                                                {displayObject.interpretation}

                                                {/* Disclaimer at the bottom (while generating) */}
                                                <div className='mt-8 pt-6 border-t border-white/5 opacity-50'>
                                                    <p className='text-[10px] leading-relaxed text-muted-foreground/50 text-center italic font-light tracking-wide animate-disclaimer-pulse'>
                                                        {t("disclaimer")}
                                                    </p>
                                                </div>
                                            </>
                                        )
                                    }

                                    return null
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {!isLargeScreen && isInterpretationFieldDone && !error && (
                <div className='w-full max-w-4xl space-y-6'>
                    <ActionSection
                        question={question || ""}
                        cards={cards || []}
                        interpretation={interpretation ?? undefined}
                        readingId={readingId!}
                        onInterpretationChange={(text) =>
                            setInterpretationState(text)
                        }
                        onGeneratingChange={(loading) =>
                            setIsGenerating(loading)
                        }
                        onStreamingObjectChange={setStreamingObjectFromAction}
                    />
                    <ShareSection
                        question={question || ""}
                        cards={cards || []}
                        interpretation={interpretation ?? undefined}
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
