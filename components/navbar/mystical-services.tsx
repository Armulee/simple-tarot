import { ArrowUpAZ, BookOpen, Hash, Star, Palette, Calendar, Hand } from "lucide-react"

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
    {
        id: "palmistry",
        href: "#",
        label: "Palmistry",
        Icon: Hand,
        available: false,
    },
] as const

export default mysticalServices
