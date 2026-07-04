"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"
import { BellRing, Check, Sparkles } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import BrandLoader from "@/components/brand-loader"
import { useAuth } from "@/hooks/use-auth"
import { subscribeToFeature } from "@/lib/feature-subscriptions"

/**
 * Post-sign-in landing page that auto-subscribes the user to a feature waitlist.
 *
 * The "coming soon" dialog sends signed-out users to
 * /signin?callbackUrl=/subscribe?feature=avatar. After they authenticate they
 * arrive here, and we subscribe them immediately (no extra click). Already
 * signed-in users who reach here are subscribed the same way.
 */
function SubscribeInner() {
    const t = useTranslations("Avatar")
    const locale = useLocale()
    const router = useRouter()
    const params = useSearchParams()
    const { user, loading } = useAuth()

    const feature = (params.get("feature") ?? "avatar").toLowerCase()
    const [state, setState] = useState<"working" | "done" | "error">("working")
    const ranRef = useRef(false)

    useEffect(() => {
        if (loading || ranRef.current) return

        // Not signed in yet → send to sign in, then back here to auto-subscribe.
        if (!user) {
            const callback = `/subscribe?feature=${encodeURIComponent(feature)}`
            router.replace(
                `/${locale}/signin?callbackUrl=${encodeURIComponent(callback)}`,
            )
            return
        }

        ranRef.current = true
        void subscribeToFeature(feature).then((result) => {
            setState(result.status === "subscribed" ? "done" : "error")
        })
    }, [loading, user, feature, locale, router])

    if (loading || (!user && state === "working")) {
        return <BrandLoader />
    }

    return (
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
            {state === "done" ? (
                <>
                    <div className="rounded-full bg-emerald-500/15 p-4">
                        <Check className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t("subscribedTitle")}
                    </h1>
                    <p className="text-muted-foreground">{t("subscribedBody")}</p>
                </>
            ) : state === "error" ? (
                <>
                    <div className="rounded-full bg-amber-500/15 p-4">
                        <Sparkles className="h-8 w-8 text-amber-300" />
                    </div>
                    <p className="text-muted-foreground">{t("subscribeError")}</p>
                </>
            ) : (
                <>
                    <BellRing className="h-8 w-8 animate-pulse text-amber-300" />
                    <p className="text-muted-foreground">{t("subscribeCta")}…</p>
                </>
            )}
            <Button asChild>
                <Link href="/">{t("close")}</Link>
            </Button>
        </div>
    )
}

export default function SubscribePage() {
    return (
        <Suspense fallback={<BrandLoader />}>
            <SubscribeInner />
        </Suspense>
    )
}
