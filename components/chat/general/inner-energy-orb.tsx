"use client"

import type { InnerEnergyShape } from "@/lib/chat/general-reply-schema"

type InnerEnergyOrbProps = {
    shape: InnerEnergyShape
    className?: string
}

type ShapeStyle = {
    /** Background gradient used for the outer glow. */
    glow: string
    /** Border / ring color around the orb. */
    ring: string
    /** Soft drop-shadow for the inner mark. */
    shadow: string
    /** Accent color for the inner mark. */
    accent: string
}

const SHAPE_STYLES: Record<InnerEnergyShape, ShapeStyle> = {
    vortex: {
        glow: "from-indigo-400/30 via-violet-400/20 to-fuchsia-500/15",
        ring: "ring-indigo-300/40",
        shadow: "drop-shadow-[0_0_22px_rgba(129,140,248,0.55)]",
        accent: "stroke-indigo-200",
    },
    eclipse: {
        glow: "from-amber-200/25 via-orange-400/15 to-slate-900/40",
        ring: "ring-amber-200/45",
        shadow: "drop-shadow-[0_0_22px_rgba(252,211,77,0.45)]",
        accent: "stroke-amber-100",
    },
    fog: {
        glow: "from-slate-200/20 via-slate-400/15 to-slate-700/15",
        ring: "ring-slate-200/30",
        shadow: "drop-shadow-[0_0_20px_rgba(226,232,240,0.35)]",
        accent: "stroke-slate-100",
    },
    wave: {
        glow: "from-cyan-300/25 via-sky-400/18 to-indigo-500/15",
        ring: "ring-cyan-200/40",
        shadow: "drop-shadow-[0_0_22px_rgba(103,232,249,0.5)]",
        accent: "stroke-cyan-100",
    },
    flame: {
        glow: "from-rose-400/30 via-orange-400/22 to-amber-300/18",
        ring: "ring-rose-300/45",
        shadow: "drop-shadow-[0_0_22px_rgba(251,113,133,0.5)]",
        accent: "stroke-rose-100",
    },
    spiral: {
        glow: "from-violet-400/30 via-purple-400/20 to-fuchsia-400/15",
        ring: "ring-violet-300/45",
        shadow: "drop-shadow-[0_0_22px_rgba(167,139,250,0.55)]",
        accent: "stroke-violet-100",
    },
    ember: {
        glow: "from-amber-400/25 via-orange-500/18 to-red-500/14",
        ring: "ring-amber-300/40",
        shadow: "drop-shadow-[0_0_22px_rgba(251,191,36,0.45)]",
        accent: "stroke-amber-100",
    },
    tide: {
        glow: "from-teal-300/25 via-cyan-400/18 to-blue-500/15",
        ring: "ring-teal-200/40",
        shadow: "drop-shadow-[0_0_22px_rgba(94,234,212,0.45)]",
        accent: "stroke-teal-100",
    },
}

function ShapeMark({ shape, accent }: { shape: InnerEnergyShape; accent: string }) {
    const common =
        "h-full w-full overflow-visible fill-none stroke-[1.5] [stroke-linecap:round] [stroke-linejoin:round]"
    if (shape === "vortex") {
        return (
            <svg viewBox='0 0 64 64' className={`${common} ${accent}`}>
                <g className='animate-[spin_18s_linear_infinite] origin-center'>
                    <path d='M32 12 C20 12 14 20 14 30 C14 38 20 44 28 44 C34 44 38 40 38 34 C38 30 35 27 31 27 C28 27 26 29 26 32' />
                    <path d='M32 16 C24 16 20 22 20 28' opacity='0.7' />
                </g>
                <circle cx='32' cy='32' r='2.4' className={`fill-current ${accent}`} />
            </svg>
        )
    }
    if (shape === "eclipse") {
        return (
            <svg viewBox='0 0 64 64' className={`${common} ${accent}`}>
                <circle cx='32' cy='32' r='18' className='fill-current opacity-90' />
                <circle cx='38' cy='30' r='17' className='fill-[#0c0a14]' />
                <circle
                    cx='32'
                    cy='32'
                    r='22'
                    strokeDasharray='2 5'
                    className='opacity-60'
                />
            </svg>
        )
    }
    if (shape === "fog") {
        return (
            <svg viewBox='0 0 64 64' className={`${common} ${accent}`}>
                <g className='animate-pulse opacity-90'>
                    <path d='M10 24 C18 20 26 28 34 24 C42 20 50 28 56 24' />
                    <path d='M8 34 C16 30 24 38 32 34 C40 30 48 38 56 34' opacity='0.8' />
                    <path d='M10 44 C18 40 26 48 34 44 C42 40 50 48 56 44' opacity='0.6' />
                </g>
            </svg>
        )
    }
    if (shape === "wave") {
        return (
            <svg viewBox='0 0 64 64' className={`${common} ${accent}`}>
                <path d='M6 38 C16 28 22 48 32 38 C42 28 48 48 58 38' />
                <path
                    d='M6 28 C16 18 22 38 32 28 C42 18 48 38 58 28'
                    opacity='0.7'
                />
                <path
                    d='M6 48 C16 38 22 58 32 48 C42 38 48 58 58 48'
                    opacity='0.5'
                />
            </svg>
        )
    }
    if (shape === "flame") {
        return (
            <svg viewBox='0 0 64 64' className={`${common} ${accent}`}>
                <path d='M32 10 C24 22 22 30 28 38 C32 44 30 50 26 54 C36 52 44 44 44 34 C44 26 38 22 36 14 C34 18 32 18 32 10 Z' />
                <path
                    d='M32 22 C30 30 30 36 34 40'
                    opacity='0.7'
                />
            </svg>
        )
    }
    if (shape === "spiral") {
        return (
            <svg viewBox='0 0 64 64' className={`${common} ${accent}`}>
                <path
                    d='M32 32 m -2 0 a 2 2 0 1 1 4 0 a 4 4 0 1 1 -8 0 a 6 6 0 1 1 12 0 a 8 8 0 1 1 -16 0 a 10 10 0 1 1 20 0 a 12 12 0 1 1 -24 0'
                    className='animate-[spin_24s_linear_infinite] origin-center'
                />
            </svg>
        )
    }
    if (shape === "ember") {
        return (
            <svg viewBox='0 0 64 64' className={`${common} ${accent}`}>
                <circle cx='32' cy='38' r='12' className='fill-current opacity-25' />
                <path d='M32 18 C28 26 26 30 30 36 C32 39 31 42 28 44 C34 44 38 40 38 34 C38 30 35 26 34 22 C33 24 33 24 32 18 Z' />
                <circle cx='32' cy='38' r='3' className='fill-current' />
            </svg>
        )
    }
    // tide
    return (
        <svg viewBox='0 0 64 64' className={`${common} ${accent}`}>
            <path d='M6 42 C18 32 26 50 32 42 C38 34 46 50 58 42' />
            <path d='M6 32 C18 22 26 40 32 32 C38 24 46 40 58 32' opacity='0.6' />
            <circle cx='52' cy='20' r='3' className='fill-current opacity-70' />
        </svg>
    )
}

/**
 * Symbolic orb for the general-reply hero. The orb sits where the verdict-hero
 * mood icon would sit, but trades the literal mood glyph for a stylized
 * abstract mark (vortex, eclipse, fog, wave, flame, spiral, ember, tide) so
 * the general strategy reads as an inner-energy reflection rather than a
 * daily forecast.
 */
export default function InnerEnergyOrb({ shape, className }: InnerEnergyOrbProps) {
    const safeShape: InnerEnergyShape =
        shape && shape in SHAPE_STYLES ? shape : "fog"
    const style = SHAPE_STYLES[safeShape]
    return (
        <div
            className={`relative flex items-center justify-center ${
                className ?? ""
            }`}
        >
            <span
                aria-hidden
                className={`pointer-events-none absolute inset-[-40%] rounded-full bg-gradient-to-br ${style.glow} blur-3xl`}
            />
            <span
                aria-hidden
                className={`pointer-events-none absolute inset-[-12%] rounded-full bg-[radial-gradient(60%_60%_at_50%_45%,rgba(255,255,255,0.10),transparent_70%)]`}
            />
            <div
                className={`relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] ring-1 ${style.ring} ${style.shadow} backdrop-blur-sm`}
            >
                <div className='absolute inset-3'>
                    <ShapeMark shape={safeShape} accent={style.accent} />
                </div>
            </div>
        </div>
    )
}

export { SHAPE_STYLES }
