"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"
import {
    FaArrowsRotate,
    FaPlus,
    FaLink,
    FaRegFileLines,
    FaDownload,
    FaFlag,
    FaThumbsUp,
    FaThumbsDown,
    FaComment,
    FaCheck,
} from "react-icons/fa6"
import { useAuth } from "@/hooks/use-auth"
import { Settings } from "lucide-react"
import { useTarot } from "@/contexts/tarot-context"
import { useRouter } from "next/navigation"
import { useStars } from "@/contexts/stars-context"
import { useCompletion } from "@ai-sdk/react"

export default function ActionSection() {
    const {
        question,
        selectedCards: cards,
        interpretation,
        setInterpretation,
        setPaidForInterpretation,
    } = useTarot()
    const [copiedLink, setCopiedLink] = useState(false)
    const [copiedText, setCopiedText] = useState(false)
    const { user } = useAuth()
    const router = useRouter()
    const { spendStars, stars } = useStars()
    const navGuardRef = useRef<HTMLDivElement>(null)

    const { complete } = useCompletion({
        api: "/api/interpret-cards/question",
        onFinish: (_, completion) => {
            setInterpretation(completion)
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
            // First, check if this interpretation already exists
            const checkRes = await fetch("/api/interpretations/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    cards: cards.map((c) => c.meaning),
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
                    cards: cards.map((c) => c.meaning),
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
    }, [question, cards, interpretation, user?.id])

    const handleRegenerate = useCallback(async () => {
        try {
            // Check if user has enough stars
            if (!Number.isFinite(stars as number) || (stars as number) < 1) {
                // Could show a dialog here, but for now just return
                return
            }

            // Spend a star for regeneration
            await spendStars(1)
            setPaidForInterpretation(true)

            // Clear current interpretation
            setInterpretation(null)

            // Build the prompt for interpretation
            const cardNames = cards.map((card) => card.meaning).join(", ")
            const prompt = `Question: ${question}

Cards drawn: ${cardNames}

Please provide a tarot interpretation for this question and these cards. Focus on:
- Direct, practical guidance
- Clear, grounded answer
- Mention cards only if essential
- Answer directly to the question`

            // Generate new interpretation
            await complete(prompt)
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
        complete,
    ])

    const actionOptions = [
        {
            id: "regen",
            label: "Regenerate",
            icon: <FaArrowsRotate className='w-4 h-4 text-white' />,
            bg: "linear-gradient(135deg, #6366F1, #4F46E5)",
            description: "Get a new interpretation",
            onClick: handleRegenerate,
        },
        {
            id: "new",
            label: "New Reading",
            icon: <FaPlus className='w-4 h-4 text-white' />,
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
            description: "Save as image",
            onClick: async () => {
                try {
                    const res = await fetch("/api/share-image", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            question,
                            cards: cards.map((c) => c.meaning),
                            interpretation,
                            width: 1080,
                            height: 1350,
                        }),
                    })
                    const blob = await res.blob()
                    const ts = new Date().toISOString().replace(/[:.]/g, "-")
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `reading-${ts}.png`
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    URL.revokeObjectURL(url)
                } catch {}
            },
        },
        {
            id: "report",
            label: "Report",
            icon: <FaFlag className='w-4 h-4 text-white' />,
            bg: "linear-gradient(135deg, #EF4444, #DC2626)",
            description: "Report issue",
            onClick: async () => {
                const link = await ensureShareLink()
                const mailto = `mailto:?subject=${encodeURIComponent("Report Tarot Reading")}&body=${encodeURIComponent(link || "")}`
                window.location.href = mailto
            },
        },
        {
            id: "vote-up",
            label: "Vote Up",
            icon: <FaThumbsUp className='w-4 h-4 text-white' />,
            bg: "linear-gradient(135deg, #22C55E, #16A34A)",
            description: "Like this reading",
            onClick: async () => {
                const link = await ensureShareLink()
                const id = (link || "").split("/").pop() || ""
                try {
                    localStorage.setItem(`share-vote-${id}`, "up")
                } catch {}
            },
        },
        {
            id: "vote-down",
            label: "Vote Down",
            icon: <FaThumbsDown className='w-4 h-4 text-white' />,
            bg: "linear-gradient(135deg, #F59E0B, #D97706)",
            description: "Dislike this reading",
            onClick: async () => {
                const link = await ensureShareLink()
                const id = (link || "").split("/").pop() || ""
                try {
                    localStorage.setItem(`share-vote-${id}`, "down")
                } catch {}
            },
        },
        {
            id: "feedback",
            label: "Feedback",
            icon: <FaComment className='w-4 h-4 text-white' />,
            bg: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            description: "Share feedback",
            onClick: async () => {
                window.open(
                    "/contact?subject=Feedback%20on%20Tarot%20Reading",
                    "_blank"
                )
            },
        },
    ]

    return (
        <div className='relative overflow-hidden group'>
            {/* Background gradient with animation */}
            <div className='absolute inset-0 bg-gradient-to-br from-accent/5 via-primary/5 to-accent/5 rounded-xl transition-all duration-500 group-hover:from-accent/10 group-hover:via-primary/10 group-hover:to-accent/10' />

            {/* Animated border */}
            <div className='absolute inset-0 rounded-xl border border-accent/20 group-hover:border-accent/40 transition-all duration-500' />

            {/* Content */}
            <div className='relative p-6'>
                {/* Header */}
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

                {/* Action Options */}
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
                        spaceBetween={8}
                        breakpoints={{
                            640: {
                                slidesPerView: "auto",
                            },
                        }}
                        className='py-2'
                    >
                        {actionOptions.map((action, index) => (
                            <SwiperSlide
                                key={action.id}
                                style={{ width: "70px" }}
                            >
                                <button
                                    type='button'
                                    onClick={action.onClick}
                                    className='group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg w-full'
                                    style={{
                                        animationDelay: `${index * 50}ms`,
                                        animationFillMode: "both",
                                    }}
                                >
                                    {/* Icon container with gradient background */}
                                    <div
                                        className='relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-110'
                                        style={{ background: action.bg }}
                                    >
                                        {action.icon}
                                        {/* Hover glow effect */}
                                        <div className='absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                    </div>

                                    {/* Label */}
                                    <span className='text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-300 text-center leading-tight'>
                                        {action.label}
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
