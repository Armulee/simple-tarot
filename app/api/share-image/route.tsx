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

        // Random size (2-3px)
        const size = 2 + Math.random()

        // Varying opacity - some stars are more faded (0.3-1.0)
        // 30% chance for faded stars (0.3-0.6), 70% for brighter (0.6-1.0)
        const isFaded = Math.random() < 0.15
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
            `${slug}.png`,
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
            headline = "",
            subtitle = "",
            keyMessage = "",
            detailedHtml = "",
            width = 1080,
            height = 1920,
            branding = "AskingFate",
        } = await req.json()

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

        // Load logo from disk
        const logoBase64 = await readLogoAsBase64()
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

        const stars = generateStars(50, imageWidth, imageHeight)

        // ---- Story (9:16) rich layout data ----
        // Content column is maxContentWidth-capped to 980 but padded to 936
        // on a 1080 canvas; all card-row math uses that effective width.
        const storyContentWidth = 1080 - basePadding * 2
        const storyCards = parsedCards
        const storyCount = storyCards.length
        const storyPerRow =
            storyCount <= 6 ? Math.max(storyCount, 1) : Math.ceil(storyCount / 2)
        const storyCardGap = storyCount <= 4 ? 22 : 14
        const storyMaxCardW =
            storyCount <= 2
                ? 280
                : storyCount === 3
                  ? 250
                  : storyCount === 4
                    ? 208
                    : 150
        const storyCardW = Math.round(
            Math.min(
                (storyContentWidth - (storyPerRow - 1) * storyCardGap) /
                    Math.max(storyPerRow, 1),
                storyMaxCardW,
            ),
        )
        const storyCardH = Math.round(storyCardW * 1.728)
        const showCardLabels = storyCount > 0 && storyCount <= 5
        const cardLabelSize = storyCount <= 3 ? 22 : 17

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
            storyCount >= 7 ? 440 : storyCount >= 5 ? 540 : 640
        storyBlocks = truncateRichBlocks(storyBlocks, detailBudget)
        const detailChars = storyBlocks.reduce(
            (sum, block) =>
                sum + block.runs.reduce((s, run) => s + run.text.length, 0),
            0,
        )
        const detailFontSize = detailChars > 460 ? 26 : 30
        const showStoryKeywords = !hasRichDetail && keywords.length > 0

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
                        background:
                            "radial-gradient(1600px 1000px at 20% 0%, rgba(30, 58, 138, 0.4) 0%, rgba(25, 45, 112, 0.3) 25%, rgba(15, 23, 42, 0.2) 40%, rgba(2, 6, 23, 1) 70%), radial-gradient(1400px 1000px at 80% 100%, rgba(30, 64, 175, 0.3) 0%, rgba(20, 40, 100, 0.2) 30%, rgba(2, 6, 23, 1) 65%), radial-gradient(1000px 800px at 50% 50%, rgba(37, 99, 235, 0.15) 0%, rgba(2, 6, 23, 0.9) 50%)",
                        color: "#ffffff",
                        fontFamily:
                            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial",
                        position: "relative",
                        overflow: "hidden",
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
                    <div
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: 1200,
                            height: 1200,
                            borderRadius: 9999,
                            background:
                                "radial-gradient(circle at center, rgba(30, 58, 138, 0.12), rgba(2, 6, 23, 0.00) 60%)",
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
                    {stars.slice(0, 12).map((star, idx) => (
                        <div
                            key={`glow-${idx}`}
                            style={{
                                position: "absolute",
                                left: star.left,
                                top: star.top,
                                width: star.size * 6,
                                height: star.size * 6,
                                borderRadius: "50%",
                                background:
                                    "radial-gradient(circle, rgba(255,255,255,0.7), rgba(255,255,255,0))",
                                opacity: 0.3,
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                    ))}
                    {/* Signature star glyphs */}
                    <svg
                        width='200'
                        height='200'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='rgba(255,255,255,0.5)'
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
                        stroke='rgba(56,189,248,0.35)'
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
                                justifyContent: "flex-end",
                                gap: 16,
                                position: "relative",
                                alignSelf: "flex-end",
                                padding: "10px 16px",
                                borderRadius: 999,
                                background:
                                    "linear-gradient(135deg, rgba(15,23,42,0.6), rgba(30,41,59,0.35))",
                                border: "1px solid rgba(255,255,255,0.12)",
                                boxShadow:
                                    "0 10px 30px -15px rgba(56,189,248,0.5)",
                            }}
                        >
                            <img
                                src={logoSrc}
                                alt='AskingFate logo'
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
                                                fontFamily:
                                                    "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
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
                                                        fontFamily:
                                                            "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
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
                                    gap: 28,
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
                                        maxWidth: "100%",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 22,
                                            fontWeight: 600,
                                            letterSpacing: 3,
                                            textTransform: "uppercase",
                                            color: "rgba(204,203,203,0.9)",
                                            marginBottom: 12,
                                        }}
                                    >
                                        Question
                                    </div>
                                    <div
                                        style={{
                                            fontFamily:
                                                "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                                            fontSize: 38,
                                            fontWeight: 800,
                                            lineHeight: 1.25,
                                            textShadow:
                                                "0 4px 20px rgba(56,189,248,0.3), 0 2px 8px rgba(139,92,246,0.2)",
                                            color: "rgba(255,255,255,0.98)",
                                            textAlign: "center",
                                            maxWidth: "100%",
                                            wordBreak: "break-word",
                                            overflowWrap: "break-word",
                                        }}
                                    >
                                        {`"${displayQuestion}"`}
                                    </div>
                                </div>

                                {/* Cards — the full spread */}
                                {storyCards.length > 0 ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 14,
                                            alignItems: "center",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 22,
                                                letterSpacing: 3,
                                                textTransform: "uppercase",
                                                color: "rgba(255,255,255,0.65)",
                                            }}
                                        >
                                            Your cards
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: storyCardGap,
                                                flexWrap: "wrap",
                                                alignItems: "flex-start",
                                                justifyContent: "center",
                                                maxWidth: "100%",
                                            }}
                                        >
                                            {storyCards.map((c, idx) => (
                                                <div
                                                    key={`card-${c.slug}-${idx}`}
                                                    style={{
                                                        display: "flex",
                                                        flexDirection:
                                                            "column",
                                                        gap: 10,
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: storyCardW,
                                                            height: storyCardH,
                                                            borderRadius: 16,
                                                            position:
                                                                "relative",
                                                            overflow:
                                                                "hidden",
                                                            boxShadow:
                                                                "0 20px 60px -18px rgba(234,179,8,0.65), 0 8px 22px rgba(139,92,246,0.35), 0 0 0 2px rgba(255,255,255,0.15)",
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
                                                                inset: -60,
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
                                                                borderRadius: 14,
                                                            }}
                                                        />
                                                        <div
                                                            style={{
                                                                position:
                                                                    "absolute",
                                                                inset: 0,
                                                                background:
                                                                    "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)",
                                                                borderRadius: 14,
                                                            }}
                                                        />
                                                    </div>
                                                    {showCardLabels ? (
                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    cardLabelSize,
                                                                color: "rgba(255,255,255,0.72)",
                                                                textAlign:
                                                                    "center",
                                                                maxWidth:
                                                                    storyCardW +
                                                                    8,
                                                                lineHeight: 1.3,
                                                            }}
                                                        >
                                                            {c.name}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {/* Key message — the verdict of the reading */}
                                {storyHeadline ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            borderRadius: 32,
                                            padding: "36px 44px",
                                            background:
                                                "linear-gradient(135deg, rgba(250,204,21,0.16) 0%, rgba(180,83,9,0.10) 35%, rgba(30,41,59,0.55) 100%)",
                                            border: "1px solid rgba(250,204,21,0.35)",
                                            boxShadow:
                                                "0 24px 80px -30px rgba(250,204,21,0.5), inset 0 1px 0 rgba(255,255,255,0.18)",
                                            position: "relative",
                                            maxWidth: "100%",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: -80,
                                                right: -80,
                                                width: 260,
                                                height: 260,
                                                borderRadius: 9999,
                                                background:
                                                    "radial-gradient(circle at center, rgba(250,204,21,0.22), rgba(250,204,21,0) 70%)",
                                            }}
                                        />
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 14,
                                                marginBottom: 18,
                                            }}
                                        >
                                            <svg
                                                width='26'
                                                height='26'
                                                viewBox='0 0 24 24'
                                                fill='rgba(252,211,77,0.9)'
                                                stroke='rgba(252,211,77,0.95)'
                                                strokeWidth='1'
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                xmlns='http://www.w3.org/2000/svg'
                                            >
                                                <path d='M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z' />
                                            </svg>
                                            <div
                                                style={{
                                                    fontSize: 22,
                                                    fontWeight: 700,
                                                    letterSpacing: 6,
                                                    textTransform: "uppercase",
                                                    color: "rgba(252,211,77,0.95)",
                                                }}
                                            >
                                                Key message
                                            </div>
                                            <svg
                                                width='26'
                                                height='26'
                                                viewBox='0 0 24 24'
                                                fill='rgba(252,211,77,0.9)'
                                                stroke='rgba(252,211,77,0.95)'
                                                strokeWidth='1'
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                xmlns='http://www.w3.org/2000/svg'
                                            >
                                                <path d='M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z' />
                                            </svg>
                                        </div>
                                        <div
                                            style={{
                                                fontFamily:
                                                    "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                                                fontSize: headlineFontSize,
                                                fontWeight: 800,
                                                lineHeight: 1.25,
                                                color: "rgba(255,255,255,1)",
                                                textShadow:
                                                    "0 4px 24px rgba(250,204,21,0.35), 0 2px 10px rgba(0,0,0,0.4)",
                                                wordBreak: "break-word",
                                                overflowWrap: "break-word",
                                            }}
                                        >
                                            {storyHeadline}
                                        </div>
                                        {storySubtitle ? (
                                            <div
                                                style={{
                                                    marginTop: 14,
                                                    fontSize: 28,
                                                    lineHeight: 1.5,
                                                    color: "rgba(255,255,255,0.8)",
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
                                            borderRadius: 32,
                                            padding: "36px 44px",
                                            background:
                                                "linear-gradient(150deg, rgba(30,41,59,0.72) 0%, rgba(99,102,241,0.22) 45%, rgba(34,211,238,0.12) 100%)",
                                            boxShadow:
                                                "0 30px 90px -35px rgba(56,189,248,0.65), 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.16)",
                                            border: "1px solid rgba(255,255,255,0.16)",
                                            position: "relative",
                                            maxWidth: "100%",
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
                                                width: 140,
                                                height: 140,
                                                borderRadius: "32px 0 0 0",
                                                background:
                                                    "radial-gradient(circle at top left, rgba(139,92,246,0.2), transparent 70%)",
                                                opacity: 0.7,
                                            }}
                                        />
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 14,
                                                marginBottom: 20,
                                            }}
                                        >
                                            <svg
                                                width='24'
                                                height='24'
                                                viewBox='0 0 24 24'
                                                fill='none'
                                                stroke='rgba(165,180,252,0.95)'
                                                strokeWidth='1.6'
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                xmlns='http://www.w3.org/2000/svg'
                                            >
                                                <path d='M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z' />
                                            </svg>
                                            <div
                                                style={{
                                                    fontSize: 22,
                                                    fontWeight: 700,
                                                    letterSpacing: 6,
                                                    textTransform: "uppercase",
                                                    color: "rgba(255,255,255,0.65)",
                                                }}
                                            >
                                                The reading
                                            </div>
                                        </div>
                                        {showStoryKeywords && (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 14,
                                                    marginBottom: 22,
                                                }}
                                            >
                                                {keywords.map(
                                                    (keyword, idx) => (
                                                        <div
                                                            key={`keyword-${idx}`}
                                                            style={{
                                                                padding:
                                                                    "8px 22px",
                                                                borderRadius: 9999,
                                                                background:
                                                                    "rgba(255,255,255,0.1)",
                                                                border: "1px solid rgba(255,255,255,0.2)",
                                                                color: "rgba(255,255,255,0.95)",
                                                                fontSize: 26,
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
                                                                    color: "rgba(252,211,77,0.95)",
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
                                                                                    ? "#fcd34d"
                                                                                    : "rgba(255,255,255,0.94)",
                                                                                fontWeight:
                                                                                    run.bold ||
                                                                                    run.gold
                                                                                        ? 700
                                                                                        : 400,
                                                                                fontStyle:
                                                                                    run.italic
                                                                                        ? "italic"
                                                                                        : "normal",
                                                                                textShadow:
                                                                                    run.gold
                                                                                        ? "0 0 18px rgba(250,204,21,0.45)"
                                                                                        : "0 2px 8px rgba(0,0,0,0.2)",
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
                            </div>
                        )}
                    </div>

                    {/* Footer removed per branding */}
                </div>
            ),
            {
                width: imageWidth,
                height: imageHeight,
            },
        )

        const arrayBuffer = await imageResponse.arrayBuffer()
        return new Response(arrayBuffer, {
            headers: {
                "Content-Type": "image/png",
                "Content-Length": arrayBuffer.byteLength.toString(),
            },
        })
    } catch (e) {
        console.error("Share image generation error:", e)
        return new Response(
            `Failed to generate image: ${e instanceof Error ? e.message : String(e)}`,
            { status: 500 },
        )
    }
}
