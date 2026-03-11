"use client"

import Image from "next/image"
import { Sparkles } from "lucide-react"

function slugifyCardName(raw: string): { slug: string; isReversed: boolean } {
    const lower = raw.toLowerCase()
    const isReversed =
        lower.includes("(reversed)") || /\breversed\b/.test(lower)
    const slug = lower
        .replace(/\s*\(reversed\)/g, "")
        .replace(/\s*reversed/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    return { slug, isReversed }
}

function truncate(text: string, max: number) {
    const t = (text ?? "").trim()
    return t.length <= max ? t : `${t.slice(0, max - 3).trimEnd()}...`
}

interface SharePreviewProps {
    question?: string | null
    cards?: string[] | null
    interpretation?: string | null
    aspectRatio: "story" | "square" | "landscape"
}

function StarGlyph({ className }: { className?: string }) {
    return (
        <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className={className}
        >
            <path d='M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z' />
        </svg>
    )
}

export default function SharePreview({
    question,
    cards,
    interpretation,
    aspectRatio,
}: SharePreviewProps) {
    const ratioClass =
        aspectRatio === "story"
            ? "aspect-[9/16]"
            : aspectRatio === "square"
              ? "aspect-square"
              : "aspect-video"

    const displayCards = (cards ?? []).slice(0, 3)
    const questionText = truncate(question ?? "", 120)
    const bodyText = truncate(
        interpretation ?? "",
        aspectRatio === "story" ? 600 : 300,
    )

    const isStory = aspectRatio === "story"
    const isLandscape = aspectRatio === "landscape"

    return (
        <div
            className={`relative w-full ${ratioClass} overflow-hidden rounded-lg text-white`}
            style={{
                background:
                    "radial-gradient(1600px 1000px at 20% 0%, rgba(30, 58, 138, 0.4) 0%, rgba(25, 45, 112, 0.3) 25%, rgba(15, 23, 42, 0.2) 40%, rgba(2, 6, 23, 1) 70%), radial-gradient(1400px 1000px at 80% 100%, rgba(30, 64, 175, 0.3) 0%, rgba(20, 40, 100, 0.2) 30%, rgba(2, 6, 23, 1) 65%), radial-gradient(1000px 800px at 50% 50%, rgba(37, 99, 235, 0.15) 0%, rgba(2, 6, 23, 0.9) 50%)",
            }}
        >
            {/* Glow blobs */}
            <div className='absolute -top-[10%] -left-[10%] w-[40%] h-[35%] rounded-full bg-blue-800/30 blur-3xl' />
            <div className='absolute -bottom-[15%] -right-[12%] w-[50%] h-[45%] rounded-full bg-blue-700/25 blur-3xl' />
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] h-[50%] rounded-full bg-blue-900/20 blur-[60px]' />

            {/* Vignette */}
            <div
                className='absolute inset-0'
                style={{
                    background:
                        "radial-gradient(ellipse at 50% 10%, rgba(2,6,23,0) 0%, rgba(2,6,23,0.35) 60%, rgba(2,6,23,0.75) 100%)",
                }}
            />

            {/* Star glyphs */}
            <StarGlyph className='absolute top-[6%] right-[10%] w-[10%] h-[10%] text-white/25' />
            <StarGlyph className='absolute bottom-[14%] left-[10%] w-[13%] h-[13%] text-cyan-400/20' />

            {/* Background card aura */}
            {displayCards.length > 0 && (() => {
                const { slug, isReversed } = slugifyCardName(displayCards[0])
                return (
                    <div
                        className='absolute top-[6%] left-[4%] w-[22%] opacity-[0.12]'
                        style={{
                            transform: `rotate(-14deg)`,
                        }}
                    >
                        <Image
                            src={`/assets/rider-waite-tarot/${slug}.png`}
                            alt=''
                            width={260}
                            height={420}
                            className='w-full h-auto'
                            style={isReversed ? { transform: "rotate(180deg)" } : undefined}
                        />
                    </div>
                )
            })()}

            <div className='relative z-10 flex h-full flex-col items-center p-[5%] pt-[4%]'>
                {/* Branding pill */}
                <div className='self-end flex items-center gap-1 rounded-full bg-slate-900/60 border border-white/[0.12] px-2 py-0.5 shadow-[0_4px_12px_-4px_rgba(56,189,248,0.4)]'>
                    <Image
                        src='/icon-192.png'
                        alt='AskingFate'
                        width={14}
                        height={14}
                        className='rounded-sm'
                    />
                    <span className='text-[7px] font-bold tracking-wide text-white'>
                        AskingFate
                    </span>
                </div>

                {/* Question section */}
                {questionText && (
                    <div className={`flex flex-col items-center text-center ${isStory ? "mt-[5%]" : "mt-[3%]"}`}>
                        <span className='text-[6px] font-semibold uppercase tracking-[0.12em] text-white/70 mb-1'>
                            Question
                        </span>
                        <p className='font-serif text-[10px] font-bold leading-tight text-white/95 max-w-[85%]'>
                            &ldquo;{questionText}&rdquo;
                        </p>
                    </div>
                )}

                {/* Cards section */}
                {displayCards.length > 0 && (
                    <div className={`flex flex-col items-center ${isStory ? "mt-[4%]" : "mt-[3%]"}`}>
                        <span className='text-[5px] uppercase tracking-[0.1em] text-white/60 mb-1.5'>
                            Your cards
                        </span>
                        <div className='flex items-start justify-center gap-2'>
                            {displayCards.map((cardName, i) => {
                                const { slug, isReversed } =
                                    slugifyCardName(cardName)
                                return (
                                    <div
                                        key={i}
                                        className='flex flex-col items-center'
                                    >
                                        <div
                                            className={`relative overflow-hidden rounded-md border border-white/20 ${
                                                isStory
                                                    ? "w-[52px] h-[88px]"
                                                    : isLandscape
                                                      ? "w-7 h-12"
                                                      : "w-9 h-[60px]"
                                            }`}
                                            style={{
                                                boxShadow:
                                                    "0 6px 20px -4px rgba(234,179,8,0.5), 0 2px 8px rgba(139,92,246,0.3), 0 0 0 0.5px rgba(255,255,255,0.15)",
                                            }}
                                        >
                                            <div
                                                className='absolute -inset-2 opacity-80 blur-md'
                                                style={{
                                                    background:
                                                        "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.4), transparent 50%), radial-gradient(circle at 70% 80%, rgba(234,179,8,0.3), transparent 55%)",
                                                }}
                                            />
                                            <Image
                                                src={`/assets/rider-waite-tarot/${slug}.png`}
                                                alt={cardName}
                                                width={52}
                                                height={88}
                                                className='relative w-full h-full object-cover'
                                                style={
                                                    isReversed
                                                        ? {
                                                              transform:
                                                                  "rotate(180deg)",
                                                          }
                                                        : undefined
                                                }
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Interpretation card */}
                {bodyText && (
                    <div
                        className={`w-full rounded-xl border border-white/[0.16] p-3 ${isStory ? "mt-[5%]" : "mt-[3%]"}`}
                        style={{
                            background:
                                "linear-gradient(135deg, rgba(30,41,59,0.6) 0%, rgba(99,102,241,0.25) 35%, rgba(34,211,238,0.16) 80%)",
                            boxShadow:
                                "0 8px 24px -8px rgba(56,189,248,0.5), 0 0 0 0.5px rgba(255,255,255,0.1), inset 0 0.5px 0 rgba(255,255,255,0.2)",
                        }}
                    >
                        <div className='flex items-center gap-1.5 mb-2'>
                            <div className='flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shadow-[0_2px_8px_rgba(56,189,248,0.2)]'>
                                <Sparkles className='w-2.5 h-2.5 text-white/90' />
                            </div>
                            <div className='flex flex-col'>
                                <span className='font-serif text-[8px] font-semibold text-white leading-tight'>
                                    Interpretation
                                </span>
                                <span className='text-[5px] text-white/60 leading-tight'>
                                    AI-powered analysis of your cards
                                </span>
                            </div>
                        </div>
                        <p
                            className={`text-[6px] text-white/90 leading-relaxed whitespace-pre-line ${
                                isStory
                                    ? "line-clamp-[14]"
                                    : isLandscape
                                      ? "line-clamp-4"
                                      : "line-clamp-6"
                            }`}
                        >
                            {bodyText}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
