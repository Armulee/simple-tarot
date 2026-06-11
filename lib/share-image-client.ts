/**
 * Client-side fetch for the server-rendered share poster, with live
 * progress. The server can't report paint progress, so the render phase
 * advances on a smooth asymptotic clock toward a ceiling; real download
 * bytes carry the bar from the ceiling to 100%. Shared by the download
 * dialog and the chat share button.
 */

export const RENDER_PROGRESS_CEILING = 0.72
const RENDER_PROGRESS_TAU_S = 2.8

export type ShareImageRequest = {
    question?: string
    cards: string[]
    interpretation?: string
    headline?: string
    subtitle?: string
    keyMessage?: string
    detailedHtml?: string
    insights?: string[]
    cta?: string
    width: number
    height: number
}

export type ShareImageProgress = (
    phase: "render" | "download",
    progress: number | null,
) => void

export async function fetchShareImageBlob(
    request: ShareImageRequest,
    onProgress?: ShareImageProgress,
): Promise<Blob> {
    const startedAt = Date.now()
    const ticker = window.setInterval(() => {
        const elapsedS = (Date.now() - startedAt) / 1000
        onProgress?.(
            "render",
            RENDER_PROGRESS_CEILING *
                (1 - Math.exp(-elapsedS / RENDER_PROGRESS_TAU_S)),
        )
    }, 120)

    let res: Response
    try {
        res = await fetch("/api/share-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...request, branding: "AskingFate" }),
        })
    } finally {
        window.clearInterval(ticker)
    }
    if (!res.ok) {
        throw new Error(`Share image request failed (${res.status})`)
    }

    const total = Number(res.headers.get("Content-Length"))
    if (!res.body || !Number.isFinite(total) || total <= 0) {
        onProgress?.("download", null)
        return await res.blob()
    }

    const reader = res.body.getReader()
    const chunks: BlobPart[] = []
    let received = 0
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
            chunks.push(value as BlobPart)
            received += value.length
            onProgress?.(
                "download",
                RENDER_PROGRESS_CEILING +
                    (1 - RENDER_PROGRESS_CEILING) *
                        Math.min(received / total, 1),
            )
        }
    }
    onProgress?.("download", 1)
    return new Blob(chunks, {
        type: res.headers.get("Content-Type") || "image/png",
    })
}
