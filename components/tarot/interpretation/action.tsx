"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"
import {
    FaArrowsRotate,
    FaLink,
    FaRegFileLines,
    FaDownload,
    FaFlag,
    FaThumbsUp,
    FaThumbsDown,
    FaComment,
    FaCheck,
    FaXmark,
} from "react-icons/fa6"
import { Sparkles, Star } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Settings } from "lucide-react"
import { useTarot } from "@/contexts/tarot-context"
import { useRouter } from "next/navigation"
import { useStars } from "@/contexts/stars-context"
import { useCompletion } from "@ai-sdk/react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useEffect as ReactUseEffect } from "react"
import { toast } from "sonner"

interface ActionSectionProps {
    question?: string
    cards?: string[]
    interpretation?: string
    readingId?: string
    onInterpretationChange?: (text: string) => void
}

export default function ActionSection({
    question: propQuestion,
    cards: propCards,
    interpretation: propInterpretation,
    readingId: propReadingId,
    onInterpretationChange,
}: ActionSectionProps = {}) {
    const {
        question: contextQuestion,
        selectedCards,
        interpretation: contextInterpretation,
        setInterpretation,
        setPaidForInterpretation,
    } = useTarot()
    const question = propQuestion || contextQuestion
    const cards = propCards || selectedCards.map((c) => c.meaning)
    const interpretation = propInterpretation || contextInterpretation
    const readingId = propReadingId
    
    const [copiedLink, setCopiedLink] = useState(false)
    const [copiedText, setCopiedText] = useState(false)
    const { user } = useAuth()
    const router = useRouter()
    const { spendStars, stars } = useStars()
    const [isDownloading, setIsDownloading] = useState(false)
    const [showReport, setShowReport] = useState(false)
    const [reportReason, setReportReason] = useState("")
    const [reportDetails, setReportDetails] = useState("")
    const [voteState, setVoteState] = useState<"up" | "down" | null>(null)
    const [showFeedback, setShowFeedback] = useState(false)
    const [rating, setRating] = useState<number>(0)
    const navGuardRef = useRef<HTMLDivElement>(null)
    const [versions, setVersions] = useState<Array<{ id: number; reading_id: string; content: string; created_at: string }>>([])
    const loadVersions = useCallback(async () => {
        try {
            if (!readingId) return
            const res = await fetch(`/api/tarot/versions?readingId=${readingId}`)
            if (!res.ok) return
            const data = await res.json()
            setVersions(Array.isArray(data.versions) ? data.versions : [])
        } catch {}
    }, [readingId])
    ReactUseEffect(() => { void loadVersions() }, [loadVersions])

    const { complete } = useCompletion({
        api: "/api/interpret-cards/question",
        onFinish: (_, completion) => {
            // Prefer parent callback when provided (e.g., owner detail page)
            if (typeof onInterpretationChange === "function") {
                onInterpretationChange(completion)
            } else {
                setInterpretation(completion)
            }
        },
    })

    useEffect(() => {
        const el = navGuardRef.current
        if (!el) return
        const onEnter = () => {
            document.body.style.overscrollBehaviorX = "none"
            document.documentElement.style.overscrollBehaviorX = "none"
        }
        const onLeave = () => {
            document.body.style.overscrollBehaviorX = "auto"
            document.documentElement.style.overscrollBehaviorX = "auto"
        }
        el.addEventListener("pointerenter", onEnter)
        el.addEventListener("pointerleave", onLeave)
        return () => {
            el.removeEventListener("pointerenter", onEnter)
            el.removeEventListener("pointerleave", onLeave)
            onLeave()
        }
    }, [])

    useEffect(() => {
        const el = navGuardRef.current
        if (!el) return
        const onWheel: (e: WheelEvent) => void = (e) => {
            // Stop propagation of horizontal wheel to avoid browser back/forward gestures
            e.stopPropagation()
        }
        el.addEventListener("wheel", onWheel, { passive: true })
        return () => {
            el.removeEventListener("wheel", onWheel)
        }
    }, [])

    const ensureShareLink = useCallback(async (): Promise<string | null> => {
        try {
            // If we have a readingId, use the new tarot/[id] link
            if (readingId) {
                const origin =
                    typeof window !== "undefined"
                        ? window.location.origin
                        : "https://dooduang.ai"
                return `${origin}/tarot/${readingId}`
            }

            // Fallback to old behavior for backward compatibility
            // First, check if this interpretation already exists
            const checkRes = await fetch("/api/interpretations/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    cards: cards,
                    interpretation,
                    user_id: user?.id ?? null,
                }),
            })

            if (checkRes.ok) {
                const checkData = await checkRes.json()
                if (checkData.exists && checkData.id) {
                    // Use existing interpretation
                    const origin =
                        typeof window !== "undefined"
                            ? window.location.origin
                            : "https://dooduang.ai"
                    return `${origin}/share/tarot/${checkData.id}`
                }
            }

            // If not found, create a new one
            const res = await fetch("/api/interpretations/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    cards: cards,
                    interpretation,
                    user_id: user?.id ?? null,
                }),
            })
            if (!res.ok) return null
            const { id } = await res.json()
            const origin =
                typeof window !== "undefined"
                    ? window.location.origin
                    : "https://dooduang.ai"
            return `${origin}/share/tarot/${id}`
        } catch {
            return null
        }
    }, [readingId, question, cards, interpretation, user?.id])

    const handleRegenerate = useCallback(async () => {
        try {
            // Check if user has enough stars
            if (!Number.isFinite(stars as number) || (stars as number) < 1) {
                // Could show a dialog here, but for now just return
                return
            }

            // Spend a star for regeneration
            const ok = await spendStars(1)
            if (ok) {
                toast.warning("-1 star for regeneration")
            } else {
                toast.error("Not enough stars to regenerate")
                return
            }
            setPaidForInterpretation(true)

            // Clear current interpretation
            setInterpretation(null)

            // Build the prompt (match initial generation logic)
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

            // Generate new interpretation
            const newText = await complete(prompt)
            if (!newText) {
                toast.error("Failed to generate a new interpretation")
                return
            }

            // Persist current interpretation to DB and versions if we have a readingId
            try {
                if (readingId && newText) {
                    await fetch("/api/tarot/update", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: readingId, interpretation: newText }),
                    })
                    await fetch("/api/tarot/versions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ reading_id: readingId, content: newText }),
                    })
                    // Reload versions list
                    await loadVersions()
                }
            } catch {}
        } catch (error) {
            console.error("Error regenerating interpretation:", error)
        }
    }, [
        question,
        cards,
        stars,
        spendStars,
        setPaidForInterpretation,
        setInterpretation,
        onInterpretationChange,
        complete,
    ])

    const actionOptions = [
        {
            id: "regen",
            label: (
                <span className='leading-tight text-center'>
                    <span className='block'>Regenerate</span>
                    <span className='block text-[10px] text-yellow-300'>
                        -1 <Star className='inline w-3 h-3 text-yellow-300' />
                    </span>
                </span>
            ),
            icon: <FaArrowsRotate className='w-4 h-4 text-white' />,
            bg: "linear-gradient(135deg, #6366F1, #4F46E5)",
            description: "Get a new interpretation",
            onClick: async () => {
                await handleRegenerate()
            },
        },
        {
            id: "new",
            label: "New Reading",
            icon: <Sparkles className='w-4 h-4 text-white' />,
            bg: "linear-gradient(135deg, #22C55E, #16A34A)",
            description: "Start fresh",
            onClick: async () => router.push("/"),
        },
        {
            id: "copy-link",
            label: copiedLink ? "Copied!" : "Copy Link",
            icon: copiedLink ? (
                <FaCheck className='w-4 h-4 text-white' />
            ) : (
                <FaLink className='w-4 h-4 text-white' />
            ),
            bg: copiedLink
                ? "linear-gradient(135deg, #22C55E, #16A34A)"
                : "linear-gradient(135deg, #06B6D4, #0891B2)",
            description: copiedLink
                ? "Link copied to clipboard"
                : "Share this reading",
            onClick: async () => {
                const link = await ensureShareLink()
                if (!link) return
                
                try {
                    // Try modern clipboard API first
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(link)
                        setCopiedLink(true)
                        window.setTimeout(() => setCopiedLink(false), 2000)
                        return
                    }
                } catch (error) {
                    console.log('Clipboard API failed, trying fallback:', error)
                }
                
                // Fallback for Safari and older browsers
                try {
                    const textArea = document.createElement('textarea')
                    textArea.value = link
                    textArea.style.position = 'fixed'
                    textArea.style.left = '-999999px'
                    textArea.style.top = '-999999px'
                    document.body.appendChild(textArea)
                    textArea.focus()
                    textArea.select()
                    
                    const successful = document.execCommand('copy')
                    document.body.removeChild(textArea)
                    
                    if (successful) {
                        setCopiedLink(true)
                        window.setTimeout(() => setCopiedLink(false), 2000)
                    } else {
                        // If both methods fail, show the link in an alert
                        alert(`Copy this link: ${link}`)
                    }
                } catch (fallbackError) {
                    console.error('Fallback copy failed:', fallbackError)
                    // Last resort: show the link
                    alert(`Copy this link: ${link}`)
                }
            },
        },
        {
            id: "copy-text",
            label: copiedText ? "Copied!" : "Copy Result",
            icon: copiedText ? (
                <FaCheck className='w-4 h-4 text-white' />
            ) : (
                <FaRegFileLines className='w-4 h-4 text-white' />
            ),
            bg: copiedText
                ? "linear-gradient(135deg, #22C55E, #16A34A)"
                : "linear-gradient(135deg, #10B981, #059669)",
            description: copiedText
                ? "Text copied to clipboard"
                : "Copy interpretation",
            onClick: async () => {
                const text = interpretation ? String(interpretation) : ""
                if (!text) return
                
                try {
                    // Try modern clipboard API first
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(text)
                        setCopiedText(true)
                        window.setTimeout(() => setCopiedText(false), 2000)
                        return
                    }
                } catch (error) {
                    console.log('Clipboard API failed, trying fallback:', error)
                }
                
                // Fallback for Safari and older browsers
                try {
                    const textArea = document.createElement('textarea')
                    textArea.value = text
                    textArea.style.position = 'fixed'
                    textArea.style.left = '-999999px'
                    textArea.style.top = '-999999px'
                    document.body.appendChild(textArea)
                    textArea.focus()
                    textArea.select()
                    
                    const successful = document.execCommand('copy')
                    document.body.removeChild(textArea)
                    
                    if (successful) {
                        setCopiedText(true)
                        window.setTimeout(() => setCopiedText(false), 2000)
                    } else {
                        // If both methods fail, show the text in an alert
                        alert(`Copy this text: ${text}`)
                    }
                } catch (fallbackError) {
                    console.error('Fallback copy failed:', fallbackError)
                    // Last resort: show the text
                    alert(`Copy this text: ${text}`)
                }
            },
        },
        {
            id: "download",
            label: "Download",
            icon: <FaDownload className='w-4 h-4 text-white' />,
            bg: "linear-gradient(135deg, #0EA5E9, #0284C7)",
            description: "Save image or video",
            onClick: async () => {}, // handled by Popover wrapper
        },
        {
            id: "versions",
            label: "Versions",
            icon: <FaRegFileLines className='w-4 h-4 text-white' />,
            bg: "linear-gradient(135deg, #9333EA, #7E22CE)",
            description: "View versions",
            onClick: async () => {},
        },
        {
            id: "report",
            label: "Report",
            icon: <FaFlag className='w-4 h-4 text-white' />,
            bg: "linear-gradient(135deg, #EF4444, #DC2626)",
            description: "Report issue",
            onClick: async () => setShowReport(true),
        },
        voteState !== "up"
            ? {
                  id: "vote-up",
                  label: "Vote Up",
                  icon: <FaThumbsUp className='w-4 h-4 text-white' />,
                  bg: "linear-gradient(135deg, #22C55E, #16A34A)",
                  description: "Like this reading",
                  onClick: async () => {
                      setVoteState("up")
                      // TODO: call /api/feedbacks to upsert vote_up=true
                  },
              }
            : {
                  id: "vote-up-cancel",
                  label: "Vote Up",
                  icon: <FaXmark className='w-4 h-4 text-white' />,
                  bg: "linear-gradient(135deg, #6B7280, #4B5563)",
                  description: "Remove vote up",
                  onClick: async () => {
                      setVoteState(null)
                      // TODO: call /api/feedbacks to remove vote
                  },
              },
        voteState !== "down"
            ? {
                  id: "vote-down",
                  label: "Vote Down",
                  icon: <FaThumbsDown className='w-4 h-4 text-white' />,
                  bg: "linear-gradient(135deg, #F59E0B, #D97706)",
                  description: "Dislike this reading",
                  onClick: async () => {
                      setVoteState("down")
                      // TODO: call /api/feedbacks to upsert vote_down=true
                  },
              }
            : {
                  id: "vote-down-cancel",
                  label: "Vote Down",
                  icon: <FaXmark className='w-4 h-4 text-white' />,
                  bg: "linear-gradient(135deg, #6B7280, #4B5563)",
                  description: "Remove vote down",
                  onClick: async () => {
                      setVoteState(null)
                      // TODO: call /api/feedbacks to remove vote
                  },
              },
        {
            id: "feedback",
            label: "Feedback",
            icon: <FaComment className='w-4 h-4 text-white' />,
            bg: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            description: "Share feedback",
            onClick: async () => setShowFeedback(true),
        },
    ]

    return (
        <div className='relative overflow-hidden group'>
            {/* Slide-up loader for download */}
            {isDownloading && (
                <div className='fixed bottom-0 left-0 right-0 z-50 animate-slide-up bg-black/60 backdrop-blur-sm p-4 text-center text-white'>
                    Preparing your {"content"}...
                </div>
            )}
            {/* Background gradient with animation */}
            <div className='absolute inset-0 bg-gradient-to-br from-accent/5 via-primary/5 to-accent/5 rounded-xl transition-all duration-500 group-hover:from-accent/10 group-hover:via-primary/10 group-hover:to-accent/10' />

            {/* Animated border */}
            <div className='absolute inset-0 rounded-xl border border-accent/20 group-hover:border-accent/40 transition-all duration-500' />

            {/* Content */}
            <div className='relative'>
                {/* Header with padding */}
                <div className='px-6 pt-6 pb-4'>
                    <div className='flex items-center gap-3 mb-6 animate-fade-up'>
                        <div className='p-2 rounded-full bg-accent/20 backdrop-blur-sm group-hover:bg-accent/30 transition-all duration-300'>
                            <Settings className='w-5 h-5 text-accent group-hover:scale-110 transition-transform duration-300' />
                        </div>
                        <div>
                            <h3 className='font-serif font-semibold text-lg text-foreground group-hover:text-accent/90 transition-colors duration-300'>
                                Actions
                            </h3>
                            <p className='text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300'>
                                Manage and interact with your reading
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Options - Full width swiper */}
                <div
                    ref={navGuardRef}
                    style={{
                        overscrollBehaviorX: "none",
                        touchAction: "pan-y pinch-zoom",
                    }}
                >
                    <Swiper
                        modules={[FreeMode, Mousewheel]}
                        freeMode
                        mousewheel={{
                            forceToAxis: true,
                            sensitivity: 1,
                            releaseOnEdges: true,
                        }}
                        slidesPerView={4.5}
                        breakpoints={{
                            640: { slidesPerView: 5.5 },
                            768: { slidesPerView: 6.5 },
                            1024: { slidesPerView: 8 },
                            1280: { slidesPerView: 9.5 },
                            1536: { slidesPerView: 10.5 },
                        }}
                        spaceBetween={8}
                        className='py-2 px-6'
                    >
                        {actionOptions.map((action, index) => (
                            <SwiperSlide
                                key={action.id}
                            >
                                {action.id === 'download' ? (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button
                                                type='button'
                                                className='group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg w-full'
                                                style={{
                                                    animationDelay: `${index * 50}ms`,
                                                    animationFillMode: "both",
                                                }}
                                            >
                                                <div
                                                    className='relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-110'
                                                    style={{ background: action.bg }}
                                                >
                                                    {action.icon}
                                                    <div className='absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                                </div>
                                                <span className='text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300 text-center leading-tight'>
                                                    {action.label}
                                                </span>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className='w-56'>
                                            <div className='space-y-2'>
                                                <button
                                                    type='button'
                                                    className='w-full px-3 py-2 rounded-md bg-primary/20 hover:bg-primary/30 text-sm'
                                                    onClick={async () => {
                                                        try {
                                                            setIsDownloading(true)
                                                            const type = 'image'
                                                            const res = await fetch('/api/share-image', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    question,
                                                                    cards: cards,
                                                                    interpretation,
                                                                    width: 1170,
                                                                    height: 2532,
                                                                    branding: 'Asking Fate',
                                                                    theme: 'cosmic',
                                                                    type,
                                                                }),
                                                            })
                                                            const blob = await res.blob()
                                                            const ts = new Date().toISOString().replace(/[:.]/g, '-')
                                                            const url = URL.createObjectURL(blob)
                                                            const a = document.createElement('a')
                                                            a.href = url
                                                            a.download = `reading-${ts}.png`
                                                            document.body.appendChild(a)
                                                            a.click()
                                                            a.remove()
                                                            URL.revokeObjectURL(url)
                                                        } finally {
                                                            setIsDownloading(false)
                                                        }
                                                    }}
                                                >
                                                    Download Image
                                                </button>
                                                <button
                                                    type='button'
                                                    className='w-full px-3 py-2 rounded-md bg-accent/20 hover:bg-accent/30 text-sm'
                                                    onClick={async () => {
                                                        try {
                                                            setIsDownloading(true)
                                                            const type = 'video'
                                                            const res = await fetch('/api/share-image', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    question,
                                                                    cards: cards,
                                                                    interpretation,
                                                                    width: 1170,
                                                                    height: 2532,
                                                                    branding: 'Asking Fate',
                                                                    theme: 'cosmic',
                                                                    type,
                                                                }),
                                                            })
                                                            const blob = await res.blob()
                                                            const ts = new Date().toISOString().replace(/[:.]/g, '-')
                                                            const url = URL.createObjectURL(blob)
                                                            const a = document.createElement('a')
                                                            a.href = url
                                                            a.download = `reading-${ts}.mp4`
                                                            document.body.appendChild(a)
                                                            a.click()
                                                            a.remove()
                                                            URL.revokeObjectURL(url)
                                                        } finally {
                                                            setIsDownloading(false)
                                                        }
                                                    }}
                                                >
                                                    Download Video (15s)
                                                </button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                ) : action.id === 'versions' ? (
                                    versions.length > 0 ? (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type='button'
                                                    className='group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg w-full'
                                                    style={{
                                                        animationDelay: `${index * 50}ms`,
                                                        animationFillMode: 'both',
                                                    }}
                                                >
                                                    <div
                                                        className='relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-110'
                                                        style={{ background: action.bg }}
                                                    >
                                                        {action.icon}
                                                        <div className='absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                                    </div>
                                                    <span className='text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300 text-center leading-tight'>
                                                        {typeof action.label === 'string' ? action.label : 'Versions'}
                                                    </span>
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className='w-72'>
                                                <div className='max-h-64 overflow-auto space-y-2'>
                                                    {versions.map((v) => (
                                                        <button
                                                            key={v.id}
                                                            type='button'
                                                            className='w-full text-left px-2 py-1 rounded hover:bg-white/10 text-sm'
                                                            onClick={() => {
                                                                if (typeof (onInterpretationChange) === 'function') onInterpretationChange(v.content)
                                                                else setInterpretation(v.content)
                                                            }}
                                                        >
                                                            {new Date(v.created_at).toLocaleString()}
                                                        </button>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    ) : (
                                        <button
                                            type='button'
                                            disabled
                                            className='group relative flex flex-col items-center gap-2 p-3 rounded-xl w-full opacity-50 cursor-not-allowed'
                                            style={{
                                                animationDelay: `${index * 50}ms`,
                                                animationFillMode: 'both',
                                            }}
                                        >
                                            <div
                                                className='relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg'
                                                style={{ background: action.bg }}
                                            >
                                                {action.icon}
                                            </div>
                                            <span className='text-xs font-medium text-foreground/60 text-center leading-tight'>
                                                Versions
                                            </span>
                                        </button>
                                    )
                                ) : (
                                    <button
                                        type='button'
                                        onClick={action.onClick}
                                        className='group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg w-full'
                                        style={{
                                            animationDelay: `${index * 50}ms`,
                                            animationFillMode: 'both',
                                        }}
                                    >
                                        <div
                                            className='relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-110'
                                            style={{ background: action.bg }}
                                        >
                                            {action.icon}
                                            <div className='absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                        </div>
                                        <span className='text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300 text-center leading-tight'>
                                            {action.label}
                                        </span>
                                    </button>
                                )}
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
            {/* Removed inline star deduction note; using toast instead */}

            {/* Report dialog */}
            <AlertDialog open={showReport}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Report this reading</AlertDialogTitle>
                        <AlertDialogDescription>
                            Select a reason and optionally add details.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className='space-y-2'>
                        <select
                            className='w-full bg-background border border-border/40 rounded-md p-2'
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                        >
                            <option value=''>Select a reason</option>
                            <option value='inappropriate'>Inappropriate content</option>
                            <option value='spam'>Spam or misleading</option>
                            <option value='harassment'>Harassment or hate</option>
                            <option value='privacy'>Privacy concern</option>
                            <option value='other'>Other</option>
                        </select>
                        {reportReason === 'other' && (
                            <textarea
                                className='w-full bg-background border border-border/40 rounded-md p-2'
                                placeholder='Please describe...'
                                value={reportDetails}
                                onChange={(e) => setReportDetails(e.target.value)}
                            />
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowReport(false)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (!reportReason) return
                                try {
                                    const res = await fetch('/api/reports', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            reading_id: readingId,
                                            reason: reportReason,
                                            details: reportDetails || undefined,
                                        }),
                                    })
                                    if (res.ok) setShowReport(false)
                                } catch {}
                            }}
                        >
                            Submit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Feedback dialog */}
            <AlertDialog open={showFeedback}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Share your feedback</AlertDialogTitle>
                        <AlertDialogDescription>
                            How helpful was this interpretation?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className='flex items-center justify-center gap-2 py-2'>
                        {[1,2,3,4,5].map((n) => (
                            <button
                                key={n}
                                type='button'
                                onClick={() => setRating(n)}
                                className={`w-8 h-8 rounded-full ${rating >= n ? 'bg-yellow-400' : 'bg-zinc-700'}`}
                                aria-label={`Rate ${n}`}
                            />
                        ))}
                    </div>
                    <textarea
                        className='w-full bg-background border border-border/40 rounded-md p-2'
                        placeholder='Optional comments'
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowFeedback(false)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                try {
                                    const res = await fetch('/api/feedbacks', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            reading_id: readingId,
                                            rating,
                                            comment: reportDetails || undefined,
                                        }),
                                    })
                                    if (res.ok) setShowFeedback(false)
                                } catch {}
                            }}
                        >
                            Submit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
