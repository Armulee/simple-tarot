"use client"

import {
    useState,
    useCallback,
    useEffect,
    useMemo,
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
} from "react-icons/fa6"
import { Sparkle, Star } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Settings } from "lucide-react"
import { useTarot } from "@/contexts/tarot-context"
import Image from "next/image"
import { useStars } from "@/contexts/stars-context"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import {
    tarotInterpretationSchema,
    type TarotInterpretation,
} from "@/lib/tarot/schema"
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { getTarotReadingPrompt } from "@/lib/prompts"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface ActionSectionProps {
    question?: string
    cards?: string[]
    interpretation?: string
    readingId?: string
    onInterpretationChange?: (text: string) => void
    onGeneratingChange?: (loading: boolean) => void
    variant?: "full" | "compact" | "embedded"
}

export default function ActionSection({
    question: propQuestion,
    cards: propCards,
    interpretation: propInterpretation,
    readingId: propReadingId,
    onInterpretationChange,
    onGeneratingChange,
    variant = "full",
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
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadOpen, setDownloadOpen] = useState(false)
    const [downloadFormat, setDownloadFormat] = useState<"image" | "video">(
        "image",
    )
    const [downloadStyleId, setDownloadStyleId] = useState("story")
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewError, setPreviewError] = useState<string | null>(null)
    const [isPreviewLoading, setIsPreviewLoading] = useState(false)
    const [previewProgress, setPreviewProgress] = useState<number | null>(null)
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
    const [isVideoGenerating, setIsVideoGenerating] = useState(false)
    const [videoProgress, setVideoProgress] = useState<number | null>(null)
    const previewBlobRef = useRef<{ styleId: string; blob: Blob } | null>(null)
    const previewCacheRef = useRef<Map<string, Blob>>(new Map())
    const videoCacheRef = useRef<Map<string, Blob>>(new Map())
    const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>(
        {},
    )
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

    const downloadStyles = useMemo(
        () => [
            {
                id: "story",
                label: t("actions.downloadStyleStory"),
                size: "1170 × 2532",
                width: 1170,
                height: 2532,
            },
            {
                id: "square",
                label: t("actions.downloadStyleSquare"),
                size: "1080 × 1080",
                width: 1080,
                height: 1080,
            },
            {
                id: "landscape",
                label: t("actions.downloadStyleLandscape"),
                size: "1920 × 1080",
                width: 1920,
                height: 1080,
            },
        ],
        [t],
    )
    const selectedStyle =
        downloadStyles.find((style) => style.id === downloadStyleId) ||
        downloadStyles[0]
    const activePreviewProgress =
        downloadFormat === "video" ? videoProgress : previewProgress
    const isActivePreviewLoading =
        downloadFormat === "video" ? isVideoGenerating : isPreviewLoading

    const fetchShareImage = useCallback(
        async ({
            width,
            height,
            signal,
            onProgress,
        }: {
            width: number
            height: number
            signal?: AbortSignal
            onProgress?: (progress: number | null) => void
        }) => {
            const res = await fetch("/api/share-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    cards,
                    interpretation,
                    width,
                    height,
                    branding: "AskingFate",
                    type: "image",
                }),
                signal,
            })
            if (!res.ok) throw new Error("Preview failed")

            const contentLength = res.headers.get("Content-Length")
            if (!res.body || !contentLength) {
                onProgress?.(null)
                return await res.blob()
            }

            const total = Number(contentLength)
            if (!Number.isFinite(total) || total <= 0) {
                onProgress?.(null)
                return await res.blob()
            }

            const reader = res.body.getReader()
            const chunks: BlobPart[] = []
            let received = 0

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value) {
                    chunks.push(value as BlobPart)
                    received += value.length
                    onProgress?.(Math.min(received / total, 1))
                }
            }

            onProgress?.(1)
            return new Blob(chunks, {
                type: res.headers.get("Content-Type") || "image/png",
            })
        },
        [question, cards, interpretation],
    )

    const createShareVideo = useCallback(
        async ({
            style,
            signal,
            onProgress,
        }: {
            style: { id: string; width: number; height: number }
            signal?: AbortSignal
            onProgress?: (progress: number) => void
        }) => {
            const cachedImage = previewCacheRef.current.get(style.id) || null
            const baseBlob =
                cachedImage ||
                (await fetchShareImage({
                    width: style.width,
                    height: style.height,
                    signal,
                }))

            const baseImage =
                typeof createImageBitmap === "function"
                    ? await createImageBitmap(baseBlob)
                    : await new Promise<HTMLImageElement>((resolve, reject) => {
                          const img = new window.Image()
                          img.onload = () => resolve(img)
                          img.onerror = () =>
                              reject(new Error("Failed to load image"))
                          img.src = URL.createObjectURL(baseBlob)
                      })

            const canvas = document.createElement("canvas")
            canvas.width = style.width
            canvas.height = style.height
            const ctx = canvas.getContext("2d")
            if (!ctx) throw new Error("Canvas not supported")

            const starCount = Math.round(
                Math.max(120, (style.width * style.height) / 20000),
            )
            const stars = Array.from({ length: starCount }, () => ({
                x: Math.random() * style.width,
                y: Math.random() * style.height,
                size: 1.4 + Math.random() * 1.6,
                alpha: 0.35 + Math.random() * 0.6,
                twinkleSpeed: 0.6 + Math.random() * 1.8,
                twinkleOffset: Math.random() * Math.PI * 2,
            }))
            const glowOrbs = [
                {
                    x: style.width * 0.2,
                    y: style.height * 0.2,
                    radius: Math.min(style.width, style.height) * 0.35,
                    color: "rgba(56,189,248,0.15)",
                    speed: 0.6,
                    phase: 0,
                },
                {
                    x: style.width * 0.8,
                    y: style.height * 0.7,
                    radius: Math.min(style.width, style.height) * 0.4,
                    color: "rgba(234,179,8,0.12)",
                    speed: 0.4,
                    phase: 2,
                },
            ]

            const stream = canvas.captureStream(30)
            const mimeType = MediaRecorder.isTypeSupported(
                "video/webm;codecs=vp9",
            )
                ? "video/webm;codecs=vp9"
                : "video/webm"
            const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 4_000_000,
            })
            const chunks: BlobPart[] = []

            const durationMs = 6000
            const start = performance.now()

            const donePromise = new Promise<Blob>((resolve, reject) => {
                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        chunks.push(event.data)
                    }
                }
                recorder.onerror = () => {
                    reject(new Error("Video recording failed"))
                }
                recorder.onstop = () => {
                    resolve(
                        new Blob(chunks, {
                            type: recorder.mimeType || "video/webm",
                        }),
                    )
                }

                const render = (now: number) => {
                    if (signal?.aborted) {
                        recorder.stop()
                        reject(new Error("Video generation aborted"))
                        return
                    }

                    const elapsed = now - start
                    const t = Math.min(elapsed / durationMs, 1)

                    ctx.clearRect(0, 0, style.width, style.height)
                    ctx.drawImage(baseImage as CanvasImageSource, 0, 0)

                    glowOrbs.forEach((orb) => {
                        const drift =
                            Math.sin(t * Math.PI * 2 * orb.speed + orb.phase) *
                            30
                        const gx = orb.x + drift
                        const gy = orb.y - drift * 0.6
                        const gradient = ctx.createRadialGradient(
                            gx,
                            gy,
                            0,
                            gx,
                            gy,
                            orb.radius,
                        )
                        gradient.addColorStop(0, orb.color)
                        gradient.addColorStop(1, "rgba(0,0,0,0)")
                        ctx.fillStyle = gradient
                        ctx.beginPath()
                        ctx.arc(gx, gy, orb.radius, 0, Math.PI * 2)
                        ctx.fill()
                    })

                    ctx.save()
                    ctx.globalCompositeOperation = "screen"
                    stars.forEach((star) => {
                        const twinkle =
                            0.5 +
                            0.5 *
                                Math.sin(
                                    t * Math.PI * 2 * star.twinkleSpeed +
                                        star.twinkleOffset,
                                )
                        const alpha = star.alpha * twinkle
                        ctx.fillStyle = `rgba(255,255,255,${alpha})`
                        ctx.beginPath()
                        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
                        ctx.fill()
                        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`
                        ctx.beginPath()
                        ctx.arc(star.x, star.y, star.size * 2.4, 0, Math.PI * 2)
                        ctx.fill()
                    })
                    ctx.restore()

                    onProgress?.(t)
                    if (t < 1) {
                        requestAnimationFrame(render)
                    } else {
                        recorder.stop()
                    }
                }

                recorder.start()
                requestAnimationFrame(render)
            })

            const blob = await donePromise
            if (baseImage instanceof HTMLImageElement) {
                URL.revokeObjectURL(baseImage.src)
            } else if (typeof (baseImage as ImageBitmap).close === "function") {
                ;(baseImage as ImageBitmap).close()
            }
            return blob
        },
        [fetchShareImage],
    )

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
        if (!downloadOpen) {
            setPreviewError(null)
            setIsPreviewLoading(false)
            setPreviewProgress(null)
            setIsVideoGenerating(false)
            setVideoProgress(null)
            setPreviewUrl((current) => {
                if (current) URL.revokeObjectURL(current)
                return null
            })
            setVideoPreviewUrl((current) => {
                if (current) URL.revokeObjectURL(current)
                return null
            })
            previewBlobRef.current = null
            setThumbnailUrls((current) => {
                Object.values(current).forEach((url) =>
                    URL.revokeObjectURL(url),
                )
                return {}
            })
        }
    }, [downloadOpen])

    useEffect(() => {
        if (!downloadOpen) return
        setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            return null
        })
        setVideoPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            return null
        })
        previewBlobRef.current = null
        setPreviewProgress(null)
        setVideoProgress(null)
        setThumbnailUrls((current) => {
            Object.values(current).forEach((url) => URL.revokeObjectURL(url))
            return {}
        })
        previewCacheRef.current.clear()
        videoCacheRef.current.clear()
    }, [downloadOpen, question, cards, interpretation])

    useEffect(() => {
        if (!downloadOpen) return

        const controller = new AbortController()
        let isActive = true

        const fetchPreview = async () => {
            setIsPreviewLoading(true)
            setPreviewError(null)
            setPreviewProgress(0)
            try {
                const cachedBlob = previewCacheRef.current.get(selectedStyle.id)
                if (cachedBlob) {
                    const nextUrl = URL.createObjectURL(cachedBlob)
                    setPreviewUrl((current) => {
                        if (current) URL.revokeObjectURL(current)
                        return nextUrl
                    })
                    previewBlobRef.current = {
                        styleId: selectedStyle.id,
                        blob: cachedBlob,
                    }
                    setPreviewProgress(1)
                    return
                }
                const blob = await fetchShareImage({
                    width: selectedStyle.width,
                    height: selectedStyle.height,
                    signal: controller.signal,
                    onProgress: (progress) => {
                        if (!isActive) return
                        setPreviewProgress(progress)
                    },
                })
                if (!isActive) return
                previewCacheRef.current.set(selectedStyle.id, blob)
                const nextUrl = URL.createObjectURL(blob)
                setPreviewUrl((current) => {
                    if (current) URL.revokeObjectURL(current)
                    return nextUrl
                })
                previewBlobRef.current = {
                    styleId: selectedStyle.id,
                    blob,
                }
            } catch (error) {
                if (!isActive || controller.signal.aborted) return
                console.error("Preview error:", error)
                setPreviewError(t("actions.downloadPreviewError"))
                setPreviewProgress(null)
            } finally {
                if (isActive) setIsPreviewLoading(false)
            }
        }

        void fetchPreview()

        return () => {
            isActive = false
            controller.abort()
        }
    }, [
        downloadOpen,
        downloadStyleId,
        question,
        cards,
        interpretation,
        selectedStyle.height,
        selectedStyle.width,
        selectedStyle.id,
        fetchShareImage,
        t,
    ])

    useEffect(() => {
        if (!downloadOpen) return

        const controller = new AbortController()
        let cancelled = false

        const loadThumbnails = async () => {
            await Promise.all(
                downloadStyles.map(async (style) => {
                    if (cancelled) return
                    let blob = previewCacheRef.current.get(style.id) || null
                    if (!blob) {
                        try {
                            blob = await fetchShareImage({
                                width: style.width,
                                height: style.height,
                                signal: controller.signal,
                            })
                            if (cancelled) return
                            previewCacheRef.current.set(style.id, blob)
                        } catch (error) {
                            if (controller.signal.aborted) return
                            console.error("Thumbnail error:", error)
                            return
                        }
                    }

                    const url = URL.createObjectURL(blob)
                    setThumbnailUrls((current) => {
                        const next = { ...current }
                        if (next[style.id]) {
                            URL.revokeObjectURL(next[style.id])
                        }
                        next[style.id] = url
                        return next
                    })
                }),
            )
        }

        void loadThumbnails()

        return () => {
            cancelled = true
            controller.abort()
        }
    }, [
        downloadOpen,
        question,
        cards,
        interpretation,
        downloadStyles,
        fetchShareImage,
    ])

    useEffect(() => {
        if (!downloadOpen || downloadFormat !== "video") return

        const controller = new AbortController()
        let active = true

        const ensureVideoPreview = async () => {
            const cached = videoCacheRef.current.get(selectedStyle.id)
            if (cached) {
                const nextUrl = URL.createObjectURL(cached)
                setVideoPreviewUrl((current) => {
                    if (current) URL.revokeObjectURL(current)
                    return nextUrl
                })
                return
            }

            try {
                setIsVideoGenerating(true)
                setVideoProgress(0)
                const blob = await createShareVideo({
                    style: {
                        id: selectedStyle.id,
                        width: selectedStyle.width,
                        height: selectedStyle.height,
                    },
                    signal: controller.signal,
                    onProgress: (progress) => {
                        if (!active) return
                        setVideoProgress(progress)
                    },
                })
                if (!active) return
                videoCacheRef.current.set(selectedStyle.id, blob)
                const nextUrl = URL.createObjectURL(blob)
                setVideoPreviewUrl((current) => {
                    if (current) URL.revokeObjectURL(current)
                    return nextUrl
                })
            } catch (error) {
                if (!active || controller.signal.aborted) return
                console.error("Video preview error:", error)
                toast.error(t("actions.downloadVideoError"))
                setVideoProgress(null)
            } finally {
                if (active) setIsVideoGenerating(false)
            }
        }

        void ensureVideoPreview()

        return () => {
            active = false
            controller.abort()
        }
    }, [
        downloadOpen,
        downloadFormat,
        selectedStyle.id,
        selectedStyle.width,
        selectedStyle.height,
        createShareVideo,
        t,
    ])

    const handleDownload = useCallback(async () => {
        try {
            setIsDownloading(true)
            const cachedPreview = previewBlobRef.current
            let blob: Blob | null = null
            if (cachedPreview?.styleId === selectedStyle.id) {
                blob = cachedPreview.blob
            } else {
                blob = previewCacheRef.current.get(selectedStyle.id) || null
            }

            if (!blob) {
                blob = await fetchShareImage({
                    width: selectedStyle.width,
                    height: selectedStyle.height,
                })
            }

            const ts = new Date().toISOString().replace(/[:.]/g, "-")
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `reading-${selectedStyle.id}-${ts}.png`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error("Download error:", e)
            toast.error(t("actions.downloadError"))
        } finally {
            setIsDownloading(false)
        }
    }, [
        selectedStyle.height,
        selectedStyle.id,
        selectedStyle.width,
        t,
        fetchShareImage,
    ])

    const handleVideoDownload = useCallback(async () => {
        try {
            setIsVideoGenerating(true)
            setVideoProgress(0)
            let blob = videoCacheRef.current.get(selectedStyle.id) || null
            if (!blob) {
                blob = await createShareVideo({
                    style: {
                        id: selectedStyle.id,
                        width: selectedStyle.width,
                        height: selectedStyle.height,
                    },
                    onProgress: (progress) => setVideoProgress(progress),
                })
                videoCacheRef.current.set(selectedStyle.id, blob)
            }

            const ts = new Date().toISOString().replace(/[:.]/g, "-")
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `reading-${selectedStyle.id}-${ts}.webm`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Video download error:", error)
            toast.error(t("actions.downloadVideoError"))
        } finally {
            setIsVideoGenerating(false)
            setVideoProgress(null)
        }
    }, [
        selectedStyle.id,
        selectedStyle.width,
        selectedStyle.height,
        createShareVideo,
        t,
    ])

    const { submit, object } = useObject({
        api: "/api/interpret-cards/question",
        schema: tarotInterpretationSchema,
        onFinish: async ({
            object,
        }: {
            object: TarotInterpretation | undefined
        }) => {
            if (object) {
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
            if (readingId) {
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
                    return `${origin}/share/tarot/${checkData.id}`
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
            setPaidForInterpretation(true)

            if (typeof onInterpretationChange === "function") {
                onInterpretationChange("")
            } else {
                setInterpretation(null)
            }

            if (typeof onGeneratingChange === "function")
                onGeneratingChange(true)

            const cardNames = cards.join(", ")

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

            const prompt = getTarotReadingPrompt({
                question: question || "",
                cards: cardNames,
                readingType: readingType || null,
                isFollowUp,
                previousQuestion,
                previousInterpretation,
            })

            const cardArray = (cards ?? []).map((c) =>
                typeof c === "string" ? c : String(c),
            )
            submit({
                prompt,
                question: question || "",
                cards: cardArray,
            })
        } catch (error) {
            console.error("Error regenerating interpretation:", error)
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
                      setVoteState("up")
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
                  className: "w-3 h-3 text-white",
              })
            : icon

    if (variant === "compact") {
        return (
            <div className='flex flex-wrap items-center gap-2'>
                {actionOptions.map((action) => (
                    <button
                        key={action.id}
                        type='button'
                        onClick={() => action.onClick?.()}
                        className='flex items-center justify-center h-6 w-6 rounded-full border border-white/10 bg-white/5 text-white/80 hover:text-white hover:border-white/30 transition-colors'
                        title={
                            typeof action.label === "string"
                                ? action.label
                                : undefined
                        }
                        aria-label={
                            typeof action.label === "string"
                                ? action.label
                                : action.id
                        }
                    >
                        {renderIcon(action.icon)}
                    </button>
                ))}
            </div>
        )
    }

    if (variant === "embedded") {
        return (
            <div className='relative'>
                {isDownloading && (
                    <div className='fixed bottom-0 left-0 right-0 z-50 animate-slide-up bg-black/60 backdrop-blur-sm p-4 text-center text-white'>
                        Preparing your {"content"}...
                    </div>
                )}
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
                                        <Sheet
                                            open={downloadOpen}
                                            onOpenChange={setDownloadOpen}
                                        >
                                            <SheetTrigger asChild>
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
                                                    <span className='text-[10px] text-white/70 leading-snug text-wrap text-pretty text-center'>
                                                        {labelText}
                                                    </span>
                                                </button>
                                            </SheetTrigger>
                                            <SheetContent
                                                side='bottom'
                                                className='max-h-[85vh] overflow-auto border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 shadow-[0_12px_40px_-12px_rgba(234,179,8,0.35)] backdrop-blur-xl'
                                            >
                                                <Sparkle
                                                    className='absolute top-10 left-10 w-3 h-3 rounded-full fill-yellow-400 opacity-50 animate-ping'
                                                    style={{
                                                        animationDelay: "0.6s",
                                                    }}
                                                />
                                                <Sparkle
                                                    className='absolute top-20 right-16 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                                                    style={{
                                                        animationDelay: "1.4s",
                                                    }}
                                                />
                                                <Sparkle
                                                    className='absolute bottom-14 left-16 w-3.5 h-3.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                                                    style={{
                                                        animationDelay: "2.3s",
                                                    }}
                                                />
                                                <Sparkle
                                                    className='absolute bottom-20 right-20 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                                                    style={{
                                                        animationDelay: "3.1s",
                                                    }}
                                                />
                                                <div className='pointer-events-none absolute inset-0 opacity-40'>
                                                    <div className='cosmic-stars-layer-3' />
                                                    <div className='cosmic-stars-layer-4' />
                                                    <div className='cosmic-stars-layer-5' />
                                                </div>
                                                <div className='pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-yellow-300/20 via-yellow-500/10 to-transparent blur-3xl animate-pulse' />
                                                <div
                                                    className='pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-tl from-yellow-400/20 via-yellow-600/10 to-transparent blur-[90px] animate-pulse'
                                                    style={{
                                                        animationDelay: "0.8s",
                                                    }}
                                                />
                                                <SheetHeader>
                                                    <SheetTitle>
                                                        {t(
                                                            downloadFormat ===
                                                                "video"
                                                                ? "actions.downloadSheetTitleVideo"
                                                                : "actions.downloadSheetTitleImage",
                                                        )}
                                                    </SheetTitle>
                                                    <SheetDescription>
                                                        {t(
                                                            "actions.downloadSheetDesc",
                                                        )}
                                                    </SheetDescription>
                                                    <div className='mt-4 flex justify-center'>
                                                        <div className='inline-flex h-10 items-center justify-center rounded-full bg-white/5 border border-white/10 p-1 text-white'>
                                                            <button
                                                                type='button'
                                                                onClick={() =>
                                                                    setDownloadFormat(
                                                                        "image",
                                                                    )
                                                                }
                                                                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                                                                    downloadFormat ===
                                                                    "image"
                                                                        ? "bg-white/15 text-white shadow"
                                                                        : "text-white/70"
                                                                }`}
                                                            >
                                                                {t(
                                                                    "actions.downloadTabImage",
                                                                )}
                                                            </button>
                                                            <button
                                                                type='button'
                                                                onClick={() =>
                                                                    setDownloadFormat(
                                                                        "video",
                                                                    )
                                                                }
                                                                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                                                                    downloadFormat ===
                                                                    "video"
                                                                        ? "bg-white/15 text-white shadow"
                                                                        : "text-white/70"
                                                                }`}
                                                            >
                                                                {t(
                                                                    "actions.downloadTabVideo",
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </SheetHeader>
                                                <div className='px-4 pb-4 space-y-5'>
                                                    <div className='space-y-2'>
                                                        <div className='flex items-center justify-between text-sm'>
                                                            <span className='font-medium'>
                                                                {t(
                                                                    "actions.downloadStylesTitle",
                                                                )}
                                                            </span>
                                                            <span className='text-xs text-muted-foreground'>
                                                                {t(
                                                                    "actions.downloadStylesHint",
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className='grid grid-cols-3 gap-2'>
                                                            {downloadStyles.map(
                                                                (style) => (
                                                                    <button
                                                                        key={
                                                                            style.id
                                                                        }
                                                                        type='button'
                                                                        onClick={() =>
                                                                            setDownloadStyleId(
                                                                                style.id,
                                                                            )
                                                                        }
                                                                        className={`flex h-36 flex-col rounded-lg border p-2 text-left transition ${
                                                                            downloadStyleId ===
                                                                            style.id
                                                                                ? "border-primary/60 bg-white/10"
                                                                                : "border-white/10 bg-white/5 hover:border-primary/40"
                                                                        }`}
                                                                    >
                                                                        <div className='h-16 w-full overflow-hidden rounded-md border border-border/40 bg-muted/40'>
                                                                            {thumbnailUrls[
                                                                                style
                                                                                    .id
                                                                            ] ? (
                                                                                <div className='relative h-full w-full'>
                                                                                    <img
                                                                                        src={
                                                                                            thumbnailUrls[
                                                                                                style
                                                                                                    .id
                                                                                            ]
                                                                                        }
                                                                                        alt={
                                                                                            style.label
                                                                                        }
                                                                                        className='object-contain'
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <div className='flex h-full w-full items-center justify-center'>
                                                                                    <div className='h-full rounded-sm bg-muted/60' />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className='mt-2 text-xs font-medium text-foreground'>
                                                                            {
                                                                                style.label
                                                                            }
                                                                        </div>
                                                                        <div className='text-[11px] text-muted-foreground'>
                                                                            {
                                                                                style.size
                                                                            }
                                                                        </div>
                                                                    </button>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className='space-y-2'>
                                                        <div className='flex items-center justify-between text-sm'>
                                                            <span className='font-medium'>
                                                                {t(
                                                                    "actions.downloadBrandingTitle",
                                                                )}
                                                            </span>
                                                            <span className='text-xs text-muted-foreground'>
                                                                {t(
                                                                    "actions.downloadBrandingHint",
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className='relative w-full max-w-[430px] mx-auto overflow-hidden rounded-lg border bg-muted/20'>
                                                            {isActivePreviewLoading ? (
                                                                <div className='absolute inset-0 animate-pulse bg-muted/40' />
                                                            ) : null}
                                                            {previewUrl ? (
                                                                <div className='relative h-full w-full'>
                                                                    <img
                                                                        src={
                                                                            previewUrl
                                                                        }
                                                                        alt='Preview'
                                                                        className='object-cover'
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className='absolute inset-0 animate-pulse bg-muted/40' />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <SheetFooter className='sticky bottom-0 z-10 gap-2 border-t border-white/10 bg-gradient-to-t from-[#0a0a1a]/95 via-[#0a0a1a]/90 to-transparent px-4 pb-4 pt-3 sm:flex-row sm:justify-end'>
                                                        <button
                                                            type='button'
                                                            onClick={() =>
                                                                setDownloadOpen(
                                                                    false,
                                                                )
                                                            }
                                                            className='w-full rounded-md border border-border/60 bg-background px-4 py-2 text-sm hover:bg-muted/40 sm:w-auto'
                                                        >
                                                            {t(
                                                                "actions.cancel",
                                                            )}
                                                        </button>
                                                        <button
                                                            type='button'
                                                            onClick={
                                                                handleDownload
                                                            }
                                                            disabled={
                                                                isDownloading
                                                            }
                                                            className='w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'
                                                        >
                                                            {t(
                                                                "actions.downloadButton",
                                                            )}
                                                        </button>
                                                    </SheetFooter>
                                                </div>
                                            </SheetContent>
                                        </Sheet>
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
                                            <PopoverContent className='w-72'>
                                                <div className='max-h-64 overflow-auto space-y-2'>
                                                    {versions.map((v) => (
                                                        <button
                                                            key={v.id}
                                                            type='button'
                                                            onClick={() => {
                                                                if (
                                                                    typeof onInterpretationChange ===
                                                                    "function"
                                                                ) {
                                                                    onInterpretationChange(
                                                                        v.content,
                                                                    )
                                                                }
                                                            }}
                                                            className='w-full text-left px-2 py-1 rounded hover:bg-white/10 text-sm'
                                                        >
                                                            {new Date(
                                                                v.created_at,
                                                            ).toLocaleString()}
                                                        </button>
                                                    ))}
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
                                                        -5{" "}
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
            </div>
        )
    }

    return (
        <div className='relative overflow-hidden group bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/5 hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-300'>
            {/* Slide-up loader for download */}
            {isDownloading && (
                <div className='fixed bottom-0 left-0 right-0 z-50 animate-slide-up bg-black/60 backdrop-blur-sm p-4 text-center text-white'>
                    Preparing your {"content"}...
                </div>
            )}

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
                                    <Sheet
                                        open={downloadOpen}
                                        onOpenChange={setDownloadOpen}
                                    >
                                        <SheetTrigger asChild>
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
                                                {variant === "full" && (
                                                    <span className='text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300 text-center leading-tight'>
                                                        {action.label}
                                                    </span>
                                                )}
                                            </button>
                                        </SheetTrigger>
                                        <SheetContent
                                            side='bottom'
                                            className='max-h-[85vh] overflow-auto border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 shadow-[0_12px_40px_-12px_rgba(234,179,8,0.35)] backdrop-blur-xl'
                                        >
                                            <Sparkle
                                                className='absolute top-10 left-10 w-3 h-3 rounded-full fill-yellow-400 opacity-50 animate-ping'
                                                style={{
                                                    animationDelay: "0.6s",
                                                }}
                                            />
                                            <Sparkle
                                                className='absolute top-20 right-16 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                                                style={{
                                                    animationDelay: "1.4s",
                                                }}
                                            />
                                            <Sparkle
                                                className='absolute bottom-14 left-16 w-3.5 h-3.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                                                style={{
                                                    animationDelay: "2.3s",
                                                }}
                                            />
                                            <Sparkle
                                                className='absolute bottom-20 right-20 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                                                style={{
                                                    animationDelay: "3.1s",
                                                }}
                                            />
                                            <div className='pointer-events-none absolute inset-0 opacity-40'>
                                                <div className='cosmic-stars-layer-3' />
                                                <div className='cosmic-stars-layer-4' />
                                                <div className='cosmic-stars-layer-5' />
                                            </div>
                                            <div className='pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-yellow-300/20 via-yellow-500/10 to-transparent blur-3xl animate-pulse' />
                                            <div
                                                className='pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-tl from-yellow-400/20 via-yellow-600/10 to-transparent blur-[90px] animate-pulse'
                                                style={{
                                                    animationDelay: "0.8s",
                                                }}
                                            />
                                            <SheetHeader>
                                                <SheetTitle>
                                                    {t(
                                                        downloadFormat ===
                                                            "video"
                                                            ? "actions.downloadSheetTitleVideo"
                                                            : "actions.downloadSheetTitleImage",
                                                    )}
                                                </SheetTitle>
                                                <SheetDescription>
                                                    {t(
                                                        "actions.downloadSheetDesc",
                                                    )}
                                                </SheetDescription>
                                                <div className='mt-4 flex justify-center'>
                                                    <div className='inline-flex h-10 items-center justify-center rounded-full bg-white/5 border border-white/10 p-1 text-white'>
                                                        <button
                                                            type='button'
                                                            onClick={() =>
                                                                setDownloadFormat(
                                                                    "image",
                                                                )
                                                            }
                                                            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                                                                downloadFormat ===
                                                                "image"
                                                                    ? "bg-white/15 text-white shadow"
                                                                    : "text-white/70"
                                                            }`}
                                                        >
                                                            {t(
                                                                "actions.downloadTabImage",
                                                            )}
                                                        </button>
                                                        <button
                                                            type='button'
                                                            onClick={() =>
                                                                setDownloadFormat(
                                                                    "video",
                                                                )
                                                            }
                                                            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                                                                downloadFormat ===
                                                                "video"
                                                                    ? "bg-white/15 text-white shadow"
                                                                    : "text-white/70"
                                                            }`}
                                                        >
                                                            {t(
                                                                "actions.downloadTabVideo",
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </SheetHeader>
                                            <div className='px-4 pb-4 space-y-5'>
                                                <div className='space-y-2'>
                                                    <div className='flex items-center justify-between text-sm'>
                                                        <span className='font-medium'>
                                                            {t(
                                                                "actions.downloadStylesTitle",
                                                            )}
                                                        </span>
                                                        <span className='text-xs text-muted-foreground'>
                                                            {t(
                                                                "actions.downloadStylesHint",
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className='grid grid-cols-3 gap-2'>
                                                        {downloadStyles.map(
                                                            (style) => (
                                                                <button
                                                                    key={
                                                                        style.id
                                                                    }
                                                                    type='button'
                                                                    onClick={() =>
                                                                        setDownloadStyleId(
                                                                            style.id,
                                                                        )
                                                                    }
                                                                    className={`flex h-36 flex-col rounded-lg border p-2 text-left transition ${
                                                                        downloadStyleId ===
                                                                        style.id
                                                                            ? "border-primary bg-primary/10"
                                                                            : "border-border/60 bg-muted/30 hover:bg-muted/50"
                                                                    }`}
                                                                >
                                                                    <div className='h-16 w-full overflow-hidden rounded-md border border-border/40 bg-muted/40'>
                                                                        {thumbnailUrls[
                                                                            style
                                                                                .id
                                                                        ] ? (
                                                                            <div className='relative h-full w-full'>
                                                                                <Image
                                                                                    src={
                                                                                        thumbnailUrls[
                                                                                            style
                                                                                                .id
                                                                                        ]
                                                                                    }
                                                                                    alt={`${style.label} preview`}
                                                                                    fill
                                                                                    unoptimized
                                                                                    className='object-contain'
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <div className='flex h-full w-full items-center justify-center'>
                                                                                <div
                                                                                    className='h-full rounded-sm bg-muted/60'
                                                                                    style={{
                                                                                        aspectRatio: `${style.width}/${style.height}`,
                                                                                        maxWidth:
                                                                                            "100%",
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className='mt-2 text-xs font-medium text-foreground'>
                                                                        {
                                                                            style.label
                                                                        }
                                                                    </div>
                                                                    <div className='text-[11px] text-muted-foreground'>
                                                                        {
                                                                            style.size
                                                                        }
                                                                    </div>
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                                <div className='space-y-2'>
                                                    <div className='flex items-center justify-between text-sm'>
                                                        <span className='font-medium'>
                                                            {t(
                                                                "actions.downloadPreviewTitle",
                                                            )}
                                                        </span>
                                                        <span className='text-xs text-muted-foreground'>
                                                            {selectedStyle.size}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className='relative w-full max-w-[430px] mx-auto overflow-hidden rounded-lg border bg-muted/20'
                                                        style={{
                                                            aspectRatio: `${selectedStyle.width}/${selectedStyle.height}`,
                                                        }}
                                                    >
                                                        {isActivePreviewLoading && (
                                                            <div className='absolute left-3 right-3 top-3 z-10 h-2 overflow-hidden rounded-full bg-black/40'>
                                                                <div
                                                                    className={`h-full rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 transition-all ${
                                                                        activePreviewProgress ==
                                                                        null
                                                                            ? "animate-pulse w-2/3"
                                                                            : ""
                                                                    }`}
                                                                    style={
                                                                        activePreviewProgress ==
                                                                        null
                                                                            ? undefined
                                                                            : {
                                                                                  width: `${Math.max(
                                                                                      6,
                                                                                      Math.round(
                                                                                          activePreviewProgress *
                                                                                              100,
                                                                                      ),
                                                                                  )}%`,
                                                                              }
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                        {downloadFormat ===
                                                        "video" ? (
                                                            isVideoGenerating ? (
                                                                <div className='absolute inset-0 animate-pulse bg-muted/40' />
                                                            ) : videoPreviewUrl ? (
                                                                <video
                                                                    src={
                                                                        videoPreviewUrl
                                                                    }
                                                                    className='h-full w-full object-cover'
                                                                    autoPlay
                                                                    loop
                                                                    muted
                                                                    playsInline
                                                                />
                                                            ) : (
                                                                <div className='absolute inset-0 flex items-center justify-center text-xs text-muted-foreground'>
                                                                    {t(
                                                                        "actions.downloadVideoPreviewFallback",
                                                                    )}
                                                                </div>
                                                            )
                                                        ) : isPreviewLoading ? (
                                                            <div className='absolute inset-0 animate-pulse bg-muted/40' />
                                                        ) : previewUrl ? (
                                                            <Image
                                                                src={previewUrl}
                                                                alt={t(
                                                                    "actions.downloadPreviewAlt",
                                                                )}
                                                                fill
                                                                unoptimized
                                                                className='object-cover'
                                                            />
                                                        ) : (
                                                            <div className='absolute inset-0 flex items-center justify-center text-xs text-muted-foreground'>
                                                                {previewError ||
                                                                    t(
                                                                        "actions.downloadPreviewFallback",
                                                                    )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <SheetFooter className='sticky bottom-0 z-10 gap-2 border-t border-white/10 bg-gradient-to-t from-[#0a0a1a]/95 via-[#0a0a1a]/90 to-transparent px-4 pb-4 pt-3 sm:flex-row sm:justify-end'>
                                                <button
                                                    type='button'
                                                    className='w-full rounded-md border border-border/60 bg-background px-4 py-2 text-sm hover:bg-muted/40 sm:w-auto'
                                                    onClick={() =>
                                                        setDownloadOpen(false)
                                                    }
                                                >
                                                    {t(
                                                        "actions.downloadCancel",
                                                    )}
                                                </button>
                                                <button
                                                    type='button'
                                                    className='w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'
                                                    onClick={() =>
                                                        downloadFormat ===
                                                        "video"
                                                            ? handleVideoDownload()
                                                            : handleDownload()
                                                    }
                                                    disabled={
                                                        downloadFormat ===
                                                        "video"
                                                            ? isVideoGenerating
                                                            : isDownloading ||
                                                              isPreviewLoading
                                                    }
                                                >
                                                    {t(
                                                        downloadFormat ===
                                                            "video"
                                                            ? "actions.downloadVideoButton"
                                                            : "actions.downloadButton",
                                                    )}
                                                </button>
                                            </SheetFooter>
                                        </SheetContent>
                                    </Sheet>
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
                                                        (v, index) => (
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
                                                                            v.content,
                                                                        )
                                                                    else
                                                                        setInterpretation(
                                                                            v.content,
                                                                        )
                                                                }}
                                                            >
                                                                {`Version ${
                                                                    versions.length -
                                                                    index
                                                                } • ${new Date(v.created_at).toLocaleString()}`}
                                                            </button>
                                                        ),
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
