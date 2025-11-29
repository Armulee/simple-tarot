"use client"

import {
    cloneElement,
    isValidElement,
    type HTMLAttributes,
    type ReactNode,
    useEffect,
    useMemo,
    useState,
} from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { loadStripe, type Stripe as ClientStripe } from "@stripe/stripe-js"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "next-intl"
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { StarsDialog } from "../star-consent"
import {
    formatAvailabilityCountdown,
    getAvailabilityCountdown,
    getAvailabilityLabel,
} from "@/lib/roadmap"
import { resolveCurrencyFromLocale } from "@/lib/payments/star-products"
import type { CurrencyCode } from "@/lib/payments/currency-utils"
import { usePreferredCurrency } from "@/hooks/use-preferred-currency"

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise: Promise<ClientStripe | null> | null = publishableKey
    ? loadStripe(publishableKey)
    : null

type CheckoutMode = "pack" | "subscribe"

type CheckoutProps = {
    mode: CheckoutMode
    packId?: string
    plan?: "monthly" | "annual"
    infinityTerm?: "month" | "year"
    customTrigger?: ReactNode
    availabilityLabel?: string
    currency?: CurrencyCode
}

type RedirectCapableStripe = ClientStripe & {
    redirectToCheckout: (options: { sessionId: string }) => Promise<{
        error?: { message?: string }
    }>
}

export function Checkout({
    mode,
    packId,
    plan,
    infinityTerm,
    customTrigger,
    availabilityLabel,
    currency,
}: CheckoutProps) {
    const { user } = useAuth()
    const t = useTranslations("Checkout")
    const params = useParams()
    const locale = (params?.locale as string) ?? "en"
    const localeCurrency = resolveCurrencyFromLocale(locale)
    const preferredCurrency = usePreferredCurrency(localeCurrency)
    const effectiveCurrency =
        currency ?? preferredCurrency ?? localeCurrency ?? "USD"
    const [countdown, setCountdown] = useState(getAvailabilityCountdown())
    const [processing, setProcessing] = useState(false)
    const [fallbackOpen, setFallbackOpen] = useState(false)
    const fallbackLabel = useMemo(
        () => availabilityLabel ?? getAvailabilityLabel(),
        [availabilityLabel]
    )

    useEffect(() => {
        if (typeof window === "undefined") return
        const timer = window.setInterval(() => {
            setCountdown(getAvailabilityCountdown())
        }, 1000)
        return () => window.clearInterval(timer)
    }, [])

    const displayLabel =
        formatAvailabilityCountdown(countdown) ?? fallbackLabel ?? undefined

    if (!user) {
        const defaultCallback = mode === "pack" ? "/pricing" : "/stars"
        const pathname =
            typeof window !== "undefined"
                ? window.location.pathname
                : defaultCallback
        const signinHref = `/signin?callbackUrl=${encodeURIComponent(pathname)}`
        if (customTrigger && isValidElement(customTrigger)) {
            return <Link href={signinHref}>{customTrigger}</Link>
        }
        if (customTrigger) {
            return (
                <Link href={signinHref}>
                    <span>{customTrigger}</span>
                </Link>
            )
        }
        return (
            <Link href={signinHref}>
                <Button className='w-full rounded-full bg-white text-black hover:brightness-90'>
                    {t("signInToSubscribe")}
                </Button>
            </Link>
        )
    }

    const openFallback = () => setFallbackOpen(true)

    const handleCheckout = async () => {
        if (processing) return

        if (!stripePromise) {
            openFallback()
            return
        }

        let toastId: string | number | undefined
        try {
            setProcessing(true)
            toastId = toast.loading(t("redirecting"))

            const payload: Record<string, unknown> = {
                mode,
                locale,
                currency: effectiveCurrency,
                userId: user.id,
            }
            if (packId) payload.packId = packId
            if (plan) payload.plan = plan
            if (infinityTerm) payload.infinityTerm = infinityTerm
            if (user.email) payload.email = user.email

            const response = await fetch("/api/checkout/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const data = (await response.json().catch(() => null)) as
                | { id?: string; code?: string; message?: string }
                | null

            if (!response.ok || !data?.id) {
                if (data?.code === "STRIPE_NOT_CONFIGURED") {
                    openFallback()
                }
                throw new Error(data?.message ?? "SESSION_ERROR")
            }

            const stripe = await stripePromise
            if (!stripe) {
                openFallback()
                throw new Error("STRIPE_NOT_READY")
            }

            const { error } = await (stripe as RedirectCapableStripe).redirectToCheckout({
                sessionId: data.id,
            })
            if (error) {
                throw new Error(error.message)
            }
        } catch (error) {
            toast.error(t("sessionError"))
            console.error(error)
        } finally {
            if (toastId) toast.dismiss(toastId)
            setProcessing(false)
        }
    }

    let triggerContent: ReactNode = null
    if (customTrigger) {
        if (isValidElement(customTrigger)) {
            const element =
                customTrigger as React.ReactElement<HTMLAttributes<HTMLElement>>
            triggerContent = cloneElement(element, {
                onClick: (event) => {
                    element.props.onClick?.(event)
                    if (event.defaultPrevented || processing) return
                    handleCheckout()
                },
                "aria-busy": processing ? true : element.props["aria-busy"],
            })
        } else {
            triggerContent = (
                <span
                    role='button'
                    tabIndex={0}
                    onClick={(event) => {
                        if (processing) return
                        event.preventDefault()
                        handleCheckout()
                    }}
                    onKeyDown={(event) => {
                        if (processing) return
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            handleCheckout()
                        }
                    }}
                >
                    {customTrigger}
                </span>
            )
        }
    } else {
        triggerContent = (
            <Button
                className='w-full rounded-full bg-white text-black hover:brightness-90'
                onClick={handleCheckout}
                disabled={processing}
            >
                <div className='flex w-full flex-col items-center justify-center gap-1 text-center'>
                    <span>
                        {processing
                            ? t("loading")
                            : mode === "pack"
                              ? t("purchase")
                              : t("subscribe")}
                    </span>
                    {mode === "subscribe" && displayLabel && !processing && (
                        <span className='text-xs font-semibold text-black/70'>
                            {displayLabel}
                        </span>
                    )}
                </div>
            </Button>
        )
    }

    return (
        <>
            {triggerContent}

            <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
                <StarsDialog className='relative space-y-4'>
                    <DialogHeader className='space-y-2'>
                        <DialogTitle className='text-yellow-300 font-serif text-xl'>
                            {t("comingSoonTitle")}
                        </DialogTitle>
                        <DialogDescription className='text-white/85'>
                            {t("comingSoonDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <p className='text-sm text-white/70 leading-relaxed'>
                        {t("comingSoonHelper")}
                    </p>
                    <p className='text-xs text-white/60 leading-relaxed'>
                        {publishableKey
                            ? t("stripeReady")
                            : t("stripeMissing", {
                                  countdown: displayLabel ?? t("countdownUnknown"),
                              })}
                    </p>
                    <DialogFooter>
                        <Button
                            className='w-full rounded-full bg-white text-black hover:brightness-95'
                            onClick={() => setFallbackOpen(false)}
                        >
                            {t("close")}
                        </Button>
                    </DialogFooter>
                </StarsDialog>
            </Dialog>
        </>
    )
}
