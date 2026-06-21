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
    /**
     * Which painted artwork set to lay behind the poster. "tarot" (default)
     * uses the night-sky paintings; "horoscope" uses the solar-system
     * backgrounds for astrology verdict shares.
     */
    kind?: "tarot" | "horoscope"
    /** Render on a transparent canvas (for video compositing). */
    transparent?: boolean
}

export type ShareImageProgress = (
    phase: "render" | "download",
    progress: number | null,
) => void

/**
 * Two-tier client cache so the same reading is never painted twice:
 * a module-level in-memory LRU for instant repeats within the page, and
 * the Cache API for persistence across navigations and reloads.
 */
const MEMORY_CACHE_MAX = 8
const memoryCache = new Map<string, Blob>()
const inFlight = new Map<string, Promise<Blob>>()
const CACHE_NAME = "askingfate-share-images-v1"
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 12

function requestKey(request: ShareImageRequest): string {
    return JSON.stringify(request)
}

function rememberInMemory(key: string, blob: Blob): void {
    memoryCache.delete(key)
    memoryCache.set(key, blob)
    while (memoryCache.size > MEMORY_CACHE_MAX) {
        const oldest = memoryCache.keys().next().value
        if (oldest === undefined) break
        memoryCache.delete(oldest)
    }
}

/** Stable cache-storage URL for a payload (synthetic, never fetched). */
async function cacheUrlFor(key: string): Promise<string> {
    let hash: string
    try {
        const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(key),
        )
        hash = Array.from(new Uint8Array(digest).slice(0, 16))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
    } catch {
        // Insecure contexts lack subtle crypto — fall back to a djb2 hash.
        let h = 5381
        for (let i = 0; i < key.length; i++) {
            h = ((h << 5) + h + key.charCodeAt(i)) | 0
        }
        hash = `djb2-${(h >>> 0).toString(16)}-${key.length}`
    }
    return `/__share-image-cache/${hash}`
}

async function readPersistentCache(key: string): Promise<Blob | null> {
    if (typeof caches === "undefined") return null
    try {
        const cache = await caches.open(CACHE_NAME)
        const hit = await cache.match(await cacheUrlFor(key))
        if (!hit) return null
        const at = Number(hit.headers.get("x-cached-at"))
        if (!Number.isFinite(at) || Date.now() - at > CACHE_TTL_MS) {
            await cache.delete(await cacheUrlFor(key))
            return null
        }
        return await hit.blob()
    } catch {
        return null
    }
}

async function writePersistentCache(key: string, blob: Blob): Promise<void> {
    if (typeof caches === "undefined") return
    try {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(
            await cacheUrlFor(key),
            new Response(blob, {
                headers: {
                    "Content-Type": blob.type || "image/png",
                    "x-cached-at": String(Date.now()),
                },
            }),
        )
        // Evict beyond the cap, oldest first.
        const keys = await cache.keys()
        if (keys.length > CACHE_MAX_ENTRIES) {
            const dated = await Promise.all(
                keys.map(async (req) => {
                    const res = await cache.match(req)
                    return {
                        req,
                        at: Number(res?.headers.get("x-cached-at")) || 0,
                    }
                }),
            )
            dated.sort((a, b) => a.at - b.at)
            for (const { req } of dated.slice(
                0,
                keys.length - CACHE_MAX_ENTRIES,
            )) {
                await cache.delete(req)
            }
        }
    } catch {
        // Persistence is best-effort; the memory tier still applies.
    }
}

/** Synchronous memory-tier lookup (e.g. to restore a preview instantly). */
export function peekShareImageBlob(request: ShareImageRequest): Blob | null {
    return memoryCache.get(requestKey(request)) ?? null
}

/**
 * Cached fetch: memory tier → Cache API tier → server render. Concurrent
 * callers for the same payload share one request.
 */
export async function getShareImageBlob(
    request: ShareImageRequest,
    onProgress?: ShareImageProgress,
): Promise<Blob> {
    const key = requestKey(request)
    const cached = memoryCache.get(key)
    if (cached) {
        onProgress?.("download", 1)
        return cached
    }
    const existing = inFlight.get(key)
    if (existing) return existing

    const promise = (async () => {
        const persisted = await readPersistentCache(key)
        if (persisted) {
            rememberInMemory(key, persisted)
            onProgress?.("download", 1)
            return persisted
        }
        const blob = await fetchShareImageBlob(request, onProgress)
        rememberInMemory(key, blob)
        void writePersistentCache(key, blob)
        return blob
    })()

    inFlight.set(key, promise)
    try {
        return await promise
    } finally {
        inFlight.delete(key)
    }
}

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
