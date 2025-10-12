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
                                        <Link href='/learn/share-rewards' className='underline underline-offset-2 ml-1 text-blue-300 hover:text-blue-200'>
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
                                                        { id: "facebook", label: "Facebook", href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
                                                        { id: "twitter", label: "Twitter/X", href: (u: string, t?: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}${t ? `&text=${encodeURIComponent(t)}` : ""}` },
                                                        { id: "line", label: "LINE", href: (u: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(u)}` },
                                                        { id: "whatsapp", label: "WhatsApp", href: (u: string) => `https://api.whatsapp.com/send?text=${encodeURIComponent(u)}` },
                                                        { id: "telegram", label: "Telegram", href: (u: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}` },
                                                        { id: "reddit", label: "Reddit", href: (u: string, t?: string) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}${t ? `&title=${encodeURIComponent(t)}` : ""}` },
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
                                                            className='text-sm px-3 py-2 rounded-md border border-white/10 hover:bg-white/5'
                                                        >
                                                            {p.label}
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
