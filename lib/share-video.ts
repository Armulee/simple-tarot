/**
 * Client-side share-video generator. Plays the hand-crafted cosmic
 * background film (public/assets/share/video-background.mp4) on a canvas,
 * composites the transparent server-rendered poster overlay on top —
 * the same elements the static images carry — and records the canvas in
 * real time with MediaRecorder. Progress maps 1:1 to elapsed recording
 * time, so the bar is always honest.
 */

export const SHARE_VIDEO_DURATION_MS = 15_000
const SHARE_VIDEO_FPS = 30
const SHARE_VIDEO_BITRATE = 7_000_000
export const SHARE_VIDEO_BACKGROUND_SRC = "/assets/share/video-background.mp4"

/** MP4 records natively on Safari/new Chrome; WebM is the broad fallback. */
const MIME_CANDIDATES: Array<{ mime: string; ext: "mp4" | "webm" }> = [
    { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9", ext: "webm" },
    { mime: "video/webm;codecs=vp8", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
]

export function pickShareVideoFormat(): { mime: string; ext: "mp4" | "webm" } {
    if (typeof MediaRecorder !== "undefined") {
        for (const candidate of MIME_CANDIDATES) {
            if (MediaRecorder.isTypeSupported(candidate.mime)) return candidate
        }
    }
    return { mime: "video/webm", ext: "webm" }
}

/** Load the looping cosmic background film, ready to play silently. */
function loadBackgroundVideo(signal?: AbortSignal): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video")
        video.src = SHARE_VIDEO_BACKGROUND_SRC
        video.muted = true
        video.loop = true
        video.playsInline = true
        video.preload = "auto"
        const cleanup = () => {
            video.removeEventListener("canplaythrough", onReady)
            video.removeEventListener("error", onError)
        }
        const onReady = () => {
            cleanup()
            resolve(video)
        }
        const onError = () => {
            cleanup()
            reject(new Error("Background video failed to load"))
        }
        if (signal?.aborted) {
            reject(new Error("Video generation aborted"))
            return
        }
        video.addEventListener("canplaythrough", onReady)
        video.addEventListener("error", onError)
        video.load()
    })
}

/** Draw the film cover-fit (centered crop) so any aspect stays filled. */
function drawVideoCover(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    width: number,
    height: number,
) {
    const vw = video.videoWidth || 1
    const vh = video.videoHeight || 1
    const scale = Math.max(width / vw, height / vh)
    const dw = vw * scale
    const dh = vh * scale
    ctx.drawImage(video, (width - dw) / 2, (height - dh) / 2, dw, dh)
}

export async function createShareVideo({
    overlayBlob,
    width,
    height,
    signal,
    onProgress,
}: {
    /** Transparent poster render — frame, cards and text, no sky. */
    overlayBlob: Blob
    width: number
    height: number
    signal?: AbortSignal
    onProgress?: (progress: number) => void
}): Promise<{ blob: Blob; ext: "mp4" | "webm" }> {
    const [overlay, background] = await Promise.all([
        createImageBitmap(overlayBlob),
        loadBackgroundVideo(signal),
    ])
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
        overlay.close()
        throw new Error("Canvas not supported")
    }

    const { mime, ext } = pickShareVideoFormat()
    const stream = canvas.captureStream(SHARE_VIDEO_FPS)
    const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: SHARE_VIDEO_BITRATE,
    })
    const chunks: BlobPart[] = []

    const blob = await new Promise<Blob>((resolve, reject) => {
        let stopped = false
        const finish = (error?: Error) => {
            if (stopped) return
            stopped = true
            if (recorder.state !== "inactive") recorder.stop()
            if (error) reject(error)
        }

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) chunks.push(event.data)
        }
        recorder.onerror = () => finish(new Error("Video recording failed"))
        recorder.onstop = () => {
            if (!stopped) stopped = true
            resolve(new Blob(chunks, { type: recorder.mimeType || mime }))
        }

        // Fallback navy sky behind the film while its first frame decodes.
        const paintFrame = () => {
            ctx.fillStyle = "#0a1232"
            ctx.fillRect(0, 0, width, height)
            if (background.readyState >= 2) {
                drawVideoCover(ctx, background, width, height)
            }
            ctx.drawImage(overlay, 0, 0, width, height)
        }

        const run = async () => {
            try {
                background.currentTime = 0
                await background.play()
            } catch {
                // Autoplay rejection shouldn't happen for a muted element;
                // record over the static fallback if it somehow does.
            }
            const start = performance.now()
            const render = (now: number) => {
                if (signal?.aborted) {
                    finish(new Error("Video generation aborted"))
                    return
                }
                const t = Math.min(
                    (now - start) / SHARE_VIDEO_DURATION_MS,
                    1,
                )
                paintFrame()
                onProgress?.(t)
                if (t < 1) {
                    requestAnimationFrame(render)
                } else {
                    finish()
                }
            }
            paintFrame()
            recorder.start(1000)
            requestAnimationFrame(render)
        }
        void run()
    }).finally(() => {
        overlay.close()
        background.pause()
        background.removeAttribute("src")
        background.load()
        stream.getTracks().forEach((track) => track.stop())
    })

    return { blob, ext }
}
