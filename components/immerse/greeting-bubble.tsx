"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

/**
 * Astra's opening line, as a small violet speech bubble beside her with a tail
 * pointing back at her — so it reads as something she is saying rather than a
 * caption laid over the artwork.
 *
 * This carries the page's <h1>: the copy is the same "Ask me anything about
 * your destiny" the legacy hero used, so the crawlable heading survives the
 * redesign.
 */
export function GreetingBubble({ hidden }: { hidden?: boolean }) {
    const t = useTranslations("Immerse")
    return (
        <div
            className={cn(
                "relative max-w-[15rem] rounded-xl border border-violet-300/45 bg-violet-500/35 px-4 py-3 shadow-[0_8px_32px_-8px_rgba(109,74,255,0.6)] backdrop-blur-md transition-opacity duration-500 sm:max-w-[17rem]",
                hidden ? "pointer-events-none opacity-0" : "opacity-100",
            )}
        >
            <h1 className="text-sm leading-snug font-medium text-white drop-shadow sm:text-base">
                {t("greetingName")}
                <span className="mt-0.5 block font-normal text-white/90">
                    {t("greetingAsk")}
                </span>
            </h1>
            <Waveform />

            {/* Tail — a rotated square sharing the bubble's fill and border,
                with its inner edges hidden behind the bubble. It has to point
                at wherever Astra actually is, and that flips with the crop:
                on a phone the bubble sits below her face, on a wide viewport
                it sits up and to her left. */}
            <span
                aria-hidden
                className="absolute -top-[7px] right-7 h-3.5 w-3.5 rotate-45 rounded-[3px] border-l border-t border-violet-300/45 bg-violet-500/35 backdrop-blur-md md:bottom-[-7px] md:top-auto md:border-l-0 md:border-t-0 md:border-b md:border-r"
            />
        </div>
    )
}

/** Decorative "voice" bars under the greeting. Purely ornamental. */
function Waveform() {
    const bars = [0.35, 0.7, 1, 0.55, 0.85, 0.4, 0.65, 0.3]
    return (
        <div
            aria-hidden
            className="mt-2 flex h-3.5 items-center justify-center gap-[3px]"
        >
            {bars.map((scale, i) => (
                <span
                    key={i}
                    className="w-[3px] rounded-full bg-white/75"
                    style={{
                        height: `${scale * 100}%`,
                        animation: `breathe 1.8s ease-in-out ${i * 0.12}s infinite`,
                    }}
                />
            ))}
        </div>
    )
}
