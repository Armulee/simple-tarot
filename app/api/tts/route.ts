import { createHash } from "node:crypto"

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"
const MAX_TEXT_LENGTH = 2500
const CACHE_MAX_ENTRIES = 50

type CacheEntry = { audio: ArrayBuffer; createdAt: number }
const ttsCache = new Map<string, CacheEntry>()
const cacheKeyOrder: string[] = []

function getCacheKey(text: string, voiceId: string): string {
    return createHash("sha256").update(`${voiceId}:${text}`).digest("hex")
}

function getCached(key: string): ArrayBuffer | null {
    const entry = ttsCache.get(key)
    if (!entry) return null
    // Move to end (most recently used)
    const idx = cacheKeyOrder.indexOf(key)
    if (idx >= 0) {
        cacheKeyOrder.splice(idx, 1)
        cacheKeyOrder.push(key)
    }
    return entry.audio
}

function setCached(key: string, audio: ArrayBuffer): void {
    while (ttsCache.size >= CACHE_MAX_ENTRIES && cacheKeyOrder.length > 0) {
        const oldest = cacheKeyOrder.shift()!
        ttsCache.delete(oldest)
    }
    ttsCache.set(key, { audio, createdAt: Date.now() })
    cacheKeyOrder.push(key)
}

type TtsRequestBody = {
    text?: string
    locale?: string
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as TtsRequestBody
        const text = body?.text?.trim()

        if (!text) {
            return new Response("Text is required", { status: 400 })
        }
        if (text.length > MAX_TEXT_LENGTH) {
            return new Response("Text is too long", { status: 400 })
        }

        const apiKey = process.env.ELEVENLABS_API_KEY
        const voiceId = process.env.ELEVENLABS_VOICE_ID_MYSTIC_FEMALE

        if (!apiKey || !voiceId) {
            const missing = [
                !apiKey && "ELEVENLABS_API_KEY",
                !voiceId && "ELEVENLABS_VOICE_ID_MYSTIC_FEMALE",
            ]
                .filter(Boolean)
                .join(", ")
            console.error("TTS not configured. Missing env:", missing)
            return new Response(
                JSON.stringify({ error: "TTS is not configured", missing }),
                {
                    status: 503,
                    headers: { "Content-Type": "application/json" },
                },
            )
        }

        const cacheKey = getCacheKey(text, voiceId)
        const cached = getCached(cacheKey)
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: {
                    "Content-Type": "audio/mpeg",
                    "Cache-Control": "public, max-age=86400",
                    "X-TTS-Cache": "hit",
                },
            })
        }

        const response = await fetch(
            `${ELEVENLABS_BASE_URL}/text-to-speech/${encodeURIComponent(
                voiceId,
            )}?output_format=mp3_44100_128`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": apiKey,
                    Accept: "audio/mpeg",
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_v3",
                    voice_settings: {
                        stability: 0.45,
                        similarity_boost: 0.7,
                        style: 0.55,
                        use_speaker_boost: true,
                    },
                }),
            },
        )

        if (!response.ok) {
            const details = await response.text()
            console.error("ElevenLabs TTS error:", details)
            return new Response("Failed to generate audio", { status: 500 })
        }

        const audio = await response.arrayBuffer()
        setCached(cacheKey, audio)

        return new Response(audio, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, max-age=86400",
            },
        })
    } catch (error) {
        console.error("TTS route failed:", error)
        return new Response("Failed to generate audio", { status: 500 })
    }
}
