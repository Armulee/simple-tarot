/**
 * Chat attachments: shared shape + client-side preparation.
 *
 * Files picked in the composer are converted into a compact, serializable
 * form that (1) previews in the composer and above the sent user message,
 * (2) persists inside the chat session's message JSON, and (3) travels to
 * the AI: images as downscaled data URLs (sent as image parts to a
 * vision-capable model), text-like files as extracted text.
 */

export type ChatAttachment = {
    kind: "image" | "file"
    name: string
    mimeType: string
    /** Compressed data URL (images only) — preview + AI input. */
    dataUrl?: string
    /** Extracted text (text-like files only) — AI input. */
    textContent?: string
}

/** Longest edge for image downscaling before sending/persisting. */
const MAX_IMAGE_EDGE = 1280
const IMAGE_QUALITY = 0.82
/** Max images actually encoded (rest become name-only file entries). */
const MAX_IMAGES = 4
/** Cap for extracted text per file. */
const MAX_TEXT_CHARS = 20_000

const TEXT_EXTENSIONS = /\.(txt|md|markdown|csv|json|log|xml|yaml|yml)$/i

function isTextLike(file: File): boolean {
    return (
        file.type.startsWith("text/") ||
        file.type === "application/json" ||
        TEXT_EXTENSIONS.test(file.name)
    )
}

async function fileToDownscaledDataUrl(file: File): Promise<string | null> {
    try {
        const bitmap = await createImageBitmap(file)
        const scale = Math.min(
            1,
            MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height),
        )
        const width = Math.max(1, Math.round(bitmap.width * scale))
        const height = Math.max(1, Math.round(bitmap.height * scale))
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) return null
        ctx.drawImage(bitmap, 0, 0, width, height)
        bitmap.close()
        return canvas.toDataURL("image/jpeg", IMAGE_QUALITY)
    } catch {
        // Unsupported format (or non-image masquerading as one).
        return null
    }
}

async function readTextCapped(file: File): Promise<string | null> {
    try {
        const text = await file.text()
        return text.slice(0, MAX_TEXT_CHARS)
    } catch {
        return null
    }
}

/**
 * Convert picked File objects into serializable ChatAttachments. Never
 * throws — files that can't be processed degrade to name-only entries so the
 * AI at least knows they were attached.
 */
export async function prepareAttachments(
    files: File[],
): Promise<ChatAttachment[]> {
    const out: ChatAttachment[] = []
    let imageCount = 0
    for (const file of files) {
        if (file.type.startsWith("image/") && imageCount < MAX_IMAGES) {
            const dataUrl = await fileToDownscaledDataUrl(file)
            if (dataUrl) {
                out.push({
                    kind: "image",
                    name: file.name,
                    mimeType: "image/jpeg",
                    dataUrl,
                })
                imageCount++
                continue
            }
        }
        if (isTextLike(file)) {
            const textContent = await readTextCapped(file)
            out.push({
                kind: "file",
                name: file.name,
                mimeType: file.type || "text/plain",
                ...(textContent ? { textContent } : {}),
            })
            continue
        }
        out.push({
            kind: "file",
            name: file.name,
            mimeType: file.type || "application/octet-stream",
        })
    }
    return out
}
