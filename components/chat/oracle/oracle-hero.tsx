"use client"

import { FaWandMagicSparkles } from "react-icons/fa6"
import { PiSparkleFill } from "react-icons/pi"
import { Moon } from "lucide-react"

import type { StreamingOracleReading } from "@/lib/chat/oracle-reading-schema"
import { cn } from "@/lib/utils"

type OracleHeroProps = {
    reading: StreamingOracleReading | null | undefined
    isLoading?: boolean
}

const ENERGY_FALLBACK_LABEL: Record<string, string> = {
    reflection: "Reflection & Inner Wisdom",
    transformation: "Transformation",
    letting_go: "Letting Go",
    new_beginnings: "New Beginnings",
    hidden_truths: "Hidden Truths",
    patience: "Patience",
    healing: "Healing",
    self_discovery: "Self Discovery",
    divine_timing: "Divine Timing",
    emotional_release: "Emotional Release",
    intuition: "Intuition",
    alignment: "Alignment",
    courage: "Courage",
    boundary: "Boundary",
    gratitude: "Gratitude",
}

/**
 * Premium-feel oracle reading card. Renders Oracle Energy → Message →
 * Deeper Meaning → Guidance bullets → optional closing whisper, all on
 * an amber/gold theme. Designed to read as a sacred reflective card,
 * not as ordinary chat prose.
 */
export default function OracleHero({ reading, isLoading }: OracleHeroProps) {
    const energy = reading?.energy
    const energyLabel =
        (reading?.energyLabel ?? "").trim() ||
        (energy ? (ENERGY_FALLBACK_LABEL[energy] ?? "") : "")
    const message = (reading?.message ?? "").trim()
    const deeperMeaning = (reading?.deeperMeaning ?? "").trim()
    const guidance = (reading?.guidance ?? []).filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
    )
    const closing = (reading?.closing ?? "").trim()

    const hasAnything =
        Boolean(energyLabel) ||
        Boolean(message) ||
        Boolean(deeperMeaning) ||
        guidance.length > 0 ||
        Boolean(closing)

    return (
        <section
            className={cn(
                "relative w-full overflow-hidden rounded-[28px] border border-amber-300/25 bg-gradient-to-b from-amber-500/10 via-[#0c0716]/60 to-[#0b0617]/70 p-5 sm:p-7",
                "shadow-[0_24px_60px_-24px_rgba(252,211,77,0.35)]",
            )}
        >
            {/* Decorative aura */}
            <div
                aria-hidden
                className='pointer-events-none absolute -top-24 left-1/2 h-56 w-[28rem] -translate-x-1/2 rounded-full bg-[radial-gradient(60%_60%_at_50%_50%,rgba(252,211,77,0.25),transparent_70%)] blur-3xl'
            />
            <div
                aria-hidden
                className='pointer-events-none absolute -bottom-24 -right-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl'
            />
            <div
                aria-hidden
                className='pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl'
            />

            <div className='relative space-y-6 text-amber-50'>
                <header className='flex flex-col items-center gap-3 text-center'>
                    <div className='inline-flex items-center justify-center gap-2'>
                        <span className='h-px w-8 bg-gradient-to-r from-transparent to-amber-300/70' />
                        <FaWandMagicSparkles className='size-3.5 text-amber-200/85' />
                        <p className='text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200/85'>
                            Oracle Energy
                        </p>
                        <PiSparkleFill className='size-3.5 text-amber-200/85' />
                        <span className='h-px w-8 bg-gradient-to-l from-transparent to-amber-300/70' />
                    </div>
                    {energyLabel ? (
                        <p className='font-serif text-xl italic leading-tight text-amber-100 sm:text-2xl'>
                            {energyLabel}
                        </p>
                    ) : isLoading ? (
                        <p className='font-serif text-xl italic leading-tight text-amber-100/40 sm:text-2xl'>
                            …
                        </p>
                    ) : null}
                </header>

                {message ? (
                    <blockquote
                        className={cn(
                            "relative mx-auto max-w-[36rem] rounded-2xl border border-amber-300/25 bg-amber-300/[0.05] px-5 py-6 text-center text-base font-medium leading-relaxed text-amber-50 sm:text-lg",
                            "shadow-[inset_0_0_24px_rgba(252,211,77,0.08)]",
                        )}
                    >
                        <span
                            aria-hidden
                            className='absolute -top-2 left-4 select-none text-3xl text-amber-300/70'
                        >
                            “
                        </span>
                        <span className='block italic'>{message}</span>
                        <span
                            aria-hidden
                            className='absolute -bottom-4 right-4 select-none text-3xl text-amber-300/70'
                        >
                            ”
                        </span>
                    </blockquote>
                ) : null}

                {deeperMeaning ? (
                    <div className='space-y-2'>
                        <SectionEyebrow icon='sparkle'>
                            Deeper Meaning
                        </SectionEyebrow>
                        <div className='space-y-3 text-[14.5px] leading-relaxed text-amber-50/90'>
                            {deeperMeaning
                                .split(/\n{2,}/)
                                .map((para, idx) => (
                                    <p key={idx}>{para}</p>
                                ))}
                        </div>
                    </div>
                ) : null}

                {guidance.length > 0 ? (
                    <div className='space-y-2'>
                        <SectionEyebrow icon='moon'>Guidance</SectionEyebrow>
                        <ul className='space-y-2 text-[14.5px] leading-relaxed text-amber-50/90'>
                            {guidance.map((item, idx) => (
                                <li
                                    key={idx}
                                    className='flex items-start gap-2.5'
                                >
                                    <span
                                        aria-hidden
                                        className='mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300/80 shadow-[0_0_8px_rgba(252,211,77,0.5)]'
                                    />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {closing ? (
                    <div className='relative pt-2'>
                        <span
                            aria-hidden
                            className='absolute left-1/2 top-0 h-px w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent'
                        />
                        <p className='text-center font-serif text-sm italic leading-relaxed text-amber-100/85'>
                            {closing}
                        </p>
                    </div>
                ) : null}

                {!hasAnything && isLoading ? (
                    <p className='text-center text-sm italic text-amber-100/50'>
                        Listening for the message…
                    </p>
                ) : null}
            </div>
        </section>
    )
}

function SectionEyebrow({
    icon,
    children,
}: {
    icon: "sparkle" | "moon"
    children: React.ReactNode
}) {
    return (
        <div className='flex items-center gap-2'>
            {icon === "sparkle" ? (
                <PiSparkleFill className='size-3.5 text-amber-300/80' />
            ) : (
                <Moon className='size-3.5 text-amber-300/80' />
            )}
            <p className='text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200/85'>
                {children}
            </p>
            <span className='h-px flex-1 bg-gradient-to-r from-amber-300/40 to-transparent' />
        </div>
    )
}
