"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Sparkles,
    ShieldCheck,
    Link as LinkIcon,
    Copy,
    ShieldAlert,
    Clock,
    AlertCircle,
    ExternalLink,
    Trophy,
    Palette,
    Globe,
    Camera,
    PenLine,
    Lightbulb,
    CheckCircle2,
    RefreshCcw,
    Instagram,
    Twitter,
    Facebook,
    Music2,
    Youtube,
    FileText,
    Linkedin,
    Globe2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { toast } from "sonner"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { useStars } from "@/contexts/stars-context"
import { cn } from "@/lib/utils"
import {
    AI_MEDIA_OPTIONS,
    AI_LANGUAGE_OPTIONS,
    AI_STAR_COST_CAP,
    CONTENT_TYPE_CATALOG,
    CONTENT_TYPE_OPTIONS_BY_MEDIA,
    type ContentTypeKey,
    type MediaPlatform,
    type LanguageCode,
    type LanguageOption,
} from "@/lib/content-generator"

type SubmissionStatus = "pending" | "verified" | "failed" | "manual_review"
type VerificationMethod =
    | "public_code"
    | "meta_tag"
    | "profile_bio"
    | "manual_proof"

interface VerificationResult {
    autoCheck?: boolean
    found?: boolean
    reason?: string
    preview?: string
    fetchError?: string
    evidenceUrl?: string
    [key: string]: unknown
}

interface ContentSubmission {
    id: string
    user_id: string
    url: string
    title: string | null
    platform: string | null
    notes: string | null
    verification_code: string
    verification_method: VerificationMethod
    verification_status: SubmissionStatus
    verification_result: VerificationResult | null
    auto_verified: boolean
    verified_at: string | null
    created_at: string
    updated_at: string
}

const submissionPlatformOptions = [
    { value: "twitter", label: "X / Twitter" },
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "tiktok", label: "TikTok" },
    { value: "youtube", label: "YouTube" },
    { value: "blog", label: "Blog / Website" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "other", label: "Other" },
]

const verificationMethodOptions: Array<{
    value: VerificationMethod
    label: string
    helper: string
}> = [
    {
        value: "public_code",
        label: "Public snippet inside the content",
        helper: "Add the verification code anywhere in the post caption, article body, or comment that you control.",
    },
    {
        value: "meta_tag",
        label: "Meta tag on your website",
        helper: 'Add a <meta name="asking-fate-verification" content="CODE" /> tag to the <head> of your page.',
    },
    {
        value: "profile_bio",
        label: "Profile bio (temporary)",
        helper: "Temporarily add the code to the bio of the social profile that published the content.",
    },
    {
        value: "manual_proof",
        label: "Manual proof (screenshot or drive link)",
        helper: "Use this only if the content platform blocks our bot. Provide a link to an image or document that proves ownership.",
    },
]

const statusConfig: Record<
    SubmissionStatus,
    { label: string; badgeClass: string; description: string }
> = {
    pending: {
        label: "Pending",
        badgeClass: "bg-sky-500/20 text-sky-200 border-sky-500/40",
        description: "Queued for processing.",
    },
    verified: {
        label: "Verified",
        badgeClass: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
        description: "Ownership verified automatically.",
    },
    failed: {
        label: "Failed",
        badgeClass: "bg-rose-500/20 text-rose-200 border-rose-500/40",
        description: "We could not find your verification code.",
    },
    manual_review: {
        label: "Manual review",
        badgeClass: "bg-amber-500/20 text-amber-100 border-amber-500/40",
        description: "Requires a teammate to confirm ownership.",
    },
}

const formatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
})

const highlightCards = [
    {
        title: "Earn 15–50 Stars",
        description:
            "Turn authentic promos into premium star rewards every month.",
        icon: Trophy,
        accent: "from-yellow-400/30 via-amber-500/25 to-yellow-600/30 border-yellow-500/40 text-yellow-200",
    },
    {
        title: "Create In Any Medium",
        description:
            "Share reels, blogs, podcasts, livestreams, or something totally new.",
        icon: Palette,
        accent: "from-pink-500/30 via-purple-500/25 to-indigo-500/30 border-purple-500/40 text-purple-200",
    },
    {
        title: "Reach A Global Audience",
        description:
            "Link to public content from any social platform or personal site.",
        icon: Globe,
        accent: "from-blue-500/30 via-cyan-500/25 to-sky-500/30 border-cyan-500/40 text-sky-200",
    },
]

const proofShortcuts = [
    {
        title: "Add the code visibly",
        description:
            "Place it in your caption, blog post, or video description before submitting.",
        icon: CheckCircle2,
    },
    {
        title: "Meta tags for websites",
        description:
            'Add `<meta name="asking-fate-verification" content="…" />` inside the head tag.',
        icon: PenLine,
    },
    {
        title: "Manual fallback",
        description:
            "If a platform blocks crawlers, share a public screenshot or drive link.",
        icon: Camera,
    },
]

const inspirationPrompts = [
    {
        title: "Behind-the-scenes rituals",
        body: "Record how you prepare for readings, shuffle cards, or set the mystical mood.",
    },
    {
        title: "Success stories",
        body: "Tell the story of someone whose AskingFate reading sparked a breakthrough.",
    },
    {
        title: "Platform walkthroughs",
        body: "Create a screen guide showing your favorite AskingFate features in action.",
    },
    {
        title: "Cosmic collaborations",
        body: "Host a livestream with fellow mystics and share the rewatch link here.",
    },
]

export default function SubmitContentPage() {
    const { user, session, loading: authLoading } = useAuth()
    const router = useRouter()

    const [verificationToken, setVerificationToken] = useState<string>("")
    const [copied, setCopied] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loadingSubmissions, setLoadingSubmissions] = useState(false)
    const [submissions, setSubmissions] = useState<ContentSubmission[]>([])

    const [formState, setFormState] = useState({
        title: "",
        url: "",
        platform: "",
        notes: "",
        verificationMethod: "public_code" as VerificationMethod,
        evidenceUrl: "",
    })

    const { stars, spendStars } = useStars()
    const defaultMediaPlatform = (AI_MEDIA_OPTIONS[0]?.value ??
        "instagram") as MediaPlatform
    const defaultLanguage = (AI_LANGUAGE_OPTIONS[0]?.value ??
        "en") as LanguageCode
    const [selectedMediaPlatform, setSelectedMediaPlatform] =
        useState<MediaPlatform>(defaultMediaPlatform)
    const [selectedLanguage, setSelectedLanguage] =
        useState<LanguageCode>(defaultLanguage)
    const initialContentKey = (CONTENT_TYPE_OPTIONS_BY_MEDIA[
        defaultMediaPlatform
    ] ?? CONTENT_TYPE_OPTIONS_BY_MEDIA.other)[0]
    const [selectedContentType, setSelectedContentType] =
        useState<ContentTypeKey>(initialContentKey)
    const [aiContent, setAiContent] = useState("")
    const [aiGenerating, setAiGenerating] = useState(false)
    const [aiCopied, setAiCopied] = useState(false)
    const [aiError, setAiError] = useState<string | null>(null)

    const availableContentTypeOptions = useMemo(() => {
        const keys =
            CONTENT_TYPE_OPTIONS_BY_MEDIA[selectedMediaPlatform] ??
            CONTENT_TYPE_OPTIONS_BY_MEDIA.other
        return keys.map((key) => ({
            value: key,
            label: CONTENT_TYPE_CATALOG[key].label,
            cost: CONTENT_TYPE_CATALOG[key].cost,
            guidance: CONTENT_TYPE_CATALOG[key].guidance,
        }))
    }, [selectedMediaPlatform])

    useEffect(() => {
        const keys =
            CONTENT_TYPE_OPTIONS_BY_MEDIA[selectedMediaPlatform] ??
            CONTENT_TYPE_OPTIONS_BY_MEDIA.other
        if (keys.length > 0 && !keys.includes(selectedContentType)) {
            setSelectedContentType(keys[0])
        }
    }, [selectedMediaPlatform, selectedContentType])

    const activeContentType = useMemo(() => {
        if (!availableContentTypeOptions.length) return null
        return (
            availableContentTypeOptions.find(
                (option) => option.value === selectedContentType,
            ) ?? availableContentTypeOptions[0]
        )
    }, [availableContentTypeOptions, selectedContentType])

    const selectedLanguageOption = useMemo<LanguageOption | undefined>(() => {
        return AI_LANGUAGE_OPTIONS.find(
            (option) => option.value === selectedLanguage,
        )
    }, [selectedLanguage])

    const selectedLanguageLabel =
        selectedLanguageOption?.label ?? "Selected language"
    const selectedLanguageFlag = selectedLanguageOption?.flag ?? "🌐"

    const mediaVisuals: Record<
        MediaPlatform,
        { icon: LucideIcon; bg: string; label: string }
    > = {
        instagram: {
            icon: Instagram,
            bg: "from-[#F58529]/80 via-[#D62976]/80 to-[#4F5BD5]/80",
            label: "Instagram",
        },
        x: {
            icon: Twitter,
            bg: "from-neutral-900 via-neutral-800 to-neutral-700",
            label: "X (Twitter)",
        },
        facebook: {
            icon: Facebook,
            bg: "from-[#1877F2]/80 via-[#0E5DC6]/80 to-[#0A3F8C]/80",
            label: "Facebook",
        },
        tiktok: {
            icon: Music2,
            bg: "from-[#FF0050]/80 via-[#00F5FF]/80 to-[#000000]/90",
            label: "TikTok",
        },
        youtube: {
            icon: Youtube,
            bg: "from-[#FF0000]/80 via-[#CC0000]/80 to-[#990000]/80",
            label: "YouTube",
        },
        blog: {
            icon: FileText,
            bg: "from-[#F97316]/70 via-[#FB923C]/70 to-[#FDBA74]/70",
            label: "Blog / Website",
        },
        linkedin: {
            icon: Linkedin,
            bg: "from-[#0A66C2]/80 via-[#004182]/80 to-[#082C5C]/80",
            label: "LinkedIn",
        },
        other: {
            icon: Globe2,
            bg: "from-[#9333EA]/80 via-[#6366F1]/80 to-[#10B981]/80",
            label: "Other Platform",
        },
    }

    const starCost = useMemo(
        () =>
            activeContentType
                ? Math.min(activeContentType.cost, AI_STAR_COST_CAP)
                : 1,
        [activeContentType],
    )

    const notEnoughStars = typeof stars === "number" && starCost > stars
    useEffect(() => {
        setAiError(null)
        setAiCopied(false)
    }, [selectedMediaPlatform, selectedContentType])

    useEffect(() => {
        if (!authLoading && !user) {
            toast.info("Please sign in to submit promotional content.", {
                duration: 4000,
            })
            const callbackUrl = encodeURIComponent("/content/submit")
            router.push(`/signin?callbackUrl=${callbackUrl}`)
        }
    }, [authLoading, user, router])

    const loadSubmissions = useCallback(
        async (showToast = false) => {
            if (!user || !session?.access_token) return
            setLoadingSubmissions(true)
            try {
                const response = await fetch("/api/content-submissions", {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                })
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}))
                    throw new Error(
                        data.error || "Unable to load previous submissions.",
                    )
                }
                const data = await response.json()
                if (typeof data.verificationToken === "string") {
                    setVerificationToken(data.verificationToken)
                } else {
                    setVerificationToken("")
                }
                setSubmissions(data.submissions ?? [])
                if (showToast) {
                    toast.success("Submission list refreshed.")
                }
            } catch (error) {
                console.error("Failed to load submissions:", error)
                setVerificationToken("")
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Failed to load submissions.",
                )
            } finally {
                setLoadingSubmissions(false)
            }
        },
        [session?.access_token, user],
    )

    useEffect(() => {
        if (user && session?.access_token) {
            void loadSubmissions()
        }
    }, [user, session?.access_token, loadSubmissions])

    const handleCopyCode = useCallback(async () => {
        if (!verificationToken) return
        try {
            await navigator.clipboard.writeText(verificationToken)
            setCopied(true)
            toast.success("Verification code copied!")
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error("Unable to copy code. Please copy it manually.")
        }
    }, [verificationToken])

    const handleChange = <Key extends keyof typeof formState>(
        key: Key,
        value: (typeof formState)[Key],
    ) => {
        setFormState((prev) => ({
            ...prev,
            [key]: value,
        }))
    }

    const clearForm = () => {
        setFormState({
            title: "",
            url: "",
            platform: "",
            notes: "",
            verificationMethod: "public_code",
            evidenceUrl: "",
        })
    }

    const handleGenerateAi = useCallback(async () => {
        if (!activeContentType) {
            toast.error("Select a media platform and content type first.")
            return
        }
        if (stars === null) {
            toast.info("Star balance is loading. Please try again in a moment.")
            return
        }
        const cost = starCost
        if (stars < cost) {
            toast.error(
                `You need ${cost} ${cost === 1 ? "star" : "stars"} to generate this content.`,
            )
            return
        }
        setAiGenerating(true)
        setAiCopied(false)
        setAiError(null)
        try {
            const response = await fetch("/api/content-submissions/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    mediaPlatform: selectedMediaPlatform,
                    contentType: selectedContentType,
                    language: selectedLanguage,
                    context: {
                        title: formState.title,
                        notes: formState.notes,
                    },
                }),
            })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                const message =
                    typeof data?.error === "string"
                        ? data.error
                        : "Failed to generate promotional content."
                throw new Error(message)
            }
            const data = await response.json()
            if (!data?.content) {
                throw new Error("No AI content returned. Please try again.")
            }
            const spent = spendStars(cost)
            if (!spent) {
                throw new Error(
                    "We couldn't reserve your stars. Please try again.",
                )
            }
            setAiContent(String(data.content).trim())
            toast.success(
                `Generated new content using ${cost} ${cost === 1 ? "star" : "stars"}.`,
            )
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Something went wrong while generating content."
            setAiError(message)
            toast.error(message)
        } finally {
            setAiGenerating(false)
        }
    }, [
        activeContentType,
        formState.notes,
        formState.title,
        selectedContentType,
        selectedMediaPlatform,
        selectedLanguage,
        spendStars,
        starCost,
        stars,
    ])

    const handleCopyAi = useCallback(async () => {
        if (!aiContent) return
        try {
            await navigator.clipboard.writeText(aiContent)
            setAiCopied(true)
            toast.success("AI content copied to clipboard.")
            setTimeout(() => setAiCopied(false), 2000)
        } catch {
            toast.error("Unable to copy AI content. Please copy it manually.")
        }
    }, [aiContent])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!user || !session?.access_token) {
            toast.error("You must be signed in to submit content.")
            return
        }

        if (!verificationToken) {
            toast.error(
                "We couldn't load your verification code yet. Please refresh the page and try again.",
            )
            return
        }

        if (!formState.url) {
            toast.error("Content URL is required.")
            return
        }

        if (
            formState.verificationMethod === "manual_proof" &&
            !formState.evidenceUrl
        ) {
            toast.error("Manual proof requires an evidence URL.")
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/content-submissions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    title: formState.title || null,
                    url: formState.url,
                    platform: formState.platform || null,
                    notes: formState.notes || null,
                    verificationCode: verificationToken,
                    verificationMethod: formState.verificationMethod,
                    evidenceUrl:
                        formState.verificationMethod === "manual_proof"
                            ? formState.evidenceUrl || null
                            : null,
                }),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Submission failed. Please review the instructions and try again.",
                )
            }

            const submission: ContentSubmission | undefined = data.submission
            if (submission) {
                setSubmissions((prev) => {
                    const existing = prev.filter(
                        (item) => item.id !== submission.id,
                    )
                    return [submission, ...existing]
                })
            } else {
                void loadSubmissions()
            }

            toast.success(
                data.message ||
                    "Content submitted. We'll verify ownership shortly.",
            )
            clearForm()
        } catch (error) {
            console.error("Content submission error:", error)
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while submitting.",
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const verificationSnippet = useMemo(() => {
        switch (formState.verificationMethod) {
            case "meta_tag":
                return verificationToken
                    ? `<meta name="asking-fate-verification" content="${verificationToken}" />`
                    : "Loading verification code..."
            case "profile_bio":
                return verificationToken
                    ? `Bio snippet: “Partnered with AskingFate ${verificationToken}”`
                    : "Loading verification code..."
            default:
                return verificationToken
                    ? `Add this text verbatim anywhere in your content:\n${verificationToken}`
                    : "Loading verification code..."
        }
    }, [formState.verificationMethod, verificationToken])

    const renderStatusBadge = (status: SubmissionStatus) => {
        const config = statusConfig[status]
        return (
            <Badge className={cn(config.badgeClass, "uppercase tracking-wide")}>
                {config.label}
            </Badge>
        )
    }

    const renderVerificationNotes = (submission: ContentSubmission) => {
        if (!submission.verification_result) return null
        const { reason, preview, fetchError, evidenceUrl } =
            submission.verification_result
        return (
            <div className='text-sm text-muted-foreground space-y-2'>
                {reason && (
                    <div className='flex items-start gap-2'>
                        <AlertCircle className='w-4 h-4 mt-px text-amber-300' />
                        <span>{reason}</span>
                    </div>
                )}
                {fetchError && (
                    <div className='flex items-start gap-2'>
                        <ShieldAlert className='w-4 h-4 mt-px text-rose-300' />
                        <span>{fetchError}</span>
                    </div>
                )}
                {preview && (
                    <div className='rounded-lg bg-background/40 border border-border/40 p-3'>
                        <p className='text-xs font-mono leading-relaxed text-muted-foreground/80'>
                            {preview}...
                        </p>
                    </div>
                )}
                {evidenceUrl && (
                    <a
                        href={evidenceUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-1 text-xs text-primary hover:underline'
                    >
                        <ExternalLink className='w-3 h-3' />
                        View manual evidence
                    </a>
                )}
            </div>
        )
    }

    const LoadingState = (
        <div className='min-h-[50vh] flex items-center justify-center'>
            <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400' />
        </div>
    )

    if (authLoading) {
        return LoadingState
    }

    if (!user) {
        return (
            <div className='min-h-[50vh] flex flex-col items-center justify-center space-y-4'>
                <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400' />
                <p className='text-muted-foreground'>Redirecting to sign in…</p>
            </div>
        )
    }

    return (
        <div className='relative min-h-screen overflow-hidden'>
            {/* Enhanced animated background */}
            <div className='absolute inset-0 pointer-events-none overflow-hidden'>
                <div className='absolute top-20 left-16 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full animate-pulse-glow' />
                <div
                    className='absolute bottom-10 right-20 w-72 h-72 bg-emerald-500/10 blur-3xl rounded-full animate-pulse-glow'
                    style={{ animationDelay: "1s" }}
                />
                <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 blur-3xl rounded-full animate-float-gentle' />
            </div>

            <div className='relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12'>
                <header className='text-center space-y-6 animate-fade-in-scale'>
                    <div className='inline-flex items-center gap-2 px-5 py-2 rounded-full border border-purple-500/50 bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-transparent text-purple-100 backdrop-blur-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 hover:scale-105'>
                        <ShieldCheck className='w-4 h-4 animate-pulse-glow' />
                        <span className='text-sm font-semibold tracking-wide'>
                            Content Ownership Verification
                        </span>
                    </div>
                    <h1 className='text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white leading-tight'>
                        <span className='bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 bg-clip-text text-transparent animate-gradient'>
                            Share Your Promotion
                        </span>
                        <br />
                        <span className='text-white/90'>
                            Prove It&apos;s Yours
                        </span>
                    </h1>
                    <p className='text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed'>
                        Submit social posts, videos, or articles that feature
                        AskingFate. We verify that you control the content
                        before rewarding your effort.
                    </p>
                    <div className='flex flex-col md:flex-row md:flex-wrap gap-5 max-w-5xl mx-auto pt-4'>
                        {highlightCards.map((card, index) => {
                            const Icon = card.icon
                            return (
                                <div
                                    key={card.title}
                                    className='w-full md:flex-1 min-w-[240px] animate-fade-in-scale'
                                    style={{
                                        animationDelay: `${index * 0.1}s`,
                                    }}
                                >
                                    <div
                                        className={`relative overflow-hidden rounded-2xl border ${card.accent} bg-gradient-to-br p-[1px] h-full group hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl`}
                                    >
                                        <div className='absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                        <div className='rounded-2xl bg-[#050512]/90 p-6 h-full flex flex-col gap-3 backdrop-blur-xl relative z-10'>
                                            <div className='flex items-center gap-3'>
                                                <span className='inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 group-hover:border-white/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3'>
                                                    <Icon className='w-6 h-6 text-white group-hover:text-purple-200 transition-colors duration-300' />
                                                </span>
                                                <p className='text-left text-base font-semibold text-white group-hover:text-purple-100 transition-colors duration-300'>
                                                    {card.title}
                                                </p>
                                            </div>
                                            <p className='text-sm text-white/70 text-left leading-relaxed group-hover:text-white/80 transition-colors duration-300'>
                                                {card.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className='max-w-5xl mx-auto w-full'>
                        <div
                            className='relative overflow-hidden rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-500/20 via-indigo-500/10 to-transparent p-6 sm:p-8 text-left backdrop-blur-xl shadow-2xl animate-fade-in-scale'
                            style={{ animationDelay: "0.15s" }}
                        >
                            <div className='absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none' />
                            <div className='relative z-10 space-y-6'>
                                <div className='space-y-3'>
                                    <p className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-200/80'>
                                        <Sparkles className='w-4 h-4 animate-pulse-glow' />
                                        AI Promo Studio
                                    </p>
                                    <h2 className='text-2xl sm:text-3xl font-semibold text-white'>
                                        Generate a ready-to-post idea in
                                        AskingFate’s voice
                                    </h2>
                                    {aiContent ? (
                                        <div className='text-sm text-white/80 leading-relaxed max-w-xl whitespace-pre-wrap'>
                                            {aiContent}
                                        </div>
                                    ) : (
                                        <p className='text-sm text-white/70 leading-relaxed max-w-xl'>
                                            Pick a platform and format, then let
                                            our AI craft mystical copy that
                                            sparks curiosity about AskingFate.
                                            We’ll tailor tone, length, and CTA
                                            automatically.
                                        </p>
                                    )}
                                </div>

                                <div className='space-y-6'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold text-white'>
                                            Media platform
                                        </Label>
                                        <div className='flex flex-wrap gap-2'>
                                            {AI_MEDIA_OPTIONS.map((option) => {
                                                const mediaKey =
                                                    option.value as MediaPlatform
                                                const visual =
                                                    mediaVisuals[mediaKey]
                                                const IconComponent =
                                                    visual.icon
                                                const isSelected =
                                                    mediaKey ===
                                                    selectedMediaPlatform
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type='button'
                                                        onClick={() =>
                                                            setSelectedMediaPlatform(
                                                                mediaKey,
                                                            )
                                                        }
                                                        className={cn(
                                                            "group relative flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-400/40",
                                                            isSelected
                                                                ? "border-white/80 shadow-lg shadow-purple-500/30"
                                                                : "border-white/20 shadow-sm hover:border-white/40 hover:shadow-purple-500/20",
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-inner shadow-black/20 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110",
                                                                visual.bg,
                                                            )}
                                                        >
                                                            <IconComponent className='w-4 h-4' />
                                                        </span>
                                                        <span className='whitespace-nowrap'>
                                                            {visual.label}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className='flex flex-col lg:flex-row gap-4'>
                                        <div className='flex-1 space-y-2'>
                                            <Label className='text-sm font-semibold text-white'>
                                                Content type
                                            </Label>
                                            <Select
                                                value={selectedContentType}
                                                onValueChange={(value) =>
                                                    setSelectedContentType(
                                                        value as ContentTypeKey,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className='bg-black/40 border border-white/15 text-white hover:border-purple-400/40 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300'>
                                                    <SelectValue placeholder='Choose content type' />
                                                </SelectTrigger>
                                                <SelectContent className='bg-background/95 backdrop-blur-xl border border-white/15 text-white'>
                                                    {availableContentTypeOptions.map(
                                                        (option) => (
                                                            <SelectItem
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                                className='text-left hover:bg-purple-500/20 focus:bg-purple-500/20 transition-colors duration-200'
                                                            >
                                                                {option.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            {activeContentType && (
                                                <p className='text-xs text-white/70 leading-relaxed'>
                                                    {activeContentType.guidance}
                                                </p>
                                            )}
                                        </div>
                                        <div className='flex-1 space-y-2'>
                                            <Label className='text-sm font-semibold text-white'>
                                                Language
                                            </Label>
                                            <Select
                                                value={selectedLanguage}
                                                onValueChange={(value) =>
                                                    setSelectedLanguage(
                                                        value as LanguageCode,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className='bg-black/40 border border-white/15 text-white hover:border-purple-400/40 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300'>
                                                    <span className='flex items-center gap-2'>
                                                        <span className='text-lg leading-none'>
                                                            {
                                                                selectedLanguageFlag
                                                            }
                                                        </span>
                                                        <SelectValue placeholder='Choose a language' />
                                                    </span>
                                                </SelectTrigger>
                                                <SelectContent className='bg-background/95 backdrop-blur-xl border border-white/15 text-white max-h-72'>
                                                    {AI_LANGUAGE_OPTIONS.map(
                                                        (option) => (
                                                            <SelectItem
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                                className='flex items-center gap-2 text-left hover:bg-purple-500/20 focus:bg-purple-500/20 transition-colors duration-200'
                                                            >
                                                                <span className='text-lg leading-none'>
                                                                    {
                                                                        option.flag
                                                                    }
                                                                </span>
                                                                <span>
                                                                    {
                                                                        option.label
                                                                    }
                                                                </span>
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <p className='text-xs text-white/70 leading-relaxed'>
                                                The AI will write naturally in
                                                the selected language. Add
                                                slang, tone, or translation cues
                                                in your notes for extra flavor.
                                            </p>
                                        </div>
                                    </div>

                                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                                        <div className='text-sm text-white/80'>
                                            Each generation uses{" "}
                                            <span className='font-semibold text-white'>
                                                {starCost}
                                            </span>{" "}
                                            {starCost === 1 ? "star" : "stars"}.
                                        </div>
                                        <Button
                                            type='button'
                                            onClick={handleGenerateAi}
                                            disabled={
                                                aiGenerating ||
                                                stars === null ||
                                                notEnoughStars
                                            }
                                            className='inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 px-6 py-2.5 text-white font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
                                        >
                                            {aiGenerating ? (
                                                <span className='flex items-center gap-2'>
                                                    <div className='h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin' />
                                                    Crafting…
                                                </span>
                                            ) : (
                                                <>
                                                    <Sparkles className='w-4 h-4' />
                                                    Generate with AI (-
                                                    {starCost}{" "}
                                                    {starCost === 1
                                                        ? "star"
                                                        : "stars"}
                                                    )
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    {notEnoughStars && (
                                        <p className='text-xs text-rose-300'>
                                            You need at least {starCost}{" "}
                                            {starCost === 1 ? "star" : "stars"}{" "}
                                            to generate this idea. Earn more by
                                            completing activities on the Stars
                                            page.
                                        </p>
                                    )}
                                    {aiError && (
                                        <p className='text-xs text-rose-300'>
                                            {aiError}
                                        </p>
                                    )}

                                    {aiContent && (
                                        <div className='rounded-2xl border border-white/15 bg-black/40 p-5 space-y-3 shadow-inner shadow-purple-500/20'>
                                            <div className='flex items-center justify-between gap-3'>
                                                <div>
                                                    <p className='text-xs font-semibold uppercase tracking-[0.35em] text-purple-200/70 flex items-center gap-2'>
                                                        <span className='text-base leading-none'>
                                                            {
                                                                selectedLanguageFlag
                                                            }
                                                        </span>
                                                        AI blueprint •{" "}
                                                        {selectedLanguageLabel}
                                                    </p>
                                                    <h3 className='text-sm text-white/90'>
                                                        {AI_MEDIA_OPTIONS.find(
                                                            (option) =>
                                                                option.value ===
                                                                selectedMediaPlatform,
                                                        )?.label ||
                                                            "Generated concept"}
                                                    </h3>
                                                </div>
                                                <Button
                                                    type='button'
                                                    variant='ghost'
                                                    size='sm'
                                                    onClick={handleCopyAi}
                                                    className='text-purple-200 hover:text-white hover:bg-purple-500/20'
                                                >
                                                    <Copy className='w-4 h-4 mr-2' />
                                                    {aiCopied
                                                        ? "Copied"
                                                        : "Copy"}
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={aiContent}
                                                readOnly
                                                className='min-h-[180px] resize-none bg-black/30 border border-white/10 text-white text-sm leading-relaxed shadow-inner'
                                            />
                                            <p className='text-xs text-white/60'>
                                                Tip: tweak the copy, add your
                                                refer-a-friend code, and then
                                                use the submission form below to
                                                claim rewards.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <section
                    className='flex flex-col lg:flex-row gap-8 animate-fade-in-scale'
                    style={{ animationDelay: "0.2s" }}
                >
                    <Card className='bg-gradient-to-br from-background/80 via-background/60 to-background/40 border border-border/50 backdrop-blur-2xl shadow-2xl flex-1 group hover:border-accent/30 transition-all duration-500 hover:shadow-purple-500/20'>
                        <CardHeader className='space-y-2 pb-6'>
                            <CardTitle className='flex items-center gap-3 text-2xl text-white group-hover:text-purple-100 transition-colors duration-300'>
                                <div className='p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300'>
                                    <LinkIcon className='w-5 h-5 text-purple-300' />
                                </div>
                                Submit Content
                            </CardTitle>
                            <CardDescription className='text-muted-foreground text-base leading-relaxed'>
                                Provide the live link to your promotional
                                content and we will attempt to verify ownership
                                automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className='space-y-6'>
                            <div className='relative mb-8 rounded-2xl border border-dashed border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent p-6 backdrop-blur-sm hover:border-purple-500/60 hover:bg-gradient-to-br hover:from-purple-500/15 hover:via-indigo-500/10 hover:to-transparent transition-all duration-300 group/verification'>
                                <div className='absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover/verification:opacity-100 transition-opacity duration-500 rounded-2xl' />
                                <div className='relative z-10 flex flex-wrap items-center gap-4'>
                                    <div className='flex-1 min-w-[200px] space-y-2'>
                                        <div className='flex items-center gap-2'>
                                            <ShieldCheck className='w-4 h-4 text-purple-300 animate-pulse-glow' />
                                            <p className='text-sm font-semibold text-purple-200'>
                                                Your permanent verification code
                                            </p>
                                        </div>
                                        <div className='relative'>
                                            <div className='absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 blur-xl rounded-lg opacity-50' />
                                            <div className='relative font-mono text-sm sm:text-base text-white bg-black/60 border border-purple-500/30 rounded-xl px-4 py-3 backdrop-blur-sm shadow-lg shadow-purple-500/10 hover:border-purple-500/50 hover:shadow-purple-500/20 transition-all duration-300'>
                                                {verificationToken || (
                                                    <span className='inline-flex items-center gap-2'>
                                                        <div className='h-4 w-4 border-2 border-purple-400/40 border-t-purple-400 rounded-full animate-spin' />
                                                        Loading...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className='text-xs text-purple-200/70 leading-relaxed'>
                                            Add this code to your public content
                                            whenever you promote AskingFate. It
                                            never expires.
                                        </p>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            onClick={handleCopyCode}
                                            disabled={!verificationToken}
                                            className='border-purple-500/50 text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30'
                                        >
                                            <Copy
                                                className={`w-4 h-4 mr-2 transition-transform duration-300 ${copied ? "scale-110" : ""}`}
                                            />
                                            {copied ? (
                                                <span className='flex items-center gap-2'>
                                                    <CheckCircle2 className='w-4 h-4' />
                                                    Copied!
                                                </span>
                                            ) : (
                                                "Copy"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <form className='space-y-6' onSubmit={handleSubmit}>
                                <div className='flex flex-col md:flex-row md:gap-4'>
                                    <div className='space-y-2.5 flex-1 group'>
                                        <Label
                                            htmlFor='title'
                                            className='text-white font-medium flex items-center gap-2 group-hover:text-purple-200 transition-colors duration-300'
                                        >
                                            Content Title
                                            <span className='text-xs text-muted-foreground font-normal'>
                                                (optional)
                                            </span>
                                        </Label>
                                        <Input
                                            id='title'
                                            value={formState.title}
                                            onChange={(event) =>
                                                handleChange(
                                                    "title",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder='E.g. Instagram Reel showcasing AskingFate'
                                            className='bg-background/60 border-border/50 text-white placeholder:text-muted-foreground/60 hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-background/70'
                                        />
                                    </div>
                                    <div className='space-y-2.5 flex-1 group'>
                                        <Label
                                            htmlFor='platform'
                                            className='text-white font-medium group-hover:text-purple-200 transition-colors duration-300'
                                        >
                                            Platform
                                        </Label>
                                        <Select
                                            value={formState.platform}
                                            onValueChange={(value) =>
                                                handleChange("platform", value)
                                            }
                                        >
                                            <SelectTrigger className='bg-background/60 border-border/50 text-white hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-background/70'>
                                                <SelectValue placeholder='Choose platform' />
                                            </SelectTrigger>
                                            <SelectContent className='bg-background/95 backdrop-blur-xl border-border/50 text-white'>
                                                {submissionPlatformOptions.map(
                                                    (option) => (
                                                        <SelectItem
                                                            key={option.value}
                                                            value={option.value}
                                                            className='hover:bg-purple-500/20 focus:bg-purple-500/20 transition-colors duration-200'
                                                        >
                                                            {option.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className='space-y-2.5 group'>
                                    <Label
                                        htmlFor='url'
                                        className='text-white font-medium flex items-center gap-2 group-hover:text-purple-200 transition-colors duration-300'
                                    >
                                        Content URL
                                        <span className='text-rose-400 font-semibold'>
                                            *
                                        </span>
                                    </Label>
                                    <div className='relative'>
                                        <div className='absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 blur-xl rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                        <Input
                                            id='url'
                                            value={formState.url}
                                            onChange={(event) =>
                                                handleChange(
                                                    "url",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder='https://...'
                                            required
                                            className='relative bg-background/60 border-border/50 text-white placeholder:text-muted-foreground/60 hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-background/70'
                                        />
                                    </div>
                                </div>

                                <div className='space-y-2.5 group'>
                                    <Label className='text-white font-medium flex items-center gap-2 group-hover:text-purple-200 transition-colors duration-300'>
                                        Verification method
                                        <span className='text-rose-400 font-semibold'>
                                            *
                                        </span>
                                    </Label>
                                    <Select
                                        value={formState.verificationMethod}
                                        onValueChange={(
                                            value: VerificationMethod,
                                        ) =>
                                            handleChange(
                                                "verificationMethod",
                                                value,
                                            )
                                        }
                                    >
                                        <SelectTrigger className='bg-background/60 border-border/50 text-white hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-background/70'>
                                            <SelectValue placeholder='Select your verification method' />
                                        </SelectTrigger>
                                        <SelectContent className='bg-background/95 backdrop-blur-xl border-border/50 text-white'>
                                            {verificationMethodOptions.map(
                                                (option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                        className='text-left hover:bg-purple-500/20 focus:bg-purple-500/20 transition-colors duration-200'
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className='relative rounded-xl border border-dashed border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent p-5 space-y-4 backdrop-blur-sm hover:border-purple-500/60 hover:bg-gradient-to-br hover:from-purple-500/15 hover:via-indigo-500/10 hover:to-transparent transition-all duration-300 group/instructions'>
                                    <div className='absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover/instructions:opacity-100 transition-opacity duration-500 rounded-xl' />
                                    <div className='relative z-10 space-y-3'>
                                        <div className='flex items-center gap-2'>
                                            <Lightbulb className='w-4 h-4 text-purple-300' />
                                            <p className='text-sm font-semibold text-purple-200'>
                                                How to verify with the selected
                                                method:
                                            </p>
                                        </div>
                                        <div className='relative'>
                                            <div className='absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 blur-xl rounded-lg opacity-30' />
                                            <pre className='relative text-xs sm:text-sm font-mono whitespace-pre-wrap break-words bg-black/60 border border-purple-500/20 rounded-lg p-4 text-white/90 backdrop-blur-sm shadow-lg shadow-purple-500/5'>
                                                {verificationSnippet}
                                            </pre>
                                        </div>
                                    </div>
                                </div>

                                {formState.verificationMethod ===
                                    "manual_proof" && (
                                    <div className='space-y-2.5 group animate-fade-in-scale'>
                                        <Label
                                            htmlFor='evidenceUrl'
                                            className='text-white font-medium flex items-center gap-2 group-hover:text-purple-200 transition-colors duration-300'
                                        >
                                            Evidence URL
                                            <span className='text-rose-400 font-semibold'>
                                                *
                                            </span>
                                        </Label>
                                        <div className='relative'>
                                            <div className='absolute inset-0 bg-gradient-to-r from-rose-500/10 to-pink-500/10 blur-xl rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                                            <Input
                                                id='evidenceUrl'
                                                value={formState.evidenceUrl}
                                                onChange={(event) =>
                                                    handleChange(
                                                        "evidenceUrl",
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder='Link to a screenshot, Google Drive folder, etc.'
                                                required
                                                className='relative bg-background/60 border-border/50 text-white placeholder:text-muted-foreground/60 hover:border-rose-500/30 focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all duration-300 hover:bg-background/70'
                                            />
                                        </div>
                                        <p className='text-xs text-muted-foreground leading-relaxed'>
                                            Share a viewable link (no login
                                            required) showing your account
                                            logged in with the content.
                                        </p>
                                    </div>
                                )}

                                <div className='space-y-2.5 group'>
                                    <Label
                                        htmlFor='notes'
                                        className='text-white font-medium group-hover:text-purple-200 transition-colors duration-300'
                                    >
                                        Additional context
                                        <span className='text-xs text-muted-foreground font-normal ml-2'>
                                            (optional)
                                        </span>
                                    </Label>
                                    <Textarea
                                        id='notes'
                                        value={formState.notes}
                                        onChange={(event) =>
                                            handleChange(
                                                "notes",
                                                event.target.value,
                                            )
                                        }
                                        placeholder='Tell us anything else helpful for reviewers.'
                                        className='bg-background/60 border-border/50 text-white placeholder:text-muted-foreground/60 min-h-[100px] hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-background/70 resize-none'
                                    />
                                </div>

                                <div className='pt-2'>
                                    <Button
                                        type='submit'
                                        disabled={isSubmitting}
                                        className='w-full sm:w-auto bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 hover:from-purple-400 hover:via-indigo-400 hover:to-blue-400 text-white font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100'
                                    >
                                        {isSubmitting ? (
                                            <span className='flex items-center gap-2'>
                                                <div className='h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin' />
                                                Submitting…
                                            </span>
                                        ) : (
                                            <span className='flex items-center gap-2'>
                                                <ShieldCheck className='w-4 h-4' />
                                                Submit for verification
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className='bg-gradient-to-br from-background/80 via-background/60 to-background/40 border border-border/50 backdrop-blur-2xl shadow-2xl flex-1 group hover:border-accent/30 transition-all duration-500 hover:shadow-indigo-500/20'>
                        <CardHeader className='space-y-2 pb-6'>
                            <CardTitle className='flex items-center gap-3 text-2xl text-white group-hover:text-indigo-100 transition-colors duration-300'>
                                <div className='p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300'>
                                    <Sparkles className='w-5 h-5 text-indigo-300' />
                                </div>
                                How verification works
                            </CardTitle>
                            <CardDescription className='text-muted-foreground text-base leading-relaxed'>
                                Follow these steps to ensure your submission is
                                auto-approved.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className='space-y-5'>
                            <div className='space-y-4'>
                                {[
                                    {
                                        title: "Copy your code",
                                        description:
                                            "Use the code above. It is unique to your account and never changes.",
                                    },
                                    {
                                        title: "Place it where we can read it",
                                        description:
                                            "Add the code to the public page, caption, or profile bio before submitting the link.",
                                    },
                                    {
                                        title: "Submit and let the bot verify",
                                        description:
                                            "We fetch the URL and look for the code in the page body or meta tags. If we can’t access it, the request moves to manual review.",
                                    },
                                ].map((step, index) => (
                                    <div
                                        key={step.title}
                                        className='group/step flex items-start gap-4 rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-4 hover:border-indigo-500/40 hover:from-indigo-500/15 hover:via-purple-500/10 hover:to-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/10'
                                    >
                                        <div className='relative'>
                                            <div className='absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 blur-lg opacity-0 group-hover/step:opacity-50 transition-opacity duration-300 rounded-full' />
                                            <div className='relative w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-200 flex items-center justify-center font-bold text-sm border border-indigo-500/30 group-hover/step:scale-110 group-hover/step:rotate-6 transition-transform duration-300'>
                                                {index + 1}
                                            </div>
                                        </div>
                                        <div className='space-y-1.5 flex-1'>
                                            <p className='text-sm font-semibold text-white group-hover/step:text-indigo-100 transition-colors duration-300'>
                                                {step.title}
                                            </p>
                                            <p className='text-sm text-muted-foreground leading-relaxed group-hover/step:text-white/80 transition-colors duration-300'>
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className='relative rounded-xl border border-amber-500/50 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-transparent p-5 text-sm text-amber-100 flex gap-4 backdrop-blur-sm hover:border-amber-500/70 hover:from-amber-500/20 hover:via-yellow-500/15 hover:to-transparent transition-all duration-300 group/warning'>
                                <div className='absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 opacity-0 group-hover/warning:opacity-100 transition-opacity duration-500 rounded-xl' />
                                <div className='relative z-10 flex gap-4'>
                                    <Clock className='w-5 h-5 mt-0.5 flex-shrink-0 text-amber-300 group-hover/warning:scale-110 transition-transform duration-300' />
                                    <div className='space-y-1.5'>
                                        <p className='font-semibold text-amber-100'>
                                            Manual fallback
                                        </p>
                                        <p className='text-amber-100/90 leading-relaxed'>
                                            Some platforms block automated
                                            crawlers. If that happens, use the
                                            manual proof option or share a
                                            public screenshot so our team can
                                            verify you manually.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className='pt-2 space-y-4'>
                                <h3 className='text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2'>
                                    <ShieldCheck className='w-4 h-4 text-indigo-300' />
                                    Quick proof checklist
                                </h3>
                                <div className='space-y-3'>
                                    {proofShortcuts.map((shortcut, index) => {
                                        const Icon = shortcut.icon
                                        return (
                                            <div
                                                key={shortcut.title}
                                                className='group/shortcut flex items-start gap-4 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/3 to-transparent p-4 hover:border-indigo-500/30 hover:from-indigo-500/10 hover:via-purple-500/5 hover:to-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/10'
                                                style={{
                                                    animationDelay: `${index * 0.1}s`,
                                                }}
                                            >
                                                <span className='inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 group-hover/shortcut:scale-110 group-hover/shortcut:rotate-3 group-hover/shortcut:border-indigo-500/50 transition-all duration-300'>
                                                    <Icon className='w-5 h-5' />
                                                </span>
                                                <div className='space-y-1 flex-1'>
                                                    <p className='text-sm font-semibold text-white group-hover/shortcut:text-indigo-100 transition-colors duration-300'>
                                                        {shortcut.title}
                                                    </p>
                                                    <p className='text-xs text-white/70 leading-relaxed group-hover/shortcut:text-white/80 transition-colors duration-300'>
                                                        {shortcut.description}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section
                    className='relative px-4 animate-fade-in-scale'
                    style={{ animationDelay: "0.4s" }}
                >
                    <Card className='bg-gradient-to-br from-background/80 via-background/60 to-background/40 border border-border/50 backdrop-blur-2xl shadow-2xl group hover:border-yellow-500/30 transition-all duration-500 hover:shadow-yellow-500/20'>
                        <CardHeader className='space-y-2 pb-6'>
                            <CardTitle className='flex items-center gap-3 text-2xl text-white group-hover:text-yellow-100 transition-colors duration-300'>
                                <div className='p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300'>
                                    <Lightbulb className='w-5 h-5 text-yellow-300' />
                                </div>
                                Content sparks that resonate
                            </CardTitle>
                            <CardDescription className='text-muted-foreground text-base leading-relaxed'>
                                Need inspiration? Try one of these
                                community-tested ideas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className='flex flex-col md:flex-row md:flex-wrap gap-5'>
                                {inspirationPrompts.map((prompt, index) => (
                                    <div
                                        key={prompt.title}
                                        className='w-full md:flex-1 min-w-[240px] rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/3 to-transparent p-5 space-y-3 group/prompt hover:border-yellow-500/30 hover:from-yellow-500/10 hover:via-amber-500/5 hover:to-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-yellow-500/10'
                                        style={{
                                            animationDelay: `${index * 0.1}s`,
                                        }}
                                    >
                                        <h3 className='text-base font-semibold text-white group-hover/prompt:text-yellow-100 transition-colors duration-300'>
                                            {prompt.title}
                                        </h3>
                                        <p className='text-sm text-white/70 leading-relaxed group-hover/prompt:text-white/80 transition-colors duration-300'>
                                            {prompt.body}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section
                    className='space-y-6 animate-fade-in-scale'
                    style={{ animationDelay: "0.6s" }}
                >
                    <div className='flex items-center justify-between flex-wrap gap-4'>
                        <div className='space-y-1'>
                            <h2 className='text-3xl font-bold text-white bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 bg-clip-text text-transparent'>
                                Submission history
                            </h2>
                            <p className='text-muted-foreground text-sm leading-relaxed'>
                                Track verification results for each content link
                                you&apos;ve shared.
                            </p>
                        </div>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={() => loadSubmissions(true)}
                            disabled={loadingSubmissions}
                            className='border-purple-500/50 text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30'
                        >
                            <RefreshCcw
                                className={`w-4 h-4 mr-2 transition-transform duration-300 ${loadingSubmissions ? "animate-spin" : ""}`}
                            />
                            {loadingSubmissions ? "Refreshing…" : "Refresh"}
                        </Button>
                    </div>

                    {loadingSubmissions ? (
                        <div className='flex flex-col md:flex-row md:flex-wrap gap-4'>
                            {[...Array(2)].map((_, index) => (
                                <div
                                    key={index}
                                    className='w-full md:flex-1 min-w-[240px] animate-pulse rounded-xl border border-border/40 bg-background/40 h-40'
                                />
                            ))}
                        </div>
                    ) : submissions.length === 0 ? (
                        <Card className='bg-gradient-to-br from-background/60 via-background/40 to-background/30 border border-border/40 backdrop-blur-xl shadow-xl group hover:border-purple-500/30 transition-all duration-500'>
                            <CardContent className='py-10 text-center space-y-3'>
                                <ShieldAlert className='w-8 h-8 text-muted-foreground mx-auto' />
                                <h3 className='text-lg font-semibold text-white'>
                                    No submissions yet
                                </h3>
                                <p className='text-sm text-muted-foreground max-w-md mx-auto'>
                                    When you share promotional content and
                                    submit it here, we’ll keep a history of
                                    every verification for your records.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className='flex flex-col md:flex-row md:flex-wrap gap-5'>
                            {submissions.map((submission, index) => {
                                let host: string | null = null
                                try {
                                    host = new URL(submission.url).hostname
                                } catch {
                                    host = null
                                }

                                return (
                                    <Card
                                        key={submission.id}
                                        className='w-full md:flex-1 min-w-[280px] bg-gradient-to-br from-background/60 via-background/50 to-background/40 border border-border/40 backdrop-blur-xl shadow-xl flex flex-col h-full group hover:border-purple-500/40 hover:shadow-purple-500/20 transition-all duration-500 hover:scale-[1.02]'
                                        style={{
                                            animationDelay: `${index * 0.05}s`,
                                        }}
                                    >
                                        <CardContent className='space-y-4 p-6 flex flex-col h-full'>
                                            <div className='flex items-start justify-between gap-3'>
                                                <div className='space-y-1.5 flex-1'>
                                                    <p className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                                        {submission.platform
                                                            ? submission.platform
                                                            : host ||
                                                              "Custom link"}
                                                    </p>
                                                    <h3 className='text-lg font-bold text-white group-hover:text-purple-100 transition-colors duration-300 leading-tight'>
                                                        {submission.title ||
                                                            submission.url.replace(
                                                                /^https?:\/\//,
                                                                "",
                                                            )}
                                                    </h3>
                                                </div>
                                                <div className='flex-shrink-0'>
                                                    {renderStatusBadge(
                                                        submission.verification_status,
                                                    )}
                                                </div>
                                            </div>

                                            <a
                                                href={submission.url}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 font-medium transition-colors duration-300 group/link'
                                            >
                                                <ExternalLink className='w-4 h-4 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform duration-300' />
                                                View content
                                            </a>

                                            <div className='text-xs text-muted-foreground/80 space-y-1'>
                                                <p className='flex items-center gap-2'>
                                                    <Clock className='w-3 h-3' />
                                                    Submitted{" "}
                                                    {formatter.format(
                                                        new Date(
                                                            submission.created_at,
                                                        ),
                                                    )}
                                                </p>
                                                {submission.verified_at && (
                                                    <p className='flex items-center gap-2'>
                                                        <CheckCircle2 className='w-3 h-3 text-emerald-400' />
                                                        Verified{" "}
                                                        {formatter.format(
                                                            new Date(
                                                                submission.verified_at,
                                                            ),
                                                        )}
                                                    </p>
                                                )}
                                            </div>

                                            {submission.notes && (
                                                <div className='rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent p-4 group/notes hover:border-purple-500/30 transition-all duration-300'>
                                                    <p className='text-xs uppercase tracking-wide text-purple-200 font-semibold mb-2'>
                                                        Notes
                                                    </p>
                                                    <p className='text-sm text-white/80 leading-relaxed'>
                                                        {submission.notes}
                                                    </p>
                                                </div>
                                            )}

                                            {renderVerificationNotes(
                                                submission,
                                            )}
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
