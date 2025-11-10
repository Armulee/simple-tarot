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
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"

type SubmissionStatus = "pending" | "verified" | "failed" | "manual_review"
type VerificationMethod = "public_code" | "meta_tag" | "profile_bio" | "manual_proof"

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

const platformOptions = [
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
        helper: "Add a <meta name=\"asking-fate-verification\" content=\"CODE\" /> tag to the <head> of your page.",
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
        description: "Turn authentic promos into premium star rewards every month.",
        icon: Trophy,
        accent: "from-yellow-400/30 via-amber-500/25 to-yellow-600/30 border-yellow-500/40 text-yellow-200",
    },
    {
        title: "Create In Any Medium",
        description: "Share reels, blogs, podcasts, livestreams, or something totally new.",
        icon: Palette,
        accent: "from-pink-500/30 via-purple-500/25 to-indigo-500/30 border-purple-500/40 text-purple-200",
    },
    {
        title: "Reach A Global Audience",
        description: "Link to public content from any social platform or personal site.",
        icon: Globe,
        accent: "from-blue-500/30 via-cyan-500/25 to-sky-500/30 border-cyan-500/40 text-sky-200",
    },
]

const proofShortcuts = [
    {
        title: "Add the code visibly",
        description: "Place it in your caption, blog post, or video description before submitting.",
        icon: CheckCircle2,
    },
    {
        title: "Meta tags for websites",
        description: 'Add `<meta name="asking-fate-verification" content="…" />` inside the head tag.',
        icon: PenLine,
    },
    {
        title: "Manual fallback",
        description: "If a platform blocks crawlers, share a public screenshot or drive link.",
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
        body: "Tell the story of someone whose Asking Fate reading sparked a breakthrough.",
    },
    {
        title: "Platform walkthroughs",
        body: "Create a screen guide showing your favorite Asking Fate features in action.",
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
                        data.error || "Unable to load previous submissions."
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
                        : "Failed to load submissions."
                )
            } finally {
                setLoadingSubmissions(false)
            }
        },
        [session?.access_token, user]
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
        value: (typeof formState)[Key]
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

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!user || !session?.access_token) {
            toast.error("You must be signed in to submit content.")
            return
        }

        if (!verificationToken) {
            toast.error("We couldn't load your verification code yet. Please refresh the page and try again.")
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
                        "Submission failed. Please review the instructions and try again."
                )
            }

            const submission: ContentSubmission | undefined = data.submission
            if (submission) {
                setSubmissions((prev) => {
                    const existing = prev.filter((item) => item.id !== submission.id)
                    return [submission, ...existing]
                })
            } else {
                void loadSubmissions()
            }

            toast.success(
                data.message || "Content submitted. We'll verify ownership shortly."
            )
            clearForm()
        } catch (error) {
            console.error("Content submission error:", error)
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while submitting."
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
                    ? `Bio snippet: “Partnered with Asking Fate ${verificationToken}”`
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
        const { reason, preview, fetchError, evidenceUrl } = submission.verification_result
        return (
            <div className="text-sm text-muted-foreground space-y-2">
                {reason && (
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-px text-amber-300" />
                        <span>{reason}</span>
                    </div>
                )}
                {fetchError && (
                    <div className="flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 mt-px text-rose-300" />
                        <span>{fetchError}</span>
                    </div>
                )}
                {preview && (
                    <div className="rounded-lg bg-background/40 border border-border/40 p-3">
                        <p className="text-xs font-mono leading-relaxed text-muted-foreground/80">
                            {preview}...
                        </p>
                    </div>
                )}
                {evidenceUrl && (
                    <a
                        href={evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" />
                        View manual evidence
                    </a>
                )}
            </div>
        )
    }

    const LoadingState = (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400" />
        </div>
    )

    if (authLoading) {
        return LoadingState
    }

    if (!user) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400" />
                <p className="text-muted-foreground">Redirecting to sign in…</p>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Ultra-enhanced animated background with mesh gradients */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Animated mesh gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-indigo-900/15 to-pink-900/20" />
                
                {/* Large floating orbs with enhanced animations */}
                <div className="absolute top-20 left-16 w-96 h-96 bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-transparent blur-3xl rounded-full animate-pulse-glow" />
                <div className="absolute bottom-10 right-20 w-[500px] h-[500px] bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-blue-500/15 blur-3xl rounded-full animate-pulse-glow" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/10 via-purple-500/8 to-pink-500/10 blur-3xl rounded-full animate-float-gentle" />
                <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-yellow-500/8 via-amber-500/6 to-orange-500/8 blur-3xl rounded-full animate-float-gentle" style={{ animationDelay: '2s', animationDuration: '8s' }} />
                
                {/* Animated grid pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ animationDuration: '3s' }} />
            </div>
            
            <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                <header className="text-center space-y-8 animate-fade-in-scale">
                    {/* Enhanced badge with glow effect */}
                    <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border-2 border-purple-500/60 bg-gradient-to-r from-purple-500/25 via-purple-500/15 to-indigo-500/20 text-purple-100 backdrop-blur-md shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-110 hover:border-purple-400/80 transition-all duration-500 group/badge relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-white/10 to-purple-500/0 translate-x-[-100%] group-hover/badge:translate-x-[100%] transition-transform duration-1000" />
                        <ShieldCheck className="w-5 h-5 relative z-10 animate-pulse-glow" />
                        <span className="text-sm font-bold tracking-wider relative z-10 uppercase">
                            Content Ownership Verification
                        </span>
                    </div>
                    
                    {/* Enhanced title with multiple gradient layers */}
                    <div className="space-y-4">
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold leading-tight">
                            <span className="block bg-gradient-to-r from-purple-200 via-pink-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                                Share Your Promotion
                            </span>
                            <span className="block text-white/95 mt-2 bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent">
                                Prove It&apos;s Yours
                            </span>
                        </h1>
                        <div className="w-24 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 mx-auto rounded-full animate-pulse-glow" />
                    </div>
                    
                    <p className="text-muted-foreground max-w-3xl mx-auto text-lg sm:text-xl leading-relaxed font-light">
                        Submit social posts, videos, or articles that feature Asking Fate.
                        <span className="block mt-2 text-purple-200/80">We verify that you control the content before rewarding your effort.</span>
                    </p>
                    
                    {/* Enhanced highlight cards with more depth */}
                    <div className="flex flex-col md:flex-row md:flex-wrap gap-6 max-w-6xl mx-auto pt-6">
                        {highlightCards.map((card, index) => {
                            const Icon = card.icon
                            return (
                                <div 
                                    key={card.title} 
                                    className="w-full md:flex-1 min-w-[260px] animate-fade-in-scale group/card"
                                    style={{ animationDelay: `${index * 0.15}s` }}
                                >
                                    <div
                                        className={`relative overflow-hidden rounded-3xl border-2 ${card.accent} bg-gradient-to-br p-[2px] h-full transition-all duration-500 hover:scale-[1.05] hover:shadow-2xl hover:shadow-purple-500/30`}
                                    >
                                        {/* Animated gradient overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
                                        
                                        {/* Shine effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-1000" />
                                        
                                        <div className="rounded-3xl bg-gradient-to-br from-[#050512]/95 via-[#0a0a1a]/90 to-[#050512]/95 p-7 h-full flex flex-col gap-4 backdrop-blur-2xl relative z-10 border border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 rounded-2xl" />
                                                    <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/25 to-white/10 border-2 border-white/30 group-hover/card:border-white/50 group-hover/card:scale-110 group-hover/card:rotate-6 transition-all duration-500 shadow-lg shadow-purple-500/20">
                                                        <Icon className="w-7 h-7 text-white group-hover/card:text-purple-200 transition-colors duration-500" />
                                                    </span>
                                                </div>
                                                <p className="text-left text-lg font-bold text-white group-hover/card:text-purple-100 transition-colors duration-500 leading-tight">
                                                    {card.title}
                                                </p>
                                            </div>
                                            <p className="text-sm text-white/75 text-left leading-relaxed group-hover/card:text-white/90 transition-colors duration-500">
                                                {card.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </header>

                <section className="flex flex-col lg:flex-row gap-10 animate-fade-in-scale" style={{ animationDelay: '0.2s' }}>
                    <Card className="relative bg-gradient-to-br from-background/90 via-background/70 to-background/50 border-2 border-border/60 backdrop-blur-3xl shadow-2xl flex-1 group hover:border-purple-500/50 hover:shadow-purple-500/30 transition-all duration-700 overflow-hidden">
                        {/* Animated border glow */}
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700 -z-10" />
                        
                        {/* Subtle inner glow */}
                        <div className="absolute inset-[1px] rounded-lg bg-gradient-to-br from-purple-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <CardHeader className="space-y-3 pb-8 relative z-10">
                            <CardTitle className="flex items-center gap-4 text-3xl text-white group-hover:text-purple-100 transition-colors duration-500">
                                <div className="relative p-3 rounded-xl bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-2 border-purple-500/40 group-hover:scale-110 group-hover:rotate-6 group-hover:border-purple-400/60 transition-all duration-500 shadow-lg shadow-purple-500/30">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <LinkIcon className="w-6 h-6 text-purple-200 relative z-10" />
                                </div>
                                Submit Content
                            </CardTitle>
                            <CardDescription className="text-muted-foreground text-lg leading-relaxed">
                                Provide the live link to your promotional content and we will
                                attempt to verify ownership automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8 relative z-10">
                            {/* Ultra-enhanced verification code display */}
                            <div className="relative mb-10 rounded-3xl border-2 border-dashed border-purple-500/50 bg-gradient-to-br from-purple-500/15 via-indigo-500/10 via-pink-500/10 to-transparent p-8 backdrop-blur-md hover:border-purple-500/70 hover:from-purple-500/20 hover:via-indigo-500/15 hover:via-pink-500/15 hover:to-transparent transition-all duration-500 group/verification overflow-hidden">
                                {/* Animated background gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-0 group-hover/verification:opacity-100 transition-opacity duration-1000 rounded-3xl" />
                                
                                {/* Shimmer effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/verification:translate-x-[100%] transition-transform duration-1500 rounded-3xl" />
                                
                                <div className="relative z-10 flex flex-wrap items-center gap-6">
                                    <div className="flex-1 min-w-[240px] space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-purple-500/40">
                                                <ShieldCheck className="w-5 h-5 text-purple-200 animate-pulse-glow" />
                                            </div>
                                            <p className="text-base font-bold text-purple-200">
                                                Your permanent verification code
                                            </p>
                                        </div>
                                        <div className="relative group/code">
                                            {/* Glow effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-indigo-500/30 blur-2xl rounded-xl opacity-50 group-hover/code:opacity-75 transition-opacity duration-500" />
                                            
                                            <div className="relative font-mono text-base sm:text-lg text-white bg-gradient-to-br from-black/80 via-black/70 to-black/80 border-2 border-purple-500/40 rounded-2xl px-6 py-4 backdrop-blur-sm shadow-2xl shadow-purple-500/20 hover:border-purple-400/60 hover:shadow-purple-500/40 transition-all duration-500">
                                                {verificationToken || (
                                                    <span className="inline-flex items-center gap-3">
                                                        <div className="h-5 w-5 border-2 border-purple-400/60 border-t-purple-400 rounded-full animate-spin" />
                                                        <span className="text-purple-300">Loading...</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-purple-200/80 leading-relaxed">
                                            Add this code to your public content whenever you promote Asking Fate. It never expires.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCopyCode}
                                            disabled={!verificationToken}
                                            className="relative border-2 border-purple-500/60 text-purple-200 bg-gradient-to-br from-purple-500/15 to-indigo-500/10 hover:from-purple-500/25 hover:to-indigo-500/20 hover:border-purple-400/80 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/40 px-6 py-3 font-semibold overflow-hidden group/btn"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                                            <Copy className={`w-5 h-5 mr-2 relative z-10 transition-transform duration-300 ${copied ? 'scale-125 rotate-12' : ''}`} />
                                            {copied ? (
                                                <span className="flex items-center gap-2 relative z-10">
                                                    <CheckCircle2 className="w-5 h-5 animate-bounce-in" />
                                                    Copied!
                                                </span>
                                            ) : (
                                                <span className="relative z-10">Copy</span>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div className="flex flex-col md:flex-row md:gap-4">
                                    <div className="space-y-2.5 flex-1 group">
                                        <Label htmlFor="title" className="text-white font-medium flex items-center gap-2 group-hover:text-purple-200 transition-colors duration-300">
                                            Content Title
                                            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                                        </Label>
                                        <Input
                                            id="title"
                                            value={formState.title}
                                            onChange={(event) =>
                                                handleChange("title", event.target.value)
                                            }
                                            placeholder="E.g. Instagram Reel showcasing Asking Fate"
                                            className="bg-background/60 border-border/50 text-white placeholder:text-muted-foreground/60 hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-background/70"
                                        />
                                    </div>
                                    <div className="space-y-2.5 flex-1 group">
                                        <Label htmlFor="platform" className="text-white font-medium group-hover:text-purple-200 transition-colors duration-300">
                                            Platform
                                        </Label>
                                        <Select
                                            value={formState.platform}
                                            onValueChange={(value) =>
                                                handleChange("platform", value)
                                            }
                                        >
                                            <SelectTrigger className="bg-background/60 border-border/50 text-white hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-background/70">
                                                <SelectValue placeholder="Choose platform" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50 text-white">
                                                {platformOptions.map((option) => (
                                                    <SelectItem 
                                                        key={option.value} 
                                                        value={option.value}
                                                        className="hover:bg-purple-500/20 focus:bg-purple-500/20 transition-colors duration-200"
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2.5 group">
                                    <Label htmlFor="url" className="text-white font-medium flex items-center gap-2 group-hover:text-purple-200 transition-colors duration-300">
                                        Content URL
                                        <span className="text-rose-400 font-semibold">*</span>
                                    </Label>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 blur-xl rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        <Input
                                            id="url"
                                            value={formState.url}
                                            onChange={(event) =>
                                                handleChange("url", event.target.value)
                                            }
                                            placeholder="https://..."
                                            required
                                            className="relative bg-background/60 border-border/50 text-white placeholder:text-muted-foreground/60 hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-background/70"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2.5 group">
                                    <Label className="text-white font-medium flex items-center gap-2 group-hover:text-purple-200 transition-colors duration-300">
                                        Verification method
                                        <span className="text-rose-400 font-semibold">*</span>
                                    </Label>
                                    <Select
                                        value={formState.verificationMethod}
                                        onValueChange={(value: VerificationMethod) =>
                                            handleChange("verificationMethod", value)
                                        }
                                    >
                                        <SelectTrigger className="bg-background/60 border-border/50 text-white hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-background/70">
                                            <SelectValue placeholder="Select your verification method" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50 text-white">
                                              {verificationMethodOptions.map((option) => (
                                                  <SelectItem
                                                      key={option.value}
                                                      value={option.value}
                                                      className="text-left hover:bg-purple-500/20 focus:bg-purple-500/20 transition-colors duration-200"
                                                  >
                                                      {option.label}
                                                  </SelectItem>
                                              ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="relative rounded-xl border border-dashed border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent p-5 space-y-4 backdrop-blur-sm hover:border-purple-500/60 hover:bg-gradient-to-br hover:from-purple-500/15 hover:via-indigo-500/10 hover:to-transparent transition-all duration-300 group/instructions">
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover/instructions:opacity-100 transition-opacity duration-500 rounded-xl" />
                                    <div className="relative z-10 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4 text-purple-300" />
                                            <p className="text-sm font-semibold text-purple-200">
                                                How to verify with the selected method:
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 blur-xl rounded-lg opacity-30" />
                                            <pre className="relative text-xs sm:text-sm font-mono whitespace-pre-wrap break-words bg-black/60 border border-purple-500/20 rounded-lg p-4 text-white/90 backdrop-blur-sm shadow-lg shadow-purple-500/5">
                                                {verificationSnippet}
                                            </pre>
                                        </div>
                                    </div>
                                </div>

                                {formState.verificationMethod === "manual_proof" && (
                                    <div className="space-y-2.5 group animate-fade-in-scale">
                                        <Label htmlFor="evidenceUrl" className="text-white font-medium flex items-center gap-2 group-hover:text-purple-200 transition-colors duration-300">
                                            Evidence URL
                                            <span className="text-rose-400 font-semibold">*</span>
                                        </Label>
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-pink-500/10 blur-xl rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            <Input
                                                id="evidenceUrl"
                                                value={formState.evidenceUrl}
                                                onChange={(event) =>
                                                    handleChange("evidenceUrl", event.target.value)
                                                }
                                                placeholder="Link to a screenshot, Google Drive folder, etc."
                                                required
                                                className="relative bg-background/60 border-border/50 text-white placeholder:text-muted-foreground/60 hover:border-rose-500/30 focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all duration-300 hover:bg-background/70"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Share a viewable link (no login required) showing your account logged in with the content.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2.5 group">
                                    <Label htmlFor="notes" className="text-white font-medium group-hover:text-purple-200 transition-colors duration-300">
                                        Additional context
                                        <span className="text-xs text-muted-foreground font-normal ml-2">(optional)</span>
                                    </Label>
                                    <Textarea
                                        id="notes"
                                        value={formState.notes}
                                        onChange={(event) =>
                                            handleChange("notes", event.target.value)
                                        }
                                        placeholder="Tell us anything else helpful for reviewers."
                                        className="bg-background/60 border-border/50 text-white placeholder:text-muted-foreground/60 min-h-[100px] hover:border-purple-500/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-background/70 resize-none"
                                    />
                                </div>

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="relative w-full sm:w-auto bg-gradient-to-r from-purple-600 via-indigo-600 via-pink-600 to-purple-600 bg-[length:200%_auto] hover:from-purple-500 hover:via-indigo-500 hover:via-pink-500 hover:to-purple-500 text-white font-bold text-lg shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-110 transition-all duration-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 px-8 py-6 rounded-2xl overflow-hidden group/submit animate-gradient"
                                    >
                                        {/* Animated gradient overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover/submit:translate-x-[100%] transition-transform duration-1000" />
                                        
                                        {/* Glow effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/50 via-pink-400/50 to-indigo-400/50 blur-xl opacity-0 group-hover/submit:opacity-100 transition-opacity duration-500 -z-10" />
                                        
                                        {isSubmitting ? (
                                            <span className="flex items-center gap-3 relative z-10">
                                                <div className="h-5 w-5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                                                <span>Submitting…</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-3 relative z-10">
                                                <ShieldCheck className="w-5 h-5 group-hover/submit:scale-110 group-hover/submit:rotate-12 transition-transform duration-300" />
                                                <span>Submit for verification</span>
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-background/80 via-background/60 to-background/40 border border-border/50 backdrop-blur-2xl shadow-2xl flex-1 group hover:border-accent/30 transition-all duration-500 hover:shadow-indigo-500/20">
                        <CardHeader className="space-y-2 pb-6">
                            <CardTitle className="flex items-center gap-3 text-2xl text-white group-hover:text-indigo-100 transition-colors duration-300">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                    <Sparkles className="w-5 h-5 text-indigo-300" />
                                </div>
                                How verification works
                            </CardTitle>
                            <CardDescription className="text-muted-foreground text-base leading-relaxed">
                                Follow these steps to ensure your submission is auto-approved.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-4">
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
                                        className="group/step flex items-start gap-4 rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-4 hover:border-indigo-500/40 hover:from-indigo-500/15 hover:via-purple-500/10 hover:to-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/10"
                                    >
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 blur-lg opacity-0 group-hover/step:opacity-50 transition-opacity duration-300 rounded-full" />
                                            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-200 flex items-center justify-center font-bold text-sm border border-indigo-500/30 group-hover/step:scale-110 group-hover/step:rotate-6 transition-transform duration-300">
                                                {index + 1}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 flex-1">
                                            <p className="text-sm font-semibold text-white group-hover/step:text-indigo-100 transition-colors duration-300">
                                                {step.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground leading-relaxed group-hover/step:text-white/80 transition-colors duration-300">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                              <div className="relative rounded-xl border border-amber-500/50 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-transparent p-5 text-sm text-amber-100 flex gap-4 backdrop-blur-sm hover:border-amber-500/70 hover:from-amber-500/20 hover:via-yellow-500/15 hover:to-transparent transition-all duration-300 group/warning">
                                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 opacity-0 group-hover/warning:opacity-100 transition-opacity duration-500 rounded-xl" />
                                  <div className="relative z-10 flex gap-4">
                                      <Clock className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-300 group-hover/warning:scale-110 transition-transform duration-300" />
                                      <div className="space-y-1.5">
                                          <p className="font-semibold text-amber-100">
                                              Manual fallback
                                          </p>
                                          <p className="text-amber-100/90 leading-relaxed">
                                              Some platforms block automated crawlers. If that happens, use
                                              the manual proof option or share a public screenshot so our
                                              team can verify you manually.
                                          </p>
                                      </div>
                                  </div>
                              </div>
                              <div className="pt-2 space-y-4">
                                  <h3 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
                                      <ShieldCheck className="w-4 h-4 text-indigo-300" />
                                      Quick proof checklist
                                  </h3>
                                  <div className="space-y-3">
                                      {proofShortcuts.map((shortcut, index) => {
                                          const Icon = shortcut.icon
                                          return (
                                              <div
                                                  key={shortcut.title}
                                                  className="group/shortcut flex items-start gap-4 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/3 to-transparent p-4 hover:border-indigo-500/30 hover:from-indigo-500/10 hover:via-purple-500/5 hover:to-transparent transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/10"
                                                  style={{ animationDelay: `${index * 0.1}s` }}
                                              >
                                                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 group-hover/shortcut:scale-110 group-hover/shortcut:rotate-3 group-hover/shortcut:border-indigo-500/50 transition-all duration-300">
                                                      <Icon className="w-5 h-5" />
                                                  </span>
                                                  <div className="space-y-1 flex-1">
                                                      <p className="text-sm font-semibold text-white group-hover/shortcut:text-indigo-100 transition-colors duration-300">
                                                          {shortcut.title}
                                                      </p>
                                                      <p className="text-xs text-white/70 leading-relaxed group-hover/shortcut:text-white/80 transition-colors duration-300">
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

                <section className="relative px-4 animate-fade-in-scale" style={{ animationDelay: '0.4s' }}>
                    <Card className="relative bg-gradient-to-br from-background/90 via-background/70 to-background/50 border-2 border-border/60 backdrop-blur-3xl shadow-2xl group hover:border-yellow-500/50 hover:shadow-yellow-500/30 transition-all duration-700 overflow-hidden">
                        {/* Animated border glow */}
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700 -z-10" />
                        
                        <CardHeader className="space-y-3 pb-8 relative z-10">
                            <CardTitle className="flex items-center gap-4 text-3xl text-white group-hover:text-yellow-100 transition-colors duration-500">
                                <div className="relative p-3 rounded-xl bg-gradient-to-br from-yellow-500/30 to-amber-500/30 border-2 border-yellow-500/40 group-hover:scale-110 group-hover:rotate-6 group-hover:border-yellow-400/60 transition-all duration-500 shadow-lg shadow-yellow-500/30">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <Lightbulb className="w-6 h-6 text-yellow-200 relative z-10" />
                                </div>
                                Content sparks that resonate
                            </CardTitle>
                            <CardDescription className="text-muted-foreground text-lg leading-relaxed">
                                Need inspiration? Try one of these community-tested ideas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="flex flex-col md:flex-row md:flex-wrap gap-6">
                                {inspirationPrompts.map((prompt, index) => (
                                    <div
                                        key={prompt.title}
                                        className="relative w-full md:flex-1 min-w-[260px] rounded-2xl border-2 border-white/15 bg-gradient-to-br from-white/8 via-white/5 to-transparent p-6 space-y-4 group/prompt hover:border-yellow-500/40 hover:from-yellow-500/15 hover:via-amber-500/10 hover:to-transparent transition-all duration-500 hover:scale-[1.03] hover:shadow-xl hover:shadow-yellow-500/20 overflow-hidden"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        {/* Shimmer effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/prompt:translate-x-[100%] transition-transform duration-1000 rounded-2xl" />
                                        
                                        <h3 className="text-lg font-bold text-white group-hover/prompt:text-yellow-100 transition-colors duration-500 relative z-10">
                                            {prompt.title}
                                        </h3>
                                        <p className="text-sm text-white/75 leading-relaxed group-hover/prompt:text-white/90 transition-colors duration-500 relative z-10">
                                            {prompt.body}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section className="space-y-8 animate-fade-in-scale" style={{ animationDelay: '0.6s' }}>
                    <div className="flex items-center justify-between flex-wrap gap-5">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-bold text-white bg-gradient-to-r from-purple-200 via-pink-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                                Submission history
                            </h2>
                            <div className="w-16 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-full animate-pulse-glow" />
                            <p className="text-muted-foreground text-base leading-relaxed pt-2">
                                Track verification results for each content link you&apos;ve shared.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => loadSubmissions(true)}
                            disabled={loadingSubmissions}
                            className="relative border-2 border-purple-500/60 text-purple-200 bg-gradient-to-br from-purple-500/15 to-indigo-500/10 hover:from-purple-500/25 hover:to-indigo-500/20 hover:border-purple-400/80 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/40 px-6 py-3 font-semibold overflow-hidden group/refresh"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/refresh:translate-x-[100%] transition-transform duration-700" />
                            <RefreshCcw className={`w-5 h-5 mr-2 relative z-10 transition-transform duration-300 ${loadingSubmissions ? 'animate-spin' : 'group-hover/refresh:rotate-180'}`} />
                            <span className="relative z-10">{loadingSubmissions ? "Refreshing…" : "Refresh"}</span>
                        </Button>
                    </div>

                    {loadingSubmissions ? (
                        <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
                            {[...Array(2)].map((_, index) => (
                                <div
                                    key={index}
                                    className="w-full md:flex-1 min-w-[240px] animate-pulse rounded-xl border border-border/40 bg-background/40 h-40"
                                />
                            ))}
                        </div>
                    ) : submissions.length === 0 ? (
                        <Card className="bg-gradient-to-br from-background/60 via-background/40 to-background/30 border border-border/40 backdrop-blur-xl shadow-xl group hover:border-purple-500/30 transition-all duration-500">
                            <CardContent className="py-10 text-center space-y-3">
                                <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto" />
                                <h3 className="text-lg font-semibold text-white">
                                    No submissions yet
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                    When you share promotional content and submit it here, we’ll keep
                                    a history of every verification for your records.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex flex-col md:flex-row md:flex-wrap gap-5">
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
                                        className="relative w-full md:flex-1 min-w-[300px] bg-gradient-to-br from-background/70 via-background/60 to-background/50 border-2 border-border/50 backdrop-blur-2xl shadow-xl flex flex-col h-full group hover:border-purple-500/50 hover:shadow-purple-500/30 transition-all duration-700 hover:scale-[1.03] overflow-hidden"
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        {/* Animated border glow */}
                                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700 -z-10" />
                                        
                                        {/* Shimmer effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1500 rounded-lg" />
                                        
                                        <CardContent className="space-y-5 p-7 flex flex-col h-full relative z-10">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-2 flex-1">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                                                        {submission.platform
                                                            ? submission.platform
                                                            : host || "Custom link"}
                                                    </p>
                                                    <h3 className="text-xl font-bold text-white group-hover:text-purple-100 transition-colors duration-500 leading-tight">
                                                        {submission.title ||
                                                            submission.url.replace(/^https?:\/\//, "")}
                                                    </h3>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {renderStatusBadge(submission.verification_status)}
                                                </div>
                                            </div>

                                            <a
                                                href={submission.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 font-semibold transition-colors duration-300 group/link"
                                            >
                                                <div className="p-1 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 group-hover/link:scale-110 group-hover/link:rotate-6 transition-all duration-300">
                                                    <ExternalLink className="w-4 h-4 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform duration-300" />
                                                </div>
                                                View content
                                            </a>

                                            <div className="text-xs text-muted-foreground/80 space-y-2">
                                                <p className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-purple-300" />
                                                    Submitted{" "}
                                                    {formatter.format(new Date(submission.created_at))}
                                                </p>
                                                {submission.verified_at && (
                                                    <p className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse-glow" />
                                                        Verified{" "}
                                                        {formatter.format(new Date(submission.verified_at))}
                                                    </p>
                                                )}
                                            </div>

                                            {submission.notes && (
                                                <div className="rounded-2xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-transparent p-5 group/notes hover:border-purple-500/50 hover:from-purple-500/20 hover:via-indigo-500/15 hover:to-transparent transition-all duration-500">
                                                    <p className="text-xs uppercase tracking-wider text-purple-200 font-bold mb-3">
                                                        Notes
                                                    </p>
                                                    <p className="text-sm text-white/85 leading-relaxed">
                                                        {submission.notes}
                                                    </p>
                                                </div>
                                            )}

                                            {renderVerificationNotes(submission)}
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
