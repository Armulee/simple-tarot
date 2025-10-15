"use client"

import { useState, useCallback, useEffect, useRef } from "react"
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

const shareOptions = [
    {
        id: "facebook",
        label: "Facebook",
        icon: <FaFacebook className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #1877F2, #0D5FCC)",
        href: (u: string) =>
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
    },
    {
        id: "messenger",
        label: "Messenger",
        icon: <FaFacebookMessenger className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #0084FF, #0066CC)",
        href: (u: string) =>
            `https://www.messenger.com/t/?link=${encodeURIComponent(u)}`,
    },
    {
        id: "instagram",
        label: "Instagram",
        icon: <SiInstagram className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #E4405F, #C13584)",
        href: () => null,
    },
    {
        id: "threads",
        label: "Threads",
        icon: <SiThreads className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #000000, #333333)",
        href: (u: string, t?: string) =>
            `https://www.threads.net/intent/post?url=${encodeURIComponent(u)}${t ? `&text=${encodeURIComponent(t)}` : ""}`,
    },
    {
        id: "tiktok",
        label: "TikTok",
        icon: <SiTiktok className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #000000, #333333)",
        href: () => null,
    },
    {
        id: "x",
        label: "X",
        icon: <FaXTwitter className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #000000, #333333)",
        href: (u: string, t?: string) =>
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}${t ? `&text=${encodeURIComponent(t)}` : ""}`,
    },
    {
        id: "line",
        label: "LINE",
        icon: <FaLine className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #00C300, #00A000)",
        href: (u: string) =>
            `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(u)}`,
    },
    {
        id: "whatsapp",
        label: "WhatsApp",
        icon: <FaWhatsapp className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #25D366, #1DA851)",
        href: (u: string) =>
            `https://api.whatsapp.com/send?text=${encodeURIComponent(u)}`,
    },
    {
        id: "telegram",
        label: "Telegram",
        icon: <FaTelegram className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #24A1DE, #1E8BC3)",
        href: (u: string) =>
            `https://t.me/share/url?url=${encodeURIComponent(u)}`,
    },
    {
        id: "snapchat",
        label: "Snapchat",
        icon: <SiSnapchat className='w-5.5 h-5.5 text-black' />,
        bg: "linear-gradient(135deg, #FFFC00, #FFD700)",
        href: () => null,
    },
    {
        id: "discord",
        label: "Discord",
        icon: <SiDiscord className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #5865F2, #4752C4)",
        href: () => null,
    },
    {
        id: "pinterest",
        label: "Pinterest",
        icon: <SiPinterest className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #E60023, #CC001F)",
        href: (u: string, t?: string) =>
            `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}${t ? `&description=${encodeURIComponent(t)}` : ""}`,
    },
    {
        id: "tumblr",
        label: "Tumblr",
        icon: <SiTumblr className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #36465D, #2C3E50)",
        href: (u: string, t?: string) =>
            `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(u)}${t ? `&caption=${encodeURIComponent(t)}` : ""}`,
    },
    {
        id: "wechat",
        label: "WeChat",
        icon: <SiWechat className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #07C160, #05A050)",
        href: () => null,
    },
    {
        id: "reddit",
        label: "Reddit",
        icon: <FaReddit className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #FF4500, #E63900)",
        href: (u: string, t?: string) =>
            `https://www.reddit.com/submit?url=${encodeURIComponent(u)}${t ? `&title=${encodeURIComponent(t)}` : ""}`,
    },
    {
        id: "sms",
        label: "SMS",
        icon: <FaCommentDots className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #34C759, #30A46C)",
        href: (u: string, t?: string) =>
            `sms:?&body=${encodeURIComponent(`${t ? t + " " : ""}${u}`)}`,
    },
    {
        id: "email",
        label: "Email",
        icon: <FaEnvelope className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #EA4335, #D33B2C)",
        href: (u: string, t?: string) =>
            `mailto:?subject=${encodeURIComponent("Check out my tarot reading")}&body=${encodeURIComponent(`${t ? t + "\n\n" : ""}${u}`)}`,
    },
    {
        id: "more",
        label: "More",
        icon: <FaShareNodes className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #6B7280, #4B5563)",
        href: () => null,
    },
]

interface ShareSectionProps {
    question?: string
    cards?: string[]
    interpretation?: string
    readingId?: string
}

export default function ShareSection({
    question: propQuestion,
    cards: propCards,
    interpretation: propInterpretation,
    readingId: propReadingId,
}: ShareSectionProps = {}) {
    const {
        question: contextQuestion,
        selectedCards,
        interpretation: contextInterpretation,
    } = useTarot()
    const question = propQuestion || contextQuestion
    const cards = propCards || selectedCards.map((c) => c.meaning)
    const interpretation = propInterpretation || contextInterpretation
    const readingId = propReadingId

    const [, setCopied] = useState(false)
    const { user } = useAuth()
    const navGuardRef = useRef<HTMLDivElement>(null)
    const [earnedStars, setEarnedStars] = useState(0)
    const maxStars = 5
    const [unavailableOpen, setUnavailableOpen] = useState(false)
    const [unavailableLabel, setUnavailableLabel] = useState<string>("")

    // Load earned stars from database on mount
    useEffect(() => {
        const loadEarnedStars = async () => {
            if (!readingId) return

            try {
                const response = await fetch(
                    `/api/tarot/earned-stars?readingId=${readingId}`
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
                `/api/tarot/earned-stars?readingId=${readingId}`
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
            // Optimistically bump UI by +1 (capped), then reconcile with server
            setEarnedStars((prev) => Math.min((prev || 0) + 1, maxStars))
            refreshEarnedStars()
        }

        if (typeof window !== "undefined") {
            window.addEventListener(
                "earned-stars-updated",
                handleEarnedStarsUpdate
            )

            // Cross-tab sync via BroadcastChannel when available
            try {
                if ("BroadcastChannel" in window) {
                    const bc = new BroadcastChannel("tarot-earned-stars")
                    const onMessage = () => handleEarnedStarsUpdate()
                    bc.addEventListener("message", onMessage)
                    ;(window as unknown as { __tarotEarnedBc?: BroadcastChannel }).__tarotEarnedBc = bc
                }
            } catch {}
        }

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener(
                    "earned-stars-updated",
                    handleEarnedStarsUpdate
                )
                try {
                    const w = window as unknown as { __tarotEarnedBc?: BroadcastChannel }
                    const bc = w.__tarotEarnedBc
                    if (bc) {
                        bc.close()
                        w.__tarotEarnedBc = undefined
                    }
                } catch {}
            }
        }
    }, [refreshEarnedStars, maxStars])

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
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange
            )
        }
    }, [readingId, refreshEarnedStars])

    // Lightweight polling to keep header fresh while viewing
    useEffect(() => {
        if (!readingId) return
        const intervalId = window.setInterval(() => {
            refreshEarnedStars()
        }, 15000) // 15s polling
        return () => window.clearInterval(intervalId)
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
                    interpretation
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
                    const link = `${origin}/share/tarot/${checkData.id}`

                    // Cache the result
                    if (question && interpretation) {
                        shareLinkCache.set(
                            question,
                            cards,
                            interpretation,
                            link
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
            const link = `${origin}/share/tarot/${id}`

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

    return (
        <div className='relative overflow-hidden group'>
            {/* Background gradient with animation */}
            <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 rounded-xl transition-all duration-500 group-hover:from-primary/10 group-hover:via-accent/10 group-hover:to-primary/10' />

            {/* Animated border */}
            <div className='absolute inset-0 rounded-xl border border-primary/20 group-hover:border-primary/40 transition-all duration-500' />

            {/* Content */}
            <div className='relative'>
                {/* Header with padding */}
                <div className='px-6 pt-6 pb-4'>
                    <div className='flex items-center gap-3 mb-6 animate-fade-up'>
                        <div className='p-2 rounded-full bg-primary/20 backdrop-blur-sm group-hover:bg-primary/30 transition-all duration-300'>
                            <Share2 className='w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300' />
                        </div>
                        <div>
                            <h3 className='font-serif font-semibold text-lg text-foreground group-hover:text-primary/90 transition-colors duration-300'>
                                Share Your Reading
                            </h3>
                            <p className='text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300'>
                                Get 1 free star for each new person who visits
                                your shared link ({earnedStars}/{maxStars}){" "}
                                <Link
                                    href='/articles/share-rewards'
                                    className='underline underline-offset-2 text-blue-300 hover:text-blue-200'
                                >
                                    Learn more
                                </Link>
                            </p>
                        </div>
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
                        spaceBetween={8}
                        className='py-2 px-6'
                    >
                        {shareOptions.map((option, index) => (
                            <SwiperSlide key={option.id}>
                                <button
                                    type='button'
                                    onClick={async () => {
                                        const link = await ensureShareLink()
                                        if (!link) return
                                        const text = question
                                            ? `"${question}" — AI tarot interpretation`
                                            : undefined
                                        const href = option.href(link, text)

                                        if (
                                            option.id === "more" &&
                                            typeof navigator !== "undefined" &&
                                            typeof (
                                                navigator as unknown as {
                                                    share?: (data: {
                                                        title?: string
                                                        text?: string
                                                        url?: string
                                                    }) => Promise<void>
                                                }
                                            ).share === "function"
                                        ) {
                                            try {
                                                await (
                                                    navigator as unknown as {
                                                        share: (data: {
                                                            title?: string
                                                            text?: string
                                                            url?: string
                                                        }) => Promise<void>
                                                    }
                                                ).share({
                                                    title: "My Tarot Reading",
                                                    text: text || undefined,
                                                    url: link,
                                                })
                                            } catch {}
                                        } else if (href) {
                                            window.open(
                                                href,
                                                "_blank",
                                                "noopener,noreferrer"
                                            )
                                        } else {
                                            // Unavailable platform: show dialog instead of copy fallback
                                            setUnavailableLabel(option.label)
                                            setUnavailableOpen(true)
                                        }
                                    }}
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
                        <AlertDialogTitle>Sharing unavailable</AlertDialogTitle>
                        <AlertDialogDescription>
                            {unavailableLabel} sharing is currently unavailable and still in work.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setUnavailableOpen(false)}>
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </div>
        </div>
    )
}
