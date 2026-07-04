import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const runtime = "nodejs"

import {
    type RichBlock,
    extractKeywordsAndContent,
    parseDetailedHtml,
    slugifyCardName,
    stripCardNamesFromHtml,
    truncate,
    truncateRichBlocks,
} from "@/lib/share-rich-text"
import {
    ASTRO_BAND_FRACTION,
    ASTRO_TECHNICAL_BAND_FRACTION,
    buildAstroPlanetLabels,
    type TransitPlanetInput,
} from "@/lib/share-astrology-planets"

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
const shareBgCache = new Map<string, string | null>()
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

type ShareBgVariant = "story" | "post" | "square" | "landscape"
type ShareTheme = "tarot" | "astrology" | "astrology-technical"

/** Subfolder under public/assets/share holding each theme's backgrounds. */
const THEME_BG_DIR: Record<ShareTheme, string[]> = {
    tarot: [],
    astrology: ["astrology"],
    "astrology-technical": ["astrology-technical"],
}

/**
 * Hand-illustrated night-sky paintings (gold crescent moon, star
 * sparkles, gilded clouds, baked-in gold frame) — one per aspect
 * variant, pre-sized to the exact canvas dimensions. The astrology themes
 * swap in the solar-system skies: the daily linear row
 * (public/assets/share/astrology/*) or the technical orbit wheel
 * (public/assets/share/astrology-technical/*).
 */
async function readShareBackground(variant: ShareBgVariant, theme: ShareTheme) {
    const cacheKey = `${theme}:${variant}`
    if (shareBgCache.has(cacheKey)) return shareBgCache.get(cacheKey) ?? null
    let src: string | null = null
    try {
        const buffer = await readFile(
            join(
                process.cwd(),
                "public",
                "assets",
                "share",
                ...THEME_BG_DIR[theme],
                `${variant}-background.jpg`,
            ),
        )
        src = `data:image/jpeg;base64,${buffer.toString("base64")}`
    } catch (error) {
        console.error(`Error reading ${theme} ${variant} background:`, error)
        src = null
    }
    shareBgCache.set(cacheKey, src)
    return src
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
 * The parsed `detailedHtml` blocks as Satori flex rows: gold/bold/italic
 * runs split into wrappable word tokens. Shared by the story and
 * landscape reading panels.
 */
function renderRichBlocks(
    blocks: RichBlock[],
    fontSize: number,
    fitContent = false,
) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                fontSize,
                lineHeight: 1.6,
                // Astrology posters size the panel to its content; growing to
                // fill (flex:1) would collapse the text under an auto-height
                // parent, so only stretch in the tarot layouts.
                ...(fitContent ? {} : { flex: 1, minHeight: 0 }),
                overflow: "hidden",
            }}
        >
            {blocks.map((block, blockIdx) => (
                <div
                    key={`detail-${blockIdx}`}
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "flex-start",
                        marginTop:
                            blockIdx === 0 ? 0 : Math.round(fontSize * 0.55),
                        paddingLeft: block.type === "item" ? 6 : 0,
                    }}
                >
                    {block.marker ? (
                        <span
                            style={{
                                whiteSpace: "pre",
                                color: GOLD_SOFT,
                                fontWeight: 700,
                                marginRight: 14,
                            }}
                        >
                            {block.marker}
                        </span>
                    ) : null}
                    {block.runs.map((run, runIdx) =>
                        tokenizeWords(run.text).map((token, tokenIdx) => (
                            <span
                                key={`detail-${blockIdx}-${runIdx}-${tokenIdx}`}
                                style={{
                                    whiteSpace: "pre-wrap",
                                    color: run.gold
                                        ? "#e8c66a"
                                        : "rgba(255,255,255,0.93)",
                                    fontWeight:
                                        run.bold || run.gold ? 700 : 400,
                                    fontStyle: run.italic
                                        ? "italic"
                                        : "normal",
                                }}
                            >
                                {token}
                            </span>
                        )),
                    )}
                </div>
            ))}
        </div>
    )
}

type ParsedCard = {
    name: string
    slug: string
    isReversed: boolean
    src: string
}

/**
 * The spread as a centered wrap row of gold-framed card tiles; spreads of
 * up to 6 get navy panels with the card name underneath, matching the
 * story poster. Used by the square and landscape layouts.
 */
function renderCardPanelRow({
    cards,
    cardW,
    cardH,
    panelPad,
    panelW,
    labelSize,
    gap,
    usePanels,
}: {
    cards: ParsedCard[]
    cardW: number
    cardH: number
    panelPad: number
    panelW: number
    labelSize: number
    gap: number
    usePanels: boolean
}) {
    return (
        <div
            style={{
                display: "flex",
                gap,
                flexWrap: "wrap",
                alignItems: "stretch",
                justifyContent: "center",
                maxWidth: "100%",
            }}
        >
            {cards.map((c, idx) => {
                const cardBox = (
                    <div
                        style={{
                            width: cardW,
                            height: cardH,
                            borderRadius: 12,
                            position: "relative",
                            overflow: "hidden",
                            border: "1px solid rgba(216,181,109,0.55)",
                            display: "flex",
                            background: "rgba(7,11,34,0.5)",
                        }}
                    >
                        <img
                            src={c.src}
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
                )
                return usePanels ? (
                    <div
                        key={`card-${c.slug}-${idx}`}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                            width: panelW,
                            padding: panelPad,
                            paddingBottom: panelPad + 4,
                            borderRadius: 16,
                            background: PANEL_BG,
                            border: PANEL_BORDER,
                        }}
                    >
                        {cardBox}
                        <div
                            style={{
                                fontFamily: SERIF_STACK,
                                fontSize: labelSize,
                                fontWeight: 700,
                                color: GOLD_SOFT,
                                textAlign: "center",
                                lineHeight: 1.25,
                                maxWidth: cardW,
                            }}
                        >
                            {c.name}
                        </div>
                    </div>
                ) : (
                    <div
                        key={`card-${c.slug}-${idx}`}
                        style={{ display: "flex" }}
                    >
                        {cardBox}
                    </div>
                )
            })}
        </div>
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
            const [, , , , , shareFonts] = await Promise.all([
                readLogoAsBase64(),
                readShareBackground("story", "tarot"),
                readShareBackground("post", "tarot"),
                readShareBackground("square", "tarot"),
                readShareBackground("landscape", "tarot"),
                loadShareFonts(),
                // Astrology skies warm in the background; not part of the
                // gating tuple since the first verdict share can pay for them.
                readShareBackground("story", "astrology"),
                readShareBackground("post", "astrology"),
                readShareBackground("square", "astrology"),
                readShareBackground("landscape", "astrology"),
                readShareBackground("story", "astrology-technical"),
                readShareBackground("post", "astrology-technical"),
                readShareBackground("square", "astrology-technical"),
                readShareBackground("landscape", "astrology-technical"),
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
            theme: themeRaw = "tarot",
            planets = [],
            // Resolved timing-window date ("when will X happen?" verdict);
            // stamped as a gold date crest for the timing strategy only.
            verdictDate = null,
            // Transparent canvas (no painted sky) — the video exporter
            // composites this overlay onto the animated background.
            transparent = false,
        } = await req.json()

        const theme: ShareTheme =
            themeRaw === "astrology"
                ? "astrology"
                : themeRaw === "astrology-technical"
                  ? "astrology-technical"
                  : "tarot"
        // Both astrology themes share the fit-to-content reading panel and
        // bottom-anchored CTA; only the daily theme stamps planet degrees.
        const isAstroTheme =
            theme === "astrology" || theme === "astrology-technical"
        const transitPlanets: TransitPlanetInput[] = Array.isArray(planets)
            ? (planets as TransitPlanetInput[])
            : []

        // Normalize the timing-verdict date crest (timing strategy only).
        const verdictDatePrimary =
            verdictDate &&
            typeof verdictDate === "object" &&
            typeof (verdictDate as { primary?: unknown }).primary === "string"
                ? String((verdictDate as { primary: string }).primary).trim()
                : ""
        const verdictDateSecondary =
            verdictDate &&
            typeof verdictDate === "object" &&
            typeof (verdictDate as { secondary?: unknown }).secondary ===
                "string"
                ? String(
                      (verdictDate as { secondary: string }).secondary,
                  ).trim()
                : ""

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
            theme,
            transitPlanets,
            verdictDatePrimary,
            verdictDateSecondary,
            Boolean(transparent),
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

        const imageWidth = Number(width) || 1080
        const imageHeight = Number(height) || 1920
        const basePadding = 72
        const isStoryAspect = imageHeight > imageWidth * 1.5
        const isLandscape = !isStoryAspect && imageWidth >= imageHeight * 1.2
        // Post (3:4, 1080x1440) shares the story's portrait column layout
        // in a shorter frame; square gets the condensed verdict layout.
        const isPost =
            !isStoryAspect && !isLandscape && imageHeight >= imageWidth * 1.15
        const isSquare = !isStoryAspect && !isLandscape && !isPost
        const bgVariant: ShareBgVariant = isStoryAspect
            ? "story"
            : isLandscape
              ? "landscape"
              : isPost
                ? "post"
                : "square"

        // Load logo + bundled fonts + artwork (all cached per instance)
        const [logoBase64, shareFonts, shareBgSrc] = await Promise.all([
            readLogoAsBase64(),
            loadShareFonts(),
            readShareBackground(bgVariant, theme),
        ])
        const logoSrc = logoBase64 || `${origin}/assets/logo.png`

        // Astrology posters keep a clear band at the bottom for the painted
        // planets and their stamped transit positions; the text column stops
        // above it. Transparent (video overlay) renders skip the reserve.
        const astroBandFraction =
            isAstroTheme && !transparent
                ? (theme === "astrology-technical"
                      ? ASTRO_TECHNICAL_BAND_FRACTION
                      : ASTRO_BAND_FRACTION)[bgVariant]
                : 0
        const astroBand = Math.round(imageHeight * astroBandFraction)
        // Only the daily theme stamps degrees under a linear planet row; the
        // technical orbit-wheel art keeps the planets unlabeled.
        const astroLabels =
            theme === "astrology" && !transparent
                ? buildAstroPlanetLabels(transitPlanets, bgVariant)
                : []

        const paddingBottom = basePadding + astroBand
        const maxInterpretChars = isStoryAspect ? 400 : isLandscape ? 420 : 240

        const displayQuestion = truncate(safeQuestion, isSquare ? 110 : 140)
        const displayInterpretation = truncate(
            safeInterpretation,
            maxInterpretChars,
        )

        // Gold date crest for a timing verdict ("when will X happen?"). Painted
        // between the question and the key-message panel — for the timing
        // strategy only (verdictDatePrimary is empty for every other reading,
        // so this is null and nothing is added to the poster).
        const verdictDateNode = verdictDatePrimary ? (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: 4,
                    maxWidth: "100%",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        fontFamily: SERIF_STACK,
                        fontStyle: "italic",
                        fontSize: isStoryAspect
                            ? 62
                            : isPost
                              ? 54
                              : isSquare
                                ? 50
                                : 52,
                        fontWeight: 800,
                        lineHeight: 1.05,
                        color: "#f4e4b0",
                        textShadow: "0 3px 18px rgba(216,181,109,0.4)",
                        whiteSpace: "nowrap",
                    }}
                >
                    {verdictDatePrimary}
                </div>
                {verdictDateSecondary ? (
                    <div
                        style={{
                            display: "flex",
                            fontSize: 22,
                            fontWeight: 600,
                            letterSpacing: 8,
                            textTransform: "uppercase",
                            color: "rgba(255,255,255,0.6)",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {verdictDateSecondary}
                    </div>
                ) : null}
            </div>
        ) : null

        // Extract keywords and content from interpretation
        const { keywords, content } = extractKeywordsAndContent(
            displayInterpretation,
        )
        const finalInterpretation = content || displayInterpretation || "—"

        const isHorizontal = !isStoryAspect && !isPost
        const maxContentWidth = isStoryAspect
            ? 980
            : imageWidth - basePadding * 2

        // Each variant has its own painted artwork (moon, stars, gold
        // clouds and frame baked in); the procedural sky below is only
        // the fallback when an asset is missing. Transparent renders skip
        // both and keep just the gold frame, for video compositing.
        const useBgArt = Boolean(shareBgSrc) && !transparent
        const stars = generateStars(85, imageWidth, imageHeight)
        const sparkles = generateSparkles(16, imageWidth, imageHeight)

        // ---- Story (9:16) / Post (3:4) rich portrait column data ----
        // Content column is maxContentWidth-capped to 980 but padded to 936
        // on a 1080 canvas; all card-row math uses that effective width.
        // Post shares this layout with tighter caps for the shorter frame.
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
            !isPost &&
            storyCount > 0 &&
            storyCount <= 3 &&
            storyInsights.some((i) => i.trim().length > 0)
        const storyMaxCardW = isPost
            ? storyCount <= 1
                ? 200
                : storyCount === 2
                  ? 176
                  : storyCount === 3
                    ? 156
                    : storyCount === 4
                      ? 136
                      : 112
            : storyCount <= 1
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
        const cardLabelSize = isPost
            ? storyCount <= 3
                ? 20
                : 15
            : storyCount <= 3
              ? 24
              : storyCount === 4
                ? 19
                : 15

        // ---- Square (1:1) / Landscape (16:9) gold layout data ----
        // Same panel treatment as the story poster, tighter size caps. The
        // landscape card column shares the row with the text column.
        const altCount = storyCount
        const altUsePanels = altCount > 0 && altCount <= 6
        const altPerRow =
            altCount <= 0
                ? 1
                : isLandscape
                  ? altCount <= 3
                      ? altCount
                      : altCount <= 6
                        ? 3
                        : Math.ceil(altCount / 2)
                  : altCount <= 6
                    ? altCount
                    : Math.ceil(altCount / 2)
        const altRowWidth = isLandscape ? 660 : imageWidth - basePadding * 2
        const altMaxCardW = isLandscape
            ? altCount <= 1
                ? 230
                : altCount <= 3
                  ? 184
                  : 150
            : altCount <= 1
              ? 190
              : altCount <= 3
                ? 165
                : altCount <= 6
                  ? 128
                  : 104
        const altPanelPad = 10
        const altCardGap = 14
        const altCardW = Math.round(
            Math.min(
                (altRowWidth - (altPerRow - 1) * altCardGap) /
                    Math.max(altPerRow, 1) -
                    (altUsePanels ? altPanelPad * 2 + 2 : 0),
                altMaxCardW,
            ),
        )
        const altCardH = Math.round(altCardW * 1.728)
        const altPanelW = altCardW + altPanelPad * 2 + 2
        const altLabelSize = altCount <= 3 ? 19 : 15

        const storyHeadline = truncate(
            String(headline ?? "").trim() || String(keyMessage ?? "").trim(),
            120,
        )
        const storySubtitle = truncate(
            String(subtitle ?? ""),
            isSquare ? 140 : 200,
        )
        const headlineFontSize = isPost
            ? storyHeadline.length <= 30
                ? 44
                : storyHeadline.length <= 60
                  ? 38
                  : 32
            : storyHeadline.length <= 30
              ? 54
              : storyHeadline.length <= 60
                ? 46
                : 38
        const altHeadlineFontSize = isLandscape
            ? storyHeadline.length <= 40
                ? 46
                : 38
            : storyHeadline.length <= 40
              ? 38
              : 32

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
        // Astrology posters fit the reading panel to its content (no card
        // spread to balance) and hard-cap it at a max height; the char budget
        // makes the AI text truncate with an ellipsis before the cap. The
        // freed space lets the panel sit snug above the planet band instead of
        // stretching to fill it.
        // The technical orbit-wheel art is larger/more central, so its reading
        // panel is tighter on the square/landscape frames than the daily theme.
        const isTechnical = theme === "astrology-technical"
        const astroReadingMaxH = isTechnical
            ? isLandscape
                ? 110
                : isPost
                  ? 300
                  : 380
            : isLandscape
              ? 212
              : isPost
                ? 320
                : 430
        const detailBudget = isAstroTheme
            ? isSquare
                ? 0
                : isTechnical
                  ? isLandscape
                      ? 0
                      : isPost
                        ? 280
                        : 340
                  : isLandscape
                    ? 230
                    : isPost
                      ? 300
                      : 380
            : isLandscape
              ? 420
              : isSquare
                ? 0
                : isPost
                  ? storyCount >= 4
                      ? 250
                      : 270
                  : storyCount >= 7
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
        const detailFontSize = isLandscape
            ? detailChars > 330
                ? 24
                : 27
            : isPost
              ? detailChars > 260
                  ? 23
                  : 25
              : detailChars > 430
                ? 26
                : 29
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
                        background: transparent
                            ? "rgba(0,0,0,0)"
                            : useBgArt
                              ? "#0a1232"
                              : "radial-gradient(1500px 1000px at 50% -10%, rgba(64, 90, 176, 0.5) 0%, rgba(30, 45, 105, 0.32) 35%, rgba(7, 11, 34, 1) 75%), radial-gradient(1200px 900px at 85% 105%, rgba(45, 65, 140, 0.35) 0%, rgba(7, 11, 34, 1) 65%)",
                        color: "#ffffff",
                        fontFamily: SANS_STACK,
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {transparent ? (
                        /* Video overlay: just the ornate gold frame — the
                           animated sky shows through the alpha channel */
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
                        </div>
                    ) : useBgArt ? (
                        /* Illustrated night-sky artwork — moon, stars, gold
                           clouds and frame are baked into the painting */
                        <img
                            src={shareBgSrc as string}
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

                    {/* Transit positions stamped under the painted planets —
                        the day's zodiac degrees (retrograde bodies in rose). */}
                    {astroLabels.map((label) => (
                        <div
                            key={`astro-${label.name}`}
                            style={{
                                position: "absolute",
                                left: Math.round(label.leftPct * imageWidth),
                                top: Math.round(label.topPct * imageHeight),
                                transform: "translateX(-50%)",
                                display: "flex",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    padding: "2px 12px",
                                    borderRadius: 999,
                                    background: "rgba(7,11,34,0.62)",
                                    border: "1px solid rgba(216,181,109,0.45)",
                                    color: label.retrograde
                                        ? "#fda4af"
                                        : "#f3e2b0",
                                    fontSize: isLandscape ? 22 : 24,
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                    textShadow: "0 2px 8px rgba(0,0,0,0.85)",
                                }}
                            >
                                {label.text}
                            </div>
                        </div>
                    ))}

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
                                alignSelf: "center",
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
                            isLandscape ? (
                                /* ===== LANDSCAPE (16:9) — cards beside the
                                   reading, same celestial gold treatment ===== */
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 44,
                                        width: "100%",
                                        flex: 1,
                                        minHeight: 0,
                                        alignItems: "stretch",
                                    }}
                                >
                                    {storyCards.length > 0 ? (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 16,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: altRowWidth,
                                            }}
                                        >
                                            {sectionLabel("Your cards", 44)}
                                            {renderCardPanelRow({
                                                cards: storyCards,
                                                cardW: altCardW,
                                                cardH: altCardH,
                                                panelPad: altPanelPad,
                                                panelW: altPanelW,
                                                labelSize: altLabelSize,
                                                gap: altCardGap,
                                                usePanels: altUsePanels,
                                            })}
                                        </div>
                                    ) : null}

                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            flex: 1,
                                            minHeight: 0,
                                            gap: 20,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                textAlign: "center",
                                                gap: 12,
                                                maxWidth: "100%",
                                            }}
                                        >
                                            {sectionLabel("Question")}
                                            <div
                                                style={{
                                                    fontFamily: SERIF_STACK,
                                                    fontSize: 34,
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

                                        {verdictDateNode}

                                        {storyHeadline ? (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    textAlign: "center",
                                                    gap: 12,
                                                    borderRadius: 22,
                                                    padding: "22px 38px 24px",
                                                    background: PANEL_BG,
                                                    border: PANEL_BORDER,
                                                    maxWidth: "100%",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                {sectionLabel(
                                                    "Key message",
                                                    52,
                                                )}
                                                <div
                                                    style={{
                                                        fontFamily: SERIF_STACK,
                                                        fontSize:
                                                            altHeadlineFontSize,
                                                        fontWeight: 800,
                                                        lineHeight: 1.25,
                                                        color: "#f8eed6",
                                                        textAlign: "center",
                                                        wordBreak: "break-word",
                                                        overflowWrap:
                                                            "break-word",
                                                        textShadow:
                                                            "0 2px 12px rgba(216,181,109,0.25)",
                                                    }}
                                                >
                                                    {storyHeadline}
                                                </div>
                                                {storySubtitle ? (
                                                    <div
                                                        style={{
                                                            fontSize: 23,
                                                            lineHeight: 1.45,
                                                            color: "rgba(255,255,255,0.72)",
                                                            textAlign: "center",
                                                            wordBreak:
                                                                "break-word",
                                                            overflowWrap:
                                                                "break-word",
                                                        }}
                                                    >
                                                        {storySubtitle}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        {storyBlocks.length > 0 ? (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 14,
                                                    borderRadius: 22,
                                                    padding: "20px 34px 24px",
                                                    background: PANEL_BG,
                                                    border: PANEL_BORDER,
                                                    maxWidth: "100%",
                                                    ...(isAstroTheme
                                                        ? {
                                                              maxHeight:
                                                                  astroReadingMaxH,
                                                          }
                                                        : {
                                                              flex: 1,
                                                              minHeight: 0,
                                                          }),
                                                    overflow: "hidden",
                                                }}
                                            >
                                                {sectionLabel(
                                                    "The reading",
                                                    52,
                                                )}
                                                {renderRichBlocks(
                                                    storyBlocks,
                                                    detailFontSize,
                                                    isAstroTheme,
                                                )}
                                            </div>
                                        ) : null}

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 14,
                                                alignSelf: "center",
                                                ...(isAstroTheme
                                                    ? {}
                                                    : { marginTop: "auto" }),
                                                padding: "13px 38px",
                                                borderRadius: 9999,
                                                border: "1.5px solid rgba(216,181,109,0.65)",
                                                background:
                                                    "rgba(216,181,109,0.1)",
                                                color: "#ecd9a8",
                                                fontSize: 24,
                                                fontWeight: 600,
                                            }}
                                        >
                                            <svg
                                                width='20'
                                                height='20'
                                                viewBox='0 0 24 24'
                                                fill='rgba(232,198,106,0.95)'
                                                xmlns='http://www.w3.org/2000/svg'
                                            >
                                                <path d={STAR_GLYPH_PATH} />
                                            </svg>
                                            {ctaText}
                                            <svg
                                                width='20'
                                                height='20'
                                                viewBox='0 0 24 24'
                                                fill='rgba(232,198,106,0.95)'
                                                xmlns='http://www.w3.org/2000/svg'
                                            >
                                                <path d={STAR_GLYPH_PATH} />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* ===== SQUARE (1:1) — condensed celestial
                                   gold column: question, spread, verdict ===== */
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 22,
                                        width: "100%",
                                        flex: 1,
                                        minHeight: 0,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            textAlign: "center",
                                            gap: 12,
                                            maxWidth: "100%",
                                        }}
                                    >
                                        {sectionLabel("Question")}
                                        <div
                                            style={{
                                                fontFamily: SERIF_STACK,
                                                fontSize: 32,
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

                                    {verdictDateNode}

                                    {storyCards.length > 0 ? (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 14,
                                                alignItems: "center",
                                            }}
                                        >
                                            {sectionLabel("Your cards")}
                                            {renderCardPanelRow({
                                                cards: storyCards,
                                                cardW: altCardW,
                                                cardH: altCardH,
                                                panelPad: altPanelPad,
                                                panelW: altPanelW,
                                                labelSize: altLabelSize,
                                                gap: altCardGap,
                                                usePanels: altUsePanels,
                                            })}
                                        </div>
                                    ) : null}

                                    {storyHeadline ? (
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                textAlign: "center",
                                                gap: 12,
                                                borderRadius: 22,
                                                padding: "20px 38px 24px",
                                                background: PANEL_BG,
                                                border: PANEL_BORDER,
                                                maxWidth: "100%",
                                                // Technical posters fit the box
                                                // to content so it clears the
                                                // central orbit art.
                                                ...(isTechnical
                                                    ? {}
                                                    : { flex: 1, minHeight: 0 }),
                                                overflow: "hidden",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <svg
                                                width='26'
                                                height='26'
                                                viewBox='0 0 24 24'
                                                fill='rgba(232,198,106,0.9)'
                                                xmlns='http://www.w3.org/2000/svg'
                                                style={{
                                                    transform: "rotate(-18deg)",
                                                }}
                                            >
                                                <path d={CRESCENT_PATH} />
                                            </svg>
                                            {sectionLabel("Key message", 52)}
                                            <div
                                                style={{
                                                    fontFamily: SERIF_STACK,
                                                    fontSize:
                                                        altHeadlineFontSize,
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
                                                        fontSize: 22,
                                                        lineHeight: 1.45,
                                                        color: "rgba(255,255,255,0.72)",
                                                        textAlign: "center",
                                                        wordBreak: "break-word",
                                                        overflowWrap:
                                                            "break-word",
                                                    }}
                                                >
                                                    {storySubtitle}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 14,
                                            alignSelf: "center",
                                            ...(isAstroTheme
                                                ? {}
                                                : { marginTop: "auto" }),
                                            padding: "13px 38px",
                                            borderRadius: 9999,
                                            border: "1.5px solid rgba(216,181,109,0.65)",
                                            background: "rgba(216,181,109,0.1)",
                                            color: "#ecd9a8",
                                            fontSize: 23,
                                            fontWeight: 600,
                                        }}
                                    >
                                        <svg
                                            width='20'
                                            height='20'
                                            viewBox='0 0 24 24'
                                            fill='rgba(232,198,106,0.95)'
                                            xmlns='http://www.w3.org/2000/svg'
                                        >
                                            <path d={STAR_GLYPH_PATH} />
                                        </svg>
                                        {ctaText}
                                        <svg
                                            width='20'
                                            height='20'
                                            viewBox='0 0 24 24'
                                            fill='rgba(232,198,106,0.95)'
                                            xmlns='http://www.w3.org/2000/svg'
                                        >
                                            <path d={STAR_GLYPH_PATH} />
                                        </svg>
                                    </div>
                                </div>
                            )
                        ) : (
                            /* ===== STORY (9:16) / POST (3:4) LAYOUT =====
                               Must be a single explicit flex column — Satori
                               lays fragment children out as an implicit row. */
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: isPost ? 18 : 26,
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
                                            fontSize: isPost ? 33 : 38,
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

                                {verdictDateNode}

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
                                            padding: isPost
                                                ? "22px 40px 24px"
                                                : "28px 44px 32px",
                                            background: PANEL_BG,
                                            border: PANEL_BORDER,
                                            maxWidth: "100%",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {/* The crescent flourish costs a
                                            text line the post frame can't
                                            spare. */}
                                        {!isPost && (
                                            <svg
                                                width='30'
                                                height='30'
                                                viewBox='0 0 24 24'
                                                fill='rgba(232,198,106,0.9)'
                                                xmlns='http://www.w3.org/2000/svg'
                                                style={{
                                                    transform:
                                                        "rotate(-18deg)",
                                                }}
                                            >
                                                <path d={CRESCENT_PATH} />
                                            </svg>
                                        )}
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
                                                    fontSize: isPost ? 23 : 26,
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
                                            ...(isAstroTheme
                                                ? { maxHeight: astroReadingMaxH }
                                                : { flex: 1, minHeight: 0 }),
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
                                        {renderRichBlocks(
                                            storyBlocks,
                                            detailFontSize,
                                            isAstroTheme,
                                        )}
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
