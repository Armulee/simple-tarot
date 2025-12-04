import {
    ArrowUpAZ,
    BookOpen,
    Hash,
    Star,
    Palette,
    Calendar,
    Hand,
    Heart,
} from "lucide-react"

const mysticalServices = [
    {
        id: "tarot",
        href: "/",
        label: "Tarot",
        Icon: BookOpen,
        available: true,
    },
    {
        id: "birthChart",
        href: "#",
        label: "Birth Chart",
        Icon: Calendar,
        available: false,
    },
    {
        id: "astrology",
        href: "#",
        label: "Astrology",
        Icon: Star,
        available: false,
    },
    {
        id: "namelogy",
        href: "#",
        label: "Namelogy",
        Icon: ArrowUpAZ,
        available: false,
    },
    {
        id: "numerology",
        href: "#",
        label: "Numerology",
        Icon: Hash,
        available: false,
    },
    {
        id: "luckyColors",
        href: "#",
        label: "Lucky Colors",
        Icon: Palette,
        available: false,
    },
    {
        id: "palmistry",
        href: "#",
        label: "Palmistry",
        Icon: Hand,
        available: false,
    },
    {
        id: "fatedRelations",
        href: "#",
        label: "Fated Relations",
        Icon: Heart,
        available: false,
    },
] as const

export default mysticalServices
