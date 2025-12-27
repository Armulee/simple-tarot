import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const runtime = "nodejs"

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

function truncate(text: string, maxChars: number): string {
    const t = String(text ?? "").trim()
    if (t.length <= maxChars) return t
    return `${t.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
}

function extractKeywordsAndContent(text: string): {
    keywords: string[]
    content: string
} {
    if (!text) return { keywords: [], content: text }

    // Split by double newline to find keywords (same logic as interpretation component)
    const parts = text.split(/\n\n/)
    if (parts.length > 1) {
        const keywordsPart = parts[0]
        const content = parts.slice(1).join("\n\n")

        // Extract keywords from comma-separated list
        const keywords = keywordsPart
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k.length > 0)
            .map((k) => {
                // Capitalize first letter
                return k.charAt(0).toUpperCase() + k.slice(1)
            })

        return { keywords, content }
    }

    return { keywords: [], content: text }
}

function generateStars(count: number, width: number, height: number) {
    const stars = []
    for (let i = 0; i < count; i++) {
        // Random position
        const left = Math.random() * width
        const top = Math.random() * height

        // Random size (1-3px)
        const size = 1 + Math.random() * 2

        // Varying opacity - some stars are more faded (0.3-1.0)
        // 30% chance for faded stars (0.3-0.6), 70% for brighter (0.6-1.0)
        const isFaded = Math.random() < 0.1
        const opacity = isFaded
            ? 0.3 + Math.random() * 0.3 // 0.3-0.6 for faded
            : 0.6 + Math.random() * 0.4 // 0.6-1.0 for brighter

        stars.push({
            left,
            top,
            size,
            opacity,
        })
    }
    return stars
}

async function readImageAsBase64(slug: string) {
    try {
        const filePath = join(
            process.cwd(),
            "public",
            "assets",
            "rider-waite-tarot",
            `${slug}.png`
        )
        const buffer = await readFile(filePath)
        const base64 = buffer.toString("base64")
        return `data:image/png;base64,${base64}`
    } catch (error) {
        console.error(`Error reading image for slug ${slug}:`, error)
        return null
    }
}

async function readLogoAsBase64() {
    try {
        const filePath = join(process.cwd(), "public", "assets", "logo.png")
        const buffer = await readFile(filePath)
        const base64 = buffer.toString("base64")
        return `data:image/png;base64,${base64}`
    } catch (error) {
        console.error("Error reading logo:", error)
        return null
    }
}

export async function POST(req: Request) {
    try {
        const {
            question = "",
            cards = [],
            interpretation = "",
            width = 1080,
            height = 1920,
            branding = "Asking Fate",
        } = await req.json()

        const safeQuestion = String(question)
        const safeInterpretation = String(interpretation)

        // origin is less critical now for cards, but might be useful for debugging
        const origin = new URL(req.url).origin

        const cardNames = Array.isArray(cards)
            ? cards.map((c) => String(c))
            : [String(cards)]

        // Pre-load images from disk
        const cardPromises = cardNames
            .filter(Boolean)
            .slice(0, 3)
            .map(async (name) => {
                const { slug, isReversed } = slugifyCardName(name)
                // Read from disk instead of fetch
                const base64 = await readImageAsBase64(slug)
                // Fallback to URL if disk read fails (unlikely if file exists)
                const src =
                    base64 || `${origin}/assets/rider-waite-tarot/${slug}.png`

                return { name, slug, isReversed, src }
            })

        const parsedCards = await Promise.all(cardPromises)

        // Load logo from disk
        const logoBase64 = await readLogoAsBase64()
        const logoSrc = logoBase64 || `${origin}/assets/logo.png`

        const displayQuestion = truncate(safeQuestion, 140)
        const displayInterpretation = truncate(safeInterpretation, 900)

        // Extract keywords and content from interpretation
        const { keywords, content } = extractKeywordsAndContent(
            displayInterpretation
        )
        const finalInterpretation = content || displayInterpretation || "—"

        // Generate stars for background (50 stars for good coverage but fast rendering)
        const stars = generateStars(
            50,
            Number(width) || 1080,
            Number(height) || 1920
        )

        return new ImageResponse(
            (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        padding: 72,
                        background:
                            "radial-gradient(1600px 1000px at 20% 0%, rgba(30, 58, 138, 0.4) 0%, rgba(25, 45, 112, 0.3) 25%, rgba(15, 23, 42, 0.2) 40%, rgba(2, 6, 23, 1) 70%), radial-gradient(1400px 1000px at 80% 100%, rgba(30, 64, 175, 0.3) 0%, rgba(20, 40, 100, 0.2) 30%, rgba(2, 6, 23, 1) 65%), radial-gradient(1000px 800px at 50% 50%, rgba(37, 99, 235, 0.15) 0%, rgba(2, 6, 23, 0.9) 50%)",
                        color: "#ffffff",
                        fontFamily:
                            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Enhanced glow blobs with multiple layers - Deep blue space theme */}
                    <div
                        style={{
                            position: "absolute",
                            top: -180,
                            left: -200,
                            width: 600,
                            height: 600,
                            borderRadius: 9999,
                            background:
                                "radial-gradient(circle at 30% 30%, rgba(37, 99, 235, 0.35), rgba(30, 64, 175, 0.25) 40%, rgba(37, 99, 235, 0.00) 70%)",
                            filter: "blur(40px)",
                            opacity: 0.6,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: -250,
                            right: -240,
                            width: 800,
                            height: 800,
                            borderRadius: 9999,
                            background:
                                "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.2) 40%, rgba(59, 130, 246, 0.00) 70%)",
                            filter: "blur(45px)",
                            opacity: 0.55,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: 900,
                            height: 900,
                            borderRadius: 9999,
                            background:
                                "radial-gradient(circle at center, rgba(30, 58, 138, 0.2), rgba(2, 6, 23, 0.00) 60%)",
                            filter: "blur(60px)",
                            opacity: 0.4,
                        }}
                    />

                    {/* Shining stars background */}
                    {stars.map((star, idx) => (
                        <div
                            key={`star-${idx}`}
                            style={{
                                position: "absolute",
                                left: star.left,
                                top: star.top,
                                width: star.size,
                                height: star.size,
                                borderRadius: "50%",
                                background: "rgba(255, 255, 255, 1)",
                                opacity: star.opacity,
                            }}
                        />
                    ))}

                    {/* background card aura */}
                    {parsedCards.slice(0, 3).map((c, idx) => {
                        const positions: Array<{
                            top?: number
                            bottom?: number
                            left?: number
                            right?: number
                            rotate: number
                        }> = [
                            { top: 120, left: 60, rotate: -14 },
                            { top: 150, right: 80, rotate: 16 },
                            { bottom: 560, left: 80, rotate: -10 },
                        ]
                        const p = positions[idx % positions.length]
                        return (
                            <img
                                key={`bg-${c.slug}-${idx}`}
                                src={c.src}
                                width={260}
                                height={420}
                                style={{
                                    position: "absolute",
                                    ...(p.top != null ? { top: p.top } : {}),
                                    ...(p.bottom != null
                                        ? { bottom: p.bottom }
                                        : {}),
                                    ...(p.left != null ? { left: p.left } : {}),
                                    ...(p.right != null
                                        ? { right: p.right }
                                        : {}),
                                    transform: `rotate(${p.rotate}deg) scale(0.9)`,
                                    opacity: 0.14,
                                }}
                            />
                        )
                    })}

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 32,
                        }}
                    >
                        {/* Enhanced Brand */}
                        <div
                            style={{
                                textAlign: "center",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: 16,
                                marginBottom: 8,
                                position: "relative",
                            }}
                        >
                            <img
                                src={logoSrc}
                                alt='Asking Fate logo'
                                width={56}
                                height={56}
                            />
                            <div
                                style={{
                                    fontSize: 36,
                                    fontWeight: 900,
                                    letterSpacing: -0.5,
                                    color: "rgba(255,255,255,1)",
                                    textShadow:
                                        "0 2px 20px rgba(234,179,8,0.4), 0 0 30px rgba(56,189,248,0.3), 0 4px 8px rgba(0,0,0,0.3)",
                                }}
                            >
                                {String(branding || "Asking Fate")}
                            </div>
                        </div>

                        {/* Enhanced Question card */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                borderRadius: 32,
                                padding: 40,
                                alignItems: "center",
                                textAlign: "center",
                                position: "relative",
                            }}
                        >
                            {/* Decorative corner accent */}
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    width: 120,
                                    height: 120,
                                    borderRadius: "0 32px 0 100%",
                                    background:
                                        "radial-gradient(circle at top right, rgba(234,179,8,0.15), transparent 70%)",
                                    opacity: 0.6,
                                }}
                            />
                            <div
                                style={{
                                    fontSize: 25,
                                    opacity: 0.9,
                                    marginBottom: 16,
                                    fontWeight: 600,
                                    letterSpacing: 0.5,
                                    textTransform: "uppercase",
                                    color: "rgba(204, 203, 203, 0.95)",
                                    textAlign: "center",
                                }}
                            >
                                Question
                            </div>
                            <div
                                style={{
                                    fontFamily:
                                        "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                                    fontSize: 48,
                                    fontWeight: 900,
                                    lineHeight: 1.2,
                                    textShadow:
                                        "0 4px 20px rgba(56,189,248,0.3), 0 2px 8px rgba(139,92,246,0.2)",
                                    color: "rgba(255,255,255,0.98)",
                                    letterSpacing: -0.5,
                                    textAlign: "center",
                                }}
                            >
                                {`"${displayQuestion}"`}
                            </div>
                        </div>

                        {/* Enhanced Selected cards row */}
                        {parsedCards.length > 0 ? (
                            <div
                                style={{
                                    display: "flex",
                                    gap: 24,
                                    flexWrap: "wrap",
                                    marginTop: 32,
                                    alignItems: "flex-start",
                                    justifyContent: "center",
                                }}
                            >
                                {parsedCards.slice(0, 3).map((c, idx) => (
                                    <div
                                        key={`card-${c.slug}-${idx}`}
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 14,
                                            alignItems: "center",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 500 * 0.7,
                                                height: 864 * 0.7,
                                                borderRadius: 20,
                                                position: "relative",
                                                overflow: "hidden",
                                                boxShadow:
                                                    "0 24px 80px -20px rgba(234,179,8,0.7), 0 8px 24px rgba(139,92,246,0.4), 0 0 0 2px rgba(255,255,255,0.15)",
                                                border: "2px solid rgba(255,255,255,0.2)",
                                                display: "flex",
                                                background: "rgba(10,8,26,0.4)",
                                            }}
                                        >
                                            {/* Enhanced glow effect */}
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    inset: -40,
                                                    background:
                                                        "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.45), rgba(99,102,241,0.0) 50%), radial-gradient(circle at 70% 80%, rgba(234,179,8,0.35), rgba(234,179,8,0.0) 55%), radial-gradient(circle at 50% 50%, rgba(139,92,246,0.25), transparent 60%)",
                                                    filter: "blur(24px)",
                                                    opacity: 1,
                                                }}
                                            />
                                            {/* Border glow */}
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    inset: -2,
                                                    borderRadius: 22,
                                                    background:
                                                        "linear-gradient(135deg, rgba(234,179,8,0.3), rgba(139,92,246,0.3), rgba(56,189,248,0.3))",
                                                    filter: "blur(8px)",
                                                    opacity: 0.6,
                                                }}
                                            />
                                            <img
                                                src={c.src}
                                                style={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    objectFit: "cover",
                                                    transform: c.isReversed
                                                        ? "rotate(180deg)"
                                                        : "rotate(0deg)",
                                                    borderRadius: 18,
                                                }}
                                            />
                                            {/* Overlay gradient for depth */}
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    background:
                                                        "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)",
                                                    borderRadius: 18,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {/* Enhanced Interpretation card */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                marginTop: 32,
                                marginBottom: 42,
                                borderRadius: 32,
                                padding: 60,
                                background:
                                    "linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(168,85,247,0.18) 30%, rgba(139,92,246,0.15) 50%, rgba(34,211,238,0.12) 80%, rgba(56,189,248,0.10) 100%)",
                                boxShadow:
                                    "0 24px 80px -25px rgba(56,189,248,0.65), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.2)",
                                border: "1px solid rgba(255,255,255,0.18)",
                                position: "relative",
                            }}
                        >
                            {/* Decorative corner accent */}
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: 140,
                                    height: 140,
                                    borderRadius: "32px 0 0 0",
                                    background:
                                        "radial-gradient(circle at top left, rgba(139,92,246,0.2), transparent 70%)",
                                    opacity: 0.7,
                                }}
                            />

                            {/* Interpretation Header */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    marginBottom: 60,
                                }}
                            >
                                {/* Sparkles icon container */}
                                <div
                                    style={{
                                        width: 100,
                                        height: 100,
                                        borderRadius: 9999,
                                        marginRight: 30,
                                        background: "rgba(59, 130, 246, 0.2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <svg
                                        width='78'
                                        height='78'
                                        viewBox='0 0 24 24'
                                        fill='none'
                                        stroke='rgb(255, 255, 255)'
                                        strokeWidth='2'
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        xmlns='http://www.w3.org/2000/svg'
                                    >
                                        <path d='M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z' />
                                    </svg>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontFamily:
                                                "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                                            fontSize: 50,
                                            fontWeight: 600,
                                            color: "rgba(255,255,255,1)",
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        Interpretation
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 40,
                                            color: "rgba(255,255,255,0.7)",
                                            marginTop: 4,
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        AI-powered analysis of your cards
                                    </div>
                                </div>
                            </div>

                            {/* Keywords badges */}
                            {keywords.length > 0 && (
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 30,
                                    }}
                                >
                                    {keywords.map((keyword, idx) => (
                                        <div
                                            key={`keyword-${idx}`}
                                            style={{
                                                padding: "10px 30px",
                                                borderRadius: 9999,
                                                background:
                                                    "rgba(255,255,255,0.1)",
                                                border: "1px solid rgba(255,255,255,0.2)",
                                                color: "rgba(255,255,255,0.95)",
                                                fontSize: 40,
                                                fontWeight: 500,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {keyword}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Interpretation content */}
                            <div
                                style={{
                                    display: "block",
                                    fontSize: 40,
                                    lineHeight: 1.6,
                                    whiteSpace: "pre-wrap",
                                    color: "rgba(255,255,255,0.95)",
                                    fontWeight: 400,
                                    letterSpacing: -0.2,
                                    marginTop: 40,
                                    textShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                }}
                            >
                                {finalInterpretation}
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Footer - Absolutely positioned at bottom */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "24px 72px",
                            borderTop: "1px solid rgba(255,255,255,0.1)",
                            opacity: 0.9,
                            fontSize: 36,
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                color: "rgba(255,255,255,0.85)",
                                fontWeight: 500,
                            }}
                        >
                            <svg
                                width='35'
                                height='35'
                                viewBox='0 0 24 24'
                                fill='currentColor'
                                xmlns='http://www.w3.org/2000/svg'
                                style={{ opacity: 0.7 }}
                            >
                                <path d='M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z' />
                            </svg>
                            Generated with Asking Fate
                        </div>
                        <div
                            style={{
                                color: "rgba(255, 255, 255, 0.95)",
                                fontWeight: 600,
                                letterSpacing: 0.5,
                            }}
                        >
                            askingfate.com
                        </div>
                    </div>
                </div>
            ),
            {
                width: Number(width) || 1080,
                height: Number(height) || 1920,
                headers: {
                    "Content-Type": "image/png",
                },
            }
        )
    } catch (e) {
        console.error("Share image generation error:", e)
        return new Response(
            `Failed to generate image: ${e instanceof Error ? e.message : String(e)}`,
            { status: 500 }
        )
    }
}
