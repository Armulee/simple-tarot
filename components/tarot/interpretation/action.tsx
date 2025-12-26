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
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover"
import { getTarotReadingPrompt } from "@/lib/prompts"
import { toast } from "sonner"

interface ActionSectionProps {
    question?: string
    cards?: string[]
    interpretation?: string
    readingId?: string
    onInterpretationChange?: (text: string) => void
    onGeneratingChange?: (loading: boolean) => void
}

import { useTranslations } from "next-intl"

import { toPng } from "html-to-image"

export default function ActionSection({
    question: propQuestion,
    cards: propCards,
    interpretation: propInterpretation,
    readingId: propReadingId,
    onInterpretationChange,
    onGeneratingChange,
}: ActionSectionProps = {}) {
    const t = useTranslations("ReadingPage.interpretation")
    const {
        question: contextQuestion,
        selectedCards,
        interpretation: contextInterpretation,
        setInterpretation,
        setPaidForInterpretation,
        isFollowUp,
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
    const [versions, setVersions] = useState<
        Array<{
            id: number
            reading_id: string
            content: string
            created_at: string
        }>
    >([])
    const loadVersions = useCallback(async () => {
        try {
            if (!readingId) return
            const res = await fetch(
                `/api/tarot/versions?readingId=${readingId}`
            )
            if (!res.ok) return
            const data = await res.json()
            setVersions(Array.isArray(data.versions) ? data.versions : [])
        } catch {}
    }, [readingId])
    useEffect(() => {
        void loadVersions()
    }, [loadVersions])

    const imageRef = useRef<HTMLDivElement>(null)

// Helper to get card image slug
    function slugifyCardName(raw: string): { slug: string; isReversed: boolean } {
        if (!raw) return { slug: "", isReversed: false }
        const lower = raw.toLowerCase()
        const isReversed =
            lower.includes("(reversed)") || /\breversed\b/.test(lower)

        const slug = lower
            .replace(/\s*\(reversed\)/g, "")
            .replace(/\s*reversed/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")

        return { slug, isReversed }
    }

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
                toast.warning("-1 star for regeneration", {
                    position: "bottom-center",
                })
            } else {
                toast.error("Not enough stars to regenerate")
                return
            }
            setPaidForInterpretation(true)

            // Clear current interpretation
            if (typeof onInterpretationChange === "function") {
                onInterpretationChange("")
            } else {
                setInterpretation(null)
            }

            // Show generating state in parent if provided
            if (typeof onGeneratingChange === "function")
                onGeneratingChange(true)

            // Build the prompt (match initial generation logic), including follow-up context when available
            const cardNames = cards.join(", ")

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

            const prompt = getTarotReadingPrompt({
                question: question || "",
                cards: cardNames,
                isFollowUp,
                previousQuestion,
                previousInterpretation,
            })

            // Generate new interpretation
            const newText = await complete(prompt)
            if (!newText) {
                toast.error("Failed to generate a new interpretation")
                if (typeof onGeneratingChange === "function")
                    onGeneratingChange(false)
                return
            }

            // Persist current interpretation to DB and versions if we have a readingId
            try {
                if (readingId && newText) {
                    await fetch("/api/tarot/update", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            id: readingId,
                            interpretation: newText,
                        }),
                    })
                    await fetch("/api/tarot/versions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            reading_id: readingId,
                            content: newText,
                        }),
                    })
                    // Reload versions list
                    await loadVersions()
                }
            } catch {}

            // Push new interpretation to parent/context
            if (typeof onInterpretationChange === "function") {
                onInterpretationChange(newText)
            } else {
                setInterpretation(newText)
            }
        } catch (error) {
            console.error("Error regenerating interpretation:", error)
        } finally {
            if (typeof onGeneratingChange === "function")
                onGeneratingChange(false)
        }
    }, [
        question,
        cards,
        stars,
        spendStars,
        setPaidForInterpretation,
        setInterpretation,
        onInterpretationChange,
        onGeneratingChange,
        complete,
        loadVersions,
        readingId,
        isFollowUp,
    ])

    const actionOptions = [
        {
            id: "new",
            label: t("buttons.newReading"),
            icon: <Sparkles className='w-6 h-6 text-white' />,
            bg: "linear-gradient(135deg, var(--primary), var(--accent))",
            description: "Start fresh",
            onClick: async () => router.push("/"),
        },
        {
            id: "regen",
            label: (
                <span className='leading-tight text-center'>
                    <span className='block'>{t("buttons.regenerate")}</span>
                    <span className='block text-[10px] text-yellow-300'>
                        -1{" "}
                        <Star
                            className='inline w-3 h-3 text-yellow-300'
                            fill='currentColor'
                        />
                    </span>
                </span>
            ),
            icon: <FaArrowsRotate className='w-6 h-6 text-white' />,
            bg: "linear-gradient(135deg, var(--primary), var(--accent))",
            description: "Get a new interpretation",
            onClick: async () => {
                await handleRegenerate()
            },
        },
        {
            id: "copy-link",
            label: copiedLink ? t("actions.copiedLink") : t("actions.copyLink"),
            icon: copiedLink ? (
                <FaCheck className='w-6 h-6 text-white' />
            ) : (
                <FaLink className='w-6 h-6 text-white' />
            ),
            bg: "linear-gradient(135deg, var(--primary), var(--accent))",
            description: copiedLink
                ? t("actions.linkCopiedDesc")
                : t("actions.shareDesc"),
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
                    console.log("Clipboard API failed, trying fallback:", error)
                }

                // Fallback for Safari and older browsers
                try {
                    const textArea = document.createElement("textarea")
                    textArea.value = link
                    textArea.style.position = "fixed"
                    textArea.style.left = "-999999px"
                    textArea.style.top = "-999999px"
                    document.body.appendChild(textArea)
                    textArea.focus()
                    textArea.select()

                    const successful = document.execCommand("copy")
                    document.body.removeChild(textArea)

                    if (successful) {
                        setCopiedLink(true)
                        window.setTimeout(() => setCopiedLink(false), 2000)
                    } else {
                        // If both methods fail, show the link in an alert
                        alert(`Copy this link: ${link}`)
                    }
                } catch (fallbackError) {
                    console.error("Fallback copy failed:", fallbackError)
                    // Last resort: show the link
                    alert(`Copy this link: ${link}`)
                }
            },
        },
        {
            id: "copy-text",
            label: copiedText
                ? t("actions.copiedLink")
                : t("actions.copyResult"),
            icon: copiedText ? (
                <FaCheck className='w-6 h-6 text-white' />
            ) : (
                <FaRegFileLines className='w-6 h-6 text-white' />
            ),
            bg: "linear-gradient(135deg, var(--primary), var(--accent))",
            description: copiedText
                ? t("actions.textCopiedDesc")
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
                    console.log("Clipboard API failed, trying fallback:", error)
                }

                // Fallback for Safari and older browsers
                try {
                    const textArea = document.createElement("textarea")
                    textArea.value = text
                    textArea.style.position = "fixed"
                    textArea.style.left = "-999999px"
                    textArea.style.top = "-999999px"
                    document.body.appendChild(textArea)
                    textArea.focus()
                    textArea.select()

                    const successful = document.execCommand("copy")
                    document.body.removeChild(textArea)

                    if (successful) {
                        setCopiedText(true)
                        window.setTimeout(() => setCopiedText(false), 2000)
                    } else {
                        // If both methods fail, show the text in an alert
                        alert(`Copy this text: ${text}`)
                    }
                } catch (fallbackError) {
                    console.error("Fallback copy failed:", fallbackError)
                    // Last resort: show the text
                    alert(`Copy this text: ${text}`)
                }
            },
        },
        {
            id: "download",
            label: t("actions.download"),
            icon: <FaDownload className='w-6 h-6 text-white' />,
            bg: "linear-gradient(135deg, var(--primary), var(--accent))",
            description: t("actions.downloadDesc"),
            onClick: async () => {}, // handled by Popover wrapper
        },
        {
            id: "versions",
            label: t("actions.versions"),
            icon: <FaRegFileLines className='w-6 h-6 text-white' />,
            bg: "linear-gradient(135deg, var(--primary), var(--accent))",
            description: t("actions.versionsDesc"),
            onClick: async () => {},
        },
        {
            id: "report",
            label: t("actions.report"),
            icon: <FaFlag className='w-6 h-6 text-white' />,
            bg: "linear-gradient(135deg, var(--primary), var(--accent))",
            description: t("actions.reportDesc"),
            onClick: async () => setShowReport(true),
        },
        voteState !== "up"
            ? {
                  id: "vote-up",
                  label: t("actions.voteUp"),
                  icon: <FaThumbsUp className='w-6 h-6 text-white' />,
                  bg: "linear-gradient(135deg, var(--primary), var(--accent))",
                  description: t("actions.voteUpDesc"),
                  onClick: async () => {
                      setVoteState("up")
                      // TODO: call /api/feedbacks to upsert vote_up=true
                  },
              }
            : {
                  id: "vote-up-cancel",
                  label: t("actions.voteUp"),
                  icon: <FaXmark className='w-6 h-6 text-white' />,
                  bg: "linear-gradient(135deg, var(--primary), var(--accent))",
                  description: t("actions.removeVoteUpDesc"),
                  onClick: async () => {
                      setVoteState(null)
                      // TODO: call /api/feedbacks to remove vote
                  },
              },
        voteState !== "down"
            ? {
                  id: "vote-down",
                  label: t("actions.voteDown"),
                  icon: <FaThumbsDown className='w-6 h-6 text-white' />,
                  bg: "linear-gradient(135deg, var(--primary), var(--accent))",
                  description: t("actions.voteDownDesc"),
                  onClick: async () => {
                      setVoteState("down")
                      // TODO: call /api/feedbacks to upsert vote_down=true
                  },
              }
            : {
                  id: "vote-down-cancel",
                  label: t("actions.voteDown"),
                  icon: <FaXmark className='w-6 h-6 text-white' />,
                  bg: "linear-gradient(135deg, var(--primary), var(--accent))",
                  description: t("actions.removeVoteDownDesc"),
                  onClick: async () => {
                      setVoteState(null)
                      // TODO: call /api/feedbacks to remove vote
                  },
              },
        {
            id: "feedback",
            label: t("actions.feedback"),
            icon: <FaComment className='w-6 h-6 text-white' />,
            bg: "linear-gradient(135deg, var(--primary), var(--accent))",
            description: t("actions.feedbackDesc"),
            onClick: async () => setShowFeedback(true),
        },
    ]

    return (
        <div className='relative overflow-hidden group'>
            {/* Hidden DOM element for image generation - positioned absolute off-screen */}
            <div
                style={{
                    position: "absolute",
                    top: -9999,
                    left: -9999,
                    width: 1080,
                    height: 1350,
                    overflow: "hidden",
                }}
            >
                <div
                    ref={imageRef}
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        padding: 64,
                        background:
                            "radial-gradient(1400px 900px at 50% 0%, rgba(99,102,241,0.26) 0%, rgba(168,85,247,0.18) 35%, rgba(10,8,26,1) 72%), radial-gradient(1200px 900px at 50% 100%, rgba(234,179,8,0.18) 0%, rgba(10,8,26,1) 60%)",
                        color: "#ffffff",
                        fontFamily:
                            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial",
                        position: "relative",
                    }}
                >
                    {/* soft glow blobs */}
                    <div
                        style={{
                            position: "absolute",
                            top: -140,
                            left: -160,
                            width: 520,
                            height: 520,
                            borderRadius: 9999,
                            background:
                                "radial-gradient(circle at 30% 30%, rgba(234,179,8,0.40), rgba(234,179,8,0.00) 60%)",
                            filter: "blur(24px)",
                            opacity: 0.6,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: -220,
                            right: -200,
                            width: 720,
                            height: 720,
                            borderRadius: 9999,
                            background:
                                "radial-gradient(circle at 30% 30%, rgba(56,189,248,0.32), rgba(56,189,248,0.00) 60%)",
                            filter: "blur(30px)",
                            opacity: 0.55,
                        }}
                    />

                    {/* background card aura */}
                    {(cards || [])
                        .slice(0, 3)
                        .map((cName) => {
                            const { slug, isReversed } = slugifyCardName(cName)
                            // Use direct path for client side
                            const src = `/assets/rider-waite-tarot/${slug}.png`
                            return { name: cName, slug, isReversed, src }
                        })
                        .map((c, idx) => {
                            const positions: Array<{
                                top?: number
                                bottom?: number
                                left?: number
                                right?: number
                                rotate: number
                            }> = [
                                { top: 120, left: 60, rotate: -14 },
                                { top: 150, right: 80, rotate: 16 },
                                { bottom: 560, left: 80, rotate: -10 },
                            ]
                            const p = positions[idx % positions.length]
                            return (
                                <img
                                    key={`bg-${c.slug}-${idx}`}
                                    src={c.src}
                                    width={260}
                                    height={420}
                                    style={{
                                        position: "absolute",
                                        ...(p.top != null
                                            ? { top: p.top }
                                            : {}),
                                        ...(p.bottom != null
                                            ? { bottom: p.bottom }
                                            : {}),
                                        ...(p.left != null
                                            ? { left: p.left }
                                            : {}),
                                        ...(p.right != null
                                            ? { right: p.right }
                                            : {}),
                                        transform: `rotate(${p.rotate}deg) scale(0.9)`,
                                        opacity: 0.14,
                                    }}
                                />
                            )
                        })}

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            position: "relative",
                            zIndex: 10,
                        }}
                    >
                        {/* Brand */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                marginBottom: 26,
                            }}
                        >
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 9999,
                                    background:
                                        "linear-gradient(135deg, rgba(234,179,8,0.95), rgba(56,189,248,0.75))",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 900,
                                    color: "#0a081a",
                                    boxShadow:
                                        "0 14px 40px rgba(234,179,8,0.22)",
                                }}
                            >
                                <svg
                                    width='24'
                                    height='24'
                                    viewBox='0 0 24 24'
                                    fill='currentColor'
                                    xmlns='http://www.w3.org/2000/svg'
                                >
                                    <path d='M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z' />
                                </svg>
                            </div>
                            <div
                                style={{
                                    fontSize: 30,
                                    fontWeight: 900,
                                    letterSpacing: -0.4,
                                }}
                            >
                                Asking Fate
                            </div>
                        </div>

                        {/* Question card */}
                        <div
                            style={{
                                borderRadius: 28,
                                padding: 34,
                                border: "1px solid rgba(255,255,255,0.12)",
                                background:
                                    "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03) 45%, rgba(56,189,248,0.06) 90%)",
                                boxShadow:
                                    "0 18px 70px -30px rgba(56,189,248,0.55)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 20,
                                    opacity: 0.85,
                                    marginBottom: 12,
                                }}
                            >
                                Your question
                            </div>
                            <div
                                style={{
                                    fontFamily:
                                        "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                                    fontSize: 44,
                                    fontWeight: 900,
                                    lineHeight: 1.15,
                                    textShadow:
                                        "0 10px 30px rgba(56,189,248,0.22)",
                                }}
                            >
                                {`“${
                                    (question || "").length > 140
                                        ? (question || "")
                                              .slice(0, 139)
                                              .trimEnd() + "…"
                                        : question || ""
                                }”`}
                            </div>

                            {/* Selected cards row */}
                            <div
                                style={{
                                    display: "flex",
                                    gap: 18,
                                    flexWrap: "wrap",
                                    marginTop: 26,
                                    alignItems: "flex-start",
                                }}
                            >
                                {(cards || [])
                                    .slice(0, 3)
                                    .map((cName) => {
                                        const { slug, isReversed } =
                                            slugifyCardName(cName)
                                        const src = `/assets/rider-waite-tarot/${slug}.png`
                                        return {
                                            name: cName,
                                            slug,
                                            isReversed,
                                            src,
                                        }
                                    })
                                    .map((c, idx) => (
                                        <div
                                            key={`card-${c.slug}-${idx}`}
                                            style={{
                                                width: 170,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 10,
                                                alignItems: "center",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 14,
                                                    padding: "8px 10px",
                                                    borderRadius: 9999,
                                                    background:
                                                        "rgba(255,255,255,0.12)",
                                                    border: "1px solid rgba(99,102,241,0.22)",
                                                    color: "rgba(255,255,255,0.92)",
                                                    textAlign: "center",
                                                    maxWidth: 170,
                                                    overflow: "hidden",
                                                    whiteSpace: "nowrap",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {c.name}
                                            </div>

                                            <div
                                                style={{
                                                    width: 150,
                                                    height: 240,
                                                    borderRadius: 18,
                                                    position: "relative",
                                                    overflow: "hidden",
                                                    boxShadow:
                                                        "0 20px 60px -35px rgba(234,179,8,0.65)",
                                                    border: "1px solid rgba(255,255,255,0.12)",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        inset: -30,
                                                        background:
                                                            "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.35), rgba(99,102,241,0.0) 55%), radial-gradient(circle at 70% 80%, rgba(234,179,8,0.25), rgba(234,179,8,0.0) 60%)",
                                                        filter: "blur(18px)",
                                                        opacity: 0.9,
                                                    }}
                                                />
                                                <img
                                                    src={c.src}
                                                    width={150}
                                                    height={240}
                                                    style={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        objectFit: "cover",
                                                        transform: c.isReversed
                                                            ? "rotate(180deg)"
                                                            : "rotate(0deg)",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Interpretation card */}
                        <div
                            style={{
                                marginTop: 28,
                                borderRadius: 28,
                                padding: 32,
                                background:
                                    "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.14) 35%, rgba(34,211,238,0.12) 70%)",
                                boxShadow:
                                    "0 20px 70px -35px rgba(56,189,248,0.55)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                position: "relative",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 9999,
                                        background: "rgba(234,179,8,0.18)",
                                        border: "1px solid rgba(234,179,8,0.25)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "rgba(255,255,255,0.9)",
                                        fontWeight: 900,
                                    }}
                                >
                                    <svg
                                        width='24'
                                        height='24'
                                        viewBox='0 0 24 24'
                                        fill='currentColor'
                                        xmlns='http://www.w3.org/2000/svg'
                                    >
                                        <path d='M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z' />
                                    </svg>
                                </div>
                                <div
                                    style={{
                                        fontSize: 26,
                                        fontWeight: 900,
                                        letterSpacing: -0.2,
                                    }}
                                >
                                    Your reading
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "block",
                                    fontSize: 28,
                                    lineHeight: 1.5,
                                    whiteSpace: "pre-wrap",
                                    color: "rgba(255,255,255,0.92)",
                                }}
                            >
                                {`${
                                    (interpretation || "").length > 900
                                        ? (interpretation || "")
                                              .slice(0, 899)
                                              .trimEnd() + "…"
                                        : interpretation || "—"
                                }`}
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: 28,
                                opacity: 0.85,
                                fontSize: 18,
                            }}
                        >
                            <div>Generated with Asking Fate</div>
                            <div>askingfate.com</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide-up loader for download */}
            {isDownloading && (
                <div className='fixed bottom-0 left-0 right-0 z-50 animate-slide-up bg-black/60 backdrop-blur-sm p-4 text-center text-white'>
                    Preparing your {"content"}...
                </div>
            )}
            {/* Background gradient with animation */}
            <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-sky-500/5 to-primary/5 rounded-xl transition-all duration-500 group-hover:from-primary/10 group-hover:via-sky-500/10 group-hover:to-primary/10' />

            {/* Animated border */}
            <div className='absolute inset-0 rounded-xl border border-primary/20 group-hover:border-primary/40 transition-all duration-500' />

            {/* Content */}
            <div className='relative'>
                {/* Header with padding */}
                <div className='px-6 pt-6 pb-4'>
                    <div className='flex items-center gap-3 mb-6 animate-fade-up'>
                        <div className='p-2 rounded-full bg-primary/20 backdrop-blur-sm group-hover:bg-primary/30 transition-all duration-300'>
                            <Settings className='w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300' />
                        </div>
                        <div>
                            <h3 className='font-serif font-semibold text-lg text-foreground group-hover:text-primary/90 transition-colors duration-300'>
                                {t("actionsHeader")}
                            </h3>
                            <p className='text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300'>
                                {t("actionsDesc")}
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
                            <SwiperSlide key={action.id}>
                                {action.id === "download" ? (
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
                                                    style={{
                                                        background: action.bg,
                                                    }}
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
                                                        if (!imageRef.current) return
                                                        try {
                                                            setIsDownloading(true)
                                                            const dataUrl =
                                                                await toPng(
                                                                    imageRef.current,
                                                                    {
                                                                        cacheBust: true,
                                                                        pixelRatio: 2,
                                                                    }
                                                                )
                                                            const ts =
                                                                new Date()
                                                                    .toISOString()
                                                                    .replace(
                                                                        /[:.]/g,
                                                                        "-"
                                                                    )
                                                            const a =
                                                                document.createElement(
                                                                    "a"
                                                                )
                                                            a.href = dataUrl
                                                            a.download = `reading-${ts}.png`
                                                            document.body.appendChild(
                                                                a
                                                            )
                                                            a.click()
                                                            a.remove()
                                                        } catch (err) {
                                                            console.error(
                                                                "Failed to generate image client-side:",
                                                                err
                                                            )
                                                            toast.error(
                                                                "Failed to generate image. Please try again."
                                                            )
                                                        } finally {
                                                            setIsDownloading(false)
                                                        }
                                                    }}
                                                >
                                                    Download Image
                                                </button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                ) : action.id === "versions" ? (
                                    versions.length > 0 ? (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type='button'
                                                    className='group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg w-full'
                                                    style={{
                                                        animationDelay: `${index * 50}ms`,
                                                        animationFillMode:
                                                            "both",
                                                    }}
                                                >
                                                    <div
                                                        className='relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-110'
                                                        style={{
                                                            background:
                                                                action.bg,
                                                        }}
                                                    >
                                                        {action.icon}
                                                        <div className='absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                                    </div>
                                                    <span className='text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300 text-center leading-tight'>
                                                        {typeof action.label ===
                                                        "string"
                                                            ? action.label
                                                            : "Versions"}
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
                                                                if (
                                                                    typeof onInterpretationChange ===
                                                                    "function"
                                                                )
                                                                    onInterpretationChange(
                                                                        v.content
                                                                    )
                                                                else
                                                                    setInterpretation(
                                                                        v.content
                                                                    )
                                                            }}
                                                        >
                                                            {new Date(
                                                                v.created_at
                                                            ).toLocaleString()}
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
                                                animationFillMode: "both",
                                            }}
                                        >
                                            <div
                                                className='relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg'
                                                style={{
                                                    background: action.bg,
                                                }}
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
                        <AlertDialogTitle>
                            {t("dialogs.report.title")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("dialogs.report.desc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className='space-y-2'>
                        <select
                            className='w-full bg-background border border-border/40 rounded-md p-2'
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                        >
                            <option value=''>
                                {t("dialogs.report.reasons.select")}
                            </option>
                            <option value='inappropriate'>
                                {t("dialogs.report.reasons.inappropriate")}
                            </option>
                            <option value='spam'>
                                {t("dialogs.report.reasons.spam")}
                            </option>
                            <option value='harassment'>
                                {t("dialogs.report.reasons.harassment")}
                            </option>
                            <option value='privacy'>
                                {t("dialogs.report.reasons.privacy")}
                            </option>
                            <option value='other'>
                                {t("dialogs.report.reasons.other")}
                            </option>
                        </select>
                        {reportReason === "other" && (
                            <textarea
                                className='w-full bg-background border border-border/40 rounded-md p-2'
                                placeholder={t("dialogs.report.placeholder")}
                                value={reportDetails}
                                onChange={(e) =>
                                    setReportDetails(e.target.value)
                                }
                            />
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowReport(false)}>
                            {t("dialogs.report.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (!reportReason) return
                                try {
                                    const res = await fetch("/api/reports", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
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
                            {t("dialogs.report.submit")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Feedback dialog */}
            <AlertDialog open={showFeedback}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t("dialogs.feedback.title")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("dialogs.feedback.desc")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className='flex items-center justify-center gap-2 py-2'>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                key={n}
                                type='button'
                                onClick={() => setRating(n)}
                                className={`w-8 h-8 rounded-full ${rating >= n ? "bg-yellow-400" : "bg-zinc-700"}`}
                                aria-label={`Rate ${n}`}
                            />
                        ))}
                    </div>
                    <textarea
                        className='w-full bg-background border border-border/40 rounded-md p-2'
                        placeholder={t("dialogs.feedback.placeholder")}
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setShowFeedback(false)}
                        >
                            {t("dialogs.feedback.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                try {
                                    const res = await fetch("/api/feedbacks", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
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
                            {t("dialogs.feedback.submit")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
