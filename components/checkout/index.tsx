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

type CheckoutMode = "pack" | "subscribe"

type CheckoutProps = {
    mode: CheckoutMode
    packId?: string
    plan?: "monthly" | "annual"
    infinityTerm?: "month" | "year"
    customTrigger?: ReactNode
    currency?: CurrencyCode
}

export function Checkout({
    mode,
    packId,
    plan,
    infinityTerm,
    customTrigger,
    currency,
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

        let toastId: string | number | undefined
        try {
            setProcessing(true)
            toastId = toast.loading(t("redirecting"))

            const payload: Record<string, unknown> = {
                mode,
                locale,
                currency: effectiveCurrency,
                userId: user.id,
                priceId: packId,
            }
            if (plan) payload.plan = plan
            if (infinityTerm) payload.infinityTerm = infinityTerm
            if (user.email) payload.email = user.email

            const response = await fetch("/api/checkout/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.message ?? "SESSION_ERROR")
            }

            if (data?.url) {
                window.location.assign(data.url)
            } else {
                throw new Error("SESSION_URL_MISSING")
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
                className='w-full rounded-full bg-white text-black hover:brightness-90'
                disabled={processing}
            >
                {processing
                    ? t("loading")
                    : mode === "pack"
                      ? t("purchase")
                      : t("subscribe")}
            </Button>
        )
    }

    return <>{triggerContent}</>
}
