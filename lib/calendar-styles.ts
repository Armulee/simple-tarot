import type { DayQuality } from "@/lib/calendar-helper"

export const qualityBg: Record<DayQuality, string> = {
    excellent:
        "bg-gradient-to-br from-amber-400/30 via-amber-300/15 to-transparent ring-1 ring-amber-300/40 shadow-[0_0_24px_-8px] shadow-amber-300/40",
    good: "bg-gradient-to-br from-emerald-400/25 via-teal-300/10 to-transparent ring-1 ring-emerald-300/30",
    neutral: "bg-white/[0.04] ring-1 ring-white/10",
    caution:
        "bg-gradient-to-br from-orange-400/25 via-amber-500/10 to-transparent ring-1 ring-orange-300/30",
    avoid: "bg-gradient-to-br from-red-500/25 via-rose-400/10 to-transparent ring-1 ring-red-400/40",
}

export const qualityDot: Record<DayQuality, string> = {
    excellent: "bg-amber-300",
    good: "bg-emerald-300",
    neutral: "bg-white/50",
    caution: "bg-orange-300",
    avoid: "bg-red-400",
}

export const qualityPill: Record<DayQuality, string> = {
    excellent: "bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/40",
    good: "bg-emerald-300/15 text-emerald-200 ring-1 ring-emerald-300/30",
    neutral: "bg-white/10 text-white/80 ring-1 ring-white/15",
    caution: "bg-orange-300/15 text-orange-200 ring-1 ring-orange-300/30",
    avoid: "bg-red-400/15 text-red-200 ring-1 ring-red-400/30",
}

export const qualityNumber: Record<DayQuality, string> = {
    excellent: "text-amber-200",
    good: "text-emerald-200",
    neutral: "text-white/90",
    caution: "text-orange-200",
    avoid: "text-red-200",
}

export const qualityLabelTh: Record<DayQuality, string> = {
    excellent: "วันมงคล",
    good: "วันดี",
    neutral: "วันปกติ",
    caution: "ระวัง",
    avoid: "ควรเลี่ยง",
}

export const severityClass: Record<"low" | "medium" | "high", string> = {
    low: "text-yellow-300",
    medium: "text-orange-300",
    high: "text-red-300",
}
