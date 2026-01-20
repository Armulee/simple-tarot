"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
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
import { Share2 } from "lucide-react"
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
            `mailto:?subject=${encodeURIComponent("Check out my Birth Chart")}&body=${encodeURIComponent(`${t ? t + "\n\n" : ""}${u}`)}`,
    },
    {
        id: "more",
        label: "More",
        icon: <FaShareNodes className='w-5.5 h-5.5 text-white' />,
        bg: "linear-gradient(135deg, #6B7280, #4B5563)",
        href: () => null,
    },
]

interface BirthChartShareSectionProps {
    id?: string
}

export default function BirthChartShareSection({
    id,
}: BirthChartShareSectionProps = {}) {
    const t = useTranslations("BirthChart")
    const navGuardRef = useRef<HTMLDivElement>(null)
    const [unavailableOpen, setUnavailableOpen] = useState(false)
    const [unavailableLabel, setUnavailableLabel] = useState<string>("")
    const fallbackShareUrl = useMemo(() => {
        if (!id) return ""
        const base =
            process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
            "https://askingfate.com"
        return `${base}/birth-chart/${id}`
    }, [id])

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

    const getShareLink = useCallback(() => {
        if (typeof window !== "undefined") {
            return window.location.href
        }
        return fallbackShareUrl
    }, [fallbackShareUrl])

    return (
        <div className='relative overflow-hidden group rounded-xl border border-border/20 bg-card/10 backdrop-blur-sm'>
            {/* Background gradient with animation */}
            <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 rounded-xl transition-all duration-500 group-hover:from-primary/10 group-hover:via-accent/10 group-hover:to-primary/10' />

            {/* Content */}
            <div className='relative'>
                {/* Header with padding */}
                <div className='px-6 pt-6 pb-4'>
                    <div className='flex items-center gap-3 mb-6 animate-fade-up'>
                        <div className='p-2 rounded-full bg-accent/20 backdrop-blur-sm group-hover:bg-accent/30 transition-all duration-300'>
                            <Share2 className='w-5 h-5 text-accent group-hover:scale-110 transition-transform duration-300' />
                        </div>
                        <div>
                            <h3 className='font-serif font-semibold text-lg text-foreground group-hover:text-accent/90 transition-colors duration-300 text-white'>
                                {t("shareTitle")}
                            </h3>
                            <p className='text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300'>
                                {t("shareDescription")}
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
                                        const link = getShareLink()
                                        if (!link) return
                                        const text = "Check out my Birth Chart!"
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
                                                    title: "My Birth Chart",
                                                    text: text,
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
                                    <span className='text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300 text-center leading-tight text-white'>
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
                                Sharing unavailable
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {unavailableLabel} sharing is currently
                                unavailable. Download the media and upload it
                                manually instead.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction
                                onClick={() => setUnavailableOpen(false)}
                            >
                                OK
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}
