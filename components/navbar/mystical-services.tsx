import { ArrowUpAZ, BookOpen, Hash, Star, Palette } from "lucide-react"

const mysticalServices = [
    {
        id: "tarot",
        href: "/",
        label: "Tarot",
        Icon: BookOpen,
        available: true,
    },
    {
        id: "astrology",
        href: "#",
        label: "Astrology",
        Icon: Star,
        available: false,
    },
    {
        id: "horoscope",
        href: "#",
        label: "Horoscope",
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
] as const

export default mysticalServices
