import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const socialImageAlt = "AskingFate - AI-Powered Fortune Reading"

// Deterministic pseudo-random star field (no Math.random so the image is
// stable across renders and cacheable).
const STARS = Array.from({ length: 90 }, (_, i) => {
    const x = (i * 137.508) % 100
    const y = ((i * 73.13 + 17) % 97) + 1.5
    const s = 1 + ((i * 7) % 3)
    const o = 0.25 + ((i * 13) % 55) / 100
    return { x, y, s, o }
})

function Sparkle({
    size,
    color,
    opacity,
}: {
    size: number
    color: string
    opacity: number
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox='0 0 24 24'
            style={{ opacity }}
        >
            <path
                d='M12 0 C13.2 7.2 16.8 10.8 24 12 C16.8 13.2 13.2 16.8 12 24 C10.8 16.8 7.2 13.2 0 12 C7.2 10.8 10.8 7.2 12 0 Z'
                fill={color}
            />
        </svg>
    )
}

function TarotCard({
    rotate,
    glyph,
}: {
    rotate: number
    glyph: "moon" | "sun"
}) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 190,
                height: 300,
                borderRadius: 18,
                transform: `rotate(${rotate}deg)`,
                background:
                    "linear-gradient(160deg, rgba(30,27,75,0.85) 0%, rgba(10,10,30,0.9) 100%)",
                border: "2px solid rgba(129,140,248,0.45)",
                boxShadow: "0 0 60px rgba(99,102,241,0.35)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 158,
                    height: 268,
                    borderRadius: 12,
                    border: "1px solid rgba(129,140,248,0.35)",
                }}
            >
                {glyph === "moon" ? (
                    <svg width='72' height='72' viewBox='0 0 24 24'>
                        <path
                            d='M20.5 14.5 A9 9 0 1 1 9.5 3.5 A7.5 7.5 0 0 0 20.5 14.5 Z'
                            fill='none'
                            stroke='rgba(196,181,253,0.9)'
                            strokeWidth='1.4'
                        />
                    </svg>
                ) : (
                    <svg width='76' height='76' viewBox='0 0 24 24'>
                        <circle
                            cx='12'
                            cy='12'
                            r='5'
                            fill='none'
                            stroke='rgba(196,181,253,0.9)'
                            strokeWidth='1.4'
                        />
                        <g stroke='rgba(196,181,253,0.9)' strokeWidth='1.4'>
                            <path d='M12 2.5 L12 5' />
                            <path d='M12 19 L12 21.5' />
                            <path d='M2.5 12 L5 12' />
                            <path d='M19 12 L21.5 12' />
                            <path d='M5.3 5.3 L7 7' />
                            <path d='M17 17 L18.7 18.7' />
                            <path d='M18.7 5.3 L17 7' />
                            <path d='M7 17 L5.3 18.7' />
                        </g>
                    </svg>
                )}
            </div>
        </div>
    )
}

export async function renderSocialImage({
    width,
    height,
}: {
    width: number
    height: number
}) {
    const [playfair, sourceSans, sourceSansSemibold, logo] = await Promise.all([
        readFile(join(process.cwd(), "assets/fonts/playfair-display-700.ttf")),
        readFile(join(process.cwd(), "assets/fonts/source-sans-3-400.ttf")),
        readFile(join(process.cwd(), "assets/fonts/source-sans-3-600.ttf")),
        readFile(join(process.cwd(), "public/assets/logo.png")),
    ])
    const logoSrc = `data:image/png;base64,${logo.toString("base64")}`

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#050510",
                    backgroundImage:
                        "radial-gradient(ellipse 90% 70% at 50% 118%, rgba(76,29,149,0.55) 0%, rgba(5,5,16,0) 65%), radial-gradient(circle at 12% 8%, rgba(99,102,241,0.28) 0%, rgba(5,5,16,0) 42%), radial-gradient(circle at 88% 14%, rgba(139,92,246,0.24) 0%, rgba(5,5,16,0) 40%)",
                    position: "relative",
                    fontFamily: "'Source Sans 3'",
                }}
            >
                {/* Star field */}
                {STARS.map((star, i) => (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: star.s,
                            height: star.s,
                            borderRadius: 9999,
                            backgroundColor: "#e0e7ff",
                            opacity: star.o,
                        }}
                    />
                ))}

                {/* Corner sparkles */}
                <div style={{ position: "absolute", top: 54, left: 74, display: "flex" }}>
                    <Sparkle size={30} color='#a5b4fc' opacity={0.9} />
                </div>
                <div style={{ position: "absolute", top: 120, left: 150, display: "flex" }}>
                    <Sparkle size={16} color='#c4b5fd' opacity={0.7} />
                </div>
                <div style={{ position: "absolute", top: 64, right: 92, display: "flex" }}>
                    <Sparkle size={24} color='#c4b5fd' opacity={0.85} />
                </div>
                <div style={{ position: "absolute", bottom: 96, right: 170, display: "flex" }}>
                    <Sparkle size={18} color='#a5b4fc' opacity={0.7} />
                </div>
                <div style={{ position: "absolute", bottom: 130, left: 120, display: "flex" }}>
                    <Sparkle size={22} color='#a5b4fc' opacity={0.75} />
                </div>

                {/* Tilted tarot cards framing the content */}
                <div
                    style={{
                        position: "absolute",
                        left: -34,
                        top: height / 2 - 128,
                        display: "flex",
                        opacity: 0.85,
                    }}
                >
                    <TarotCard rotate={-14} glyph='moon' />
                </div>
                <div
                    style={{
                        position: "absolute",
                        right: -34,
                        top: height / 2 - 172,
                        display: "flex",
                        opacity: 0.85,
                    }}
                >
                    <TarotCard rotate={14} glyph='sun' />
                </div>

                {/* Central content */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: "0 220px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 132,
                            height: 132,
                            borderRadius: 9999,
                            marginBottom: 28,
                            boxShadow:
                                "0 0 70px rgba(99,102,241,0.75), 0 0 24px rgba(139,92,246,0.5)",
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={logoSrc}
                            alt=''
                            width={132}
                            height={132}
                            style={{ width: 132, height: 132, borderRadius: 9999 }}
                        />
                    </div>

                    <div
                        style={{
                            fontFamily: "'Playfair Display'",
                            fontSize: 92,
                            fontWeight: 700,
                            color: "#f8fafc",
                            lineHeight: 1.05,
                            letterSpacing: -1,
                        }}
                    >
                        AskingFate
                    </div>

                    {/* Divider */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            margin: "26px 0",
                        }}
                    >
                        <div
                            style={{
                                width: 130,
                                height: 1.5,
                                background:
                                    "linear-gradient(to left, #818cf8, rgba(129,140,248,0))",
                            }}
                        />
                        <Sparkle size={16} color='#c4b5fd' opacity={1} />
                        <div
                            style={{
                                width: 130,
                                height: 1.5,
                                background:
                                    "linear-gradient(to right, #818cf8, rgba(129,140,248,0))",
                            }}
                        />
                    </div>

                    <div
                        style={{
                            fontSize: 34,
                            fontWeight: 600,
                            color: "#dfe3ff",
                            letterSpacing: 5,
                            textTransform: "uppercase",
                        }}
                    >
                        AI-Powered Fortune Reading
                    </div>

                    <div
                        style={{
                            display: "flex",
                            fontSize: 25,
                            fontWeight: 400,
                            color: "#9aa0d8",
                            marginTop: 18,
                            letterSpacing: 1,
                        }}
                    >
                        Tarot · Astrology · Horoscope · Spiritual Guidance
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            marginTop: 34,
                            padding: "12px 34px",
                            borderRadius: 9999,
                            backgroundColor: "rgba(99,102,241,0.16)",
                            border: "1px solid rgba(129,140,248,0.5)",
                            color: "#c7d2fe",
                            fontSize: 24,
                            fontWeight: 600,
                            letterSpacing: 2,
                        }}
                    >
                        askingfate.com
                    </div>
                </div>
            </div>
        ),
        {
            width,
            height,
            fonts: [
                {
                    name: "Playfair Display",
                    data: playfair,
                    weight: 700,
                    style: "normal",
                },
                {
                    name: "Source Sans 3",
                    data: sourceSans,
                    weight: 400,
                    style: "normal",
                },
                {
                    name: "Source Sans 3",
                    data: sourceSansSemibold,
                    weight: 600,
                    style: "normal",
                },
            ],
        },
    )
}
