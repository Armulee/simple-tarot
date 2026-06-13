/**
 * One-time setup: turn a face image + a voice sample into reusable HeyGen
 * assets, and print the `HEYGEN_AVATAR_ID` / `HEYGEN_VOICE_ID` to store in env.
 *
 * WHY THIS EXISTS (read before running):
 *   A raw image/audio file CANNOT be lip-synced live on the fly. HeyGen needs a
 *   processed "photo/streaming avatar" (an avatar_id) and a cloned voice
 *   (a voice_id) created ahead of time. Runtime (app/api/avatar/*) only
 *   references those ids — it never uploads media per request.
 *
 * RUN (locally, NOT in production):
 *   HEYGEN_API_KEY=xxxx \
 *   ELEVENLABS_API_KEY=xxxx \
 *   npx tsx scripts/setup-heygen-avatar.ts \
 *     --image ./assets/fortune-teller.png \
 *     --voice ./assets/fortune-teller-voice.mp3 \
 *     --voice-name "AskingFate Fortune Teller"
 *
 * Then copy the printed ids into your env:
 *   HEYGEN_AVATAR_ID=...
 *   HEYGEN_VOICE_ID=...
 *   HEYGEN_VOICE_MODEL=eleven_multilingual_v2
 *
 * NOTES / GOTCHAS:
 *   - Photo/streaming avatar creation needs processing time and may require
 *     face-likeness consent per HeyGen's terms. Check the latest requirements
 *     (image specs, allowed content) at https://docs.heygen.com.
 *   - The voice is cloned through ElevenLabs' multilingual model
 *     (eleven_multilingual_v2) so it speaks Thai clearly. You need an
 *     ElevenLabs key with voice-cloning enabled; HeyGen references the cloned
 *     ElevenLabs voice.
 *   - Endpoint paths below match the documented APIs at the time of writing.
 *     If they 404, re-check the docs — HeyGen/ElevenLabs version their APIs.
 */

import { readFile } from "node:fs/promises"
import { basename } from "node:path"

const ELEVEN_BASE = "https://api.elevenlabs.io"

function parseArgs(): Record<string, string> {
    const out: Record<string, string> = {}
    const argv = process.argv.slice(2)
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a.startsWith("--")) {
            const key = a.slice(2)
            const val = argv[i + 1]?.startsWith("--") ? "true" : argv[++i]
            out[key] = val ?? "true"
        }
    }
    return out
}

function requireEnv(name: string): string {
    const v = process.env[name]
    if (!v) {
        console.error(`Missing required env: ${name}`)
        process.exit(1)
    }
    return v
}

/**
 * Step 1 — clone the voice from the audio sample via ElevenLabs.
 * Returns the ElevenLabs voice_id (used as HEYGEN_VOICE_ID).
 */
async function cloneVoice(audioPath: string, name: string): Promise<string> {
    const apiKey = requireEnv("ELEVENLABS_API_KEY")
    const audio = await readFile(audioPath)

    const form = new FormData()
    form.append("name", name)
    form.append(
        "description",
        "AskingFate fortune-teller voice (Thai), cloned for HeyGen LiveAvatar.",
    )
    form.append(
        "files",
        new Blob([new Uint8Array(audio)], { type: "audio/mpeg" }),
        basename(audioPath),
    )

    const res = await fetch(`${ELEVEN_BASE}/v1/voices/add`, {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: form,
    })
    const json = (await res.json()) as { voice_id?: string; detail?: unknown }
    if (!res.ok || !json.voice_id) {
        throw new Error(`ElevenLabs voice clone failed: ${JSON.stringify(json)}`)
    }
    return json.voice_id
}

/**
 * Step 2 — create a HeyGen photo/streaming avatar from the image.
 * Returns the avatar_id (used as HEYGEN_AVATAR_ID).
 *
 * This uploads the asset (talking-photo) and registers it for streaming. The
 * exact endpoint/field names can change — verify against the current docs.
 */
async function createPhotoAvatar(imagePath: string): Promise<string> {
    const apiKey = requireEnv("HEYGEN_API_KEY")
    const image = await readFile(imagePath)

    // Upload the talking-photo asset.
    const upload = await fetch("https://upload.heygen.com/v1/talking_photo", {
        method: "POST",
        headers: { "x-api-key": apiKey, "content-type": "image/png" },
        body: new Uint8Array(image),
    })
    const uploadJson = (await upload.json()) as {
        data?: { talking_photo_id?: string }
        error?: unknown
    }
    const talkingPhotoId = uploadJson.data?.talking_photo_id
    if (!upload.ok || !talkingPhotoId) {
        throw new Error(`HeyGen photo upload failed: ${JSON.stringify(uploadJson)}`)
    }

    // For LiveAvatar/streaming, the talking_photo_id is the avatar id you pass
    // as avatar_id in /v1/streaming.new. Some accounts must additionally
    // "approve"/process the avatar in the HeyGen dashboard before it can stream
    // (consent + processing). Check the dashboard if streaming.new rejects it.
    return talkingPhotoId
}

async function main() {
    const args = parseArgs()
    const imagePath = args.image
    const voicePath = args.voice
    const voiceName = args["voice-name"] ?? "AskingFate Fortune Teller"

    if (!imagePath && !voicePath) {
        console.error(
            "Usage: tsx scripts/setup-heygen-avatar.ts --image <path> --voice <path> [--voice-name <name>]",
        )
        process.exit(1)
    }

    if (voicePath) {
        console.log(`\n▶ Cloning voice from ${voicePath} …`)
        const voiceId = await cloneVoice(voicePath, voiceName)
        console.log(`✓ HEYGEN_VOICE_ID=${voiceId}`)
        console.log("  HEYGEN_VOICE_MODEL=eleven_multilingual_v2")
    }

    if (imagePath) {
        console.log(`\n▶ Creating photo avatar from ${imagePath} …`)
        const avatarId = await createPhotoAvatar(imagePath)
        console.log(`✓ HEYGEN_AVATAR_ID=${avatarId}`)
        console.log(
            "  (If streaming.new later rejects this id, approve/process the avatar in the HeyGen dashboard first.)",
        )
    }

    console.log("\nDone. Copy the ids above into your environment (e.g. .env.local / Vercel).")
}

main().catch((err) => {
    console.error("\nSetup failed:", err)
    process.exit(1)
})
