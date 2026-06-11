"use client"

import {
    useState,
    useCallback,
    useEffect,
    useRef,
    cloneElement,
    isValidElement,
    type ReactElement,
    type ReactNode,
} from "react"
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
    FaCopy,
} from "react-icons/fa6"
import { Star } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Settings } from "lucide-react"
import { useTarot } from "@/contexts/tarot-context"
import { useStars } from "@/contexts/stars-context"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import ReadingDownloadDialog from "@/components/share/reading-download-dialog"
import {
    tarotInterpretationSchema,
    type TarotInterpretation,
} from "@/lib/tarot/schema"
import {
    AlertDialog,
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { MoreHorizontal } from "lucide-react"

export interface ActionSectionProps {
    question?: string
    cards?: string[]
    interpretation?: string
    readingId?: string
    onInterpretationChange?: (text: string) => void
    onGeneratingChange?: (loading: boolean) => void
    onStreamingObjectChange?: (obj: Partial<TarotInterpretation> | null) => void
    variant?: "full" | "compact" | "embedded"
    mode?: "tarot" | "horoscope"
    onRegenerateHoroscope?: (messageId: string) => void
    onRegenerateTarot?: (messageId: string) => void
    messageId?: string
    insights?: string[]
    conclusion?: string
    spreadType?: string
    cardsFull?: Array<{
        id: number
        name: string
        image: string
        meaning: string
        isReversed: boolean
    }>
    assistantText?: string
    /** Rich tarot fields forwarded to the share-image renderer (story layout). */
    headline?: string
    subtitle?: string
    keyMessage?: string
    detailedHtml?: string
    /** When set (e.g. from layout: row width − pill width − gap), drives how many icons show in `compact`. */
    compactAvailableWidthPx?: number
}

const COMPACT_ACTION_BUTTON_PX = 32
const COMPACT_ACTION_GAP_PX = 6

function getCompactVisibleActionCountFromWidth(availablePx: number, total: number) {
    if (total <= 0) return 0
    if (!Number.isFinite(availablePx) || availablePx <= 0) return 1

    const rowWidth = (n: number) =>
        n * COMPACT_ACTION_BUTTON_PX +
        Math.max(0, n - 1) * COMPACT_ACTION_GAP_PX

    for (let n = total; n >= 1; n--) {
        const need =
            n >= total
                ? rowWidth(n)
                : rowWidth(n + 1)
        if (need <= availablePx) return n
    }
    return 1
}

function getCompactVisibleActionCountViewportFallback(width: number) {
    if (width < 480) return 3
    if (width < 640) return 4
    if (width < 768) return 5
    if (width < 1024) return 6
    return 6
}

export default function ActionSection({
    question: propQuestion,
    cards: propCards,
    interpretation: propInterpretation,
    readingId: propReadingId,
    onInterpretationChange,
    onGeneratingChange,
    onStreamingObjectChange,
    variant = "full",
    mode = "tarot",
    onRegenerateHoroscope,
    onRegenerateTarot,
    messageId,
    insights: propInsights,
    conclusion: propConclusion,
    spreadType: propSpreadType,
    cardsFull: propCardsFull,
    assistantText: propAssistantText,
    headline: propHeadline,
    subtitle: propSubtitle,
    keyMessage: propKeyMessage,
    detailedHtml: propDetailedHtml,
    compactAvailableWidthPx: propCompactAvailableWidthPx,
}: ActionSectionProps = {}) {
    const t = useTranslations("ReadingPage.interpretation")
    const {
        question: contextQuestion,
        selectedCards,
        interpretation: contextInterpretation,
        setInterpretation,
        setPaidForInterpretation,
        isFollowUp,
        readingType,
    } = useTarot()
    const question = propQuestion || contextQuestion
    const cards = propCards || selectedCards.map((c) => c.meaning)
    const interpretation = propInterpretation || contextInterpretation
    const readingId = propReadingId

    const [copiedLink, setCopiedLink] = useState(false)
    const [copiedText, setCopiedText] = useState(false)
    const { user, session } = useAuth()
    const { spendStars, stars } = useStars()
    const [downloadOpen, setDownloadOpen] = useState(false)
    const [showReport, setShowReport] = useState(false)
    const [reportReason, setReportReason] = useState("")
    const [reportDetails, setReportDetails] = useState("")
    const [feedbackComment, setFeedbackComment] = useState("")
    const [voteState, setVoteState] = useState<"up" | "down" | null>(null)
    const [showFeedback, setShowFeedback] = useState(false)
    const [rating, setRating] = useState<number>(0)
    const [versionsOpen, setVersionsOpen] = useState(false)
    const [viewportWidth, setViewportWidth] = useState(0)
    const navGuardRef = useRef<HTMLDivElement>(null)
    const [versions, setVersions] = useState<
        Array<{
            id: number
            reading_id: string
            content: string
            created_at: string
        }>
    >([])

    useEffect(() => {
        if (typeof window === "undefined") return
        const handleResize = () => setViewportWidth(window.innerWidth)
        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const loadVersions = useCallback(async () => {
        try {
            if (!readingId) return
            const headers: Record<string, string> = {}
            if (session?.access_token) {
                headers["Authorization"] = `Bearer ${session.access_token}`
            }

            const res = await fetch(
                `/api/tarot/versions?readingId=${readingId}`,
                { headers },
            )
            if (!res.ok) return
            const data = await res.json()
            setVersions(Array.isArray(data.versions) ? data.versions : [])
        } catch {}
    }, [readingId, session?.access_token])

    useEffect(() => {
        void loadVersions()
    }, [loadVersions])

    useEffect(() => {
        if (!interpretation || !readingId) return
        const timer = setTimeout(() => {
            void loadVersions()
        }, 1500)
        return () => clearTimeout(timer)
    }, [interpretation, readingId, loadVersions])

    const contentType = mode === "horoscope" ? "horoscope" : "tarot"

    useEffect(() => {
        if (!readingId) return
        fetch(
            `/api/reactions?contentId=${readingId}&contentType=${contentType}`,
        )
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d?.reaction === "like") setVoteState("up")
                else if (d?.reaction === "dislike") setVoteState("down")
            })
            .catch(() => {})
    }, [readingId, contentType])

    const persistVote = useCallback(
        (next: "up" | "down" | null) => {
            setVoteState(next)
            if (!readingId) return
            const reaction =
                next === "up" ? "like" : next === "down" ? "dislike" : null
            fetch("/api/reactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content_id: readingId,
                    content_type: contentType,
                    reaction,
                }),
            }).catch(() => {})
        },
        [readingId, contentType],
    )

    const { submit, object } = useObject({
        api: "/api/interpret-cards/question",
        schema: tarotInterpretationSchema,
        onFinish: async ({
            object,
        }: {
            object: TarotInterpretation | undefined
        }) => {
            if (object) {
                if (typeof onStreamingObjectChange === "function")
                    onStreamingObjectChange(null)
                const completion = `${object.keywords}\n\n${object.interpretation}`
                if (typeof onInterpretationChange === "function") {
                    onInterpretationChange(completion)
                } else {
                    setInterpretation(completion)
                }

                try {
                    if (readingId && completion) {
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
                                interpretation: completion,
                            }),
                        })
                        await fetch("/api/tarot/versions", {
                            method: "POST",
                            headers,
                            body: JSON.stringify({
                                reading_id: readingId,
                                content: completion,
                            }),
                        })
                        await loadVersions()
                    }
                } catch {}

                if (typeof onGeneratingChange === "function")
                    onGeneratingChange(false)
            }
        },
        onError: () => {
            if (typeof onStreamingObjectChange === "function")
                onStreamingObjectChange(null)
            toast.error("Failed to generate a new interpretation")
            if (typeof onGeneratingChange === "function")
                onGeneratingChange(false)
        },
    })

    const { setCardInsights } = useTarot()

    // Sync card insights to context while streaming
    useEffect(() => {
        if (object?.cardInsights) {
            const insights = object.cardInsights.filter(
                (insight): insight is string => typeof insight === "string",
            )
            if (insights.length > 0) {
                setCardInsights(insights)
            }
        }
    }, [object?.cardInsights, setCardInsights])

    // Sync streaming object to parent for regenerate flow (so parent can show streaming text)
    useEffect(() => {
        if (typeof onStreamingObjectChange === "function") {
            onStreamingObjectChange(
                object ? (object as Partial<TarotInterpretation>) : null,
            )
        }
    }, [object, onStreamingObjectChange])

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
            e.stopPropagation()
        }
        el.addEventListener("wheel", onWheel, { passive: true })
        return () => {
            el.removeEventListener("wheel", onWheel)
        }
    }, [])

    const ensureShareLink = useCallback(async (): Promise<string | null> => {
        try {
            if (readingId && !messageId) {
                const origin =
                    typeof window !== "undefined"
                        ? window.location.origin
                        : "https://dooduang.ai"
                return `${origin}/tarot/${readingId}`
            }

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
                    const origin =
                        typeof window !== "undefined"
                            ? window.location.origin
                            : "https://dooduang.ai"
                    return `${origin}/share/${checkData.id}`
                }
            }

            const res = await fetch("/api/interpretations/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    cards: cards,
                    interpretation,
                    user_id: user?.id ?? null,
                    assistant_text: propAssistantText ?? null,
                    insights: propInsights ?? null,
                    conclusion: propConclusion ?? null,
                    spread_type: propSpreadType ?? null,
                    cards_full: propCardsFull ?? null,
                }),
            })
            if (!res.ok) return null
            const { id } = await res.json()
            const origin =
                typeof window !== "undefined"
                    ? window.location.origin
                    : "https://dooduang.ai"
            return `${origin}/share/${id}`
        } catch {
            return null
        }
    }, [
        readingId,
        messageId,
        question,
        cards,
        interpretation,
        user?.id,
        propAssistantText,
        propInsights,
        propConclusion,
        propSpreadType,
        propCardsFull,
    ])

    const handleRegenerate = useCallback(async () => {
        try {
            if (!Number.isFinite(stars as number) || (stars as number) < 1) {
                return
            }

            const ok = await spendStars(1)
            if (ok) {
                toast.warning("-1 star for regeneration", {
                    position: "bottom-center",
                })
            } else {
                toast.error("Not enough stars to regenerate")
                return
            }

            if (
                mode === "horoscope" &&
                typeof onRegenerateHoroscope === "function" &&
                messageId
            ) {
                onRegenerateHoroscope(messageId)
                return
            }

            if (typeof onRegenerateTarot === "function" && messageId) {
                onRegenerateTarot(messageId)
                return
            }

            setPaidForInterpretation(true)

            if (typeof onInterpretationChange === "function") {
                onInterpretationChange("")
            } else {
                setInterpretation(null)
            }

            if (typeof onGeneratingChange === "function")
                onGeneratingChange(true)

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
                question: question || "",
                cards: cardArray,
                readingType: readingType || null,
                isFollowUp,
                previousQuestion,
                previousInterpretation,
            })
        } catch (error) {
            console.error("Error regenerating interpretation:", error)
            if (typeof onGeneratingChange === "function")
                onGeneratingChange(false)
        }
    }, [
        mode,
        onRegenerateHoroscope,
        onRegenerateTarot,
        messageId,
        question,
        cards,
        stars,
        spendStars,
        setPaidForInterpretation,
        setInterpretation,
        onInterpretationChange,
        onGeneratingChange,
        submit,
        isFollowUp,
        readingType,
    ])

    const actionOptions = [
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
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(link)
                        setCopiedLink(true)
                        window.setTimeout(() => setCopiedLink(false), 2000)
                        return
                    }
                } catch (error) {
                    console.log("Clipboard API failed, trying fallback:", error)
                }

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
                        alert(`Copy this link: ${link}`)
                    }
                } catch (fallbackError) {
                    console.error("Fallback copy failed:", fallbackError)
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
                <FaCopy className='w-6 h-6 text-white' />
            ),
            bg: "linear-gradient(135deg, var(--primary), var(--accent))",
            description: copiedText
                ? t("actions.textCopiedDesc")
                : "Copy interpretation",
            onClick: async () => {
                const text = interpretation ? String(interpretation) : ""
                if (!text) return

                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(text)
                        setCopiedText(true)
                        window.setTimeout(() => setCopiedText(false), 2000)
                        return
                    }
                } catch (error) {
                    console.log("Clipboard API failed, trying fallback:", error)
                }

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
                        alert(`Copy this text: ${text}`)
                    }
                } catch (fallbackError) {
                    console.error("Fallback copy failed:", fallbackError)
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
                      persistVote("up")
                  },
              }
            : {
                  id: "vote-up-cancel",
                  label: t("actions.voteUp"),
                  icon: <FaXmark className='w-6 h-6 text-white' />,
                  bg: "linear-gradient(135deg, var(--primary), var(--accent))",
                  description: t("actions.removeVoteUpDesc"),
                  onClick: async () => {
                      persistVote(null)
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
                      persistVote("down")
                  },
              }
            : {
                  id: "vote-down-cancel",
                  label: t("actions.voteDown"),
                  icon: <FaXmark className='w-6 h-6 text-white' />,
                  bg: "linear-gradient(135deg, var(--primary), var(--accent))",
                  description: t("actions.removeVoteDownDesc"),
                  onClick: async () => {
                      persistVote(null)
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

    const renderIcon = (icon: ReactNode) =>
        isValidElement(icon)
            ? cloneElement(icon as ReactElement<{ className?: string }>, {
                  className: "w-4 h-4 text-white",
              })
            : icon

    const compactPriorityOrder = [
        "regen",
        "download",
        "copy-link",
        "versions",
        "copy-text",
        "vote-up",
        "vote-up-cancel",
        "vote-down",
        "vote-down-cancel",
        "report",
        "feedback",
    ]
    const compactPriorityMap = new Map(
        compactPriorityOrder.map((id, index) => [id, index]),
    )
    const compactActionOptions = [...actionOptions].sort((a, b) => {
        const aPriority = compactPriorityMap.get(a.id) ?? 999
        const bPriority = compactPriorityMap.get(b.id) ?? 999
        return aPriority - bPriority
    })
    const compactVisibleCount =
        propCompactAvailableWidthPx !== undefined
            ? getCompactVisibleActionCountFromWidth(
                  propCompactAvailableWidthPx,
                  compactActionOptions.length,
              )
            : getCompactVisibleActionCountViewportFallback(viewportWidth)
    const compactVisibleActionOptions = compactActionOptions.slice(
        0,
        compactVisibleCount,
    )
    const compactOverflowActionOptions = compactActionOptions.slice(
        compactVisibleCount,
    )
    const compactButtonClass =
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-accent/30 bg-accent/40 text-white transition hover:scale-105 hover:border-accent/45 hover:bg-accent/50"

    const getCompactActionLabel = (action: (typeof actionOptions)[number]) =>
        typeof action.label === "string"
            ? action.label
            : action.id === "regen"
              ? t("buttons.regenerate")
              : action.id === "versions"
                ? t("actions.versions")
                : action.id

    const handleCompactActionClick = (
        action: (typeof actionOptions)[number],
    ) => {
        if (action.id === "download") {
            setDownloadOpen(true)
            return
        }
        if (action.id === "versions") {
            setVersionsOpen(true)
            return
        }
        void action.onClick?.()
    }

    const downloadDialogNode = (
        <ReadingDownloadDialog
            open={downloadOpen}
            onOpenChange={setDownloadOpen}
            question={question || undefined}
            cards={cards}
            interpretation={interpretation || undefined}
            headline={propHeadline}
            subtitle={propSubtitle}
            keyMessage={propKeyMessage}
            detailedHtml={propDetailedHtml}
            insights={propInsights}
        />
    )

    if (variant === "compact") {
        return (
            <div className='relative'>
                <div className='flex items-center gap-1.5'>
                    {compactVisibleActionOptions.map((action) => (
                        <button
                            key={action.id}
                            type='button'
                            onClick={() => handleCompactActionClick(action)}
                            className={compactButtonClass}
                            title={getCompactActionLabel(action)}
                            aria-label={getCompactActionLabel(action)}
                            disabled={
                                action.id === "versions" &&
                                versions.length === 0
                            }
                        >
                            {renderIcon(action.icon)}
                        </button>
                    ))}
                    {compactOverflowActionOptions.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type='button'
                                    className={compactButtonClass}
                                    aria-label='More actions'
                                    title='More actions'
                                >
                                    <MoreHorizontal className='h-4 w-4' />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align='end'
                                className='w-52 border-white/10 bg-[#0b1020]/95 text-white backdrop-blur-xl'
                            >
                                {compactOverflowActionOptions.map((action) => (
                                    <DropdownMenuItem
                                        key={action.id}
                                        onClick={() =>
                                            handleCompactActionClick(action)
                                        }
                                        disabled={
                                            action.id === "versions" &&
                                            versions.length === 0
                                        }
                                        className='gap-2 text-white/85 focus:bg-white/10 focus:text-white'
                                    >
                                        {renderIcon(action.icon)}
                                        {getCompactActionLabel(action)}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {downloadDialogNode}

                <Sheet open={versionsOpen} onOpenChange={setVersionsOpen}>
                    <SheetContent
                        side='bottom'
                        className='max-h-[70vh] overflow-auto border border-white/10 bg-[#0b1020]/95 text-white backdrop-blur-xl'
                    >
                        <SheetHeader>
                            <SheetTitle>{t("actions.versions")}</SheetTitle>
                            <SheetDescription>
                                {t("actions.versionsDesc")}
                            </SheetDescription>
                        </SheetHeader>
                        <div className='mt-4 space-y-2'>
                            {versions.length > 0 ? (
                                versions.map((v, index) => {
                                    const isCurrent =
                                        interpretation?.trim() ===
                                        v.content?.trim()
                                    return (
                                        <button
                                            key={v.id}
                                            type='button'
                                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                                                isCurrent
                                                    ? "bg-white/10 font-medium text-white"
                                                    : "bg-white/5 text-white/75 hover:bg-white/10"
                                            }`}
                                            onClick={() => {
                                                if (
                                                    typeof onInterpretationChange ===
                                                    "function"
                                                ) {
                                                    onInterpretationChange(
                                                        v.content,
                                                    )
                                                } else {
                                                    setInterpretation(v.content)
                                                }
                                                setVersionsOpen(false)
                                            }}
                                        >
                                            {`Version ${index + 1}${isCurrent ? " (current)" : ""}`}
                                        </button>
                                    )
                                })
                            ) : (
                                <p className='text-sm text-white/60'>
                                    {t("actions.versionsDesc")}
                                </p>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>

                <AlertDialog open={showReport} onOpenChange={setShowReport}>
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
                                onChange={(e) =>
                                    setReportReason(e.target.value)
                                }
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
                            {reportReason && (
                                <textarea
                                    className='w-full bg-background border border-border/40 rounded-md p-2 min-h-[80px]'
                                    placeholder={t(
                                        "dialogs.report.placeholder",
                                    )}
                                    value={reportDetails}
                                    onChange={(e) =>
                                        setReportDetails(e.target.value)
                                    }
                                />
                            )}
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>
                                {t("dialogs.report.cancel")}
                            </AlertDialogCancel>
                            <button
                                type='button'
                                disabled={!reportReason}
                                className='inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
                                onClick={async () => {
                                    try {
                                        const res = await fetch(
                                            "/api/reports",
                                            {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type":
                                                        "application/json",
                                                },
                                                body: JSON.stringify({
                                                    reading_id: readingId,
                                                    reason: reportReason,
                                                    details:
                                                        reportDetails ||
                                                        undefined,
                                                }),
                                            },
                                        )
                                        if (res.ok) {
                                            setShowReport(false)
                                            setReportReason("")
                                            setReportDetails("")
                                        }
                                    } catch {}
                                }}
                            >
                                {t("dialogs.report.submit")}
                            </button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showFeedback} onOpenChange={setShowFeedback}>
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
                                    className={`w-8 h-8 rounded-full transition-colors ${rating >= n ? "bg-yellow-400" : "bg-zinc-700 hover:bg-zinc-600"}`}
                                    aria-label={`Rate ${n}`}
                                />
                            ))}
                        </div>
                        <textarea
                            className='w-full bg-background border border-border/40 rounded-md p-2'
                            placeholder={t("dialogs.feedback.placeholder")}
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                        />
                        <AlertDialogFooter>
                            <AlertDialogCancel>
                                {t("dialogs.feedback.cancel")}
                            </AlertDialogCancel>
                            <button
                                type='button'
                                disabled={rating === 0}
                                className='inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
                                onClick={async () => {
                                    try {
                                        const res = await fetch(
                                            "/api/feedbacks",
                                            {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type":
                                                        "application/json",
                                                },
                                                body: JSON.stringify({
                                                    reading_id: readingId,
                                                    rating,
                                                    comment:
                                                        feedbackComment ||
                                                        undefined,
                                                }),
                                            },
                                        )
                                        if (res.ok) {
                                            setShowFeedback(false)
                                            setFeedbackComment("")
                                            setRating(0)
                                        }
                                    } catch {}
                                }}
                            >
                                {t("dialogs.feedback.submit")}
                            </button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )
    }

    if (variant === "embedded") {
        return (
            <div className='relative'>
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
                        slidesPerView={5.5}
                        breakpoints={{
                            640: { slidesPerView: 6.5 },
                            768: { slidesPerView: 6.5 },
                            1024: { slidesPerView: 8 },
                            1280: { slidesPerView: 9.5 },
                            1536: { slidesPerView: 10.5 },
                        }}
                        spaceBetween={4}
                        className='py-1'
                    >
                        {actionOptions.map((action, index) => {
                            const labelText =
                                typeof action.label === "string"
                                    ? action.label
                                    : action.id === "regen"
                                      ? t("buttons.regenerate")
                                      : action.id
                            return (
                                <SwiperSlide key={action.id}>
                                    {action.id === "download" ? (
                                        <button
                                            type='button'
                                            onClick={() =>
                                                setDownloadOpen(true)
                                            }
                                            className='group flex flex-col items-center gap-1.5 py-2 transition-all duration-300 hover:shadow-lg w-full'
                                            style={{
                                                animationDelay: `${index * 50}ms`,
                                                animationFillMode: "both",
                                            }}
                                        >
                                            <div
                                                className='relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-110'
                                                style={{
                                                    background: action.bg,
                                                }}
                                            >
                                                {renderIcon(action.icon)}
                                                <div className='absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                            </div>
                                            <span className='text-[10px] text-white/70 leading-snug text-wrap text-pretty text-center'>
                                                {labelText}
                                            </span>
                                        </button>
                                    ) : action.id === "versions" ? (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type='button'
                                                    className='group flex flex-col items-center gap-1.5 py-2 transition-all duration-300 hover:shadow-lg w-full'
                                                    style={{
                                                        animationDelay: `${index * 50}ms`,
                                                        animationFillMode:
                                                            "both",
                                                    }}
                                                >
                                                    <div
                                                        className='relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-110'
                                                        style={{
                                                            background:
                                                                action.bg,
                                                        }}
                                                    >
                                                        {renderIcon(
                                                            action.icon,
                                                        )}
                                                        <div className='absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                                    </div>
                                                    <span className='text-[10px] text-white/70 text-center leading-tight truncate max-w-full'>
                                                        {labelText}
                                                    </span>
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className='w-72 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 shadow-[0_12px_40px_-12px_rgba(234,179,8,0.35)] backdrop-blur-xl'>
                                                <div className='max-h-64 overflow-auto space-y-1'>
                                                    {versions.length === 0 ? (
                                                        <div className='px-2 py-1.5 text-sm text-white font-medium'>
                                                            Version 1 (current)
                                                        </div>
                                                    ) : (
                                                        versions.map(
                                                            (v, idx) => {
                                                                const isCurrent =
                                                                    interpretation?.trim() ===
                                                                    v.content?.trim()
                                                                return (
                                                                    <button
                                                                        key={
                                                                            v.id
                                                                        }
                                                                        type='button'
                                                                        onClick={() => {
                                                                            if (
                                                                                typeof onInterpretationChange ===
                                                                                "function"
                                                                            ) {
                                                                                onInterpretationChange(
                                                                                    v.content,
                                                                                )
                                                                            } else {
                                                                                setInterpretation(
                                                                                    v.content,
                                                                                )
                                                                            }
                                                                        }}
                                                                        className={`w-full text-left px-2 py-1.5 rounded hover:bg-white/10 text-sm ${
                                                                            isCurrent
                                                                                ? "text-white font-medium bg-white/5"
                                                                                : "text-white/70"
                                                                        }`}
                                                                    >
                                                                        Version{" "}
                                                                        {idx +
                                                                            1}
                                                                        {isCurrent &&
                                                                            " (current)"}
                                                                    </button>
                                                                )
                                                            },
                                                        )
                                                    )}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    ) : (
                                        <button
                                            type='button'
                                            className='group flex flex-col items-center gap-1.5 py-2 transition-all duration-300 hover:shadow-lg w-full'
                                            onClick={() =>
                                                void action.onClick?.()
                                            }
                                            style={{
                                                animationDelay: `${index * 50}ms`,
                                                animationFillMode: "both",
                                            }}
                                        >
                                            <div
                                                className='relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-110'
                                                style={{
                                                    background: action.bg,
                                                }}
                                            >
                                                {renderIcon(action.icon)}
                                                <div className='absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                            </div>
                                            <div className='flex flex-col items-center'>
                                                <span className='text-[10px] text-white/70 leading-snug text-wrap text-pretty text-center'>
                                                    {labelText}
                                                </span>
                                                {action.id === "regen" && (
                                                    <span className='text-[9px] text-yellow-300 flex items-center gap-0.5'>
                                                        -1{" "}
                                                        <Star
                                                            className='w-2.5 h-2.5 text-yellow-300'
                                                            fill='currentColor'
                                                        />
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    )}
                                </SwiperSlide>
                            )
                        })}
                    </Swiper>
                </div>

                {downloadDialogNode}

                {/* Report dialog */}
                <AlertDialog open={showReport} onOpenChange={setShowReport}>
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
                                onChange={(e) =>
                                    setReportReason(e.target.value)
                                }
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
                            {reportReason && (
                                <textarea
                                    className='w-full bg-background border border-border/40 rounded-md p-2 min-h-[80px]'
                                    placeholder={t(
                                        "dialogs.report.placeholder",
                                    )}
                                    value={reportDetails}
                                    onChange={(e) =>
                                        setReportDetails(e.target.value)
                                    }
                                />
                            )}
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>
                                {t("dialogs.report.cancel")}
                            </AlertDialogCancel>
                            <button
                                type='button'
                                disabled={!reportReason}
                                className='inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
                                onClick={async () => {
                                    try {
                                        const res = await fetch(
                                            "/api/reports",
                                            {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type":
                                                        "application/json",
                                                },
                                                body: JSON.stringify({
                                                    reading_id: readingId,
                                                    reason: reportReason,
                                                    details:
                                                        reportDetails ||
                                                        undefined,
                                                }),
                                            },
                                        )
                                        if (res.ok) {
                                            setShowReport(false)
                                            setReportReason("")
                                            setReportDetails("")
                                        }
                                    } catch {}
                                }}
                            >
                                {t("dialogs.report.submit")}
                            </button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Feedback dialog */}
                <AlertDialog open={showFeedback} onOpenChange={setShowFeedback}>
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
                                    className={`w-8 h-8 rounded-full transition-colors ${rating >= n ? "bg-yellow-400" : "bg-zinc-700 hover:bg-zinc-600"}`}
                                    aria-label={`Rate ${n}`}
                                />
                            ))}
                        </div>
                        <textarea
                            className='w-full bg-background border border-border/40 rounded-md p-2'
                            placeholder={t("dialogs.feedback.placeholder")}
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                        />
                        <AlertDialogFooter>
                            <AlertDialogCancel>
                                {t("dialogs.feedback.cancel")}
                            </AlertDialogCancel>
                            <button
                                type='button'
                                disabled={rating === 0}
                                className='inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
                                onClick={async () => {
                                    try {
                                        const res = await fetch(
                                            "/api/feedbacks",
                                            {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type":
                                                        "application/json",
                                                },
                                                body: JSON.stringify({
                                                    reading_id: readingId,
                                                    rating,
                                                    comment:
                                                        feedbackComment ||
                                                        undefined,
                                                }),
                                            },
                                        )
                                        if (res.ok) {
                                            setShowFeedback(false)
                                            setFeedbackComment("")
                                            setRating(0)
                                        }
                                    } catch {}
                                }}
                            >
                                {t("dialogs.feedback.submit")}
                            </button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )
    }

    return (
        <div className='relative overflow-hidden group bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/5 hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-300'>

            {/* Content */}
            <div className='relative'>
                {variant === "full" && (
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
                )}

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
                        spaceBetween={4}
                        className='py-2 px-6'
                    >
                        {actionOptions.map((action, index) => (
                            <SwiperSlide key={action.id}>
                                {action.id === "download" ? (
                                    <button
                                        type='button'
                                        onClick={() => setDownloadOpen(true)}
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
                                        {variant === "full" && (
                                            <span className='text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300 text-center leading-tight'>
                                                {action.label}
                                            </span>
                                        )}
                                    </button>
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
                                                    {variant === "full" && (
                                                        <span className='text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300 text-center leading-tight'>
                                                            {typeof action.label ===
                                                            "string"
                                                                ? action.label
                                                                : "Versions"}
                                                        </span>
                                                    )}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className='w-72'>
                                                <div className='max-h-64 overflow-auto space-y-2'>
                                                    {versions.map(
                                                        (v, index) => {
                                                            const isCurrent =
                                                                interpretation?.trim() ===
                                                                v.content?.trim()
                                                            return (
                                                                <button
                                                                    key={v.id}
                                                                    type='button'
                                                                    className={`w-full text-left px-2 py-1 rounded hover:bg-white/10 text-sm ${
                                                                        isCurrent
                                                                            ? "text-white font-medium bg-white/5"
                                                                            : "text-white/70"
                                                                    }`}
                                                                    onClick={() => {
                                                                        if (
                                                                            typeof onInterpretationChange ===
                                                                            "function"
                                                                        )
                                                                            onInterpretationChange(
                                                                                v.content,
                                                                            )
                                                                        else
                                                                            setInterpretation(
                                                                                v.content,
                                                                            )
                                                                    }}
                                                                >
                                                                    {`Version ${index + 1}${isCurrent ? " (current)" : ""}`}
                                                                </button>
                                                            )
                                                        },
                                                    )}
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
                                        {variant === "full" && (
                                            <span className='text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300 text-center leading-tight'>
                                                {action.label}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
            {/* Removed inline star deduction note; using toast instead */}

            {downloadDialogNode}

            {/* Report dialog */}
            <AlertDialog open={showReport} onOpenChange={setShowReport}>
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
                        {reportReason && (
                            <textarea
                                className='w-full bg-background border border-border/40 rounded-md p-2 min-h-[80px]'
                                placeholder={t("dialogs.report.placeholder")}
                                value={reportDetails}
                                onChange={(e) =>
                                    setReportDetails(e.target.value)
                                }
                            />
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {t("dialogs.report.cancel")}
                        </AlertDialogCancel>
                        <button
                            type='button'
                            disabled={!reportReason}
                            className='inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
                            onClick={async () => {
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
                                    if (res.ok) {
                                        setShowReport(false)
                                        setReportReason("")
                                        setReportDetails("")
                                    }
                                } catch {}
                            }}
                        >
                            {t("dialogs.report.submit")}
                        </button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Feedback dialog */}
            <AlertDialog open={showFeedback} onOpenChange={setShowFeedback}>
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
                                className={`w-8 h-8 rounded-full transition-colors ${rating >= n ? "bg-yellow-400" : "bg-zinc-700 hover:bg-zinc-600"}`}
                                aria-label={`Rate ${n}`}
                            />
                        ))}
                    </div>
                    <textarea
                        className='w-full bg-background border border-border/40 rounded-md p-2'
                        placeholder={t("dialogs.feedback.placeholder")}
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {t("dialogs.feedback.cancel")}
                        </AlertDialogCancel>
                        <button
                            type='button'
                            disabled={rating === 0}
                            className='inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
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
                                            comment:
                                                feedbackComment || undefined,
                                        }),
                                    })
                                    if (res.ok) {
                                        setShowFeedback(false)
                                        setFeedbackComment("")
                                        setRating(0)
                                    }
                                } catch {}
                            }}
                        >
                            {t("dialogs.feedback.submit")}
                        </button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
