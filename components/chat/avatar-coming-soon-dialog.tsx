"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Sparkles, BellRing, Check, X } from "lucide-react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { subscribeToFeature } from "@/lib/feature-subscriptions"

const FEATURE = "avatar"

/**
 * "Coming soon" dialog for the avatar feature — a premium, cosmic-themed card
 * with an animated aurora border, a shimmering badge, floating sparkles, and a
 * gradient CTA. Lets the user subscribe to be emailed when it launches
 * (sign-in required; signed-out users are routed to sign in and auto-subscribed
 * on return via /subscribe).
 */
export function AvatarComingSoonDialog({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const t = useTranslations("Avatar")
    const locale = useLocale()
    const router = useRouter()
    const introSrc = process.env.NEXT_PUBLIC_AVATAR_INTRO ?? "/avatar/intro.mp4"

    const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")

    const handleSubscribe = async () => {
        setState("loading")
        const result = await subscribeToFeature(FEATURE)
        if (result.status === "subscribed") {
            setState("done")
        } else if (result.status === "needs-login") {
            const callback = `/subscribe?feature=${FEATURE}`
            router.push(
                `/${locale}/signin?callbackUrl=${encodeURIComponent(callback)}`,
            )
        } else {
            setState("error")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                hideCloseButton
                className="max-w-md overflow-visible border-0 bg-transparent p-0 shadow-none"
            >
                <div className="relative">
                    {/* Animated aurora glow ring behind the card. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -inset-0.5 rounded-[28px] opacity-70 blur-[10px]"
                        style={{
                            background:
                                "conic-gradient(from 0deg, #fcd34d, #a78bfa, #7de3ff, #a78bfa, #fcd34d)",
                            animation: "spin 8s linear infinite",
                        }}
                    />

                    {/* Glass card. */}
                    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0b0b1f]/95 shadow-2xl backdrop-blur-xl">
                        {/* Close. */}
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            aria-label={t("close")}
                            className="absolute right-3 top-3 z-20 rounded-full bg-black/40 p-1.5 text-white/70 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {/* Video hero. */}
                        <div className="relative aspect-video overflow-hidden bg-[#05050f]">
                            <video
                                src={introSrc}
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="h-full w-full object-cover object-top"
                            />
                            {/* Cinematic gradient wash. */}
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0b1f] via-[#0b0b1f]/10 to-transparent" />
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(168,85,247,0.25),transparent_60%)]" />

                            {/* Floating sparkles. */}
                            {[
                                { top: "18%", left: "12%", d: "0s", s: "h-1 w-1" },
                                { top: "30%", left: "82%", d: "0.6s", s: "h-1.5 w-1.5" },
                                { top: "62%", left: "24%", d: "1.1s", s: "h-1 w-1" },
                                { top: "48%", left: "68%", d: "1.6s", s: "h-1 w-1" },
                            ].map((p, i) => (
                                <span
                                    key={i}
                                    className={`pointer-events-none absolute rounded-full bg-amber-200 shadow-[0_0_8px_2px_rgba(252,211,77,0.7)] ${p.s}`}
                                    style={{
                                        top: p.top,
                                        left: p.left,
                                        animation: `csFloat 3.4s ease-in-out ${p.d} infinite`,
                                    }}
                                />
                            ))}

                            {/* Shimmering COMING SOON badge. */}
                            <span className="absolute left-4 top-4 inline-flex items-center overflow-hidden rounded-full bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200 ring-1 ring-amber-300/40 backdrop-blur">
                                <span className="relative z-10">{t("comingSoon")}</span>
                                <span
                                    aria-hidden
                                    className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                                    style={{ animation: "csShimmer 2.6s ease-in-out infinite" }}
                                />
                            </span>
                        </div>

                        {/* Body. */}
                        <div className="relative -mt-6 px-6 pb-6">
                            {state === "done" ? (
                                <div className="flex flex-col items-center gap-3 py-2 text-center">
                                    <div className="relative">
                                        <span
                                            aria-hidden
                                            className="absolute inset-0 rounded-full bg-emerald-400/40"
                                            style={{ animation: "csRingBurst 1s ease-out" }}
                                        />
                                        <div
                                            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_10px_30px_-6px_rgba(16,185,129,0.7)]"
                                            style={{ animation: "csPopIn 0.5s ease-out" }}
                                        >
                                            <Check className="h-7 w-7 text-white" />
                                        </div>
                                    </div>
                                    <h2 className="text-lg font-semibold text-white">
                                        {t("subscribedTitle")}
                                    </h2>
                                    <p className="text-sm leading-relaxed text-white/70">
                                        {t("subscribedBody")}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => onOpenChange(false)}
                                        className="mt-1 rounded-xl border border-white/15 px-5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
                                    >
                                        {t("close")}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 text-center">
                                    <h2
                                        className="font-playfair bg-gradient-to-r from-amber-200 via-violet-200 to-sky-200 bg-clip-text text-2xl font-semibold text-transparent"
                                        style={{
                                            backgroundSize: "200% auto",
                                            animation: "csGradientText 6s ease-in-out infinite",
                                        }}
                                    >
                                        {t("comingSoonTitle")}
                                    </h2>
                                    <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/70">
                                        {t("comingSoonBody")}
                                    </p>

                                    {state === "error" && (
                                        <p className="text-sm text-rose-400">
                                            {t("subscribeError")}
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleSubscribe}
                                        disabled={state === "loading"}
                                        className="group relative w-full overflow-hidden rounded-xl px-5 py-3 font-semibold text-white shadow-[0_14px_40px_-12px_rgba(168,85,247,0.8)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        <span className="absolute inset-0 bg-gradient-to-r from-amber-400 via-fuchsia-500 to-indigo-500" />
                                        <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                                        <span
                                            aria-hidden
                                            className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/40 blur-md"
                                            style={{ animation: "csShimmer 3s ease-in-out infinite" }}
                                        />
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {state === "loading" ? (
                                                <BellRing className="h-4 w-4 animate-pulse" />
                                            ) : (
                                                <BellRing className="h-4 w-4" />
                                            )}
                                            {t("subscribeCta")}
                                        </span>
                                    </button>

                                    <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/40">
                                        <Sparkles className="h-3 w-3 text-amber-300/70" />
                                        {t("freeAvailable")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
