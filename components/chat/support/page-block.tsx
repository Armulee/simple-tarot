"use client"

import { Link } from "@/i18n/navigation"
import { ArrowRight } from "lucide-react"
import type { SupportBlockPayload } from "@/components/chat/types"
import { SupportIcon } from "./icon-map"

type Props = {
    payload: Extract<SupportBlockPayload, { kind: "page" | "article" }>
    ctaLabel?: string
}

export function PageBlock({ payload, ctaLabel = "Open page" }: Props) {
    return (
        <Link
            href={payload.href}
            className='group relative block w-full md:max-w-[85%] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-primary/50 hover:bg-white/[0.06]'
        >
            <div className='flex items-start gap-3'>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary'>
                    <SupportIcon iconId={payload.iconId} className='h-5 w-5' />
                </div>
                <div className='flex-1 min-w-0'>
                    <h4 className='text-sm font-semibold text-white truncate'>
                        {payload.title}
                    </h4>
                    <p className='mt-1 text-xs text-white/70 leading-relaxed line-clamp-3'>
                        {payload.description}
                    </p>
                    <div className='mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary group-hover:text-primary/80'>
                        {ctaLabel}
                        <ArrowRight className='h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5' />
                    </div>
                </div>
            </div>
        </Link>
    )
}
