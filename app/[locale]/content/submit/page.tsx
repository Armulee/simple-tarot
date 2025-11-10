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
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-16 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full" />
                <div className="absolute bottom-10 right-20 w-72 h-72 bg-emerald-500/10 blur-3xl rounded-full" />
            </div>
            <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
                <header className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-100">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            Content Ownership Verification
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white">
                        Share Your Promotion, Prove It&apos;s Yours
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
                        Submit social posts, videos, or articles that feature Asking Fate.
                        We verify that you control the content before rewarding your effort.
                    </p>
                    <div className="flex flex-col md:flex-row md:flex-wrap gap-4 max-w-5xl mx-auto pt-2">
                        {highlightCards.map((card) => {
                            const Icon = card.icon
                            return (
                                <div key={card.title} className="w-full md:flex-1 min-w-[240px]">
                                    <div
                                        className={`relative overflow-hidden rounded-2xl border ${card.accent} bg-gradient-to-br p-[1px] h-full`}
                                    >
                                        <div className="rounded-2xl bg-[#050512]/80 p-5 h-full flex flex-col gap-3 backdrop-blur">
                                            <div className="flex items-center gap-3">
                                                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 border border-white/20">
                                                    <Icon className="w-5 h-5 text-white" />
                                                </span>
                                                <p className="text-left text-base font-semibold text-white">
                                                    {card.title}
                                                </p>
                                            </div>
                                            <p className="text-sm text-white/70 text-left leading-relaxed">
                                                {card.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </header>

                <section className="flex flex-col lg:flex-row gap-6">
                    <Card className="bg-background/60 border border-border/40 backdrop-blur-xl shadow-lg flex-1">
                        <CardHeader className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-xl text-white">
                                <LinkIcon className="w-5 h-5 text-accent" />
                                Submit Content
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Provide the live link to your promotional content and we will
                                attempt to verify ownership automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6 rounded-xl border border-dashed border-accent/30 bg-accent/5 p-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex-1 min-w-[200px]">
                                        <p className="text-sm text-muted-foreground mb-1">
                                            Your permanent verification code
                                        </p>
                                        <div className="font-mono text-sm sm:text-base text-white bg-black/40 border border-white/10 rounded-lg px-3 py-2">
                                            {verificationToken || "Loading..."}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Add this code to your public content whenever you promote Asking Fate. It never expires.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCopyCode}
                                            disabled={!verificationToken}
                                            className="border-accent/50 text-accent hover:bg-accent/10 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            <Copy className="w-4 h-4 mr-2" />
                                            {copied ? "Copied" : "Copy"}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div className="flex flex-col md:flex-row md:gap-4">
                                    <div className="space-y-2 flex-1">
                                        <Label htmlFor="title" className="text-white">
                                            Content Title (optional)
                                        </Label>
                                        <Input
                                            id="title"
                                            value={formState.title}
                                            onChange={(event) =>
                                                handleChange("title", event.target.value)
                                            }
                                            placeholder="E.g. Instagram Reel showcasing Asking Fate"
                                            className="bg-background/50 border-border/40 text-white placeholder:text-muted-foreground"
                                        />
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <Label htmlFor="platform" className="text-white">
                                            Platform
                                        </Label>
                                        <Select
                                            value={formState.platform}
                                            onValueChange={(value) =>
                                                handleChange("platform", value)
                                            }
                                        >
                                            <SelectTrigger className="bg-background/50 border-border/40 text-white">
                                                <SelectValue placeholder="Choose platform" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-background/95 border-border/40 text-white">
                                                {platformOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="url" className="text-white">
                                        Content URL<span className="text-rose-400">*</span>
                                    </Label>
                                    <Input
                                        id="url"
                                        value={formState.url}
                                        onChange={(event) =>
                                            handleChange("url", event.target.value)
                                        }
                                        placeholder="https://..."
                                        required
                                        className="bg-background/50 border-border/40 text-white placeholder:text-muted-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-white">
                                        Verification method<span className="text-rose-400">*</span>
                                    </Label>
                                    <Select
                                        value={formState.verificationMethod}
                                        onValueChange={(value: VerificationMethod) =>
                                            handleChange("verificationMethod", value)
                                        }
                                    >
                                        <SelectTrigger className="bg-background/50 border-border/40 text-white">
                                            <SelectValue placeholder="Select your verification method" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-background/95 border-border/40 text-white">
                                            {verificationMethodOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    <div className="flex flex-col gap-1">
                                                        <span>{option.label}</span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {option.helper}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="rounded-lg border border-dashed border-border/40 bg-background/40 p-4 space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        How to verify with the selected method:
                                    </p>
                                    <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words bg-black/40 border border-white/5 rounded-md p-3 text-white/90">
                                        {verificationSnippet}
                                    </pre>
                                </div>

                                {formState.verificationMethod === "manual_proof" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="evidenceUrl" className="text-white">
                                            Evidence URL<span className="text-rose-400">*</span>
                                        </Label>
                                        <Input
                                            id="evidenceUrl"
                                            value={formState.evidenceUrl}
                                            onChange={(event) =>
                                                handleChange("evidenceUrl", event.target.value)
                                            }
                                            placeholder="Link to a screenshot, Google Drive folder, etc."
                                            required
                                            className="bg-background/50 border-border/40 text-white placeholder:text-muted-foreground"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Share a viewable link (no login required) showing your account logged in with the content.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="notes" className="text-white">
                                        Additional context (optional)
                                    </Label>
                                    <Textarea
                                        id="notes"
                                        value={formState.notes}
                                        onChange={(event) =>
                                            handleChange("notes", event.target.value)
                                        }
                                        placeholder="Tell us anything else helpful for reviewers."
                                        className="bg-background/50 border-border/40 text-white placeholder:text-muted-foreground min-h-[90px]"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 hover:from-purple-400 hover:via-indigo-400 hover:to-blue-400 text-white"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            Submitting…
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4" />
                                            Submit for verification
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="bg-background/50 border border-border/40 backdrop-blur-xl shadow-lg flex-1">
                        <CardHeader className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-xl text-white">
                                <Sparkles className="w-5 h-5 text-accent" />
                                How verification works
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Follow these steps to ensure your submission is auto-approved.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                                        className="flex items-start gap-3 rounded-xl border border-border/20 bg-background/40 p-3"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-semibold">
                                            {index + 1}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-white">
                                                {step.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3">
                                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <div>
                                      <p className="font-semibold text-amber-100">
                                          Manual fallback
                                      </p>
                                      <p className="text-amber-100/90">
                                          Some platforms block automated crawlers. If that happens, use
                                          the manual proof option or share a public screenshot so our
                                          team can verify you manually.
                                      </p>
                                  </div>
                              </div>
                              <div className="pt-2 space-y-3">
                                  <h3 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
                                      <ShieldCheck className="w-4 h-4 text-accent" />
                                      Quick proof checklist
                                  </h3>
                                  <div className="space-y-3">
                                      {proofShortcuts.map((shortcut) => {
                                          const Icon = shortcut.icon
                                          return (
                                              <div
                                                  key={shortcut.title}
                                                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                                              >
                                                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 border border-accent/30 text-accent">
                                                      <Icon className="w-5 h-5" />
                                                  </span>
                                                  <div className="space-y-1">
                                                      <p className="text-sm font-semibold text-white">
                                                          {shortcut.title}
                                                      </p>
                                                      <p className="text-xs text-white/70 leading-relaxed">
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

                <section className="relative px-4">
                    <Card className="bg-background/50 border border-border/40 backdrop-blur-xl shadow-lg">
                        <CardHeader className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-xl text-white">
                                <Lightbulb className="w-5 h-5 text-yellow-300" />
                                Content sparks that resonate
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Need inspiration? Try one of these community-tested ideas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
                                {inspirationPrompts.map((prompt) => (
                                    <div
                                        key={prompt.title}
                                        className="w-full md:flex-1 min-w-[240px] rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
                                    >
                                        <h3 className="text-base font-semibold text-white">
                                            {prompt.title}
                                        </h3>
                                        <p className="text-sm text-white/70 leading-relaxed">
                                            {prompt.body}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h2 className="text-2xl font-semibold text-white">
                                Submission history
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                Track verification results for each content link you&apos;ve shared.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => loadSubmissions(true)}
                            disabled={loadingSubmissions}
                            className="border-accent/40 text-accent hover:bg-accent/10"
                        >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            {loadingSubmissions ? "Refreshing…" : "Refresh"}
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
                        <Card className="bg-background/40 border border-border/30 backdrop-blur-lg">
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
                        <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
                            {submissions.map((submission) => {
                                let host: string | null = null
                                try {
                                    host = new URL(submission.url).hostname
                                } catch {
                                    host = null
                                }

                                return (
                                    <Card
                                        key={submission.id}
                                        className="w-full md:flex-1 min-w-[280px] bg-background/50 border border-border/30 backdrop-blur-lg flex flex-col h-full"
                                    >
                                        <CardContent className="space-y-3 p-5 flex flex-col h-full">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm text-muted-foreground uppercase tracking-wide">
                                                        {submission.platform
                                                            ? submission.platform
                                                            : host || "Custom link"}
                                                    </p>
                                                    <h3 className="text-lg font-semibold text-white">
                                                        {submission.title ||
                                                            submission.url.replace(/^https?:\/\//, "")}
                                                    </h3>
                                                </div>
                                                {renderStatusBadge(submission.verification_status)}
                                            </div>

                                            <a
                                                href={submission.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                View content
                                            </a>

                                            <div className="text-xs text-muted-foreground/80">
                                                <p>
                                                    Submitted{" "}
                                                    {formatter.format(new Date(submission.created_at))}
                                                </p>
                                                {submission.verified_at && (
                                                    <p>
                                                        Verified{" "}
                                                        {formatter.format(new Date(submission.verified_at))}
                                                    </p>
                                                )}
                                            </div>

                                            {submission.notes && (
                                                <div className="rounded-lg border border-border/30 bg-background/40 p-3">
                                                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                                                        Notes
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
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
