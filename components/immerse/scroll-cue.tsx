"use client"

import { ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"

/** "Scroll to explore" affordance pointing at the section below the fold. */
export function ScrollCue({ targetId }: { targetId: string }) {
    const t = useTranslations("Immerse")
    return (
        <button
            type="button"
            onClick={() =>
                document
                    .getElementById(targetId)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="mx-auto flex flex-col items-center gap-1 text-white/55 transition-colors hover:text-white/85"
        >
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">
                {t("scrollToExplore")}
            </span>
            <ChevronDown
                className="h-5 w-5"
                style={{ animation: "float 2.4s ease-in-out infinite" }}
            />
        </button>
    )
}
