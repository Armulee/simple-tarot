"use client"

import { useService } from "@/contexts/service-context"
import { useTranslations } from "next-intl"

const items = [
    { id: "tarot" },
    { id: "astrology" },
    { id: "horoscope" },
    { id: "numerology" },
    { id: "namelogy" },
    { id: "luckyColors" },
] as const

export default function HomeFeaturesGrid() {
    const t = useTranslations("Home")
    const { setActiveService } = useService()

    const handleClick = (id: string) => {
        setActiveService(id as any)
        const el = document.getElementById("interactive")
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {items.map(({ id }) => (
                <button
                    key={id}
                    onClick={() => handleClick(id)}
                    className='group block text-left rounded-xl border border-white/10 bg-card/30 p-5 hover:bg-card/50 transition-colors'
                >
                    <div className='font-semibold text-white mb-1'>
                        {t(`features.items.${id}.title` as any)}
                    </div>
                    <div className='text-sm text-white/70'>
                        {t(`features.items.${id}.desc` as any)}
                    </div>
                </button>
            ))}
        </div>
    )
}

