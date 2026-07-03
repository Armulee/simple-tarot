import {
    Home,
    Info,
    DollarSign,
    BookOpen,
    MessageSquare,
    ShieldCheck,
    FileText,
    type LucideIcon,
} from "lucide-react"

/** A top-level navigation entry shared by the mobile drawer and desktop sidebar. */
export type PrimaryNavItem = {
    href: string
    icon: LucideIcon
    /** Key in the "Sidebar" i18n namespace. */
    labelKey:
        | "home"
        | "about"
        | "pricing"
        | "articles"
        | "contactSupport"
        | "privacyPolicy"
        | "termsOfService"
    /** How to decide the active state against the current pathname. */
    match: "exact" | "startsWith"
}

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
    { href: "/", icon: Home, labelKey: "home", match: "exact" },
    { href: "/about", icon: Info, labelKey: "about", match: "exact" },
    { href: "/pricing", icon: DollarSign, labelKey: "pricing", match: "exact" },
    { href: "/articles", icon: BookOpen, labelKey: "articles", match: "startsWith" },
    {
        href: "/contact",
        icon: MessageSquare,
        labelKey: "contactSupport",
        match: "exact",
    },
    {
        href: "/privacy-policy",
        icon: ShieldCheck,
        labelKey: "privacyPolicy",
        match: "exact",
    },
    {
        href: "/terms-of-service",
        icon: FileText,
        labelKey: "termsOfService",
        match: "exact",
    },
]

export function isPrimaryNavActive(
    item: PrimaryNavItem,
    pathname: string,
): boolean {
    return item.match === "exact"
        ? pathname === item.href
        : pathname.startsWith(item.href)
}
