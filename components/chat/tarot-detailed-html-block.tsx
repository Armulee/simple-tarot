"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { sanitizeTarotDetailedHtml } from "@/lib/tarot/sanitize-detailed-html"

type TarotDetailedHtmlBlockProps = {
    /** Raw HTML from the model (already unmasked for display). */
    html: string
    /** When true and there is no usable HTML yet, show a compact loader. */
    showLoadingPlaceholder?: boolean
}

/**
 * Renders sanitized tarot “detailed” HTML with a warm gold-forward palette.
 */
export function TarotDetailedHtmlBlock({
    html,
    showLoadingPlaceholder = false,
}: TarotDetailedHtmlBlockProps) {
    const [safe, setSafe] = useState("")

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const next = await sanitizeTarotDetailedHtml(html)
            if (!cancelled) setSafe(next)
        })()
        return () => {
            cancelled = true
        }
    }, [html])

    if (!safe.trim() && showLoadingPlaceholder) {
        return (
            <div
                className='flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/25 via-amber-900/10 to-yellow-950/5 px-4 py-4 text-amber-100/70'
                aria-busy
                aria-label='Loading detailed interpretation'
            >
                <Loader2 className='h-4 w-4 shrink-0 animate-spin text-amber-400/90' />
                <span className='text-sm'>…</span>
            </div>
        )
    }

    if (!safe.trim()) return null

    return (
        <div className='rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/35 via-amber-900/15 to-yellow-950/10 px-4 py-4 shadow-[0_10px_36px_-20px_rgba(251,191,36,0.35)]'>
            <div
                className='tarot-detailed-html space-y-3 text-[15px] leading-7 text-amber-50/95 [&_b]:text-amber-50 [&_em]:text-amber-100/85 [&_i]:text-amber-100/85 [&_li]:my-1 [&_mark]:rounded-md [&_mark]:bg-amber-400/22 [&_mark]:px-1.5 [&_mark]:py-0.5 [&_mark]:text-amber-50 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_ol]:marker:text-amber-400/90 [&_p]:my-2 [&_p]:first:mt-0 [&_p]:last:mb-0 [&_strong]:font-semibold [&_strong]:text-amber-100 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:marker:text-amber-400/85'
                dangerouslySetInnerHTML={{ __html: safe }}
            />
        </div>
    )
}
