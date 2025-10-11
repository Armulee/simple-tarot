"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { loadCheckoutWebComponents } from "@checkout.com/checkout-web-components"
import { useMemo, useRef, useState } from "react"
import {
    Dialog,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useStars } from "@/contexts/stars-context"
import { StarsDialog } from "../star-consent"
import { Swiper, SwiperSlide } from "swiper/react"
import type { SwiperRef } from "swiper/react"
import Summary from "./summary"
import Payment from "./payment"
import Success from "./success"
import Failure from "./failure"
import { useTranslations } from "next-intl"
import "swiper/css"

type CheckoutMode = "pack" | "subscribe"

export function Checkout({
    mode,
    packId,
    plan,
    infinityTerm,
    customTrigger,
}: {
    mode: CheckoutMode
    packId?: string
    plan?: "monthly" | "annual"
    infinityTerm?: "month" | "year"
    customTrigger?: React.ReactNode
}) {
    const { user } = useAuth()
    const { setStarsBalance, stars } = useStars()
    const t = useTranslations("Checkout")
    const [open, setOpen] = useState(false)
    const [currentSlide, setCurrentSlide] = useState(0)
    const [creatingSession, setCreatingSession] = useState(false)
    const [progress, setProgress] = useState(0)
    const progressTimerRef = useRef<number | null>(null)
    const [paymentResult, setPaymentResult] = useState<{
        status: "idle" | "success" | "error"
        added?: number
        newBalance?: number
    }>({ status: "idle" })
    const flowContainerRef = useRef<HTMLDivElement | null>(null)
    const swiperRef = useRef<SwiperRef | null>(null)

    const scrollToTop = () => {
        // Try multiple selectors to find the scrollable container
        const selectors = [
            '[role="dialog"]',
            ".dialog-content",
            ".swiper-slide",
            ".max-w-lg",
        ]

        for (const selector of selectors) {
            const element = document.querySelector(selector)
            if (element && element.scrollHeight > element.clientHeight) {
                element.scrollTop = 0
                break
            }
        }

        // Also try scrolling the window if no container found
        window.scrollTo({ top: 0, behavior: "smooth" })
    }
    type CheckoutSession = Record<string, unknown>
    const cachedSessionRef = useRef<{
        session: CheckoutSession
        expiresAtMs: number
    } | null>(null)

    const round2 = (n: number) => Math.round(n * 100) / 100
    const basePerDollar = 60
    const monthlyPrice = 9.99

    const packMeta = useMemo(() => {
        if (mode !== "pack") return null
        switch (packId) {
            case "pack-1":
                return { label: "60 stars", stars: 60, price: 0.99 }
            case "pack-2":
                return { label: "130 stars", stars: 130, price: 1.99 }
            case "pack-3":
                return { label: "200 stars", stars: 200, price: 2.99 }
            case "pack-5":
                return { label: "350 stars", stars: 350, price: 4.99 }
            case "pack-7":
                return { label: "500 stars", stars: 500, price: 6.99 }
            case "pack-infinity":
                return {
                    label:
                        infinityTerm === "year"
                            ? "Infinity (1 year)"
                            : "Infinity (1 month)",
                    stars: undefined as number | undefined,
                    price: infinityTerm === "year" ? 99.99 : 9.99,
                }
            default:
                return null
        }
    }, [mode, packId, infinityTerm])

    const subscribeMeta = useMemo(() => {
        if (mode !== "subscribe") return null
        if (plan === "annual")
            return { label: "Annual subscription", price: 99.99 }
        return { label: "Monthly subscription", price: 9.99 }
    }, [mode, plan])

    const selectedMeta = packMeta ?? subscribeMeta

    const summary = useMemo(() => {
        if (!selectedMeta) return null
        if (packMeta && typeof packMeta.stars === "number") {
            const total = packMeta.price
            const base = round2((packMeta.stars / basePerDollar) * 1)
            const discount = round2(base - total)
            return {
                label: packMeta.label,
                stars: packMeta.stars,
                base,
                discount,
                total,
            }
        }
        if (packMeta && typeof packMeta.stars !== "number") {
            const isYear = infinityTerm === "year"
            const total = isYear ? 99.99 : 9.99
            const base = isYear ? round2(monthlyPrice * 12) : monthlyPrice
            const discount = round2(base - total)
            return {
                label: packMeta.label,
                stars: undefined as number | undefined,
                base,
                discount,
                total,
            }
        }
        if (subscribeMeta) {
            const isYear = plan === "annual"
            const total = subscribeMeta.price
            const base = isYear ? round2(monthlyPrice * 12) : monthlyPrice
            const discount = round2(base - total)
            return {
                label: subscribeMeta.label,
                stars: undefined as number | undefined,
                base,
                discount,
                total,
            }
        }
        return null
    }, [selectedMeta, packMeta, subscribeMeta, infinityTerm, plan])

    const handleCheckout = async () => {
        if (!user || !summary?.total) return
        // Start creating session while staying on summary; show button loading + progress
        setCreatingSession(true)
        setProgress(5)
        if (progressTimerRef.current) {
            window.clearInterval(progressTimerRef.current)
            progressTimerRef.current = null
        }
        progressTimerRef.current = window.setInterval(() => {
            setProgress((p) => (p < 90 ? p + 3 : p))
        }, 200)
        const cached = cachedSessionRef.current
        const now = Date.now()
        if (cached && now < cached.expiresAtMs) {
            try {
                const checkout = await loadCheckoutWebComponents({
                    paymentSession: cached.session,
                    publicKey: process.env
                        .NEXT_PUBLIC_CHECKOUT_PUBLIC_KEY as string,
                    environment: "sandbox",
                    appearance,
                    onPaymentCompleted: async (_component, payment) => {
                        const added =
                            typeof packMeta?.stars === "number"
                                ? packMeta.stars
                                : 0
                        const prev = typeof stars === "number" ? stars : 0
                        const newBal = prev + added
                        if (added > 0) setStarsBalance(newBal)
                        setPaymentResult({
                            status: "success",
                            added,
                            newBalance: newBal,
                        })
                        try {
                            if (user && summary?.total) {
                                const providerPaymentId = payment?.id ?? null
                                const transactionType =
                                    mode === "subscribe"
                                        ? "subscription_initial"
                                        : "one_time"
                                await fetch(
                                    "/api/billing/transactions/record",
                                    {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            userId: user.id,
                                            type: transactionType,
                                            amountUsd: summary.total,
                                            currency: "USD",
                                            reference: summary.label,
                                            provider: "checkout_com",
                                            providerPaymentId,
                                        }),
                                    }
                                )
                            }
                        } catch {}
                        swiperRef.current?.swiper.slideTo(2) // success slide
                    },
                })
                const flow = checkout?.create("flow")
                const container =
                    flowContainerRef.current ||
                    document.getElementById("flow-container")
                if (flow && container) {
                    flow.mount(container)
                    setProgress(100)
                    if (progressTimerRef.current) {
                        window.clearInterval(progressTimerRef.current)
                        progressTimerRef.current = null
                    }
                    window.setTimeout(() => {
                        setCreatingSession(false)
                        swiperRef.current?.swiper.slideTo(1)
                    }, 2000)
                }
            } catch {}
            return
        }

        try {
            type UserMeta = { user_metadata?: { full_name?: string } }
            const u = user as unknown as UserMeta
            const response = await fetch("/api/checkout/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amountUsd: summary.total,
                    reference: summary.label,
                    currency: "USD",
                    customer: {
                        name: u.user_metadata?.full_name || user.email,
                        email: user.email,
                    },
                }),
            })
            if (!response.ok) {
                setCreatingSession(false)
                if (progressTimerRef.current) {
                    window.clearInterval(progressTimerRef.current)
                    progressTimerRef.current = null
                }
                setProgress(0)
                setPaymentResult({ status: "error" })
                swiperRef.current?.swiper.slideTo(3)

                return
            }
            const paymentSession: CheckoutSession = await response.json()
            cachedSessionRef.current = {
                session: paymentSession,
                expiresAtMs: Date.now() + 10 * 60 * 1000,
            }
            const checkout = await loadCheckoutWebComponents({
                paymentSession,
                publicKey: process.env
                    .NEXT_PUBLIC_CHECKOUT_PUBLIC_KEY as string,
                environment: "sandbox",
                appearance,
                onPaymentCompleted: async (_component, payment) => {
                    const added =
                        typeof packMeta?.stars === "number" ? packMeta.stars : 0
                    const prev = typeof stars === "number" ? stars : 0
                    const newBal = prev + added
                    if (added > 0) setStarsBalance(newBal)
                    setPaymentResult({
                        status: "success",
                        added,
                        newBalance: newBal,
                    })
                    try {
                        if (user && summary?.total) {
                            const providerPaymentId = payment?.id ?? null
                            const transactionType =
                                mode === "subscribe"
                                    ? "subscription_initial"
                                    : "one_time"
                            await fetch("/api/billing/transactions/record", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    userId: user.id,
                                    type: transactionType,
                                    amountUsd: summary.total,
                                    currency: "USD",
                                    reference: summary.label,
                                    provider: "checkout_com",
                                    providerPaymentId,
                                }),
                            })
                        }
                    } catch {}
                    swiperRef.current?.swiper.slideTo(2) // success slide
                },
            })
            const flow = checkout?.create("flow")
            const container =
                flowContainerRef.current ||
                document.getElementById("flow-container")
            if (flow && container) {
                flow.mount(container)
                if (progressTimerRef.current) {
                    window.clearInterval(progressTimerRef.current)
                    progressTimerRef.current = null
                }
                setProgress(100)
                window.setTimeout(() => {
                    setCreatingSession(false)
                    swiperRef.current?.swiper.slideTo(1)
                }, 2000)
            }
        } catch {
        } finally {
            // progress handled above
        }
    }

    if (user) {
        return (
            <Dialog
                open={open}
                onOpenChange={(v: boolean) => {
                    setOpen(v)
                    if (!v) {
                        setCurrentSlide(0)
                        swiperRef.current?.swiper.slideTo(0)
                    }
                }}
            >
                <DialogTrigger asChild>
                    {customTrigger ? (
                        <span
                            onClick={() => {
                                setCurrentSlide(0)
                                setOpen(true)
                            }}
                        >
                            {customTrigger}
                        </span>
                    ) : (
                        <Button
                            className={`w-full rounded-full bg-white text-black hover:brightness-90`}
                            onClick={() => {
                                setCurrentSlide(0)
                                setOpen(true)
                            }}
                        >
                            {mode === "pack" ? t("purchase") : t("subscribe")}
                        </Button>
                    )}
                </DialogTrigger>
                <StarsDialog
                    className={`${
                        currentSlide === 0 ? "overflow-y-hidden" : ""
                    } relative max-w-lg w-[92vw] border border-yellow-400/20 overflow-x-hidden bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.35)]`}
                >
                    <DialogHeader className='mb-3'>
                        <DialogTitle className='text-yellow-300 font-serif text-xl'>
                            {t("checkout")}
                        </DialogTitle>
                    </DialogHeader>

                    <Swiper
                        ref={swiperRef}
                        effect='fade'
                        allowTouchMove={false}
                        onSlideChange={(swiper) => {
                            setCurrentSlide(swiper.activeIndex)
                            scrollToTop()
                        }}
                        className='w-full'
                        style={{ height: "auto" }}
                        autoHeight={true}
                    >
                        {/* Summary Slide */}
                        {summary && (
                            <SwiperSlide className='overflow-y-hidden'>
                                <Summary
                                    summary={summary}
                                    progress={progress}
                                />
                            </SwiperSlide>
                        )}

                        {/* Payment Slide */}
                        <SwiperSlide>
                            <Payment
                                summary={
                                    summary
                                        ? {
                                              label: summary.label,
                                              total: summary.total,
                                          }
                                        : null
                                }
                                flowContainerRef={flowContainerRef}
                            />
                        </SwiperSlide>

                        {/* Success Slide */}
                        <SwiperSlide>
                            <Success paymentResult={paymentResult} />
                        </SwiperSlide>

                        {/* Failure Slide */}
                        <SwiperSlide>
                            <Failure />
                        </SwiperSlide>
                    </Swiper>
                    <DialogFooter>
                        {currentSlide === 0 && (
                            <Button
                                className='w-full rounded-full bg-white text-black hover:brightness-95 hover:bg-yellow-400 hover:text-black disabled:opacity-70 disabled:cursor-not-allowed'
                                onClick={() => handleCheckout()}
                                disabled={creatingSession}
                            >
                                {creatingSession ? t("loading") : t("checkout")}
                            </Button>
                        )}
                        {currentSlide === 2 && (
                            <Button
                                className='w-full rounded-full bg-blue-500 text-black hover:bg-blue-400'
                                onClick={() => setOpen(false)}
                            >
                                {t("done")}
                            </Button>
                        )}
                        {currentSlide !== 0 && currentSlide !== 2 && (
                            <div className='flex w-full gap-2'>
                                <Button
                                    variant='outline'
                                    className='w-32'
                                    onClick={() => {
                                        swiperRef.current?.swiper.slideTo(0)
                                    }}
                                >
                                    {t("back")}
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </StarsDialog>
            </Dialog>
        )
    }
    return customTrigger ? (
        <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
            <span>{customTrigger}</span>
        </Link>
    ) : (
        <Link href={`/signin?callbackUrl=${encodeURIComponent("/pricing")}`}>
            <Button
                className={`w-full rounded-full bg-white text-black hover:brightness-90`}
            >
                {t("signInToSubscribe")}
            </Button>
        </Link>
    )
}

const appearance = {
    colorAction: "#EAB308",
    colorBackground: "#0A0A1A",
    colorBorder: "#EAB308",
    colorDisabled: "#64646E",
    colorError: "#FF3300",
    colorFormBackground: "#0D0B1F",
    colorFormBorder: "#0D0B1F",
    colorInverse: "#0A0A0C",
    colorOutline: "#FACC15",
    colorPrimary: "#F9F9FB",
    colorSecondary: "#A3A3A7",
    colorSuccess: "#22C55E",
    button: {
        fontFamily:
            '"Roboto Mono", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif',
        fontSize: "16px",
        fontWeight: 700,
        letterSpacing: 0,
        lineHeight: "24px",
    },
    footnote: {
        fontFamily:
            '"PT Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif',
        fontSize: "14px",
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: "20px",
    },
    label: {
        fontFamily:
            '"Roboto Mono", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif',
        fontSize: "14px",
        fontWeight: 400,
        letterSpacing: 0,
        lineHeight: "20px",
    },
    subheading: {
        fontFamily:
            '"Roboto Mono", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif',
        fontSize: "16px",
        fontWeight: 700,
        letterSpacing: 0,
        lineHeight: "24px",
    },
    borderRadius: ["12px", "12px"] as [string, string],
}
