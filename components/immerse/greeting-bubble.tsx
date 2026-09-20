"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

/**
 * Astra's opening line, as a glass speech bubble anchored near her.
 *
 * This carries the page's <h1>: the copy is the same "Ask me anything about
 * your destiny" the legacy hero used, so the crawlable heading survives the
 * redesign without rendering both landing modes.
 */
export function GreetingBubble({ hidden }: { hidden?: boolean }) {
    const t = useTranslations("Immerse")
    return (
        <div
            className={cn(
                "max-w-[17rem] rounded-3xl rounded-bl-lg border border-white/15 bg-white/10 px-5 py-4 shadow-xl backdrop-blur-md transition-opacity duration-500 sm:max-w-xs",
                hidden ? "pointer-events-none opacity-0" : "opacity-100",
            )}
        >
            <h1 className="text-lg leading-snug font-medium text-white drop-shadow sm:text-xl">
                {t("greetingName")}
                <span className="block font-normal text-white/85">
                    {t("greetingAsk")}
                </span>
            </h1>
            <Waveform />
        </div>
    )
}

/** Decorative "voice" bars under the greeting. Purely ornamental. */
function Waveform() {
    const bars = [0.35, 0.7, 1, 0.55, 0.85, 0.4, 0.65, 0.3]
    return (
        <div
            aria-hidden
            className="mt-3 flex h-4 items-center justify-center gap-[3px]"
        >
            {bars.map((scale, i) => (
                <span
                    key={i}
                    className="w-[3px] rounded-full bg-white/70"
                    style={{
                        height: `${scale * 100}%`,
                        animation: `breathe 1.8s ease-in-out ${i * 0.12}s infinite`,
                    }}
                />
            ))}
        </div>
    )
}
