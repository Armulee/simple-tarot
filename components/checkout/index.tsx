"use client"

import {
    cloneElement,
    isValidElement,
    type HTMLAttributes,
    type ReactNode,
    useState,
} from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "next-intl"
import { resolveCurrencyFromLocale } from "@/lib/payments/star-products"
import {
    ensureSupportedCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"
import { usePathname } from "@/i18n/navigation"
import { supabase } from "@/lib/supabase"

type CheckoutMode = "pack" | "subscribe" | "addon"

type CheckoutProps = {
    mode: CheckoutMode
    packId?: string
    plan?: "monthly" | "annual"
    customTrigger?: ReactNode
    currency?: CurrencyCode
    couponId?: string
    className?: string
}

export function Checkout({
    mode,
    packId,
    plan,
    customTrigger,
    currency,
    couponId,
    className,
}: CheckoutProps) {
    const { user } = useAuth()
    const t = useTranslations("Checkout")
    const params = useParams()
    const pathname = usePathname()
    const locale = (params?.locale as string) ?? "en"
    const localeCurrency = resolveCurrencyFromLocale(locale)
    const effectiveCurrency = currency
        ? ensureSupportedCurrency(currency)
        : ensureSupportedCurrency(localeCurrency)
    const [processing, setProcessing] = useState(false)

    if (!user) {
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

    const handleCheckout = async () => {
        if (processing) return

        // Validate packId before making the API call
        if (!packId || packId.trim() === "") {
            const errorMsg = mode === "subscribe" 
                ? "Subscription price is not configured. Please contact support."
                : "Product price is not configured. Please contact support."
            toast.error(errorMsg)
            console.error("Missing packId for mode:", mode, "plan:", plan, "packId:", packId)
            return
        }

        let toastId: string | number | undefined
        try {
            setProcessing(true)
            toastId = toast.loading(t("redirecting"))

            if (mode === "addon") {
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (!session?.access_token) {
                    throw new Error("AUTH_REQUIRED")
                }
                const response = await fetch(
                    "/api/billing/subscription/addon",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                            priceId: packId,
                            action: "add",
                        }),
                    }
                )
                const data = await response.json().catch(() => ({}))
                if (!response.ok) {
                    throw new Error(
                        data?.error || data?.message || "ADDON_ERROR"
                    )
                }
                toast.success(t("addonSuccess") || "Add-on added")
                if (typeof window !== "undefined") {
                    window.dispatchEvent(
                        new CustomEvent("stars-balance-updated")
                    )
                }
                return
            }

            const payload: Record<string, unknown> = {
                mode,
                locale,
                currency: effectiveCurrency,
                userId: user.id,
                priceId: packId,
                couponId: couponId,
            }
            if (plan) payload.plan = plan
            if (user.email) payload.email = user.email

            const response = await fetch("/api/checkout/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const data = await response.json()

            if (!response.ok) {
                const errorMessage =
                    data?.error || data?.message || "SESSION_ERROR"
                console.error("Checkout session error:", errorMessage, data)
                throw new Error(errorMessage)
            }

            if (data?.url) {
                window.location.assign(data.url)
            } else {
                throw new Error("SESSION_URL_MISSING")
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error && error.message === "AUTH_REQUIRED"
                    ? t("signInToSubscribe")
                    : error instanceof Error
                      ? error.message
                      : t("sessionError")
            toast.error(errorMessage)
            console.error("Checkout error:", error)
        } finally {
            if (toastId) toast.dismiss(toastId)
            setProcessing(false)
        }
    }

    let triggerContent: ReactNode = null
    if (customTrigger) {
        if (isValidElement(customTrigger)) {
            const element = customTrigger as React.ReactElement<
                HTMLAttributes<HTMLElement>
            >
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
                onClick={handleCheckout}
                className={`w-full rounded-full bg-white text-black hover:brightness-90 ${className || ''}`}
                disabled={processing || !packId}
            >
                {processing
                    ? t("loading")
                    : !packId
                      ? t("unavailable", { defaultValue: "Unavailable" })
                      : mode === "pack"
                        ? t("purchase")
                        : mode === "addon"
                          ? t("addOn")
                          : t("subscribe")}
            </Button>
        )
    }

    return <>{triggerContent}</>
}
