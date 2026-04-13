"use client"

import Image from "next/image"
import { Sparkles } from "lucide-react"
import { useMemo } from "react"

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

function extractKeywordsAndContent(text: string): {
    keywords: string[]
    content: string
} {
    if (!text) return { keywords: [], content: text }
    const parts = text.split(/\n\n/)
    if (parts.length > 1) {
        const keywordsPart = parts[0]
        const content = parts.slice(1).join("\n\n")
        const keywords = keywordsPart
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k.length > 0)
            .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
        return { keywords, content }
    }
    return { keywords: [], content: text }
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

function StarDots({ count, seed }: { count: number; seed: number }) {
    const stars = useMemo(() => {
        const rng = (s: number) => {
            s = Math.sin(s) * 10000
            return s - Math.floor(s)
        }
        return Array.from({ length: count }, (_, i) => ({
            left: `${rng(seed + i * 3.1) * 100}%`,
            top: `${rng(seed + i * 7.7) * 100}%`,
            size: 1 + rng(seed + i * 13.3),
            opacity: 0.3 + rng(seed + i * 17.9) * 0.7,
        }))
    }, [count, seed])

    return (
        <>
            {stars.map((s, i) => (
                <div
                    key={i}
                    className='absolute rounded-full bg-white'
                    style={{
                        left: s.left,
                        top: s.top,
                        width: s.size,
                        height: s.size,
                        opacity: s.opacity,
                    }}
                />
            ))}
        </>
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
    const questionText = truncate(question ?? "", 140)
    const rawInterpretation = truncate(
        interpretation ?? "",
        aspectRatio === "story" ? 780 : 300,
    )
    const { keywords, content } = extractKeywordsAndContent(rawInterpretation)
    const bodyText = content || rawInterpretation

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
            {/* Glow blobs - matching server layout */}
            <div className='absolute -top-[15%] -left-[15%] w-[55%] h-[45%] rounded-full opacity-60'
                style={{ background: "radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.22), rgba(30, 64, 175, 0.12) 40%, transparent 70%)" }}
            />
            <div className='absolute -bottom-[18%] -right-[18%] w-[60%] h-[55%] rounded-full opacity-55'
                style={{ background: "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.18), rgba(37, 99, 235, 0.1) 40%, transparent 70%)" }}
            />
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[60%] rounded-full opacity-40'
                style={{ background: "radial-gradient(circle at center, rgba(30, 58, 138, 0.12), transparent 60%)" }}
            />

            {/* Star dots */}
            <StarDots count={40} seed={42} />

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

            {/* Background card auras - all 3 like the server */}
            {displayCards.slice(0, 3).map((cardName, idx) => {
                const { slug, isReversed } = slugifyCardName(cardName)
                const positions = [
                    { top: "6%", left: "4%", rotate: -14 },
                    { top: "8%", right: "6%", rotate: 16 },
                    { bottom: "30%", left: "6%", rotate: -10 },
                ]
                const p = positions[idx]
                if (!p) return null
                return (
                    <div
                        key={`bg-${idx}`}
                        className='absolute w-[22%] opacity-[0.12]'
                        style={{
                            ...(p.top ? { top: p.top } : {}),
                            ...(p.bottom ? { bottom: p.bottom } : {}),
                            ...(p.left ? { left: p.left } : {}),
                            ...(p.right ? { right: p.right } : {}),
                            transform: `rotate(${p.rotate}deg) scale(0.9)`,
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
            })}

            <div className={`relative z-10 flex h-full flex-col items-center ${isStory ? "p-[6.5%] pt-[4%]" : "p-[5%] pt-[3%]"}`}>
                {/* Branding pill - matching server */}
                <div className='self-end flex items-center gap-1 rounded-full border border-white/[0.12] px-2 py-0.5'
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.6), rgba(30,41,59,0.35))",
                        boxShadow: "0 4px 12px -4px rgba(56,189,248,0.4)",
                    }}
                >
                    <Image
                        src='/assets/logo.png'
                        alt='AskingFate'
                        width={14}
                        height={14}
                        className='rounded-sm'
                    />
                    <span className='text-[7px] font-black tracking-wide text-white'
                        style={{ textShadow: "0 1px 6px rgba(234,179,8,0.3), 0 0 8px rgba(56,189,248,0.2)" }}
                    >
                        AskingFate
                    </span>
                </div>

                {/* Question section */}
                {questionText && (
                    <div className={`flex flex-col items-center text-center ${isStory ? "mt-[5%]" : "mt-[3%]"}`}>
                        <span className='text-[5.5px] font-semibold uppercase tracking-[0.12em] text-white/70 mb-1'>
                            Question
                        </span>
                        <p className='font-serif text-[10px] font-black leading-tight text-white/[0.98] max-w-[90%]'
                            style={{ textShadow: "0 1px 6px rgba(56,189,248,0.2)" }}
                        >
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
                                            className={`relative overflow-hidden rounded-md border-[1.5px] border-white/20 ${
                                                isStory
                                                    ? "w-[52px] h-[88px]"
                                                    : isLandscape
                                                      ? "w-7 h-12"
                                                      : "w-9 h-[60px]"
                                            }`}
                                            style={{
                                                boxShadow:
                                                    "0 6px 20px -4px rgba(234,179,8,0.5), 0 2px 8px rgba(139,92,246,0.3), 0 0 0 0.5px rgba(255,255,255,0.15)",
                                                background: "rgba(10,8,26,0.4)",
                                            }}
                                        >
                                            <div
                                                className='absolute -inset-3 opacity-70'
                                                style={{
                                                    background:
                                                        "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.3), transparent 50%), radial-gradient(circle at 70% 80%, rgba(234,179,8,0.22), transparent 55%)",
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
                        className={`w-full rounded-xl border border-white/[0.16] ${isStory ? "mt-[5%] p-3" : "mt-[3%] p-2.5"}`}
                        style={{
                            background:
                                "linear-gradient(135deg, rgba(30,41,59,0.6) 0%, rgba(99,102,241,0.25) 35%, rgba(34,211,238,0.16) 80%)",
                            boxShadow:
                                "0 8px 24px -8px rgba(56,189,248,0.5), 0 0 0 0.5px rgba(255,255,255,0.1), inset 0 0.5px 0 rgba(255,255,255,0.2)",
                        }}
                    >
                        {/* Corner accent */}
                        <div className='absolute top-0 left-0 w-8 h-8 rounded-tl-xl opacity-70'
                            style={{ background: "radial-gradient(circle at top left, rgba(139,92,246,0.2), transparent 70%)" }}
                        />

                        <div className='flex items-center gap-1.5 mb-2'>
                            <div className='flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center'
                                style={{
                                    background: "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.28), rgba(99, 102, 241, 0.1))",
                                    boxShadow: "0 2px 8px rgba(56,189,248,0.2)",
                                }}
                            >
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

                        {/* Keywords */}
                        {keywords.length > 0 && (
                            <div className='flex flex-wrap gap-1 mb-1.5'>
                                {keywords.map((keyword, idx) => (
                                    <span
                                        key={idx}
                                        className='text-[5px] font-medium text-white/90 px-1.5 py-0.5 rounded-full border border-white/20'
                                        style={{ background: "rgba(255,255,255,0.1)" }}
                                    >
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        )}

                        <p
                            className={`text-[6px] text-white/90 leading-relaxed whitespace-pre-line ${
                                isStory
                                    ? "line-clamp-[14]"
                                    : isLandscape
                                      ? "line-clamp-4"
                                      : "line-clamp-6"
                            }`}
                            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
                        >
                            {bodyText}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
