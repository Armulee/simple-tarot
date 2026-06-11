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
    return `${t.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`
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

type RichRun = { text: string; bold?: boolean; italic?: boolean; gold?: boolean }
type RichBlock = { type: "paragraph" | "item"; marker?: string; runs: RichRun[] }

function decodeHtmlEntities(s: string): string {
    return s
        .replace(/&nbsp;/gi, " ")
        .replace(/&quot;/gi, '"')
        .replace(/&#0*39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&amp;/gi, "&")
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Remove card titles from the AI-authored `detailedHtml` (mirrors the
 * on-screen `PrivacyDetailedHtml` strip behaviour) so the share image's
 * detailed block never names the cards.
 */
function stripCardNamesFromHtml(html: string, cardNames: string[]): string {
    if (!html) return html
    const labels = new Set<string>()
    for (const raw of cardNames) {
        const full = String(raw ?? "").trim()
        const base = full
            .replace(/\s*\(reversed\)/gi, "")
            .replace(/\s*\breversed\b/gi, "")
            .trim()
        for (const label of [full, base, `${base} (Reversed)`, `${base} Reversed`]) {
            if (label.length >= 5) labels.add(label)
        }
    }
    let out = html
    for (const label of [...labels].sort((a, b) => b.length - a.length)) {
        out = out.replace(new RegExp(escapeRegExp(label), "gi"), "")
    }
    return out.replace(/[ \t ]{2,}/g, " ")
}

/**
 * Parse the sanitized `detailedHtml` tag subset (<p>, <strong>/<b>, <em>/<i>,
 * <ul>, <ol>, <li>, <br>, <span class="highlight-gold">) into flat blocks of
 * styled inline runs that Satori can render. Unknown tags are ignored (their
 * text content is kept), except <script>/<style> whose content is dropped.
 */
function parseDetailedHtml(html: string): RichBlock[] {
    const input = String(html ?? "").trim()
    if (!input) return []

    const blocks: RichBlock[] = []
    let runs: RichRun[] = []
    let bold = 0
    let italic = 0
    let gold = 0
    const spanGoldStack: boolean[] = []
    let listType: "ul" | "ol" | null = null
    let listIndex = 0
    let blockType: RichBlock["type"] = "paragraph"
    let marker: string | undefined
    let skipDepth = 0

    const flush = () => {
        const kept = runs.filter((r) => r.text.length > 0)
        if (kept.length > 0) {
            kept[0] = { ...kept[0], text: kept[0].text.replace(/^\s+/, "") }
            const lastIdx = kept.length - 1
            kept[lastIdx] = {
                ...kept[lastIdx],
                text: kept[lastIdx].text.replace(/\s+$/, ""),
            }
        }
        if (kept.some((r) => r.text.trim().length > 0)) {
            blocks.push({ type: blockType, marker, runs: kept })
        }
        runs = []
        blockType = "paragraph"
        marker = undefined
    }

    const pushText = (raw: string) => {
        if (!raw || skipDepth > 0) return
        const text = decodeHtmlEntities(raw).replace(/\s+/g, " ")
        if (!text) return
        runs.push({ text, bold: bold > 0, italic: italic > 0, gold: gold > 0 })
    }

    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s[^>]*)?)\/?>/g
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = tagRe.exec(input))) {
        pushText(input.slice(lastIndex, match.index))
        lastIndex = tagRe.lastIndex
        const isClosing = match[0].startsWith("</")
        const tag = match[1].toLowerCase()
        const attrs = match[2] ?? ""
        if (tag === "script" || tag === "style") {
            skipDepth = Math.max(0, skipDepth + (isClosing ? -1 : 1))
            continue
        }
        if (skipDepth > 0) continue
        switch (tag) {
            case "p":
            case "br":
                flush()
                break
            case "ul":
            case "ol":
                flush()
                listType = isClosing ? null : (tag as "ul" | "ol")
                listIndex = 0
                break
            case "li":
                flush()
                if (!isClosing) {
                    listIndex += 1
                    blockType = "item"
                    marker = listType === "ol" ? `${listIndex}.` : "•"
                }
                break
            case "strong":
            case "b":
                bold = Math.max(0, bold + (isClosing ? -1 : 1))
                break
            case "em":
            case "i":
                italic = Math.max(0, italic + (isClosing ? -1 : 1))
                break
            case "span":
                if (isClosing) {
                    if (spanGoldStack.pop()) gold = Math.max(0, gold - 1)
                } else {
                    const isGold = /highlight-gold/i.test(attrs)
                    spanGoldStack.push(isGold)
                    if (isGold) gold += 1
                }
                break
            default:
                break
        }
    }
    pushText(input.slice(lastIndex))
    flush()
    return blocks
}

type WordSegmenter = {
    segment: (input: string) => Iterable<{ segment: string }>
}

/**
 * Split a run into wrappable tokens. Satori only wraps between flex items in
 * a flex-wrap row, and `Intl.Segmenter` knows Thai/Lao word boundaries that
 * plain whitespace splitting misses. Trailing spaces/punctuation are glued to
 * the previous token so lines never start with them.
 */
function tokenizeWords(text: string): string[] {
    try {
        const SegmenterCtor = (
            Intl as unknown as {
                Segmenter?: new (
                    locale?: string,
                    opts?: { granularity: string },
                ) => WordSegmenter
            }
        ).Segmenter
        if (SegmenterCtor) {
            const tokens: string[] = []
            const segments = new SegmenterCtor(undefined, {
                granularity: "word",
            }).segment(text)
            for (const part of segments) {
                const piece = part.segment
                if (
                    tokens.length > 0 &&
                    /^[\s.,!?;:)\]}»…"'`]+$/.test(piece)
                ) {
                    tokens[tokens.length - 1] += piece
                } else {
                    tokens.push(piece)
                }
            }
            if (tokens.length > 0) return tokens
        }
    } catch {}
    return text.split(/(?<=\s)/)
}

function truncateRichBlocks(blocks: RichBlock[], maxChars: number): RichBlock[] {
    const out: RichBlock[] = []
    let used = 0
    for (const block of blocks) {
        if (used >= maxChars) break
        const runs: RichRun[] = []
        for (const run of block.runs) {
            const remaining = maxChars - used
            if (remaining <= 0) break
            if (run.text.length <= remaining) {
                runs.push(run)
                used += run.text.length
            } else {
                const cut = run.text
                    .slice(0, Math.max(0, remaining - 1))
                    .trimEnd()
                if (cut) runs.push({ ...run, text: `${cut}…` })
                used = maxChars
            }
        }
        if (runs.length > 0) out.push({ ...block, runs })
    }
    return out
}

function generateStars(count: number, width: number, height: number) {
    const stars = []
    for (let i = 0; i < count; i++) {
        // Random position
        const left = Math.random() * width
        const top = Math.random() * height

        // Random size (1.5-4px)
        const size = 1.5 + Math.random() * 2.5

        // Varying opacity - some stars are more faded (0.25-1.0)
        const isFaded = Math.random() < 0.3
        const opacity = isFaded
            ? 0.25 + Math.random() * 0.3 // 0.25-0.55 for faded
            : 0.55 + Math.random() * 0.45 // 0.55-1.0 for brighter

        // Mostly white, with warm gold and cool blue accents for a
        // lived-in night sky (flat fills — cheap for the rasterizer)
        const roll = Math.random()
        const color =
            roll < 0.72
                ? "255, 255, 255"
                : roll < 0.88
                  ? "252, 211, 77"
                  : "191, 219, 254"

        stars.push({
            left,
            top,
            size,
            opacity,
            color,
        })
    }
    return stars
}

/**
 * Four-point "twinkle" sparkles scattered across the sky. Rendered as flat
 * SVG fills (no blur filters), so they add sparkle without render cost.
 */
function generateSparkles(count: number, width: number, height: number) {
    return Array.from({ length: count }, () => ({
        left: Math.random() * (width - 60),
        top: Math.random() * (height - 60),
        size: 10 + Math.random() * 24,
        opacity: 0.3 + Math.random() * 0.55,
        gold: Math.random() < 0.45,
        rotate: Math.floor(Math.random() * 90),
    }))
}

/**
 * Per-instance caches: card art, logo and fonts are immutable build assets,
 * so re-reading + re-encoding them per request only burns render time.
 */
const cardImageCache = new Map<string, string | null>()
let logoCache: string | null | undefined
let storyBgCache: string | null | undefined
let fontsPromise: Promise<ShareFont[]> | null = null

type ShareFont = {
    name: string
    data: Buffer
    weight: 400 | 700
    style: "normal"
}

const SHARE_FONT_FILES: Array<[string, string, 400 | 700]> = [
    ["Noto Sans", "noto-sans-400.ttf", 400],
    ["Noto Sans", "noto-sans-700.ttf", 700],
    ["Noto Sans Thai", "noto-sans-thai-400.ttf", 400],
    ["Noto Sans Thai", "noto-sans-thai-700.ttf", 700],
    ["Noto Sans Lao", "noto-sans-lao-400.ttf", 400],
    ["Noto Sans Lao", "noto-sans-lao-700.ttf", 700],
    ["Playfair Display", "playfair-display-700.ttf", 700],
    ["Noto Serif Thai", "noto-serif-thai-700.ttf", 700],
]

/**
 * Bundled fonts keep Satori from fetching glyph subsets from Google Fonts on
 * every render — that network round-trip dominated generation time.
 */
function loadShareFonts(): Promise<ShareFont[]> {
    if (!fontsPromise) {
        fontsPromise = Promise.all(
            SHARE_FONT_FILES.map(async ([name, file, weight]) => ({
                name,
                data: await readFile(
                    join(process.cwd(), "public", "fonts", "share", file),
                ),
                weight,
                style: "normal" as const,
            })),
        ).catch((error) => {
            console.error("Error loading share fonts:", error)
            fontsPromise = null
            return []
        })
    }
    return fontsPromise
}

const SANS_STACK = "Noto Sans, Noto Sans Thai, Noto Sans Lao"
const SERIF_STACK = "Playfair Display, Noto Serif Thai, Noto Sans Thai, Noto Sans Lao"

async function readImageAsBase64(slug: string) {
    if (cardImageCache.has(slug)) return cardImageCache.get(slug) ?? null
    let src: string | null = null
    try {
        // Prefer the pre-shrunk share variants (~80KB JPEG vs multi-MB PNG
        // scans) — decoding the originals was the other big render cost.
        const buffer = await readFile(
            join(
                process.cwd(),
                "public",
                "assets",
                "rider-waite-tarot-share",
                `${slug}.jpg`,
            ),
        )
        src = `data:image/jpeg;base64,${buffer.toString("base64")}`
    } catch {
        try {
            const buffer = await readFile(
                join(
                    process.cwd(),
                    "public",
                    "assets",
                    "rider-waite-tarot",
                    `${slug}.png`,
                ),
            )
            src = `data:image/png;base64,${buffer.toString("base64")}`
        } catch (error) {
            console.error(`Error reading image for slug ${slug}:`, error)
            src = null
        }
    }
    cardImageCache.set(slug, src)
    return src
}

/** Hand-illustrated night-sky artwork used as the story canvas. */
async function readStoryBackground() {
    if (storyBgCache !== undefined) return storyBgCache
    try {
        const filePath = join(
            process.cwd(),
            "public",
            "assets",
            "share",
            "story-background.jpg",
        )
        const buffer = await readFile(filePath)
        storyBgCache = `data:image/jpeg;base64,${buffer.toString("base64")}`
    } catch (error) {
        console.error("Error reading story background:", error)
        storyBgCache = null
    }
    return storyBgCache
}

async function readLogoAsBase64() {
    if (logoCache !== undefined) return logoCache
    try {
        const filePath = join(process.cwd(), "public", "assets", "logo.png")
        const buffer = await readFile(filePath)
        logoCache = `data:image/png;base64,${buffer.toString("base64")}`
    } catch (error) {
        console.error("Error reading logo:", error)
        logoCache = null
    }
    return logoCache
}


const GOLD_SOFT = "rgba(232, 198, 106, 0.92)"
const PANEL_BG = "rgba(10, 16, 44, 0.66)"
const PANEL_BORDER = "1px solid rgba(216, 181, 109, 0.5)"
const CRESCENT_PATH = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
const STAR_GLYPH_PATH =
    "M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"

/** Centered gold "— ◆ LABEL ◆ —" heading used by every story section. */
function sectionLabel(text: string, lineWidth = 84) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
            }}
        >
            <div
                style={{
                    width: lineWidth,
                    height: 1,
                    background:
                        "linear-gradient(90deg, rgba(216,181,109,0), rgba(216,181,109,0.65))",
                }}
            />
            <div
                style={{
                    width: 7,
                    height: 7,
                    transform: "rotate(45deg)",
                    background: GOLD_SOFT,
                }}
            />
            <div
                style={{
                    fontSize: 21,
                    fontWeight: 700,
                    letterSpacing: 6,
                    textTransform: "uppercase",
                    color: GOLD_SOFT,
                }}
            >
                {text}
            </div>
            <div
                style={{
                    width: 7,
                    height: 7,
                    transform: "rotate(45deg)",
                    background: GOLD_SOFT,
                }}
            />
            <div
                style={{
                    width: lineWidth,
                    height: 1,
                    background:
                        "linear-gradient(90deg, rgba(216,181,109,0.65), rgba(216,181,109,0))",
                }}
            />
        </div>
    )
}

/** Art-deco corner flourish: two arcs + a small diamond, flat strokes only. */
function cornerOrnament(
    rotation: number,
    position: { top?: number; bottom?: number; left?: number; right?: number },
) {
    return (
        <svg
            width='76'
            height='76'
            viewBox='0 0 76 76'
            xmlns='http://www.w3.org/2000/svg'
            style={{
                position: "absolute",
                ...position,
                transform: `rotate(${rotation}deg)`,
                opacity: 0.9,
            }}
        >
            <path
                d='M70 12 C44 14 14 44 12 70'
                stroke='rgba(216,181,109,0.6)'
                strokeWidth='1.5'
                fill='none'
            />
            <path
                d='M60 7 C38 11 11 38 7 60'
                stroke='rgba(216,181,109,0.35)'
                strokeWidth='1'
                fill='none'
            />
            <path d='M16 9 L23 16 L16 23 L9 16 Z' fill='rgba(232,198,106,0.9)' />
        </svg>
    )
}

/**
 * One-time pipeline warm-up: loads fonts/logo/background into the module
 * caches and renders a tiny throwaway canvas so Satori + the resvg WASM and
 * the font parser are initialized before the first real request. The client
 * pings GET /api/share-image as soon as a reading is on screen.
 */
let warmUpPromise: Promise<void> | null = null
function warmUpPipeline(): Promise<void> {
    if (!warmUpPromise) {
        warmUpPromise = (async () => {
            const [, , shareFonts] = await Promise.all([
                readLogoAsBase64(),
                readStoryBackground(),
                loadShareFonts(),
            ])
            const probe = new ImageResponse(
                (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            background: "#0a1232",
                            color: "#ffffff",
                            fontSize: 12,
                        }}
                    >
                        Aก
                    </div>
                ),
                {
                    width: 32,
                    height: 32,
                    fonts: shareFonts.length > 0 ? shareFonts : undefined,
                },
            )
            await probe.arrayBuffer()
        })().catch((error) => {
            console.error("share-image warm-up failed:", error)
            warmUpPromise = null
        })
    }
    return warmUpPromise
}

export async function GET() {
    await warmUpPipeline()
    return new Response(null, { status: 204 })
}

/**
 * Tiny LRU of finished renders. Re-downloading the same reading (or the
 * download right after the sheet preview) returns instantly instead of
 * re-painting an identical image.
 */
const renderedImageCache = new Map<string, { buffer: ArrayBuffer; at: number }>()
const RENDERED_CACHE_MAX = 6
const RENDERED_CACHE_TTL_MS = 10 * 60 * 1000

function pngResponse(buffer: ArrayBuffer): Response {
    return new Response(buffer, {
        headers: {
            "Content-Type": "image/png",
            "Content-Length": buffer.byteLength.toString(),
        },
    })
}

export async function POST(req: Request) {
    try {
        const {
            question = "",
            cards = [],
            interpretation = "",
            headline = "",
            subtitle = "",
            keyMessage = "",
            detailedHtml = "",
            insights = [],
            cta = "",
            width = 1080,
            height = 1920,
            branding = "AskingFate",
        } = await req.json()

        const cacheKey = JSON.stringify([
            question,
            cards,
            interpretation,
            headline,
            subtitle,
            keyMessage,
            detailedHtml,
            insights,
            cta,
            width,
            height,
            branding,
        ])
        const cached = renderedImageCache.get(cacheKey)
        if (cached && Date.now() - cached.at < RENDERED_CACHE_TTL_MS) {
            renderedImageCache.delete(cacheKey)
            renderedImageCache.set(cacheKey, { ...cached, at: cached.at })
            return pngResponse(cached.buffer)
        }

        const safeQuestion = String(question)
        const safeInterpretation = String(interpretation)

        // origin is less critical now for cards, but might be useful for debugging
        const origin = new URL(req.url).origin

        const cardNames = Array.isArray(cards)
            ? cards.map((c) => String(c))
            : [String(cards)]

        // Pre-load images from disk. The story layout renders the full
        // spread (up to 12 cards); horizontal layouts still slice to 3.
        const cardPromises = cardNames
            .filter(Boolean)
            .slice(0, 12)
            .map(async (name) => {
                const { slug, isReversed } = slugifyCardName(name)
                // Read from disk instead of fetch
                const base64 = await readImageAsBase64(slug)
                // Fallback to URL if disk read fails (unlikely if file exists)
                const src =
                    base64 || `${origin}/assets/rider-waite-tarot/${slug}.png`

                // A card Satori can't size (missing asset + dead URL) would
                // fail the whole render — drop it instead.
                if (!base64) {
                    try {
                        const head = await fetch(src, { method: "HEAD" })
                        if (!head.ok) return null
                    } catch {
                        return null
                    }
                }

                return { name, slug, isReversed, src }
            })

        const parsedCards = (await Promise.all(cardPromises)).filter(
            (card): card is NonNullable<typeof card> => card !== null,
        )

        // Load logo + bundled fonts (both cached per instance)
        const [logoBase64, shareFonts, storyBgSrc] = await Promise.all([
            readLogoAsBase64(),
            loadShareFonts(),
            readStoryBackground(),
        ])
        const logoSrc = logoBase64 || `${origin}/assets/logo.png`

        const imageWidth = Number(width) || 1080
        const imageHeight = Number(height) || 1920
        const basePadding = 72
        const isWideLayout = imageWidth >= imageHeight
        const isStoryAspect = imageHeight > imageWidth * 1.5
        const paddingBottom = basePadding + (isWideLayout ? 140 : 0)
        const maxInterpretChars = isStoryAspect ? 400 : isWideLayout ? 200 : 280

        const displayQuestion = truncate(safeQuestion, 140)
        const displayInterpretation = truncate(
            safeInterpretation,
            maxInterpretChars,
        )

        // Extract keywords and content from interpretation
        const { keywords, content } = extractKeywordsAndContent(
            displayInterpretation,
        )
        const finalInterpretation = content || displayInterpretation || "—"

        const isHorizontal = !isStoryAspect
        const hCardScale = 0.4
        const maxContentWidth = isStoryAspect
            ? 980
            : isWideLayout
              ? 1600
              : 980

        // The illustrated artwork replaces every procedural sky layer for
        // the story format; the composed sky stays as the fallback and for
        // the horizontal formats the art's portrait framing doesn't fit.
        const useStoryBgImage = isStoryAspect && Boolean(storyBgSrc)
        const stars = generateStars(85, imageWidth, imageHeight)
        const sparkles = generateSparkles(16, imageWidth, imageHeight)

        // ---- Story (9:16) rich layout data ----
        // Content column is maxContentWidth-capped to 980 but padded to 936
        // on a 1080 canvas; all card-row math uses that effective width.
        const storyContentWidth = 1080 - basePadding * 2
        const storyCards = parsedCards
        const storyCount = storyCards.length
        const storyPerRow =
            storyCount <= 6 ? Math.max(storyCount, 1) : Math.ceil(storyCount / 2)
        const storyCardGap = storyCount <= 4 ? 18 : 14
        // Spreads up to 6 cards get framed panels with the card name (plus
        // the per-card insight line for 1-3 cards, like the reference
        // poster); bigger spreads fall back to bare gold-bordered tiles.
        const usePanels = storyCount > 0 && storyCount <= 6
        const storyPanelPad = storyCount <= 3 ? 14 : 10
        const storyInsights = Array.isArray(insights)
            ? insights.map((i) => String(i ?? ""))
            : []
        const showCardInsights =
            storyCount > 0 &&
            storyCount <= 3 &&
            storyInsights.some((i) => i.trim().length > 0)
        const storyMaxCardW =
            storyCount <= 1
                ? 300
                : storyCount === 2
                  ? 256
                  : storyCount === 3
                    ? 228
                    : storyCount === 4
                      ? 190
                      : 150
        const storyCardW = Math.round(
            Math.min(
                (storyContentWidth - (storyPerRow - 1) * storyCardGap) /
                    Math.max(storyPerRow, 1) -
                    (usePanels ? storyPanelPad * 2 + 2 : 0),
                storyMaxCardW,
            ),
        )
        const storyCardH = Math.round(storyCardW * 1.728)
        const storyPanelW = storyCardW + storyPanelPad * 2 + 2
        const cardLabelSize = storyCount <= 3 ? 24 : storyCount === 4 ? 19 : 15

        const storyHeadline = truncate(
            String(headline ?? "").trim() || String(keyMessage ?? "").trim(),
            120,
        )
        const storySubtitle = truncate(String(subtitle ?? ""), 200)
        const headlineFontSize =
            storyHeadline.length <= 30 ? 54 : storyHeadline.length <= 60 ? 46 : 38

        const strippedDetailedHtml = stripCardNamesFromHtml(
            String(detailedHtml ?? ""),
            cardNames,
        )
        let storyBlocks = parseDetailedHtml(strippedDetailedHtml)
        const hasRichDetail = storyBlocks.length > 0
        if (!hasRichDetail && finalInterpretation && finalInterpretation !== "—") {
            storyBlocks = [
                { type: "paragraph", runs: [{ text: finalInterpretation }] },
            ]
        }
        const detailBudget =
            storyCount >= 7
                ? 400
                : storyCount >= 4
                  ? 500
                  : showCardInsights
                    ? 460
                    : 600
        storyBlocks = truncateRichBlocks(storyBlocks, detailBudget)
        const detailChars = storyBlocks.reduce(
            (sum, block) =>
                sum + block.runs.reduce((s, run) => s + run.text.length, 0),
            0,
        )
        const detailFontSize = detailChars > 430 ? 26 : 29
        const showStoryKeywords = !hasRichDetail && keywords.length > 0
        const ctaText =
            truncate(String(cta ?? ""), 70) ||
            "Ask your own question at askingfate.com"

        const imageResponse = new ImageResponse(
            (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        paddingTop: basePadding,
                        paddingRight: basePadding,
                        paddingLeft: basePadding,
                        paddingBottom,
                        boxSizing: "border-box",
                        background: useStoryBgImage
                            ? "#0a1232"
                            : "radial-gradient(1500px 1000px at 50% -10%, rgba(64, 90, 176, 0.5) 0%, rgba(30, 45, 105, 0.32) 35%, rgba(7, 11, 34, 1) 75%), radial-gradient(1200px 900px at 85% 105%, rgba(45, 65, 140, 0.35) 0%, rgba(7, 11, 34, 1) 65%)",
                        color: "#ffffff",
                        fontFamily: SANS_STACK,
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {useStoryBgImage ? (
                        /* Illustrated night-sky artwork — moon, stars, gold
                           clouds and frame are baked into the painting */
                        <img
                            src={storyBgSrc as string}
                            width={imageWidth}
                            height={imageHeight}
                            style={{
                                position: "absolute",
                                inset: 0,
                                objectFit: "cover",
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                            }}
                        >
                    <div
                        style={{
                            position: "absolute",
                            top: -280,
                            left: -300,
                            width: 900,
                            height: 900,
                            borderRadius: 9999,
                            background:
                                "radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.22), rgba(30, 64, 175, 0.12) 40%, rgba(37, 99, 235, 0.00) 70%)",
                            opacity: 0.6,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: -350,
                            right: -340,
                            width: 1100,
                            height: 1100,
                            borderRadius: 9999,
                            background:
                                "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.18), rgba(37, 99, 235, 0.1) 40%, rgba(59, 130, 246, 0.00) 70%)",
                            opacity: 0.55,
                        }}
                    />

                    {/* Cosmic starfield — dots, soft halos and four-point
                        twinkles flattened into ONE svg layer so Satori/resvg
                        treat the whole sky as a single node */}
                    <svg
                        width={imageWidth}
                        height={imageHeight}
                        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
                        xmlns='http://www.w3.org/2000/svg'
                        style={{ position: "absolute", top: 0, left: 0 }}
                    >
                        {stars.slice(0, 10).map((star, idx) => (
                            <circle
                                key={`halo-${idx}`}
                                cx={star.left}
                                cy={star.top}
                                r={star.size * 3.2}
                                fill='rgba(255,255,255,0.12)'
                            />
                        ))}
                        {stars.map((star, idx) => (
                            <circle
                                key={`star-${idx}`}
                                cx={star.left}
                                cy={star.top}
                                r={star.size / 2}
                                fill={`rgba(${star.color}, 1)`}
                                opacity={star.opacity}
                            />
                        ))}
                        {sparkles.map((sparkle, idx) => (
                            <path
                                key={`sparkle-${idx}`}
                                d='M12 0C12.7 7.3 16.7 11.3 24 12C16.7 12.7 12.7 16.7 12 24C11.3 16.7 7.3 12.7 0 12C7.3 11.3 11.3 7.3 12 0Z'
                                fill={
                                    sparkle.gold
                                        ? "rgba(252,211,77,0.95)"
                                        : "rgba(255,255,255,0.95)"
                                }
                                opacity={sparkle.opacity}
                                transform={`translate(${Math.round(sparkle.left)} ${Math.round(sparkle.top)}) scale(${(sparkle.size / 24).toFixed(2)}) rotate(${sparkle.rotate} 12 12)`}
                            />
                        ))}
                    </svg>
                    {/* Vignette to frame content */}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "radial-gradient(1200px 900px at 50% 10%, rgba(2,6,23,0) 0%, rgba(2,6,23,0.35) 60%, rgba(2,6,23,0.75) 100%)",
                            pointerEvents: "none",
                        }}
                    />
                    {/* Ornate double gold frame with corner flourishes */}
                    <div
                        style={{
                            position: "absolute",
                            top: 22,
                            left: 22,
                            right: 22,
                            bottom: 22,
                            borderRadius: 34,
                            border: "2px solid rgba(216,181,109,0.5)",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            top: 32,
                            left: 32,
                            right: 32,
                            bottom: 32,
                            borderRadius: 26,
                            border: "1px solid rgba(216,181,109,0.26)",
                        }}
                    />
                    {cornerOrnament(0, { top: 34, left: 34 })}
                    {cornerOrnament(90, { top: 34, right: 34 })}
                    {cornerOrnament(180, { bottom: 34, right: 34 })}
                    {cornerOrnament(270, { bottom: 34, left: 34 })}
                    {/* Crescent moon */}
                    <svg
                        width='46'
                        height='46'
                        viewBox='0 0 24 24'
                        fill='rgba(232,198,106,0.8)'
                        xmlns='http://www.w3.org/2000/svg'
                        style={{
                            position: "absolute",
                            top: 110,
                            left: 92,
                            transform: "rotate(-18deg)",
                        }}
                    >
                        <path d={CRESCENT_PATH} />
                    </svg>
                    {/* Signature star glyphs */}
                    <svg
                        width='200'
                        height='200'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='rgba(232,198,106,0.55)'
                        strokeWidth='1.2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        xmlns='http://www.w3.org/2000/svg'
                        style={{
                            position: "absolute",
                            top: 120,
                            right: 120,
                            opacity: 0.3,
                        }}
                    >
                        <path d='M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z' />
                    </svg>
                    <svg
                        width='260'
                        height='260'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='rgba(232,198,106,0.4)'
                        strokeWidth='0.8'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        xmlns='http://www.w3.org/2000/svg'
                        style={{
                            position: "absolute",
                            bottom: 220,
                            left: 140,
                            opacity: 0.25,
                        }}
                    >
                        <path d='M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z' />
                    </svg>
                        </div>
                    )}

                    {/* background card aura — horizontal layouts only; the
                        story layout shows the full spread, so the ghosts only
                        cost render time behind its panels */}
                    {isHorizontal &&
                        parsedCards.slice(0, 3).map((c, idx) => {
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
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            gap: isHorizontal ? 24 : 28,
                            maxWidth: maxContentWidth,
                            width: "100%",
                            margin: "0 auto",
                            flex: 1,
                            minHeight: 0,
                        }}
                    >
                        {/* Brand pill */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 14,
                                position: "relative",
                                alignSelf: isHorizontal
                                    ? "flex-end"
                                    : "center",
                                padding: "10px 26px",
                                borderRadius: 999,
                                background: "rgba(10,16,44,0.55)",
                                border: "1px solid rgba(216,181,109,0.4)",
                            }}
                        >
                            <img
                                src={logoSrc}
                                alt='AskingFate logo'
                                width={50}
                                height={50}
                            />
                            <div
                                style={{
                                    fontFamily: SERIF_STACK,
                                    fontSize: 38,
                                    fontWeight: 700,
                                    letterSpacing: 0.5,
                                    color: "#ecd9a8",
                                }}
                            >
                                {String(branding || "AskingFate")}
                            </div>
                        </div>

                        {isHorizontal ? (
                            /* ===== HORIZONTAL LAYOUT (square / landscape) ===== */
                            <div
                                style={{
                                    display: "flex",
                                    flex: 1,
                                    minHeight: 0,
                                    gap: 36,
                                    alignItems: "stretch",
                                }}
                            >
                                {/* Left column — card(s) */}
                                {parsedCards.length > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 12,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 18,
                                                letterSpacing: 1,
                                                textTransform: "uppercase",
                                                color: "rgba(255,255,255,0.6)",
                                            }}
                                        >
                                            Your cards
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 16,
                                                alignItems: "center",
                                            }}
                                        >
                                            {parsedCards
                                                .slice(0, 3)
                                                .map((c, idx) => (
                                                    <div
                                                        key={`card-${c.slug}-${idx}`}
                                                        style={{
                                                            display: "flex",
                                                            flexDirection:
                                                                "column",
                                                            alignItems:
                                                                "center",
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width:
                                                                    500 *
                                                                    hCardScale,
                                                                height:
                                                                    864 *
                                                                    hCardScale,
                                                                borderRadius: 14,
                                                                position:
                                                                    "relative",
                                                                overflow:
                                                                    "hidden",
                                                                boxShadow:
                                                                    "0 16px 50px -12px rgba(234,179,8,0.6), 0 6px 16px rgba(139,92,246,0.3), 0 0 0 2px rgba(255,255,255,0.15)",
                                                                border: "2px solid rgba(255,255,255,0.2)",
                                                                display: "flex",
                                                                background:
                                                                    "rgba(10,8,26,0.4)",
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    position:
                                                                        "absolute",
                                                                    inset: -40,
                                                                    background:
                                                                        "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.3), rgba(99,102,241,0.0) 50%), radial-gradient(circle at 70% 80%, rgba(234,179,8,0.22), rgba(234,179,8,0.0) 55%)",
                                                                    opacity: 0.8,
                                                                }}
                                                            />
                                                            <img
                                                                src={c.src}
                                                                style={{
                                                                    position:
                                                                        "absolute",
                                                                    inset: 0,
                                                                    objectFit:
                                                                        "cover",
                                                                    transform:
                                                                        c.isReversed
                                                                            ? "rotate(180deg)"
                                                                            : "rotate(0deg)",
                                                                    borderRadius: 12,
                                                                }}
                                                            />
                                                            <div
                                                                style={{
                                                                    position:
                                                                        "absolute",
                                                                    inset: 0,
                                                                    background:
                                                                        "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)",
                                                                    borderRadius: 12,
                                                                }}
                                                            />
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: 16,
                                                                color: "rgba(255,255,255,0.7)",
                                                                textAlign:
                                                                    "center",
                                                                maxWidth:
                                                                    500 *
                                                                    hCardScale,
                                                                lineHeight: 1.3,
                                                            }}
                                                        >
                                                            {c.name}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Right column — question + interpretation */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        flex: 1,
                                        minHeight: 0,
                                        gap: 20,
                                    }}
                                >
                                    {/* Question */}
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 20,
                                                fontWeight: 600,
                                                letterSpacing: 0.5,
                                                textTransform: "uppercase",
                                                color: "rgba(204,203,203,0.95)",
                                                marginBottom: 10,
                                            }}
                                        >
                                            Question
                                        </div>
                                        <div
                                            style={{
                                                fontFamily: SERIF_STACK,
                                                fontSize: 36,
                                                fontWeight: 900,
                                                lineHeight: 1.2,
                                                textShadow:
                                                    "0 3px 14px rgba(56,189,248,0.25)",
                                                color: "rgba(255,255,255,0.98)",
                                                wordBreak: "break-word",
                                                overflowWrap: "break-word",
                                            }}
                                        >
                                            {`"${displayQuestion}"`}
                                        </div>
                                    </div>

                                    {/* Interpretation card */}
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            borderRadius: 24,
                                            padding: 36,
                                            background:
                                                "linear-gradient(135deg, rgba(30,41,59,0.6) 0%, rgba(99,102,241,0.25) 35%, rgba(34,211,238,0.16) 80%)",
                                            boxShadow:
                                                "0 20px 60px -20px rgba(56,189,248,0.5), 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.2)",
                                            border: "1px solid rgba(255,255,255,0.16)",
                                            position: "relative",
                                            flex: 1,
                                            minHeight: 0,
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                width: 100,
                                                height: 100,
                                                borderRadius: "24px 0 0 0",
                                                background:
                                                    "radial-gradient(circle at top left, rgba(139,92,246,0.2), transparent 70%)",
                                                opacity: 0.7,
                                            }}
                                        />
                                        {/* Header */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                marginBottom: 24,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 56,
                                                    height: 56,
                                                    borderRadius: 9999,
                                                    marginRight: 16,
                                                    background:
                                                        "radial-gradient(circle at 30% 30%, rgba(59,130,246,0.28), rgba(99,102,241,0.1))",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    boxShadow:
                                                        "0 6px 20px rgba(56,189,248,0.2)",
                                                }}
                                            >
                                                <svg
                                                    width='36'
                                                    height='36'
                                                    viewBox='0 0 24 24'
                                                    fill='none'
                                                    stroke='rgba(255,255,255,0.95)'
                                                    strokeWidth='1.6'
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    xmlns='http://www.w3.org/2000/svg'
                                                >
                                                    <path d='M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z' />
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
                                                        fontFamily: SERIF_STACK,
                                                        fontSize: 36,
                                                        fontWeight: 600,
                                                        color: "rgba(255,255,255,1)",
                                                        lineHeight: 1.2,
                                                    }}
                                                >
                                                    Interpretation
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 26,
                                                        color: "rgba(255,255,255,0.6)",
                                                        marginTop: 2,
                                                        lineHeight: 1.3,
                                                    }}
                                                >
                                                    AI-powered analysis of your
                                                    cards
                                                </div>
                                            </div>
                                        </div>
                                        {/* Keywords */}
                                        {keywords.length > 0 && (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 14,
                                                }}
                                            >
                                                {keywords.map(
                                                    (keyword, idx) => (
                                                        <div
                                                            key={`keyword-${idx}`}
                                                            style={{
                                                                padding:
                                                                    "6px 18px",
                                                                borderRadius: 9999,
                                                                background:
                                                                    "rgba(255,255,255,0.1)",
                                                                border: "1px solid rgba(255,255,255,0.2)",
                                                                color: "rgba(255,255,255,0.95)",
                                                                fontSize: 24,
                                                                fontWeight: 500,
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            {keyword}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                        {/* Body */}
                                        <div
                                            style={{
                                                fontSize: 28,
                                                lineHeight: 1.6,
                                                whiteSpace: "pre-line",
                                                color: "rgba(255,255,255,0.95)",
                                                fontWeight: 400,
                                                marginTop: 20,
                                                textShadow:
                                                    "0 2px 6px rgba(0,0,0,0.2)",
                                                wordBreak: "break-word",
                                                overflowWrap: "break-word",
                                                flex: 1,
                                                minHeight: 0,
                                                overflow: "hidden",
                                            }}
                                        >
                                            {finalInterpretation}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* ===== STORY LAYOUT (9:16 social story) =====
                               Must be a single explicit flex column — Satori
                               lays fragment children out as an implicit row. */
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 26,
                                    width: "100%",
                                    flex: 1,
                                    minHeight: 0,
                                }}
                            >
                                {/* Question */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        textAlign: "center",
                                        gap: 14,
                                        maxWidth: "100%",
                                    }}
                                >
                                    {sectionLabel("Question")}
                                    <div
                                        style={{
                                            fontFamily: SERIF_STACK,
                                            fontSize: 38,
                                            fontWeight: 800,
                                            lineHeight: 1.25,
                                            color: "#f6ecd2",
                                            textAlign: "center",
                                            maxWidth: "100%",
                                            wordBreak: "break-word",
                                            overflowWrap: "break-word",
                                            textShadow:
                                                "0 2px 10px rgba(7,11,34,0.8)",
                                        }}
                                    >
                                        {`"${displayQuestion}"`}
                                    </div>
                                </div>

                                {/* Cards — the full spread in framed panels */}
                                {storyCards.length > 0 ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 18,
                                            alignItems: "center",
                                        }}
                                    >
                                        {sectionLabel("Your cards")}
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: storyCardGap,
                                                flexWrap: "wrap",
                                                alignItems: "stretch",
                                                justifyContent: "center",
                                                maxWidth: "100%",
                                            }}
                                        >
                                            {storyCards.map((c, idx) => {
                                                const insight =
                                                    showCardInsights
                                                        ? truncate(
                                                              storyInsights[
                                                                  idx
                                                              ] ?? "",
                                                              90,
                                                          )
                                                        : ""
                                                const cardBox = (
                                                    <div
                                                        style={{
                                                            width: storyCardW,
                                                            height: storyCardH,
                                                            borderRadius: 12,
                                                            position:
                                                                "relative",
                                                            overflow:
                                                                "hidden",
                                                            border: "1px solid rgba(216,181,109,0.55)",
                                                            display: "flex",
                                                            background:
                                                                "rgba(7,11,34,0.5)",
                                                        }}
                                                    >
                                                        <img
                                                            src={c.src}
                                                            style={{
                                                                position:
                                                                    "absolute",
                                                                inset: 0,
                                                                objectFit:
                                                                    "cover",
                                                                transform:
                                                                    c.isReversed
                                                                        ? "rotate(180deg)"
                                                                        : "rotate(0deg)",
                                                            }}
                                                        />
                                                    </div>
                                                )
                                                return usePanels ? (
                                                    <div
                                                        key={`card-${c.slug}-${idx}`}
                                                        style={{
                                                            display: "flex",
                                                            flexDirection:
                                                                "column",
                                                            alignItems:
                                                                "center",
                                                            gap: 10,
                                                            width: storyPanelW,
                                                            padding:
                                                                storyPanelPad,
                                                            paddingBottom:
                                                                storyPanelPad +
                                                                4,
                                                            borderRadius: 18,
                                                            background:
                                                                PANEL_BG,
                                                            border: PANEL_BORDER,
                                                        }}
                                                    >
                                                        {cardBox}
                                                        <div
                                                            style={{
                                                                fontFamily:
                                                                    SERIF_STACK,
                                                                fontSize:
                                                                    cardLabelSize,
                                                                fontWeight: 700,
                                                                color: GOLD_SOFT,
                                                                textAlign:
                                                                    "center",
                                                                lineHeight: 1.25,
                                                                maxWidth:
                                                                    storyCardW,
                                                            }}
                                                        >
                                                            {c.name}
                                                        </div>
                                                        {insight ? (
                                                            <div
                                                                style={{
                                                                    fontSize: 17,
                                                                    lineHeight: 1.45,
                                                                    color: "rgba(255,255,255,0.72)",
                                                                    textAlign:
                                                                        "center",
                                                                    maxWidth:
                                                                        storyCardW,
                                                                }}
                                                            >
                                                                {insight}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <div
                                                        key={`card-${c.slug}-${idx}`}
                                                        style={{
                                                            display: "flex",
                                                        }}
                                                    >
                                                        {cardBox}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : null}

                                {/* Key message — the verdict of the reading */}
                                {storyHeadline ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            textAlign: "center",
                                            gap: 14,
                                            borderRadius: 24,
                                            padding: "28px 44px 32px",
                                            background: PANEL_BG,
                                            border: PANEL_BORDER,
                                            maxWidth: "100%",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <svg
                                            width='30'
                                            height='30'
                                            viewBox='0 0 24 24'
                                            fill='rgba(232,198,106,0.9)'
                                            xmlns='http://www.w3.org/2000/svg'
                                            style={{
                                                transform: "rotate(-18deg)",
                                            }}
                                        >
                                            <path d={CRESCENT_PATH} />
                                        </svg>
                                        {sectionLabel("Key message", 60)}
                                        <div
                                            style={{
                                                fontFamily: SERIF_STACK,
                                                fontSize: headlineFontSize,
                                                fontWeight: 800,
                                                lineHeight: 1.25,
                                                color: "#f8eed6",
                                                textAlign: "center",
                                                wordBreak: "break-word",
                                                overflowWrap: "break-word",
                                                textShadow:
                                                    "0 2px 12px rgba(216,181,109,0.25)",
                                            }}
                                        >
                                            {storyHeadline}
                                        </div>
                                        {storySubtitle ? (
                                            <div
                                                style={{
                                                    fontSize: 26,
                                                    lineHeight: 1.5,
                                                    color: "rgba(255,255,255,0.72)",
                                                    textAlign: "center",
                                                    wordBreak: "break-word",
                                                    overflowWrap: "break-word",
                                                }}
                                            >
                                                {storySubtitle}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                {/* Detailed reading — rich text parsed from
                                    the AI's detailedHtml (gold highlights,
                                    bold/italic, lists). Falls back to the
                                    legacy keywords + interpretation text. */}
                                {storyBlocks.length > 0 ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 18,
                                            borderRadius: 24,
                                            padding: "26px 40px 30px",
                                            background: PANEL_BG,
                                            border: PANEL_BORDER,
                                            maxWidth: "100%",
                                            flex: 1,
                                            minHeight: 0,
                                            overflow: "hidden",
                                        }}
                                    >
                                        {sectionLabel("The reading", 60)}
                                        {showStoryKeywords && (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 12,
                                                    justifyContent: "center",
                                                }}
                                            >
                                                {keywords.map(
                                                    (keyword, idx) => (
                                                        <div
                                                            key={`keyword-${idx}`}
                                                            style={{
                                                                padding:
                                                                    "7px 20px",
                                                                borderRadius: 9999,
                                                                background:
                                                                    "rgba(216,181,109,0.1)",
                                                                border: "1px solid rgba(216,181,109,0.4)",
                                                                color: GOLD_SOFT,
                                                                fontSize: 24,
                                                                fontWeight: 500,
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            {keyword}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                fontSize: detailFontSize,
                                                lineHeight: 1.6,
                                                flex: 1,
                                                minHeight: 0,
                                                overflow: "hidden",
                                            }}
                                        >
                                            {storyBlocks.map(
                                                (block, blockIdx) => (
                                                    <div
                                                        key={`detail-${blockIdx}`}
                                                        style={{
                                                            display: "flex",
                                                            flexWrap: "wrap",
                                                            alignItems:
                                                                "flex-start",
                                                            marginTop:
                                                                blockIdx === 0
                                                                    ? 0
                                                                    : Math.round(
                                                                          detailFontSize *
                                                                              0.55,
                                                                      ),
                                                            paddingLeft:
                                                                block.type ===
                                                                "item"
                                                                    ? 6
                                                                    : 0,
                                                        }}
                                                    >
                                                        {block.marker ? (
                                                            <span
                                                                style={{
                                                                    whiteSpace:
                                                                        "pre",
                                                                    color: GOLD_SOFT,
                                                                    fontWeight: 700,
                                                                    marginRight: 14,
                                                                }}
                                                            >
                                                                {block.marker}
                                                            </span>
                                                        ) : null}
                                                        {block.runs.map(
                                                            (run, runIdx) =>
                                                                tokenizeWords(
                                                                    run.text,
                                                                ).map(
                                                                    (
                                                                        token,
                                                                        tokenIdx,
                                                                    ) => (
                                                                        <span
                                                                            key={`detail-${blockIdx}-${runIdx}-${tokenIdx}`}
                                                                            style={{
                                                                                whiteSpace:
                                                                                    "pre-wrap",
                                                                                color: run.gold
                                                                                    ? "#e8c66a"
                                                                                    : "rgba(255,255,255,0.93)",
                                                                                fontWeight:
                                                                                    run.bold ||
                                                                                    run.gold
                                                                                        ? 700
                                                                                        : 400,
                                                                                fontStyle:
                                                                                    run.italic
                                                                                        ? "italic"
                                                                                        : "normal",
                                                                            }}
                                                                        >
                                                                            {
                                                                                token
                                                                            }
                                                                        </span>
                                                                    ),
                                                                ),
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                ) : null}

                                {/* CTA — invite the viewer to ask their own */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 14,
                                        alignSelf: "center",
                                        padding: "15px 42px",
                                        borderRadius: 9999,
                                        border: "1.5px solid rgba(216,181,109,0.65)",
                                        background: "rgba(216,181,109,0.1)",
                                        color: "#ecd9a8",
                                        fontSize: 26,
                                        fontWeight: 600,
                                    }}
                                >
                                    <svg
                                        width='22'
                                        height='22'
                                        viewBox='0 0 24 24'
                                        fill='rgba(232,198,106,0.95)'
                                        xmlns='http://www.w3.org/2000/svg'
                                    >
                                        <path d={STAR_GLYPH_PATH} />
                                    </svg>
                                    {ctaText}
                                    <svg
                                        width='22'
                                        height='22'
                                        viewBox='0 0 24 24'
                                        fill='rgba(232,198,106,0.95)'
                                        xmlns='http://www.w3.org/2000/svg'
                                    >
                                        <path d={STAR_GLYPH_PATH} />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer removed per branding */}
                </div>
            ),
            {
                width: imageWidth,
                height: imageHeight,
                fonts: shareFonts.length > 0 ? shareFonts : undefined,
            },
        )

        const arrayBuffer = await imageResponse.arrayBuffer()
        renderedImageCache.set(cacheKey, { buffer: arrayBuffer, at: Date.now() })
        while (renderedImageCache.size > RENDERED_CACHE_MAX) {
            const oldestKey = renderedImageCache.keys().next().value
            if (oldestKey === undefined) break
            renderedImageCache.delete(oldestKey)
        }
        return pngResponse(arrayBuffer)
    } catch (e) {
        console.error("Share image generation error:", e)
        return new Response(
            `Failed to generate image: ${e instanceof Error ? e.message : String(e)}`,
            { status: 500 },
        )
    }
}
