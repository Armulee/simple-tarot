"use client"

import {
    BookOpen,
    Compass,
    CreditCard,
    HelpCircle,
    Info,
    LogIn,
    Mail,
    MessageCircleQuestion,
    Moon,
    Settings,
    Share2,
    Shield,
    Sparkles,
    Star,
    User,
    UserPlus,
    Users,
    Gamepad2,
    type LucideIcon,
} from "lucide-react"

export const SUPPORT_ICON_MAP: Record<string, LucideIcon> = {
    sparkles: Sparkles,
    mail: Mail,
    help: HelpCircle,
    faq: MessageCircleQuestion,
    book: BookOpen,
    gamepad: Gamepad2,
    share: Share2,
    users: Users,
    shield: Shield,
    star: Star,
    moon: Moon,
    user: User,
    settings: Settings,
    info: Info,
    "credit-card": CreditCard,
    compass: Compass,
    "log-in": LogIn,
    "user-plus": UserPlus,
}

export function SupportIcon({
    iconId,
    className,
}: {
    iconId?: string | null
    className?: string
}) {
    const Icon =
        (iconId && SUPPORT_ICON_MAP[iconId]) || SUPPORT_ICON_MAP.sparkles
    return <Icon className={className} />
}
