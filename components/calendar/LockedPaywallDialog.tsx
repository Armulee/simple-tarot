"use client"

import { Crown, Sparkles } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import type { CalendarPlanTier } from "@/lib/calendar/access-window"
import {
    formatCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"
import { getPlanPrice } from "@/lib/payments/subscription-plans"
import { formatFullDate } from "./utils"

export function LockedPaywallDialog({
    open,
    onOpenChange,
    planTier,
    lockedDate,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    planTier: CalendarPlanTier
    lockedDate: Date | null
}) {
    const t = useTranslations("Calendar")
    const locale = useLocale()
    const currency: CurrencyCode = locale === "th" ? "THB" : "USD"
    const targetTier = planTier === "basic" ? "pro" : "basic"
    const subscribeHash =
        targetTier === "basic" ? "subscribe-basic" : "subscribe-pro"
    const bodyKey =
        planTier === "basic" ? "locked.bodyBasic" : "locked.bodyFree"
    const ctaKey = planTier === "basic" ? "locked.ctaBasic" : "locked.ctaFree"
    const priceAmount = getPlanPrice(targetTier, "monthly", currency)
    const priceLabel = formatCurrency(priceAmount, currency, locale).replace(
        /^US(?=\$)/,
        "",
    )

    const formattedDate = lockedDate ? formatFullDate(locale, lockedDate) : null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-md w-[92vw] overflow-hidden border border-amber-300/30 bg-gradient-to-br from-[#0b0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(252,211,77,0.35)]'>
                <div className='pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl' />
                <div className='pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl' />

                <DialogHeader className='relative space-y-2 text-left'>
                    <div className='flex items-center gap-3'>
                        <span className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/40 shadow-[0_0_24px_-6px_rgba(252,211,77,0.5)]'>
                            <Crown className='h-5 w-5' />
                        </span>
                        <DialogTitle className='font-serif italic text-xl text-white leading-tight'>
                            {t("locked.title")}
                        </DialogTitle>
                    </div>
                    {formattedDate ? (
                        <div className='text-[11px] uppercase tracking-[0.22em] text-amber-200/80'>
                            {formattedDate}
                        </div>
                    ) : null}
                    <DialogDescription className='text-sm text-white/75 leading-relaxed'>
                        {t(bodyKey, { price: priceLabel })}
                    </DialogDescription>
                </DialogHeader>

                {planTier === "free" ? (
                    <p className='relative text-xs text-white/55 leading-relaxed'>
                        {t("locked.noteFree")}
                    </p>
                ) : null}

                <Link
                    href={`/stars#${subscribeHash}`}
                    onClick={() => onOpenChange(false)}
                    className='relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-medium text-black hover:bg-amber-200 transition-colors shadow-[0_8px_24px_-8px_rgba(252,211,77,0.6)]'
                >
                    <Sparkles className='h-4 w-4' />
                    {t(ctaKey)}
                </Link>
            </DialogContent>
        </Dialog>
    )
}
