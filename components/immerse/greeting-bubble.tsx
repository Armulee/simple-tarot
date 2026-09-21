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

            {/* Tail. A real triangle, sitting entirely outside the bubble —
                a rotated square half-overlapping it showed as a diamond,
                because the bubble is translucent and the overlap painted 35%
                violet over 35% violet.

                The path is open rather than closed, so the fill covers the
                implied triangle while the stroke follows only the two slanted
                edges and draws no line across the base.

                Colours come from Tailwind's own theme variables through the
                same color-mix its opacity modifiers compile to, so the tail is
                an exact match for the bubble and follows it if that changes.
                The backdrop blur is clipped to the same triangle, because
                backdrop-filter otherwise applies to the element's box and
                would blur a rectangle around the tail; without it the fill
                read darker than the bubble, since the bubble softens what is
                behind it and the tail did not.

                10px tall and flush, which is the offset the bubble's own
                position assumes to land this tip on Astra's chin. It points at
                wherever she actually is, and that flips with the crop: on a
                phone the bubble sits below her face, on a wide viewport it
                sits up and to her left. */}
            <svg
                aria-hidden
                width="20"
                height="10"
                viewBox="0 0 20 10"
                fill="none"
                className="absolute -top-[10px] right-7 backdrop-blur-md [clip-path:polygon(50%_0%,100%_100%,0%_100%)] md:-bottom-[10px] md:top-auto md:rotate-180"
            >
                <path
                    d="M1 10 L10 1 L19 10"
                    fill="color-mix(in oklab, var(--color-violet-500) 35%, transparent)"
                    stroke="color-mix(in oklab, var(--color-violet-300) 45%, transparent)"
                    strokeWidth="1"
                    strokeLinejoin="round"
                />
            </svg>
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
