"use client"

import {
    useState,
    useCallback,
    useEffect,
    useRef,
    useMemo,
    cloneElement,
    isValidElement,
    type CSSProperties,
    type ReactElement,
    type ReactNode,
} from "react"
import { toast } from "sonner"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"
import {
    FaShareNodes,
    FaFacebook,
    FaXTwitter,
    FaLine,
    FaWhatsapp,
    FaTelegram,
    FaReddit,
    FaFacebookMessenger,
    FaEnvelope,
    FaCommentDots,
} from "react-icons/fa6"
import {
    SiInstagram,
    SiThreads,
    SiTiktok,
    SiSnapchat,
    SiDiscord,
    SiPinterest,
    SiTumblr,
    SiWechat,
} from "react-icons/si"
import { useAuth } from "@/hooks/use-auth"
import { Share2 } from "lucide-react"
import { shareLinkCache } from "@/lib/share-cache"
import { getShareImageBlob } from "@/lib/share-image-client"
import { createShareVideo } from "@/lib/share-video"
import Link from "next/link"
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
import { useTranslations } from "next-intl"

type ShareOption = {
    id: string
    label: string
    icon: ReactNode
    bg: string
    /**
     * "file" platforms (Instagram, TikTok, …) have no web share intent —
     * the rendered poster goes through the OS share sheet instead.
     */
    mode?: "file"
    href: (url: string, text?: string, media?: string) => string | null
}

/** Gold pill toasts, echoing the download sheet's amber theme. Shown at
 *  the top so the bottom-rising OS share sheet never covers them. */
const GOLD_TOAST_STYLE: CSSProperties = {
    background: "linear-gradient(90deg, #f59e0b, #fde047 50%, #f59e0b)",
    color: "#241a05",
    border: "1px solid rgba(252, 211, 77, 0.6)",
    fontWeight: 600,
}

interface ShareSectionProps {
    question?: string
    cards?: string[]
    interpretation?: string
    readingId?: string
    variant?: "full" | "compact" | "embedded"
}

export default function ShareSection({
    question: propQuestion,
    cards: propCards,
    interpretation: propInterpretation,
    readingId: propReadingId,
    variant = "full",
}: ShareSectionProps = {}) {
    const t = useTranslations("ReadingPage.interpretation.share")
    const tInterp = useTranslations("ReadingPage.interpretation")
    const tCommon = useTranslations(
        "ReadingPage.interpretation.dialogs.unavailable",
    )

    const {
        question: contextQuestion,
        selectedCards,
        interpretation: contextInterpretation,
    } = useTarot()
    const question = propQuestion || contextQuestion
    const cards = propCards || selectedCards.map((c) => c.meaning)
    const interpretation = propInterpretation || contextInterpretation
    const readingId = propReadingId

    const { user } = useAuth()
    const navGuardRef = useRef<HTMLDivElement>(null)
    const [earnedStars, setEarnedStars] = useState(0)
    const starsPerVisit = 5
    const maxGrantsPerDay = 3
    const maxStars = starsPerVisit * maxGrantsPerDay
    const [unavailableOpen, setUnavailableOpen] = useState(false)
    const [unavailableLabel, setUnavailableLabel] = useState<string>("")
    const [shareFormat, setShareFormat] = useState<"image" | "video">("image")

    // The 15s recording is generated once and cached; the progress
    // listener lives in a ref so a tap that joins an in-flight
    // generation (e.g. pre-started by the toggle) still gets updates.
    const videoCacheRef = useRef<{ blob: Blob; ext: "mp4" | "webm" } | null>(
        null,
    )
    const videoPromiseRef = useRef<Promise<{
        blob: Blob
        ext: "mp4" | "webm"
    }> | null>(null)
    const videoProgressRef = useRef<((progress: number) => void) | null>(null)

    // Load earned stars from database on mount
    useEffect(() => {
        const loadEarnedStars = async () => {
            if (!readingId) return

            try {
                const response = await fetch(
                    `/api/tarot/earned-stars?readingId=${readingId}`,
                )
                if (response.ok) {
                    const data = await response.json()
                    setEarnedStars(data.earnedStars || 0)
                }
            } catch (error) {
                console.error("Error loading earned stars:", error)
            }
        }
        loadEarnedStars()
    }, [readingId])

    // Refresh earned stars function - only used when needed
    const refreshEarnedStars = useCallback(async () => {
        if (!readingId) return

        try {
            const response = await fetch(
                `/api/tarot/earned-stars?readingId=${readingId}`,
            )
            if (response.ok) {
                const data = await response.json()
                setEarnedStars(data.earnedStars || 0)
            }
        } catch (error) {
            console.error("Error refreshing earned stars:", error)
        }
    }, [readingId])

    // Listen for earned stars updates from other components
    useEffect(() => {
        const handleEarnedStarsUpdate = () => {
            // Optimistically bump UI by +5 (capped), then reconcile with server
            setEarnedStars((prev) =>
                Math.min((prev || 0) + starsPerVisit, maxStars),
            )
            refreshEarnedStars()
        }

        if (typeof window !== "undefined") {
            window.addEventListener(
                "earned-stars-updated",
                handleEarnedStarsUpdate,
            )

            // Cross-tab sync via BroadcastChannel when available
            try {
                if ("BroadcastChannel" in window) {
                    const bc = new BroadcastChannel("tarot-earned-stars")
                    const onMessage = () => handleEarnedStarsUpdate()
                    bc.addEventListener("message", onMessage)
                    ;(
                        window as unknown as {
                            __tarotEarnedBc?: BroadcastChannel
                        }
                    ).__tarotEarnedBc = bc
                }
            } catch {}
        }

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener(
                    "earned-stars-updated",
                    handleEarnedStarsUpdate,
                )
                try {
                    const w = window as unknown as {
                        __tarotEarnedBc?: BroadcastChannel
                    }
                    const bc = w.__tarotEarnedBc
                    if (bc) {
                        bc.close()
                        w.__tarotEarnedBc = undefined
                    }
                } catch {}
            }
        }
    }, [refreshEarnedStars, maxStars, starsPerVisit])

    // Refresh when tab becomes visible (owner may be watching while others visit)
    useEffect(() => {
        if (!readingId) return
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                refreshEarnedStars()
            }
        }
        document.addEventListener("visibilitychange", onVisibilityChange)
        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange)
        }
    }, [readingId, refreshEarnedStars])

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
                const link = `${origin}/tarot/${readingId}`

                // Mark this user as the original sharer
                try {
                    localStorage.setItem("is-original-sharer", "true")
                } catch (error) {
                    console.error("Error marking original sharer:", error)
                }

                return link
            }

            // Fallback to old behavior for backward compatibility
            // Check cache first
            if (question && interpretation) {
                const cachedLink = shareLinkCache.get(
                    question,
                    cards,
                    interpretation,
                )
                if (cachedLink) {
                    return cachedLink
                }
            }

            // First, check if this interpretation already exists
            const checkRes = await fetch("/api/interpretations/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    cards,
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
                    const link = `${origin}/share/${checkData.id}`

                    // Cache the result
                    if (question && interpretation) {
                        shareLinkCache.set(
                            question,
                            cards,
                            interpretation,
                            link,
                        )
                    }

                    // Mark this user as the original sharer
                    try {
                        localStorage.setItem("is-original-sharer", "true")
                    } catch (error) {
                        console.error("Error marking original sharer:", error)
                    }

                    return link
                }
            }

            // If not found, create a new one
            const res = await fetch("/api/interpretations/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    cards,
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
            const link = `${origin}/share/${id}`

            // Cache the result
            if (question && interpretation) {
                shareLinkCache.set(question, cards, interpretation, link)
            }

            // Mark this user as the original sharer
            try {
                localStorage.setItem("is-original-sharer", "true")
            } catch (error) {
                console.error("Error marking original sharer:", error)
            }

            return link
        } catch {
            return null
        }
    }, [readingId, question, cards, interpretation, user?.id])

    /**
     * App-only platforms: render the story poster and hand the file to
     * the OS share sheet (the user picks the app there). Desktop falls
     * back to the clipboard, then to a plain download.
     */
    const sharePlatformImage = useCallback(
        async (option: ShareOption) => {
            const loadingId = toast.loading(t("imagePreparing"), {
                position: "top-center",
                style: GOLD_TOAST_STYLE,
            })
            try {
                const blob = await getShareImageBlob({
                    question: question || undefined,
                    cards,
                    interpretation: interpretation || undefined,
                    cta: tInterp("actions.shareCta"),
                    width: 1080,
                    height: 1920,
                })
                const file = new File([blob], "askingfate-reading.png", {
                    type: "image/png",
                })
                toast.dismiss(loadingId)
                if (
                    typeof navigator !== "undefined" &&
                    typeof navigator.canShare === "function" &&
                    typeof navigator.share === "function" &&
                    navigator.canShare({ files: [file] })
                ) {
                    const hintId = toast(
                        t("selectInSheet", { platform: option.label }),
                        {
                            position: "top-center",
                            duration: 8000,
                            style: GOLD_TOAST_STYLE,
                        },
                    )
                    try {
                        await navigator.share({
                            title: "AskingFate",
                            files: [file],
                        })
                    } catch (error) {
                        toast.dismiss(hintId)
                        if ((error as DOMException)?.name !== "AbortError") {
                            throw error
                        }
                    }
                    return
                }
                if (
                    typeof ClipboardItem !== "undefined" &&
                    navigator.clipboard?.write
                ) {
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            [blob.type || "image/png"]: blob,
                        }),
                    ])
                    toast(t("imageCopied", { platform: option.label }), {
                        position: "top-center",
                        duration: 8000,
                        style: GOLD_TOAST_STYLE,
                    })
                    return
                }
                const url = URL.createObjectURL(blob)
                try {
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "askingfate-reading.png"
                    a.rel = "noopener"
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                } finally {
                    URL.revokeObjectURL(url)
                }
                toast(t("imageSaved", { platform: option.label }), {
                    position: "top-center",
                    duration: 8000,
                    style: GOLD_TOAST_STYLE,
                })
            } catch (error) {
                console.error("Image share error:", error)
                toast.dismiss(loadingId)
                toast.error(t("imageError"), { position: "top-center" })
            }
        },
        [question, cards, interpretation, t, tInterp],
    )

    /**
     * Story-poster overlay + 15s recording over the cosmic film, shared
     * across all platform taps. Overlay render maps to the first 25% of
     * progress, the realtime recording to the rest.
     */
    const getShareVideo = useCallback(() => {
        if (videoCacheRef.current) {
            return Promise.resolve(videoCacheRef.current)
        }
        if (!videoPromiseRef.current) {
            videoPromiseRef.current = (async () => {
                const overlayBlob = await getShareImageBlob(
                    {
                        question: question || undefined,
                        cards,
                        interpretation: interpretation || undefined,
                        cta: tInterp("actions.shareCta"),
                        width: 1080,
                        height: 1920,
                        transparent: true,
                    },
                    (phase, progress) =>
                        videoProgressRef.current?.((progress ?? 0) * 0.25),
                )
                const video = await createShareVideo({
                    overlayBlob,
                    aspect: "story",
                    width: 1080,
                    height: 1920,
                    onProgress: (progress) =>
                        videoProgressRef.current?.(0.25 + progress * 0.75),
                })
                videoCacheRef.current = video
                return video
            })()
            videoPromiseRef.current.catch(() => {
                videoPromiseRef.current = null
            })
        }
        return videoPromiseRef.current
    }, [question, cards, interpretation, tInterp])

    /** Video format: every platform goes through the OS share sheet —
     *  no web intent accepts a video file. */
    const sharePlatformVideo = useCallback(
        async (option: ShareOption) => {
            const loadingId = toast.loading(t("videoPreparing"), {
                position: "top-center",
                style: GOLD_TOAST_STYLE,
            })
            videoProgressRef.current = (progress) => {
                toast.loading(
                    `${t("videoPreparing")} ${Math.round(progress * 100)}%`,
                    {
                        id: loadingId,
                        position: "top-center",
                        style: GOLD_TOAST_STYLE,
                    },
                )
            }
            try {
                const { blob, ext } = await getShareVideo()
                videoProgressRef.current = null
                toast.dismiss(loadingId)
                const file = new File([blob], `askingfate-reading.${ext}`, {
                    type:
                        blob.type ||
                        (ext === "mp4" ? "video/mp4" : "video/webm"),
                })
                if (
                    typeof navigator !== "undefined" &&
                    typeof navigator.canShare === "function" &&
                    typeof navigator.share === "function" &&
                    navigator.canShare({ files: [file] })
                ) {
                    const hintId = toast(
                        t("selectInSheet", { platform: option.label }),
                        {
                            position: "top-center",
                            duration: 8000,
                            style: GOLD_TOAST_STYLE,
                        },
                    )
                    try {
                        await navigator.share({
                            title: "AskingFate",
                            files: [file],
                        })
                    } catch (error) {
                        toast.dismiss(hintId)
                        const name = (error as DOMException)?.name
                        if (name === "AbortError") return
                        if (name === "NotAllowedError") {
                            // The recording outlived the tap's activation
                            // window; it's cached now, so one more tap
                            // shares instantly.
                            toast(
                                t("videoReady", { platform: option.label }),
                                {
                                    position: "top-center",
                                    duration: 8000,
                                    style: GOLD_TOAST_STYLE,
                                },
                            )
                            return
                        }
                        throw error
                    }
                    return
                }
                // No file share sheet (desktop): save it — the clipboard
                // can't hold video.
                const url = URL.createObjectURL(blob)
                try {
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `askingfate-reading.${ext}`
                    a.rel = "noopener"
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                } finally {
                    URL.revokeObjectURL(url)
                }
                toast(t("videoSaved", { platform: option.label }), {
                    position: "top-center",
                    duration: 8000,
                    style: GOLD_TOAST_STYLE,
                })
            } catch (error) {
                console.error("Video share error:", error)
                videoProgressRef.current = null
                toast.dismiss(loadingId)
                toast.error(t("videoError"), { position: "top-center" })
            }
        },
        [getShareVideo, t],
    )

    /** Pre-render the recording while the user is still picking a
     *  platform, so the tap can usually share from cache. */
    const handleFormatChange = (value: "image" | "video") => {
        setShareFormat(value)
        if (value === "video") {
            void getShareVideo().catch(() => {})
        }
    }

    /** One click handler for every variant and platform mode. */
    const handleOptionClick = useCallback(
        async (option: ShareOption) => {
            if (shareFormat === "video") {
                await sharePlatformVideo(option)
                return
            }
            if (option.mode === "file") {
                await sharePlatformImage(option)
                return
            }
            const link = await ensureShareLink()
            if (!link) return
            const text = question
                ? `"${question}" — AI tarot interpretation`
                : undefined
            if (
                option.id === "more" &&
                typeof navigator !== "undefined" &&
                typeof navigator.share === "function"
            ) {
                try {
                    await navigator.share({
                        title: "AskingFate",
                        text,
                        url: link,
                    })
                } catch {}
                return
            }
            // Pinterest pins the actual poster: pass its public render URL,
            // derived from the reading id at the end of the share link.
            let media: string | undefined
            if (option.id === "pinterest") {
                const id = link.split("/").filter(Boolean).pop()
                if (id) {
                    media = `${window.location.origin}/api/share-image/${id}?style=story`
                }
            }
            const href = option.href(link, text, media)
            if (href) {
                window.open(href, "_blank", "noopener,noreferrer")
            } else {
                setUnavailableLabel(option.label)
                setUnavailableOpen(true)
            }
        },
        [ensureShareLink, question, shareFormat, sharePlatformImage, sharePlatformVideo],
    )

    /** Image/video segmented pill — top-right of the section header. */
    const formatToggle = (
        <div
            role='group'
            aria-label={t("formatLabel")}
            className='inline-flex items-center rounded-full border border-amber-300/25 bg-white/5 p-0.5'
        >
            {(["image", "video"] as const).map((value) => (
                <button
                    key={value}
                    type='button'
                    onClick={() => handleFormatChange(value)}
                    aria-pressed={shareFormat === value}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                        shareFormat === value
                            ? "bg-gradient-to-r from-amber-400/90 via-yellow-300/90 to-amber-400/90 text-[#241a05] shadow-[0_2px_10px_-2px_rgba(252,211,77,0.55)]"
                            : "text-white/65 hover:text-white/90"
                    }`}
                >
                    {t(value === "video" ? "formatVideo" : "formatImage")}
                </button>
            ))}
        </div>
    )

    const shareOptions = useMemo<ShareOption[]>(
        () => [
            {
                id: "facebook",
                label: t("facebook"),
                icon: <FaFacebook className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #1877F2, #0D5FCC)",
                href: (u: string) =>
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
            },
            {
                id: "messenger",
                label: t("messenger"),
                icon: (
                    <FaFacebookMessenger className='w-5.5 h-5.5 text-white' />
                ),
                bg: "linear-gradient(135deg, #0084FF, #0066CC)",
                href: (u: string) =>
                    `https://www.messenger.com/t/?link=${encodeURIComponent(u)}`,
            },
            {
                id: "instagram",
                label: t("instagram"),
                icon: <SiInstagram className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #E4405F, #C13584)",
                mode: "file",
                href: () => null,
            },

            {
                id: "tiktok",
                label: t("tiktok"),
                icon: <SiTiktok className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #000000, #333333)",
                mode: "file",
                href: () => null,
            },
            {
                id: "x",
                label: t("x"),
                icon: <FaXTwitter className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #000000, #333333)",
                href: (u: string, t?: string) =>
                    `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}${t ? `&text=${encodeURIComponent(t)}` : ""}`,
            },
            {
                id: "threads",
                label: t("threads"),
                icon: <SiThreads className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #000000, #333333)",
                href: (u: string, t?: string) =>
                    `https://www.threads.net/intent/post?url=${encodeURIComponent(u)}${t ? `&text=${encodeURIComponent(t)}` : ""}`,
            },
            {
                id: "line",
                label: t("line"),
                icon: <FaLine className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #00C300, #00A000)",
                href: (u: string) =>
                    `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(u)}`,
            },
            {
                id: "whatsapp",
                label: t("whatsapp"),
                icon: <FaWhatsapp className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #25D366, #1DA851)",
                href: (u: string) =>
                    `https://api.whatsapp.com/send?text=${encodeURIComponent(u)}`,
            },
            {
                id: "telegram",
                label: t("telegram"),
                icon: <FaTelegram className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #24A1DE, #1E8BC3)",
                href: (u: string) =>
                    `https://t.me/share/url?url=${encodeURIComponent(u)}`,
            },
            {
                id: "snapchat",
                label: t("snapchat"),
                icon: <SiSnapchat className='w-5.5 h-5.5 text-black' />,
                bg: "linear-gradient(135deg, #FFFC00, #FFD700)",
                mode: "file",
                href: () => null,
            },
            {
                id: "discord",
                label: t("discord"),
                icon: <SiDiscord className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #5865F2, #4752C4)",
                mode: "file",
                href: () => null,
            },
            {
                id: "pinterest",
                label: t("pinterest"),
                icon: <SiPinterest className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #E60023, #CC001F)",
                href: (u: string, t?: string, media?: string) =>
                    `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}${media ? `&media=${encodeURIComponent(media)}` : ""}${t ? `&description=${encodeURIComponent(t)}` : ""}`,
            },
            {
                id: "tumblr",
                label: t("tumblr"),
                icon: <SiTumblr className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #36465D, #2C3E50)",
                href: (u: string, t?: string) =>
                    `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(u)}${t ? `&caption=${encodeURIComponent(t)}` : ""}`,
            },
            {
                id: "wechat",
                label: t("wechat"),
                icon: <SiWechat className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #07C160, #05A050)",
                mode: "file",
                href: () => null,
            },
            {
                id: "reddit",
                label: t("reddit"),
                icon: <FaReddit className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, #FF4500, #E63900)",
                href: (u: string, t?: string) =>
                    `https://www.reddit.com/submit?url=${encodeURIComponent(u)}${t ? `&title=${encodeURIComponent(t)}` : ""}`,
            },
            {
                id: "sms",
                label: t("sms"),
                icon: <FaCommentDots className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, var(--primary), var(--accent))",
                href: (u: string, t?: string) =>
                    `sms:?&body=${encodeURIComponent(`${t ? t + " " : ""}${u}`)}`,
            },
            {
                id: "email",
                label: t("email"),
                icon: <FaEnvelope className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, var(--primary), var(--accent))",
                href: (u: string, t?: string) =>
                    `mailto:?subject=${encodeURIComponent("Check out my tarot reading")}&body=${encodeURIComponent(`${t ? t + "\n\n" : ""}${u}`)}`,
            },
            {
                id: "more",
                label: t("more"),
                icon: <FaShareNodes className='w-5.5 h-5.5 text-white' />,
                bg: "linear-gradient(135deg, var(--primary), var(--accent))",
                href: () => null,
            },
        ],
        [t],
    )

    const renderIcon = (icon: ReactNode) =>
        isValidElement(icon)
            ? cloneElement(icon as ReactElement<{ className?: string }>, {
                  className: "w-4 h-4 text-white",
              })
            : icon

    if (variant === "compact") {
        return (
            <div className='flex flex-wrap items-center gap-2'>
                {shareOptions.map((option) => (
                    <button
                        key={option.id}
                        type='button'
                        onClick={() => void handleOptionClick(option)}
                        className='flex items-center justify-center h-6 w-6 rounded-full border border-white/10 bg-white/5 text-white/80 hover:text-white hover:border-white/30 transition-colors'
                        title={option.label}
                        aria-label={option.label}
                    >
                        {renderIcon(option.icon)}
                    </button>
                ))}
            </div>
        )
    }

    if (variant === "embedded") {
        return (
            <div className='relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)] transition hover:border-accent/40'>
                <div
                    aria-hidden
                    className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.18),rgba(168,85,247,0.12)_35%,rgba(34,211,238,0.10)_70%,transparent_80%)] blur-xl opacity-90'
                />
                <div className='relative py-4'>
                    <div className='mb-6 flex items-start gap-2.5'>
                        <div className='min-w-0 flex-1 px-4'>
                            <p className='text-sm font-semibold uppercase tracking-wider text-white/88'>
                                {t("title")}
                            </p>
                            <p className='mt-0.5 text-[11px] leading-snug text-white/70'>
                                {t("desc", {
                                    earned: earnedStars,
                                    max: maxStars,
                                })}{" "}
                                <Link
                                    href='/articles/share-rewards'
                                    className='underline underline-offset-2 hover:text-cyan-100'
                                >
                                    {t("learnMore")}
                                </Link>
                            </p>
                        </div>
                        <div className='shrink-0 pr-4'>{formatToggle}</div>
                    </div>

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
                                640: { slidesPerView: 5.5 },
                                768: { slidesPerView: 6.5 },
                                1024: { slidesPerView: 8 },
                                1280: { slidesPerView: 9.5 },
                                1536: { slidesPerView: 10.5 },
                            }}
                            spaceBetween={4}
                            className='py-1'
                        >
                            {shareOptions.map((option) => (
                                <SwiperSlide key={option.id}>
                                    <button
                                        type='button'
                                        onClick={() =>
                                            void handleOptionClick(option)
                                        }
                                        className='group flex w-full flex-col items-center gap-1.5 py-2 transition-all duration-300'
                                        aria-label={option.label}
                                    >
                                        <div
                                            className='relative flex h-9 w-9 items-center justify-center rounded-full shadow-[0_6px_18px_-6px_rgba(0,0,0,0.6)] ring-1 ring-white/15 transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_10px_24px_-6px_rgba(168,85,247,0.55)] group-hover:ring-white/40'
                                            style={{
                                                background: option.bg,
                                            }}
                                        >
                                            {renderIcon(option.icon)}
                                            <div className='absolute inset-0 rounded-full bg-white/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
                                        </div>
                                        <span className='text-[10px] leading-snug text-white/75 text-pretty text-wrap text-center group-hover:text-white'>
                                            {option.label}
                                        </span>
                                    </button>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className='group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)] transition hover:border-accent/40'>
            <div
                aria-hidden
                className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.18),rgba(168,85,247,0.12)_35%,rgba(34,211,238,0.10)_70%,transparent_80%)] blur-xl opacity-90'
            />
            {/* Content */}
            <div className='relative'>
                {/* Header with padding */}
                <div className='px-6 pt-6 pb-4'>
                    <div className='mb-6 flex animate-fade-up items-start gap-3'>
                        <div className='rounded-full bg-white/10 p-2 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/15'>
                            <Share2 className='h-5 w-5 text-cyan-200/90 transition-transform duration-300 group-hover:scale-110 group-hover:text-white' />
                        </div>
                        <div className='min-w-0 flex-1'>
                            <h3 className='font-serif text-lg font-semibold text-white/90 transition-colors duration-300 group-hover:text-white'>
                                {t("title")}
                            </h3>
                            <p className='text-sm text-white/65 transition-colors duration-300 group-hover:text-white/80'>
                                {t("desc", {
                                    earned: earnedStars,
                                    max: maxStars,
                                })}{" "}
                                <Link
                                    href='/articles/share-rewards'
                                    className='underline underline-offset-2 text-cyan-200/90 hover:text-cyan-100'
                                >
                                    {t("learnMore")}
                                </Link>
                            </p>
                        </div>
                        <div className='shrink-0'>{formatToggle}</div>
                    </div>
                </div>

                {/* Share Options - Full width swiper */}
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
                        {shareOptions.map((option, index) => (
                            <SwiperSlide key={option.id}>
                                <button
                                    type='button'
                                    onClick={() =>
                                        void handleOptionClick(option)
                                    }
                                    className='group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg w-full'
                                    style={{
                                        animationDelay: `${index * 50}ms`,
                                        animationFillMode: "both",
                                    }}
                                >
                                    {/* Icon container with gradient background */}
                                    <div
                                        className='relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-110'
                                        style={{ background: option.bg }}
                                    >
                                        {option.icon}
                                        {/* Hover glow effect */}
                                        <div className='absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                    </div>

                                    {/* Label */}
                                    <span className='text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300 text-center leading-tight'>
                                        {option.label}
                                    </span>
                                </button>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
                {/* Unavailable share dialog */}
                <AlertDialog open={unavailableOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {tCommon("title")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {tCommon("desc", { label: unavailableLabel })}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction
                                onClick={() => setUnavailableOpen(false)}
                            >
                                {tCommon("ok")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}
