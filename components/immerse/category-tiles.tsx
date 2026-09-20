"use client"

import { Orbit, Sparkles, Sun, Wand2 } from "lucide-react"
import { useTranslations } from "next-intl"

const TILES = [
    { id: "tarot", Icon: Sparkles },
    { id: "birthChart", Icon: Orbit },
    { id: "horoscope", Icon: Sun },
    { id: "oracle", Icon: Wand2 },
] as const

export type TileId = (typeof TILES)[number]["id"]

/**
 * The four ways in. Tapping one fills the composer with that starter question
 * rather than navigating, so the conversation always begins with Astra.
 */
export function CategoryTiles({
    onPick,
}: {
    onPick: (question: string) => void
}) {
    const t = useTranslations("Immerse")
    return (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
            {TILES.map(({ id, Icon }) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => onPick(t(`tiles.${id}.question`))}
                    className="group flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2 text-center transition-colors hover:bg-white/5"
                >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/8 backdrop-blur-md transition-colors group-hover:border-white/30 group-hover:bg-white/15 sm:h-14 sm:w-14">
                        <Icon className="h-5 w-5 text-white/90 sm:h-6 sm:w-6" />
                    </span>
                    <span className="text-xs font-semibold text-white sm:text-sm">
                        {t(`tiles.${id}.label`)}
                    </span>
                    <span className="text-[10px] leading-tight text-white/55 sm:text-xs">
                        {t(`tiles.${id}.subtitle`)}
                    </span>
                </button>
            ))}
        </div>
    )
}
