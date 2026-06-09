"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

export function ConsultingBadge({ label }: { label?: string }) {
    const t = useTranslations("Home")
    const [dots, setDots] = useState(1)

    useEffect(() => {
        const interval = window.setInterval(() => {
            setDots((prev) => (prev >= 3 ? 1 : prev + 1))
        }, 500)
        return () => window.clearInterval(interval)
    }, [])

    return (
        <div className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 px-4 py-2 backdrop-blur-xl shadow-[0_0_20px_-5px_rgba(56,189,248,0.3)]'>
            <Loader2 className='h-4 w-4 text-primary animate-spin shrink-0' />
            <span className='text-sm font-medium text-white/90'>
                {`${label ?? t("consulting")}${".".repeat(dots)}`}
            </span>
        </div>
    )
}
