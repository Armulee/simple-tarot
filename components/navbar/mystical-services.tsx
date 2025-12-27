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
        href: "/?service=birthChart",
        label: "Birth Chart",
        Icon: Calendar,
        available: true,
    },
    {
        id: "astrology",
        href: "/?service=astrology",
        label: "Astrology",
        Icon: Star,
        available: true,
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
