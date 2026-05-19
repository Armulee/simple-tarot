"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { AlertCircle } from "lucide-react"
import type { PaywallNotice } from "@/components/chat/types"

type PaywallBlockProps = {
    data: PaywallNotice
}

export default function PaywallBlock({ data }: PaywallBlockProps) {
    const t = useTranslations("HoroscopeChat")
    const locale = useLocale()
    const upgradeHref = `/${locale}/billing`

    const title =
        data.reason === "other_person"
            ? t("paywallOtherPersonTitle")
            : t("paywallOtherPersonTitle")
    const body =
        data.reason === "other_person"
            ? t("paywallOtherPersonBody")
            : t("paywallOtherPersonBody")

    return (
        <div
            role='alert'
            className='flex w-full flex-col gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-red-100 shadow-[0_0_24px_-12px_rgba(248,113,113,0.55)] backdrop-blur-sm'
        >
            <div className='flex items-start gap-3'>
                <span className='mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-300/50 bg-red-500/20'>
                    <AlertCircle className='h-3.5 w-3.5 text-red-200' />
                </span>
                <div className='flex flex-col gap-1'>
                    <p className='text-sm font-semibold text-red-50'>{title}</p>
                    <p className='text-xs leading-relaxed text-red-100/90'>
                        {body}
                    </p>
                </div>
            </div>
            <Link
                href={upgradeHref}
                className='inline-flex h-8 w-fit items-center gap-1.5 rounded-full border border-red-300/50 bg-red-500/20 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-50 transition hover:bg-red-500/30'
            >
                {t("paywallUpgradeCta")}
            </Link>
        </div>
    )
}
