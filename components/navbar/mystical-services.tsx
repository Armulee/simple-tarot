import { ArrowUpAZ, BookOpen, Hash, Star, Palette } from "lucide-react"

const mysticalServices = [
    { href: "/", label: "Tarot", Icon: BookOpen, available: true },
    { href: "#", label: "Astrology", Icon: Star, available: false },
    { href: "#", label: "Namelogy", Icon: ArrowUpAZ, available: false },
    { href: "#", label: "Numerology", Icon: Hash, available: false },
    { href: "#", label: "Lucky Colors", Icon: Palette, available: false },
] as const

export default mysticalServices
