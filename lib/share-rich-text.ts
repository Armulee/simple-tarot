/**
 * Pure text helpers shared by the share-image server renderer and the
 * client-side preview mock, so both compose the exact same content.
 */

export type RichRun = {
    text: string
    bold?: boolean
    italic?: boolean
    gold?: boolean
}
export type RichBlock = {
    type: "paragraph" | "item"
    marker?: string
    runs: RichRun[]
}

export function slugifyCardName(raw: string): {
    slug: string
    isReversed: boolean
} {
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

export function truncate(text: string, maxChars: number): string {
    const t = String(text ?? "").trim()
    if (t.length <= maxChars) return t
    return `${t.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`
}

export function extractKeywordsAndContent(text: string): {
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
export function stripCardNamesFromHtml(
    html: string,
    cardNames: string[],
): string {
    if (!html) return html
    const labels = new Set<string>()
    for (const raw of cardNames) {
        const full = String(raw ?? "").trim()
        const base = full
            .replace(/\s*\(reversed\)/gi, "")
            .replace(/\s*\breversed\b/gi, "")
            .trim()
        for (const label of [
            full,
            base,
            `${base} (Reversed)`,
            `${base} Reversed`,
        ]) {
            if (label.length >= 5) labels.add(label)
        }
    }
    let out = html
    for (const label of [...labels].sort((a, b) => b.length - a.length)) {
        out = out.replace(new RegExp(escapeRegExp(label), "gi"), "")
    }
    return out.replace(/[ \t ]{2,}/g, " ")
}

/**
 * Parse the sanitized `detailedHtml` tag subset (<p>, <strong>/<b>, <em>/<i>,
 * <ul>, <ol>, <li>, <br>, <span class="highlight-gold">) into flat blocks of
 * styled inline runs. Unknown tags are ignored (their text content is kept),
 * except <script>/<style> whose content is dropped.
 */
export function parseDetailedHtml(html: string): RichBlock[] {
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

export function truncateRichBlocks(
    blocks: RichBlock[],
    maxChars: number,
): RichBlock[] {
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
