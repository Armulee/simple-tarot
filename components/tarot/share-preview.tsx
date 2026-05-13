"use client"

import Image from "next/image"
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
            {stars.map((star, i) => (
                <div
                    key={i}
                    className='absolute rounded-full bg-white'
                    style={{
                        left: star.left,
                        top: star.top,
                        width: star.size,
                        height: star.size,
                        opacity: star.opacity,
                    }}
                />
            ))}
        </>
    )
}

/**
 * All dimensions use container query width units (cqw) so the preview
 * scales proportionally to match the server-rendered image at any size.
 * Server reference canvas: 1080×1920 (portrait) or 1920×1080 (landscape).
 */
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
    const isStory = aspectRatio === "story"
    const isLandscape = aspectRatio === "landscape"
    const rawInterpretation = truncate(
        interpretation ?? "",
        isStory ? 400 : isLandscape ? 200 : 280,
    )
    const { keywords, content } = extractKeywordsAndContent(rawInterpretation)
    const bodyText = content || rawInterpretation

    const isHorizontal = !isStory
    const refW = isLandscape ? 1920 : 1080
    const s = (px: number) => `${(px / refW) * 100}cqw`
    const paddingBottom = isLandscape ? 212 : 72
    const cardScale = isStory ? 0.5 : 0.4
    const cardW = 500 * cardScale
    const cardH = 864 * cardScale
    const maxContentWidth = isStory ? 980 : isLandscape ? 1600 : 980

    return (
        <div
            className={`relative w-full ${ratioClass} overflow-hidden rounded-lg text-white`}
            style={{
                containerType: "inline-size",
                background:
                    "radial-gradient(1600px 1000px at 20% 0%, rgba(30, 58, 138, 0.4) 0%, rgba(25, 45, 112, 0.3) 25%, rgba(15, 23, 42, 0.2) 40%, rgba(2, 6, 23, 1) 70%), radial-gradient(1400px 1000px at 80% 100%, rgba(30, 64, 175, 0.3) 0%, rgba(20, 40, 100, 0.2) 30%, rgba(2, 6, 23, 1) 65%), radial-gradient(1000px 800px at 50% 50%, rgba(37, 99, 235, 0.15) 0%, rgba(2, 6, 23, 0.9) 50%)",
            }}
        >
            {/* Glow blobs */}
            <div
                className='absolute -top-[15%] -left-[15%] w-[55%] h-[45%] rounded-full opacity-60'
                style={{
                    background:
                        "radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.22), rgba(30, 64, 175, 0.12) 40%, transparent 70%)",
                }}
            />
            <div
                className='absolute -bottom-[18%] -right-[18%] w-[60%] h-[55%] rounded-full opacity-55'
                style={{
                    background:
                        "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.18), rgba(37, 99, 235, 0.1) 40%, transparent 70%)",
                }}
            />
            <div
                className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[60%] rounded-full opacity-40'
                style={{
                    background:
                        "radial-gradient(circle at center, rgba(30, 58, 138, 0.12), transparent 60%)",
                }}
            />

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
            <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='rgba(255,255,255,0.5)'
                strokeWidth='1.2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='absolute'
                style={{
                    width: s(200),
                    height: s(200),
                    top: s(120),
                    right: s(120),
                    opacity: 0.3,
                }}
            >
                <path d='M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z' />
            </svg>
            <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='rgba(56,189,248,0.35)'
                strokeWidth='0.8'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='absolute'
                style={{
                    width: s(260),
                    height: s(260),
                    bottom: s(220),
                    left: s(140),
                    opacity: 0.25,
                }}
            >
                <path d='M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z' />
            </svg>

            {/* Background card auras */}
            {displayCards.slice(0, 3).map((cardName, idx) => {
                const { slug, isReversed } = slugifyCardName(cardName)
                const positions = [
                    { top: s(120), left: s(60), rotate: -14 },
                    { top: s(150), right: s(80), rotate: 16 },
                    { bottom: s(560), left: s(80), rotate: -10 },
                ]
                const p = positions[idx]
                if (!p) return null
                return (
                    <div
                        key={`bg-${idx}`}
                        className='absolute'
                        style={{
                            width: s(260),
                            ...(p.top ? { top: p.top } : {}),
                            ...(p.bottom ? { bottom: p.bottom } : {}),
                            ...(p.left ? { left: p.left } : {}),
                            ...(p.right ? { right: p.right } : {}),
                            transform: `rotate(${p.rotate}deg) scale(0.9)`,
                            opacity: 0.14,
                        }}
                    >
                        <Image
                            src={`/assets/rider-waite-tarot/${slug}.png`}
                            alt=''
                            width={260}
                            height={420}
                            className='w-full h-auto'
                            style={
                                isReversed
                                    ? { transform: "rotate(180deg)" }
                                    : undefined
                            }
                        />
                    </div>
                )
            })}

            {/* Content layer — mirrors server layout */}
            <div
                className='relative z-10 flex h-full w-full flex-col'
                style={{
                    paddingTop: s(72),
                    paddingLeft: s(72),
                    paddingRight: s(72),
                    paddingBottom: s(paddingBottom),
                    boxSizing: "border-box",
                }}
            >
                <div
                    className='flex flex-col'
                    style={{
                        gap: s(isHorizontal ? 24 : 36),
                        maxWidth: s(maxContentWidth),
                        width: "100%",
                        margin: "0 auto",
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    {/* Brand pill */}
                    <div
                        className='flex items-center self-end'
                        style={{
                            gap: s(16),
                            padding: `${s(10)} ${s(16)}`,
                            borderRadius: 9999,
                            background:
                                "linear-gradient(135deg, rgba(15,23,42,0.6), rgba(30,41,59,0.35))",
                            border: "1px solid rgba(255,255,255,0.12)",
                            boxShadow: `0 ${s(10)} ${s(30)} ${s(-15)} rgba(56,189,248,0.5)`,
                        }}
                    >
                        <Image
                            src='/assets/logo.png'
                            alt='AskingFate'
                            width={56}
                            height={56}
                            style={{ width: s(56), height: s(56) }}
                            className='rounded-sm'
                        />
                        <span
                            style={{
                                fontSize: s(36),
                                fontWeight: 900,
                                letterSpacing: s(-0.5),
                                color: "rgba(255,255,255,1)",
                                textShadow:
                                    "0 2px 20px rgba(234,179,8,0.4), 0 0 30px rgba(56,189,248,0.3)",
                            }}
                        >
                            AskingFate
                        </span>
                    </div>

                    {isHorizontal ? (
                        /* ===== HORIZONTAL (square / landscape) ===== */
                        <div
                            className='flex'
                            style={{
                                flex: 1,
                                minHeight: 0,
                                gap: s(36),
                                alignItems: "stretch",
                            }}
                        >
                            {/* Left — card(s) */}
                            {displayCards.length > 0 && (
                                <div
                                    className='flex flex-col items-center'
                                    style={{ gap: s(12) }}
                                >
                                    <span
                                        style={{
                                            fontSize: s(18),
                                            letterSpacing: s(1),
                                            textTransform: "uppercase",
                                            color: "rgba(255,255,255,0.6)",
                                        }}
                                    >
                                        Your cards
                                    </span>
                                    <div
                                        className='flex flex-col items-center'
                                        style={{ gap: s(16) }}
                                    >
                                        {displayCards.map((cardName, i) => {
                                            const { slug, isReversed } =
                                                slugifyCardName(cardName)
                                            return (
                                                <div
                                                    key={i}
                                                    className='flex flex-col items-center'
                                                    style={{ gap: s(8) }}
                                                >
                                                    <div
                                                        className='relative overflow-hidden'
                                                        style={{
                                                            width: s(cardW),
                                                            height: s(cardH),
                                                            borderRadius:
                                                                s(14),
                                                            boxShadow: `0 ${s(16)} ${s(50)} ${s(-12)} rgba(234,179,8,0.6), 0 ${s(6)} ${s(16)} rgba(139,92,246,0.3), 0 0 0 ${s(2)} rgba(255,255,255,0.15)`,
                                                            border: `${s(2)} solid rgba(255,255,255,0.2)`,
                                                            background:
                                                                "rgba(10,8,26,0.4)",
                                                        }}
                                                    >
                                                        <div
                                                            className='absolute'
                                                            style={{
                                                                inset: s(-40),
                                                                background:
                                                                    "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.3), transparent 50%), radial-gradient(circle at 70% 80%, rgba(234,179,8,0.22), transparent 55%)",
                                                                opacity: 0.8,
                                                            }}
                                                        />
                                                        <Image
                                                            src={`/assets/rider-waite-tarot/${slug}.png`}
                                                            alt={cardName}
                                                            width={200}
                                                            height={346}
                                                            className='absolute inset-0 w-full h-full object-cover'
                                                            style={{
                                                                borderRadius:
                                                                    s(12),
                                                                ...(isReversed
                                                                    ? {
                                                                          transform:
                                                                              "rotate(180deg)",
                                                                      }
                                                                    : {}),
                                                            }}
                                                        />
                                                        <div
                                                            className='absolute inset-0'
                                                            style={{
                                                                background:
                                                                    "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)",
                                                                borderRadius:
                                                                    s(12),
                                                            }}
                                                        />
                                                    </div>
                                                    <span
                                                        style={{
                                                            fontSize: s(16),
                                                            color: "rgba(255,255,255,0.7)",
                                                            textAlign:
                                                                "center",
                                                            maxWidth: s(cardW),
                                                            lineHeight: 1.3,
                                                        }}
                                                    >
                                                        {cardName}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Right — question + interpretation */}
                            <div
                                className='flex flex-col'
                                style={{
                                    flex: 1,
                                    minHeight: 0,
                                    gap: s(20),
                                }}
                            >
                                {/* Question */}
                                {questionText && (
                                    <div className='flex flex-col'>
                                        <span
                                            style={{
                                                fontSize: s(20),
                                                fontWeight: 600,
                                                letterSpacing: s(0.5),
                                                textTransform: "uppercase",
                                                color: "rgba(204,203,203,0.95)",
                                                marginBottom: s(10),
                                            }}
                                        >
                                            Question
                                        </span>
                                        <p
                                            style={{
                                                fontFamily:
                                                    "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                                                fontSize: s(36),
                                                fontWeight: 900,
                                                lineHeight: 1.2,
                                                color: "rgba(255,255,255,0.98)",
                                                textShadow: `0 ${s(3)} ${s(14)} rgba(56,189,248,0.25)`,
                                                wordBreak: "break-word",
                                                overflowWrap: "break-word",
                                            }}
                                        >
                                            &ldquo;{questionText}&rdquo;
                                        </p>
                                    </div>
                                )}

                                {/* Interpretation card */}
                                {bodyText && (
                                    <div
                                        className='relative flex flex-col'
                                        style={{
                                            borderRadius: s(24),
                                            padding: s(36),
                                            background:
                                                "linear-gradient(135deg, rgba(30,41,59,0.6) 0%, rgba(99,102,241,0.25) 35%, rgba(34,211,238,0.16) 80%)",
                                            boxShadow: `0 ${s(20)} ${s(60)} ${s(-20)} rgba(56,189,248,0.5), 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.2)`,
                                            border: "1px solid rgba(255,255,255,0.16)",
                                            overflow: "hidden",
                                            flex: 1,
                                            minHeight: 0,
                                        }}
                                    >
                                        <div
                                            className='absolute top-0 left-0'
                                            style={{
                                                width: s(100),
                                                height: s(100),
                                                borderRadius: `${s(24)} 0 0 0`,
                                                background:
                                                    "radial-gradient(circle at top left, rgba(139,92,246,0.2), transparent 70%)",
                                                opacity: 0.7,
                                            }}
                                        />
                                        {/* Header */}
                                        <div
                                            className='flex items-center'
                                            style={{
                                                gap: s(10),
                                                marginBottom: s(24),
                                            }}
                                        >
                                            <div
                                                className='flex-shrink-0 flex items-center justify-center'
                                                style={{
                                                    width: s(56),
                                                    height: s(56),
                                                    borderRadius: 9999,
                                                    marginRight: s(16),
                                                    background:
                                                        "radial-gradient(circle at 30% 30%, rgba(59,130,246,0.28), rgba(99,102,241,0.1))",
                                                    boxShadow: `0 ${s(6)} ${s(20)} rgba(56,189,248,0.2)`,
                                                }}
                                            >
                                                <svg
                                                    viewBox='0 0 24 24'
                                                    fill='none'
                                                    stroke='rgba(255,255,255,0.95)'
                                                    strokeWidth='1.6'
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    style={{
                                                        width: s(36),
                                                        height: s(36),
                                                    }}
                                                >
                                                    <path d='M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z' />
                                                </svg>
                                            </div>
                                            <div className='flex flex-col'>
                                                <span
                                                    style={{
                                                        fontFamily:
                                                            "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                                                        fontSize: s(36),
                                                        fontWeight: 600,
                                                        color: "rgba(255,255,255,1)",
                                                        lineHeight: 1.2,
                                                    }}
                                                >
                                                    Interpretation
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: s(26),
                                                        color: "rgba(255,255,255,0.6)",
                                                        marginTop: s(2),
                                                        lineHeight: 1.3,
                                                    }}
                                                >
                                                    AI-powered analysis of your
                                                    cards
                                                </span>
                                            </div>
                                        </div>
                                        {/* Keywords */}
                                        {keywords.length > 0 && (
                                            <div
                                                className='flex flex-wrap'
                                                style={{ gap: s(14) }}
                                            >
                                                {keywords.map(
                                                    (keyword, idx) => (
                                                        <span
                                                            key={idx}
                                                            style={{
                                                                padding: `${s(6)} ${s(18)}`,
                                                                borderRadius: 9999,
                                                                background:
                                                                    "rgba(255,255,255,0.1)",
                                                                border: "1px solid rgba(255,255,255,0.2)",
                                                                color: "rgba(255,255,255,0.95)",
                                                                fontSize:
                                                                    s(24),
                                                                fontWeight: 500,
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            {keyword}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                        {/* Body */}
                                        <div
                                            style={{
                                                flex: 1,
                                                minHeight: 0,
                                                overflow: "hidden",
                                                position: "relative",
                                            }}
                                        >
                                            <p
                                                style={{
                                                    fontSize: s(28),
                                                    lineHeight: 1.6,
                                                    whiteSpace: "pre-line",
                                                    color: "rgba(255,255,255,0.95)",
                                                    fontWeight: 400,
                                                    marginTop: s(20),
                                                    textShadow: `0 ${s(2)} ${s(6)} rgba(0,0,0,0.2)`,
                                                    wordBreak: "break-word",
                                                    overflowWrap: "break-word",
                                                }}
                                            >
                                                {bodyText}
                                            </p>
                                            <div
                                                className='absolute bottom-0 left-0 right-0 pointer-events-none'
                                                style={{
                                                    height: s(60),
                                                    background:
                                                        "linear-gradient(to bottom, transparent, rgba(30,41,59,0.95))",
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* ===== STORY (vertical) ===== */
                        <>
                            {/* Question */}
                            {questionText && (
                                <div
                                    className='flex flex-col items-center text-center'
                                    style={{ padding: `${s(20)} 0` }}
                                >
                                    <span
                                        style={{
                                            fontSize: s(25),
                                            fontWeight: 600,
                                            letterSpacing: s(0.5),
                                            textTransform: "uppercase",
                                            color: "rgba(204,203,203,0.95)",
                                            marginBottom: s(16),
                                        }}
                                    >
                                        Question
                                    </span>
                                    <p
                                        style={{
                                            fontFamily:
                                                "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                                            fontSize: s(48),
                                            fontWeight: 900,
                                            lineHeight: 1.2,
                                            color: "rgba(255,255,255,0.98)",
                                            textShadow: `0 ${s(4)} ${s(20)} rgba(56,189,248,0.3), 0 ${s(2)} ${s(8)} rgba(139,92,246,0.2)`,
                                            maxWidth: "100%",
                                            wordBreak: "break-word",
                                            overflowWrap: "break-word",
                                        }}
                                    >
                                        &ldquo;{questionText}&rdquo;
                                    </p>
                                </div>
                            )}

                            {/* Cards */}
                            {displayCards.length > 0 && (
                                <div
                                    className='flex flex-col items-center'
                                    style={{ gap: s(18), marginTop: s(8) }}
                                >
                                    <span
                                        style={{
                                            fontSize: s(24),
                                            letterSpacing: s(1.2),
                                            textTransform: "uppercase",
                                            color: "rgba(255,255,255,0.7)",
                                        }}
                                    >
                                        Your cards
                                    </span>
                                    <div
                                        className='flex flex-wrap items-start justify-center'
                                        style={{ gap: s(24) }}
                                    >
                                        {displayCards.map((cardName, i) => {
                                            const { slug, isReversed } =
                                                slugifyCardName(cardName)
                                            return (
                                                <div
                                                    key={i}
                                                    className='flex flex-col items-center'
                                                    style={{ gap: s(14) }}
                                                >
                                                    <div
                                                        className='relative overflow-hidden'
                                                        style={{
                                                            width: s(cardW),
                                                            height: s(cardH),
                                                            borderRadius:
                                                                s(20),
                                                            boxShadow: `0 ${s(24)} ${s(80)} ${s(-20)} rgba(234,179,8,0.7), 0 ${s(8)} ${s(24)} rgba(139,92,246,0.4), 0 0 0 ${s(2)} rgba(255,255,255,0.15)`,
                                                            border: `${s(2)} solid rgba(255,255,255,0.2)`,
                                                            background:
                                                                "rgba(10,8,26,0.4)",
                                                        }}
                                                    >
                                                        <div
                                                            className='absolute'
                                                            style={{
                                                                inset: s(-60),
                                                                background:
                                                                    "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.3), transparent 50%), radial-gradient(circle at 70% 80%, rgba(234,179,8,0.22), transparent 55%)",
                                                                opacity: 0.8,
                                                            }}
                                                        />
                                                        <Image
                                                            src={`/assets/rider-waite-tarot/${slug}.png`}
                                                            alt={cardName}
                                                            width={350}
                                                            height={605}
                                                            className='absolute inset-0 w-full h-full object-cover'
                                                            style={{
                                                                borderRadius:
                                                                    s(18),
                                                                ...(isReversed
                                                                    ? {
                                                                          transform:
                                                                              "rotate(180deg)",
                                                                      }
                                                                    : {}),
                                                            }}
                                                        />
                                                        <div
                                                            className='absolute inset-0'
                                                            style={{
                                                                background:
                                                                    "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)",
                                                                borderRadius:
                                                                    s(18),
                                                            }}
                                                        />
                                                    </div>
                                                    <span
                                                        style={{
                                                            fontSize: s(22),
                                                            color: "rgba(255,255,255,0.7)",
                                                            textAlign:
                                                                "center",
                                                            maxWidth: s(cardW),
                                                            lineHeight: 1.3,
                                                        }}
                                                    >
                                                        {cardName}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Interpretation */}
                            {bodyText && (
                                <div
                                    className='relative flex flex-col'
                                    style={{
                                        marginTop: s(32),
                                        marginBottom: s(42),
                                        borderRadius: s(32),
                                        padding: s(60),
                                        background:
                                            "linear-gradient(135deg, rgba(30,41,59,0.6) 0%, rgba(99,102,241,0.25) 35%, rgba(34,211,238,0.16) 80%)",
                                        boxShadow: `0 ${s(30)} ${s(90)} ${s(-35)} rgba(56,189,248,0.65), 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.2)`,
                                        border: "1px solid rgba(255,255,255,0.16)",
                                        overflow: "hidden",
                                        flex: 1,
                                        minHeight: 0,
                                    }}
                                >
                                    <div
                                        className='absolute top-0 left-0'
                                        style={{
                                            width: s(140),
                                            height: s(140),
                                            borderRadius: `${s(32)} 0 0 0`,
                                            background:
                                                "radial-gradient(circle at top left, rgba(139,92,246,0.2), transparent 70%)",
                                            opacity: 0.7,
                                        }}
                                    />
                                    <div
                                        className='flex items-center'
                                        style={{
                                            gap: s(12),
                                            marginBottom: s(60),
                                        }}
                                    >
                                        <div
                                            className='flex-shrink-0 flex items-center justify-center'
                                            style={{
                                                width: s(88),
                                                height: s(88),
                                                borderRadius: 9999,
                                                marginRight: s(24),
                                                background:
                                                    "radial-gradient(circle at 30% 30%, rgba(59,130,246,0.28), rgba(99,102,241,0.1))",
                                                boxShadow: `0 ${s(10)} ${s(30)} rgba(56,189,248,0.25)`,
                                            }}
                                        >
                                            <svg
                                                viewBox='0 0 24 24'
                                                fill='none'
                                                stroke='rgba(255,255,255,0.95)'
                                                strokeWidth='1.6'
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                style={{
                                                    width: s(64),
                                                    height: s(64),
                                                }}
                                            >
                                                <path d='M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z' />
                                            </svg>
                                        </div>
                                        <div className='flex flex-col'>
                                            <span
                                                style={{
                                                    fontFamily:
                                                        "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                                                    fontSize: s(50),
                                                    fontWeight: 600,
                                                    color: "rgba(255,255,255,1)",
                                                    lineHeight: 1.2,
                                                }}
                                            >
                                                Interpretation
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: s(40),
                                                    color: "rgba(255,255,255,0.7)",
                                                    marginTop: s(4),
                                                    lineHeight: 1.3,
                                                }}
                                            >
                                                AI-powered analysis of your
                                                cards
                                            </span>
                                        </div>
                                    </div>
                                    {keywords.length > 0 && (
                                        <div
                                            className='flex flex-wrap'
                                            style={{ gap: s(30) }}
                                        >
                                            {keywords.map((keyword, idx) => (
                                                <span
                                                    key={idx}
                                                    style={{
                                                        padding: `${s(10)} ${s(30)}`,
                                                        borderRadius: 9999,
                                                        background:
                                                            "rgba(255,255,255,0.1)",
                                                        border: "1px solid rgba(255,255,255,0.2)",
                                                        color: "rgba(255,255,255,0.95)",
                                                        fontSize: s(40),
                                                        fontWeight: 500,
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div
                                        style={{
                                            flex: 1,
                                            minHeight: 0,
                                            overflow: "hidden",
                                            position: "relative",
                                        }}
                                    >
                                        <p
                                            style={{
                                                fontSize: s(40),
                                                lineHeight: 1.6,
                                                whiteSpace: "pre-line",
                                                color: "rgba(255,255,255,0.95)",
                                                fontWeight: 400,
                                                marginTop: s(40),
                                                textShadow: `0 ${s(2)} ${s(8)} rgba(0,0,0,0.2)`,
                                                wordBreak: "break-word",
                                                overflowWrap: "break-word",
                                            }}
                                        >
                                            {bodyText}
                                        </p>
                                        <div
                                            className='absolute bottom-0 left-0 right-0 pointer-events-none'
                                            style={{
                                                height: s(80),
                                                background:
                                                    "linear-gradient(to bottom, transparent, rgba(30,41,59,0.95))",
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
