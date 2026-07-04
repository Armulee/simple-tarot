"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Sparkles, BellRing, Check } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { subscribeToFeature } from "@/lib/feature-subscriptions"

const FEATURE = "avatar"

/**
 * "Coming soon" dialog for the avatar feature. Shows a short demo clip and lets
 * the user subscribe to be emailed when it launches. Subscribing requires
 * sign-in: logged-in users subscribe inline; signed-out users are sent to sign
 * in with a callback to /subscribe, which auto-subscribes them on return.
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
            // Sign in, then land on /subscribe which subscribes automatically.
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
            <DialogContent className="max-w-md overflow-hidden">
                <div className="relative -mx-6 -mt-6 mb-2 aspect-video overflow-hidden bg-[#05050f]">
                    <video
                        src={introSrc}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="h-full w-full object-cover object-top"
                    />
                    <span className="absolute right-3 top-3 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black shadow">
                        {t("comingSoon")}
                    </span>
                </div>

                {state === "done" ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-emerald-400" />
                                {t("subscribedTitle")}
                            </DialogTitle>
                            <DialogDescription>{t("subscribedBody")}</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button onClick={() => onOpenChange(false)}>
                                {t("close")}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-amber-300" />
                                {t("comingSoonTitle")}
                            </DialogTitle>
                            <DialogDescription>{t("comingSoonBody")}</DialogDescription>
                        </DialogHeader>
                        {state === "error" && (
                            <p className="text-sm text-red-400">{t("subscribeError")}</p>
                        )}
                        <DialogFooter>
                            <Button
                                onClick={handleSubscribe}
                                disabled={state === "loading"}
                                className="gap-2"
                            >
                                <BellRing className="h-4 w-4" />
                                {t("subscribeCta")}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
