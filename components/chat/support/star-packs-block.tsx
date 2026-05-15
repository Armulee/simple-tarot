"use client"

import { useTranslations } from "next-intl"
import { ArrowRight, Star } from "lucide-react"
import { Link } from "@/i18n/navigation"
import type { SupportBlockPayload } from "@/components/chat/types"
import { useSupportBlockTopicCopy } from "./use-support-block-topic-copy"

export function StarPacksBlock({
    payload,
}: {
    payload: Extract<SupportBlockPayload, { kind: "star-packs" }>
}) {
    const t = useTranslations("Pricing")
    const tStars = useTranslations("Stars")
    const { title, description } = useSupportBlockTopicCopy(payload)
    return (
        <div className='w-full md:max-w-[85%] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3'>
            <div className='flex items-center gap-3'>
                <span className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/15 border border-yellow-400/25 text-yellow-300'>
                    <Star className='h-5 w-5 fill-current' />
                </span>
                <div className='min-w-0'>
                    <h4 className='text-sm font-semibold text-white truncate'>
                        {title}
                    </h4>
                    <p className='mt-1 text-xs text-white/65 line-clamp-2'>
                        {description}
                    </p>
                </div>
            </div>

            <ul className='space-y-1.5 text-xs text-white/80'>
                <li className='flex items-start gap-2'>
                    <span className='mt-1.5 h-1 w-1 rounded-full bg-yellow-300 shrink-0' />
                    {t("howFastStarsAnswer")}
                </li>
                <li className='flex items-start gap-2'>
                    <span className='mt-1.5 h-1 w-1 rounded-full bg-yellow-300 shrink-0' />
                    {t("pricingFaq.addonsAnswer")}
                </li>
            </ul>

            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                <Link
                    href={payload.href}
                    className='group inline-flex items-center justify-center gap-1.5 flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90'
                >
                    {tStars("addStars")}
                    <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
                </Link>
                <Link
                    href='/pricing'
                    className='group inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/85 hover:text-white hover:border-white/30'
                >
                    {t("subscriptionPlans")}
                </Link>
            </div>
        </div>
    )
}
