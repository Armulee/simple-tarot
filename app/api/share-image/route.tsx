// import { readFile } from "node:fs/promises"
// import { join } from "node:path"
import { ImageResponse } from "next/og"
import { Buffer } from "node:buffer"

// export const runtime = "nodejs" // DISABLED: Using default runtime to allow fetch
// export const maxDuration = 60 // Increase timeout for image generation
export const runtime = "edge" // Explicitly use edge runtime for ImageResponse to avoid nodejs bundling issues

function slugifyCardName(raw: string): { slug: string; isReversed: boolean } {
    if (!raw) return { slug: "", isReversed: false };
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
    if (!text) return "";
    const t = String(text).trim()
    if (t.length <= maxChars) return t
    return `${t.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
}

async function readImageAsBase64(slug: string, origin: string) {
    if (!slug) return null;
    try {
        // Fallback to fetch since we are in Edge runtime (or automatic) and can't use fs
        const url = `${origin}/assets/rider-waite-tarot/${slug}.png`
        
        // Add timeout and validation to fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            console.error(`Fetch failed for ${url}: ${res.status} ${res.statusText}`);
            return null
        }
        
        const contentType = res.headers.get("content-type");
        if (contentType && !contentType.startsWith("image/")) {
             console.error(`Invalid content type for ${url}: ${contentType}`);
             return null;
        }

        const buffer = await res.arrayBuffer()
        if (buffer.byteLength === 0) {
            console.error(`Empty buffer for ${url}`);
            return null;
        }
        
        const base64 = Buffer.from(buffer).toString("base64")
        return `data:image/png;base64,${base64}`
    } catch (error) {
        console.error(`Error reading image for slug ${slug}:`, error)
        return null
    }
}

export async function POST(req: Request) {
    try {
        let jsonBody;
        try {
            jsonBody = await req.json();
        } catch (e) {
            console.error("Failed to parse request JSON:", e);
            return new Response("Invalid JSON body", { status: 400 });
        }

        const {
            question = "",
            cards = [],
            interpretation = "",
            width = 1080,
            height = 1350,
            branding = "Asking Fate",
        } = jsonBody

        const safeQuestion = String(question || "")
        const safeInterpretation = String(interpretation || "")

// origin is less critical now for cards, but might be useful for debugging
        let origin = "http://localhost:3000";
        try {
            if (req.headers.get("host")) {
                const proto = req.headers.get("x-forwarded-proto") || "https";
                const host = req.headers.get("host");
                origin = `${proto}://${host}`
            } else {
                 origin = new URL(req.url).origin
            }
        } catch {}

        const cardNames = Array.isArray(cards)
            ? cards.map((c) => String(c))
            : cards
              ? [String(cards)]
              : []

        // Pre-load images from disk
        const cardPromises = cardNames
            .filter(Boolean)
            .slice(0, 3)
            .map(async (name) => {
                const { slug, isReversed } = slugifyCardName(name)
                // Read from disk instead of fetch
                const base64 = await readImageAsBase64(slug, origin)
                // Fallback to URL if disk read fails (unlikely if file exists)
                // Note: fetch within Node runtime might still fail if self-signed cert or other network issues,
                // but base64 is the primary path now.
                const src =
                    base64 || `${origin}/assets/rider-waite-tarot/${slug}.png`

                if (!base64) {
                     console.warn(`Warning: Could not fetch image for slug: ${slug} from ${origin}`);
                }
                
                // If src is still just a URL (fetch failed), this might fail in ImageResponse if not reachable.
                // We'll let it try, but if it fails, ImageResponse might throw "Unsupported image type: unknown".
                
                return { name, slug, isReversed, src }
            })

        const parsedCards = await Promise.all(cardPromises)

        const displayQuestion = truncate(safeQuestion, 140)
        const displayInterpretation = truncate(safeInterpretation, 900)

        return new ImageResponse(
            (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        padding: 64,
                        background:
                            "radial-gradient(1400px 900px at 50% 0%, rgba(99,102,241,0.26) 0%, rgba(168,85,247,0.18) 35%, rgba(10,8,26,1) 72%), radial-gradient(1200px 900px at 50% 100%, rgba(234,179,8,0.18) 0%, rgba(10,8,26,1) 60%)",
                        color: "#ffffff",
                        fontFamily:
                            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial",
                        position: "relative",
                    }}
                >
                    {/* soft glow blobs */}
                    <div
                        style={{
                            position: "absolute",
                            top: -140,
                            left: -160,
                            width: 520,
                            height: 520,
                            borderRadius: 9999,
                            background:
                                "radial-gradient(circle at 30% 30%, rgba(234,179,8,0.40), rgba(234,179,8,0.00) 60%)",
                            filter: "blur(24px)",
                            opacity: 0.6,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: -220,
                            right: -200,
                            width: 720,
                            height: 720,
                            borderRadius: 9999,
                            background:
                                "radial-gradient(circle at 30% 30%, rgba(56,189,248,0.32), rgba(56,189,248,0.00) 60%)",
                            filter: "blur(30px)",
                            opacity: 0.55,
                        }}
                    />

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

                    <div style={{ display: "flex", flexDirection: "column" }}>
                        {/* Brand */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                marginBottom: 26,
                                position: "relative",
                                zIndex: 2,
                            }}
                        >
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 9999,
                                    background:
                                        "linear-gradient(135deg, rgba(234,179,8,0.95), rgba(56,189,248,0.75))",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 900,
                                    color: "#0a081a",
                                    boxShadow:
                                        "0 14px 40px rgba(234,179,8,0.22)",
                                }}
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z" />
                                </svg>
                            </div>
                            <div
                                style={{
                                    fontSize: 30,
                                    fontWeight: 900,
                                    letterSpacing: -0.4,
                                }}
                            >
                                {String(branding || "Asking Fate")}
                            </div>
                        </div>

                        {/* Question card (mirrors tarot/[id] header vibe) */}
                        <div
                            style={{
                                borderRadius: 28,
                                padding: 34,
                                border: "1px solid rgba(255,255,255,0.12)",
                                background:
                                    "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03) 45%, rgba(56,189,248,0.06) 90%)",
                                boxShadow:
                                    "0 18px 70px -30px rgba(56,189,248,0.55)",
                                position: "relative",
                                zIndex: 2,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 20,
                                    opacity: 0.85,
                                    marginBottom: 12,
                                }}
                            >
                                Your question
                            </div>
                            <div
                                style={{
                                    fontFamily:
                                        "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                                    fontSize: 44,
                                    fontWeight: 900,
                                    lineHeight: 1.15,
                                    textShadow:
                                        "0 10px 30px rgba(56,189,248,0.22)",
                                }}
                            >
                                {`“${displayQuestion}”`}
                            </div>

                            {/* Selected cards row */}
                            {parsedCards.length > 0 ? (
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 18,
                                        flexWrap: "wrap",
                                        marginTop: 26,
                                        alignItems: "flex-start",
                                    }}
                                >
                                    {parsedCards.slice(0, 3).map((c, idx) => (
                                        <div
                                            key={`card-${c.slug}-${idx}`}
                                            style={{
                                                width: 170,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 10,
                                                alignItems: "center",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 14,
                                                    padding: "8px 10px",
                                                    borderRadius: 9999,
                                                    background:
                                                        "rgba(255,255,255,0.12)",
                                                    border: "1px solid rgba(99,102,241,0.22)",
                                                    color: "rgba(255,255,255,0.92)",
                                                    textAlign: "center",
                                                    maxWidth: 170,
                                                    overflow: "hidden",
                                                    whiteSpace: "nowrap",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {c.name}
                                            </div>

                                            <div
                                                style={{
                                                    width: 150,
                                                    height: 240,
                                                    borderRadius: 18,
                                                    position: "relative",
                                                    overflow: "hidden",
                                                    boxShadow:
                                                        "0 20px 60px -35px rgba(234,179,8,0.65)",
                                                    border: "1px solid rgba(255,255,255,0.12)",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        inset: -30,
                                                        background:
                                                            "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.35), rgba(99,102,241,0.0) 55%), radial-gradient(circle at 70% 80%, rgba(234,179,8,0.25), rgba(234,179,8,0.0) 60%)",
                                                        filter: "blur(18px)",
                                                        opacity: 0.9,
                                                    }}
                                                />
                                                <img
                                                    src={c.src}
                                                    width={150}
                                                    height={240}
                                                    style={{
                                                        position: "absolute",
                                                        inset: 0,
                                                        objectFit: "cover",
                                                        transform: c.isReversed
                                                            ? "rotate(180deg)"
                                                            : "rotate(0deg)",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        {/* Interpretation card */}
                        <div
                            style={{
                                marginTop: 28,
                                borderRadius: 28,
                                padding: 32,
                                background:
                                    "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.14) 35%, rgba(34,211,238,0.12) 70%)",
                                boxShadow:
                                    "0 20px 70px -35px rgba(56,189,248,0.55)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                position: "relative",
                                zIndex: 2,
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 9999,
                                        background: "rgba(234,179,8,0.18)",
                                        border: "1px solid rgba(234,179,8,0.25)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "rgba(255,255,255,0.9)",
                                        fontWeight: 900,
                                    }}
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        {/* 6-pointed star / spark */}
                                        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" />
                                    </svg>
                                </div>
                                <div
                                    style={{
                                        fontSize: 26,
                                        fontWeight: 900,
                                        letterSpacing: -0.2,
                                    }}
                                >
                                    Your reading
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "block",
                                    fontSize: 28,
                                    lineHeight: 1.5,
                                    whiteSpace: "pre-wrap",
                                    color: "rgba(255,255,255,0.92)",
                                }}
                            >
                                {displayInterpretation || "—"}
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginTop: 28,
                                opacity: 0.85,
                                fontSize: 18,
                                position: "relative",
                                zIndex: 2,
                            }}
                        >
                            <div>Generated with Asking Fate</div>
                            <div>askingfate.com</div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: Number(width) || 1080,
                height: Number(height) || 1350,
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
