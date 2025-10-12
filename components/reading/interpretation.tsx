"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, RefreshCcw, Stars, Star } from "lucide-react"
import { FaShareNodes, FaCopy, FaDownload, FaCheck } from "react-icons/fa6"
import { useEffect, useRef, useState, useCallback } from "react"
import { useCompletion } from "@ai-sdk/react"
import { useTarot } from "@/contexts/tarot-context"
import { useRouter } from "next/navigation"
import QuestionInput from "../question-input"
import { CardImage } from "../card-image"
import { getCleanQuestionText } from "@/lib/question-utils"
import { useTranslations } from "next-intl"
import Link from "next/link"
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

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

    const { spendStars, stars, addStars, setStarsBalance } = useStars()
    const { user } = useAuth()

    // Share reward limits
    const SHARE_DAILY_LIMIT = 3
    const SHARE_COOLDOWN_MS = 60 * 60 * 1000
    const [shareRewardLeft, setShareRewardLeft] = useState<number>(
        SHARE_DAILY_LIMIT
    )

    type ShareRewardState = {
        dateKey: string
        count: number
        lastRewardedAtMs: number | null
    }

    const getBangkokDateKey = (): string => {
        const offsetMs = 7 * 60 * 60 * 1000
        const bkk = new Date(Date.now() + offsetMs)
        const y = bkk.getUTCFullYear()
        const m = String(bkk.getUTCMonth() + 1).padStart(2, "0")
        const day = String(bkk.getUTCDate()).padStart(2, "0")
        return `${y}-${m}-${day}`
    }

    const loadShareRewardState = useCallback((): ShareRewardState => {
        try {
            const raw = localStorage.getItem("share-reward-v1")
            if (!raw) {
                return { dateKey: getBangkokDateKey(), count: 0, lastRewardedAtMs: null }
            }
            const parsed: unknown = JSON.parse(raw)
            if (typeof parsed !== "object" || parsed === null) {
                return { dateKey: getBangkokDateKey(), count: 0, lastRewardedAtMs: null }
            }
            const obj = parsed as Partial<Record<keyof ShareRewardState, unknown>>
            const dateKey =
                typeof obj.dateKey === "string" && obj.dateKey
                    ? obj.dateKey
                    : getBangkokDateKey()
            const count = typeof obj.count === "number" && Number.isFinite(obj.count)
                ? Math.max(0, Math.floor(obj.count))
                : 0
            const lastRewardedAtMs =
                typeof obj.lastRewardedAtMs === "number" && Number.isFinite(obj.lastRewardedAtMs)
                    ? obj.lastRewardedAtMs
                    : null
            return { dateKey, count, lastRewardedAtMs }
        } catch {
            return { dateKey: getBangkokDateKey(), count: 0, lastRewardedAtMs: null }
        }
    }, [])

    const saveShareRewardState = (state: ShareRewardState) => {
        try {
            localStorage.setItem("share-reward-v1", JSON.stringify(state))
        } catch {}
    }

    const normalizeShareRewardState = useCallback((state: ShareRewardState): ShareRewardState => {
        const today = getBangkokDateKey()
        if (state.dateKey !== today) {
            return { dateKey: today, count: 0, lastRewardedAtMs: state.lastRewardedAtMs }
        }
        return state
    }, [])

    const refreshShareRewardUi = useCallback(() => {
        const current = loadShareRewardState()
        const state = normalizeShareRewardState(current)
        const used = Math.max(0, Math.min(SHARE_DAILY_LIMIT, state.count))
        setShareRewardLeft(Math.max(0, SHARE_DAILY_LIMIT - used))
    }, [loadShareRewardState, normalizeShareRewardState])

    useEffect(() => {
        if (typeof window === "undefined") return
        refreshShareRewardUi()
    }, [refreshShareRewardUi])

    const maybeAwardShareStar = async () => {
        const current = normalizeShareRewardState(loadShareRewardState())
        const now = Date.now()
        const used = Math.max(0, Math.min(SHARE_DAILY_LIMIT, current.count))
        const inCooldown =
            typeof current.lastRewardedAtMs === "number" &&
            now - current.lastRewardedAtMs < SHARE_COOLDOWN_MS
        const canAward = used < SHARE_DAILY_LIMIT && !inCooldown
        if (!canAward) {
            refreshShareRewardUi()
            return
        }
        // Award (user -> server share-award uncapped; anon -> addStars)
        try {
            if (user?.id) {
                await fetch("/api/stars/share-award", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: user.id }),
                })
                const current = typeof stars === "number" ? stars : 0
                setStarsBalance(current + 1)
            } else {
                // Anonymous: use addStars which posts to star_add (no cap)
                addStars(1)
            }
        } catch {}
        const next: ShareRewardState = {
            dateKey: current.dateKey,
            count: used + 1,
            lastRewardedAtMs: now,
        }
        saveShareRewardState(next)
        refreshShareRewardUi()
    }

    const shareImage = async () => {
        try {
            // 1) Persist shared interpretation to get a link
            const createRes = await fetch("/api/interpretations/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    cards: selectedCards.map((c) => c.meaning),
                    interpretation: interpretation ?? completion,
                }),
            })
            if (!createRes.ok) throw new Error("SHARE_CREATE_FAILED")
            const { id } = await createRes.json()
            const link = typeof window !== "undefined" ? `${window.location.origin}/tarot/${id}` : `https://dooduang.ai/tarot/${id}`

            // 2) Copy link to clipboard
            try {
                await navigator.clipboard.writeText(link)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
            } catch {}

            const shareTitle = "Asking Fate Reading"
            const shareText = [
                question ? `Question: "${question}"` : "",
                "Read my AI tarot interpretation",
                link,
            ]
                .filter(Boolean)
                .join("\n\n")

            // 3) Try to open native share sheet with link
            if (navigator.canShare && navigator.canShare({ url: link })) {
                try {
                    await navigator.share({
                        title: shareTitle,
                        text: shareText,
                        url: link,
                    })
                    // Award only if under limit and not in cooldown
                    await maybeAwardShareStar()
                    return
                } catch {
                    // User may cancel or share may fail; do not award, continue to fallback below
                }
            } else if (typeof navigator.share === "function") {
                try {
                    await navigator.share({
                        title: shareTitle,
                        text: shareText,
                        url: link,
                    })
                    // Award only if under limit and not in cooldown
                    await maybeAwardShareStar()
                    return
                } catch {
                    // User may cancel or share may fail; do not award, continue to fallback below
                }
            }
            // 4) Fallback: show a prompt with the link if share not available
            try {
                window.prompt("Copy this link", link)
            } catch {}
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

    const [shareOpen, setShareOpen] = useState(false)

    const shareButtons = [
        {
            id: "share",
            Icon: FaShareNodes,
            label: t("actions.share"),
            className:
                "border-white/20 text-white bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 hover:from-indigo-500/30 hover:via-purple-500/30 hover:to-cyan-500/30",
            onClick: () => setShareOpen(true),
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

Goal: Provide a concise interpretation that directly answers the question.

Silent steps (do not reveal):
1) Classify the question intent into: love/relationships, work/career, finances, health/wellbeing, personal growth, spiritual, or general.
2) Map the listed cards to that intent and emphasize the most relevant angles.
3) Do not fetch or cite external sources (e.g., thetarotguide.com). Use only the provided card names (and reversed markers) as context.

Output:
- One short paragraph, <= 100 words.
- Clear, grounded. Mention cards only if essential.
- Answer directly to the question. ground it; if vague, add specificity; if too long, trim; if too short, enrich with specifics.`

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
                                    &ldquo;
                                    {getCleanQuestionText(
                                        isFollowUp && followUpQuestion
                                            ? followUpQuestion
                                            : question || ""
                                    )}
                                    &rdquo;
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

                            {/* Card Images with Badges on Top */}
                            <div className='flex flex-wrap gap-6 justify-center'>
                                {selectedCards.map((card, index) => (
                                    <div
                                        key={index}
                                        className='flex flex-col items-center gap-3 relative animate-slide-up'
                                        style={{
                                            animationDelay: `${index * 150}ms`,
                                            animationFillMode: "both",
                                        }}
                                    >
                                        {/* Glow effect behind card */}
                                        <div
                                            className='absolute inset-0 -z-10 bg-gradient-to-br from-primary/30 via-accent/30 to-primary/30 blur-xl opacity-50 scale-110 animate-pulse'
                                            style={{
                                                animationDelay: `${index * 150 + 500}ms`,
                                            }}
                                        />

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
                                ) : (
                                    <div
                                        className='text-foreground leading-relaxed whitespace-pre-wrap mb-4 animate-fade-up'
                                        style={{
                                            animationDelay: "600ms",
                                            animationDuration: "500ms",
                                            animationFillMode: "both",
                                        }}
                                    >
                                        {/* Interpretation */}
                                        {interpretation ?? completion}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Show action buttons and sharing when interpretation is complete or there's an error */}
                    {(interpretation || finish || error) && (
                        <>
                            {/* Sharing - only show when not error */}
                            {!error && (
                                <div className='flex flex-col items-center justify-center gap-3'>
                                    <div className='text-xs text-center text-white'>
                                        Get 1 free star for each new person who visits your shared link.
                                        <br />
                                        <Link href='/learn/share-rewards' className='underline underline-offset-2 text-blue-300 hover:text-blue-200'>
                                            Learn more
                                        </Link>
                                    </div>
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
                                    {/* Share Sheet */}
                                    <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Share</DialogTitle>
                                            </DialogHeader>
                                            <div className='space-y-3'>
                                                <div className='text-sm text-muted-foreground'>
                                                    Choose a platform to share or copy the link.
                                                </div>
                                                <div className='grid grid-cols-3 gap-3'>
                                                    {[
                                                        {
                                                            id: "facebook",
                                                            label: "Facebook",
                                                            icon: (
                                                                <svg viewBox='0 0 24 24' className='w-5 h-5 fill-current'>
                                                                    <path d='M22 12.06C22 6.49 17.52 2 11.94 2S2 6.49 2 12.06c0 5 3.66 9.14 8.44 9.94v-7.03H7.9v-2.91h2.54V9.41c0-2.51 1.5-3.9 3.79-3.9 1.1 0 2.26.2 2.26.2v2.48h-1.27c-1.25 0-1.64.78-1.64 1.57v1.88h2.79l-.45 2.91h-2.34V22c4.78-.8 8.44-4.94 8.44-9.94Z' />
                                                                </svg>
                                                            ),
                                                            href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
                                                        },
                                                        {
                                                            id: "twitter",
                                                            label: "Twitter/X",
                                                            icon: (
                                                                <svg viewBox='0 0 24 24' className='w-5 h-5 fill-current'>
                                                                    <path d='M18.244 2H21l-6.5 7.43L22 22h-6.91l-4.51-5.87L4.5 22H2l7.18-8.21L2 2h7.09l4.09 5.45L18.244 2Zm-1.21 18h1.81L7.5 4h-1.8l11.334 16Z' />
                                                                </svg>
                                                            ),
                                                            href: (u: string, t?: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}${t ? `&text=${encodeURIComponent(t)}` : ""}`,
                                                        },
                                                        {
                                                            id: "line",
                                                            label: "LINE",
                                                            icon: (
                                                                <svg viewBox='0 0 24 24' className='w-5 h-5 fill-current'>
                                                                    <path d='M19 3H5C3.35 3 2 4.35 2 6v12c0 1.65 1.35 3 3 3h14c1.65 0 3-1.35 3-3V6c0-1.65-1.35-3-3-3Zm-1.44 9.43c-.03.04-.07.09-.12.14-1.23 1.23-3.53 2.51-8.07 2.51h-.37l-2.55 1.86a.5.5 0 0 1-.79-.41v-1.46C4.47 14.3 4 13.2 4 12c0-2.96 3.02-5.36 6.75-5.36 3.72 0 6.75 2.4 6.75 5.36 0 .53-.13 1.04-.39 1.43Z' />
                                                                </svg>
                                                            ),
                                                            href: (u: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(u)}`,
                                                        },
                                                        {
                                                            id: "whatsapp",
                                                            label: "WhatsApp",
                                                            icon: (
                                                                <svg viewBox='0 0 24 24' className='w-5 h-5 fill-current'>
                                                                    <path d='M.057 24l1.687-6.163A11.867 11.867 0 0 1 0 11.9C0 5.327 5.373 0 12 0c3.19 0 6.167 1.243 8.413 3.488A11.82 11.82 0 0 1 24 11.9c0 6.627-5.373 12-12 12-2.042 0-4.025-.506-5.788-1.463L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.591 5.448 0 9.89-4.434 9.89-9.884a9.86 9.86 0 0 0-2.896-6.994A9.825 9.825 0 0 0 12 2.02c-5.45 0-9.884 4.433-9.884 9.883 0 2.183.713 4.207 1.937 5.853l-.637 2.327 2.238-.59zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.03-.967-.272-.099-.47-.149-.668.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.074-.149-.668-1.611-.916-2.207-.242-.58-.487-.5-.668-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z' />
                                                                </svg>
                                                            ),
                                                            href: (u: string) => `https://api.whatsapp.com/send?text=${encodeURIComponent(u)}`,
                                                        },
                                                        {
                                                            id: "telegram",
                                                            label: "Telegram",
                                                            icon: (
                                                                <svg viewBox='0 0 24 24' className='w-5 h-5 fill-current'>
                                                                    <path d='M9.04 15.68 8.9 19.4a.87.87 0 0 0 .7-.34l1.68-1.6 3.48 2.56c.64.35 1.1.16 1.28-.6l2.32-10.88c.21-.96-.35-1.34-.98-1.1L3.5 11.54c-.94.37-.92.9-.16 1.14l4.6 1.44 10.7-6.74-9.6 8.3Z' />
                                                                </svg>
                                                            ),
                                                            href: (u: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}`,
                                                        },
                                                        {
                                                            id: "reddit",
                                                            label: "Reddit",
                                                            icon: (
                                                                <svg viewBox='0 0 24 24' className='w-5 h-5 fill-current'>
                                                                    <path d='M12 2c5.523 0 10 3.806 10 8.5S17.523 19 12 19 2 15.194 2 10.5C2 5.806 6.477 2 12 2Zm5.5 9.25c-.69 0-1.25.56-1.25 1.25 0 .69.56 1.25 1.25 1.25s1.25-.56 1.25-1.25-.56-1.25-1.25-1.25Zm-11 0c-.69 0-1.25.56-1.25 1.25 0 .69.56 1.25 1.25 1.25s1.25-.56 1.25-1.25-.56-1.25-1.25-1.25ZM12 17c1.932 0 3.5-.672 3.5-1.5S13.932 14 12 14s-3.5.672-3.5 1.5.568 1.5 3.5 1.5Z' />
                                                                </svg>
                                                            ),
                                                            href: (u: string, t?: string) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}${t ? `&title=${encodeURIComponent(t)}` : ""}`,
                                                        },
                                                    ].map((p) => (
                                                        <button
                                                            key={p.id}
                                                            type='button'
                                                            onClick={async () => {
                                                                // Ensure link exists by creating a share record first
                                                                const createRes = await fetch("/api/interpretations/share", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({
                                                                        question,
                                                                        cards: selectedCards.map((c) => c.meaning),
                                                                        interpretation: interpretation ?? completion,
                                                                    }),
                                                                })
                                                                if (!createRes.ok) return
                                                                const { id } = await createRes.json()
                                                                const link = typeof window !== "undefined" ? `${window.location.origin}/tarot/${id}` : `https://dooduang.ai/tarot/${id}`
                                                                const text = question ? `"${question}" — AI tarot interpretation` : undefined
                                                                window.open(p.href(link, text), "_blank", "noopener,noreferrer")
                                                                // Award star under constraints
                                                                await maybeAwardShareStar()
                                                            }}
                                                            className='px-3 py-2 rounded-md border border-white/10 hover:bg-white/5 text-center'
                                                        >
                                                            <div className='flex items-center justify-center'>
                                                                {p.icon}
                                                            </div>
                                                            <div className='text-[10px] mt-1 text-muted-foreground'>
                                                                {p.label}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className='flex gap-2'>
                                                    <input
                                                        className='flex-1 bg-transparent border rounded px-3 py-2 text-sm'
                                                        readOnly
                                                        value={typeof window !== "undefined" ? window.location.href : ""}
                                                    />
                                                    <Button
                                                        type='button'
                                                        onClick={async () => {
                                                            try {
                                                                // Create link if not existing in clipboard flow too
                                                                const createRes = await fetch("/api/interpretations/share", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({
                                                                        question,
                                                                        cards: selectedCards.map((c) => c.meaning),
                                                                        interpretation: interpretation ?? completion,
                                                                    }),
                                                                })
                                                                if (!createRes.ok) return
                                                                const { id } = await createRes.json()
                                                                const link = typeof window !== "undefined" ? `${window.location.origin}/tarot/${id}` : `https://dooduang.ai/tarot/${id}`
                                                                await navigator.clipboard.writeText(link)
                                                                setCopied(true)
                                                                window.setTimeout(() => setCopied(false), 1500)
                                                                await maybeAwardShareStar()
                                                            } catch {}
                                                        }}
                                                    >
                                                        {copied ? "Copied" : "Copy Link"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
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
