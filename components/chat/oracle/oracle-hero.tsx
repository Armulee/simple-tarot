"use client"

import { useTranslations } from "next-intl"

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
 * Premium-feel oracle reading. The headline (Message Received) sits in
 * a soft amber pill with the energy chip beneath it. Meaning and
 * Guidance flow straight on the cosmic page background — no section
 * labels, no outer card.
 */
export default function OracleHero({ reading, isLoading }: OracleHeroProps) {
    const t = useTranslations("OracleReading")
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
        <section className='relative w-full text-amber-50'>
            <div className='relative space-y-6'>
                {message || isLoading ? (
                    <div
                        className={cn(
                            "relative mx-auto flex max-w-[36rem] flex-col items-center gap-4 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] px-5 py-8 text-center sm:py-10",
                            "shadow-[inset_0_0_28px_rgba(252,211,77,0.10)]",
                        )}
                    >
                        <span
                            aria-hidden
                            className='absolute -top-2 left-4 select-none text-3xl text-amber-300/70'
                        >
                            “
                        </span>
                        {message ? (
                            <p className='block font-serif text-2xl italic leading-tight text-amber-50 sm:text-3xl'>
                                {message}
                            </p>
                        ) : (
                            <p className='block font-serif text-2xl italic leading-tight text-amber-100/40 sm:text-3xl'>
                                …
                            </p>
                        )}
                        {energyLabel ? (
                            <span className='inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/[0.10] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-100/90'>
                                <span aria-hidden>✨</span>
                                <span className='normal-case tracking-normal text-[12px] font-medium'>
                                    {energyLabel}
                                </span>
                            </span>
                        ) : null}
                        <span
                            aria-hidden
                            className='absolute -bottom-4 right-4 select-none text-3xl text-amber-300/70'
                        >
                            ”
                        </span>
                    </div>
                ) : null}

                {deeperMeaning ? (
                    <div className='space-y-3 text-[14.5px] leading-relaxed text-amber-50/90'>
                        {deeperMeaning.split(/\n{2,}/).map((para, idx) => (
                            <p key={idx}>{para}</p>
                        ))}
                    </div>
                ) : null}

                {guidance.length > 0 ? (
                    <ul className='space-y-2 text-[14.5px] leading-relaxed text-amber-50/90'>
                        {guidance.map((item, idx) => (
                            <li key={idx} className='flex items-start gap-2.5'>
                                <span
                                    aria-hidden
                                    className='mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300/80 shadow-[0_0_8px_rgba(252,211,77,0.5)]'
                                />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
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
                        {t("listening")}
                    </p>
                ) : null}
            </div>
        </section>
    )
}
