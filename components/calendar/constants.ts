import {
    Activity,
    Briefcase,
    Coins,
    Heart,
    Sparkles,
    Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { DayQuality, Vitality } from "@/lib/calendar-helper"
import { getStarField } from "@/lib/calendar-helper"

export const WEEKDAY_KEYS = [
    "sun",
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
] as const

type VitalityCategory = keyof Vitality

export const VITALITY_META: Array<{
    key: VitalityCategory
    Icon: LucideIcon
    barFrom: string
    barTo: string
    iconBg: string
    iconText: string
}> = [
    {
        key: "career",
        Icon: Briefcase,
        barFrom: "from-indigo-400",
        barTo: "to-blue-400",
        iconBg: "bg-indigo-500/15 ring-indigo-300/30",
        iconText: "text-indigo-200",
    },
    {
        key: "love",
        Icon: Heart,
        barFrom: "from-rose-400",
        barTo: "to-pink-400",
        iconBg: "bg-rose-500/15 ring-rose-300/30",
        iconText: "text-rose-200",
    },
    {
        key: "finance",
        Icon: Coins,
        barFrom: "from-amber-400",
        barTo: "to-yellow-300",
        iconBg: "bg-amber-500/15 ring-amber-300/30",
        iconText: "text-amber-200",
    },
    {
        key: "health",
        Icon: Activity,
        barFrom: "from-emerald-400",
        barTo: "to-teal-300",
        iconBg: "bg-emerald-500/15 ring-emerald-300/30",
        iconText: "text-emerald-200",
    },
    {
        key: "social",
        Icon: Users,
        barFrom: "from-sky-400",
        barTo: "to-cyan-300",
        iconBg: "bg-sky-500/15 ring-sky-300/30",
        iconText: "text-sky-200",
    },
    {
        key: "spiritual",
        Icon: Sparkles,
        barFrom: "from-violet-400",
        barTo: "to-purple-300",
        iconBg: "bg-violet-500/15 ring-violet-300/30",
        iconText: "text-violet-200",
    },
]

export const COLOR_HEX_MAP: Record<string, string> = {
    ทอง: "#f5c14e",
    เงิน: "#cbd5e1",
    ม่วง: "#a78bfa",
    ฟ้า: "#7dd3fc",
    เขียวมรกต: "#34d399",
    แดงเลือดหมู: "#b91c1c",
    ขาวมุก: "#f8fafc",
    ชมพูกุหลาบ: "#f9a8d4",
    น้ำตาลทอง: "#b45309",
    เหลืองมัสตาร์ด: "#facc15",
    ฟ้าคราม: "#3b82f6",
    เขียวน้ำทะเล: "#10b981",
    ส้มอำพัน: "#f59e0b",
}

export const DIRECTION_DEG: Record<string, number> = {
    ทิศเหนือ: 0,
    ทิศตะวันออกเฉียงเหนือ: 45,
    ทิศตะวันออก: 90,
    ทิศตะวันออกเฉียงใต้: 135,
    ทิศใต้: 180,
    ทิศตะวันตกเฉียงใต้: 225,
    ทิศตะวันตก: 270,
    ทิศตะวันตกเฉียงเหนือ: 315,
}

export const QUALITY_ACCENT: Record<
    DayQuality,
    { stroke: string; from: string; to: string }
> = {
    excellent: {
        stroke: "#fcd34d",
        from: "from-amber-300",
        to: "to-amber-100",
    },
    good: {
        stroke: "#6ee7b7",
        from: "from-emerald-300",
        to: "to-teal-100",
    },
    neutral: { stroke: "#cbd5e1", from: "from-slate-200", to: "to-white" },
    caution: {
        stroke: "#fdba74",
        from: "from-orange-300",
        to: "to-amber-100",
    },
    avoid: { stroke: "#fca5a5", from: "from-red-300", to: "to-rose-100" },
}

export const STAR_FIELD = getStarField(7, 56)
