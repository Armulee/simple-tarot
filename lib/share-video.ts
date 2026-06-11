/**
 * Client-side share-video generator. Plays a 15-second cosmic animation —
 * twinkling stars, breathing nebula glows and shooting stars that fall as
 * shining arcs — over the server-rendered share poster, recording the
 * canvas in real time with MediaRecorder. Progress maps 1:1 to elapsed
 * recording time, so the bar is always honest.
 */

export const SHARE_VIDEO_DURATION_MS = 15_000
const SHARE_VIDEO_FPS = 30
const SHARE_VIDEO_BITRATE = 7_000_000

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

type TwinkleStar = {
    x: number
    y: number
    size: number
    alpha: number
    speed: number
    offset: number
    gold: boolean
}

type ShootingStar = {
    /** Normalized [0..1] time inside the video when the star appears. */
    startT: number
    /** Flight time as a fraction of the full video. */
    duration: number
    x0: number
    y0: number
    /** Quadratic bezier control + end point — gives the arc its curve. */
    cx: number
    cy: number
    x1: number
    y1: number
    size: number
}

function makeTwinkleStars(w: number, h: number): TwinkleStar[] {
    const count = Math.round(Math.max(110, (w * h) / 16_000))
    return Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 0.8 + Math.random() * 1.9,
        alpha: 0.28 + Math.random() * 0.6,
        speed: 0.5 + Math.random() * 1.9,
        offset: Math.random() * Math.PI * 2,
        gold: Math.random() < 0.22,
    }))
}

/**
 * Pre-plan the whole shower: one star roughly every 1.6s, each falling
 * diagonally with a gentle bow so the trail reads as an arc, not a line.
 */
function makeShootingStars(w: number, h: number): ShootingStar[] {
    const stars: ShootingStar[] = []
    const count = 9
    for (let i = 0; i < count; i++) {
        const startT = (i + 0.25 + Math.random() * 0.5) / (count + 1)
        const leftToRight = Math.random() < 0.5
        const x0 = leftToRight
            ? Math.random() * w * 0.45
            : w * 0.55 + Math.random() * w * 0.45
        const y0 = Math.random() * h * 0.4
        const travelX = (0.32 + Math.random() * 0.3) * w * (leftToRight ? 1 : -1)
        const travelY = (0.28 + Math.random() * 0.28) * h
        const x1 = x0 + travelX
        const y1 = y0 + travelY
        // Bow the control point perpendicular to the chord for the arc.
        const bow = (0.1 + Math.random() * 0.12) * Math.hypot(travelX, travelY)
        stars.push({
            startT,
            duration: (1100 + Math.random() * 700) / SHARE_VIDEO_DURATION_MS,
            x0,
            y0,
            cx: (x0 + x1) / 2 + (leftToRight ? bow : -bow),
            cy: (y0 + y1) / 2 - bow,
            x1,
            y1,
            size: 2.4 + Math.random() * 1.8,
        })
    }
    return stars
}

function bezierPoint(
    s: ShootingStar,
    t: number,
): { x: number; y: number } {
    const u = 1 - t
    return {
        x: u * u * s.x0 + 2 * u * t * s.cx + t * t * s.x1,
        y: u * u * s.y0 + 2 * u * t * s.cy + t * t * s.y1,
    }
}

function drawShootingStar(
    ctx: CanvasRenderingContext2D,
    star: ShootingStar,
    progress: number,
    scale: number,
) {
    // Ease the head along the arc and fade the whole star out at the end.
    const head = Math.min(progress * 1.12, 1)
    const fade = progress > 0.78 ? 1 - (progress - 0.78) / 0.22 : 1
    const trailLen = 0.34
    const tail = Math.max(head - trailLen, 0)
    const segments = 22

    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.lineCap = "round"

    let prev = bezierPoint(star, tail)
    for (let i = 1; i <= segments; i++) {
        const f = i / segments
        const t = tail + (head - tail) * f
        const point = bezierPoint(star, t)
        const alpha = 0.55 * f * f * fade
        const width = star.size * scale * (0.25 + 1.05 * f)
        ctx.strokeStyle = `rgba(255, ${Math.round(225 + 25 * f)}, ${Math.round(160 + 70 * f)}, ${alpha.toFixed(3)})`
        ctx.lineWidth = width
        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
        prev = point
    }

    // Shining head: hot white core inside a soft gold halo.
    const headPoint = bezierPoint(star, head)
    const haloR = star.size * scale * 7
    const halo = ctx.createRadialGradient(
        headPoint.x,
        headPoint.y,
        0,
        headPoint.x,
        headPoint.y,
        haloR,
    )
    halo.addColorStop(0, `rgba(255,255,255,${(0.9 * fade).toFixed(3)})`)
    halo.addColorStop(0.25, `rgba(255,236,170,${(0.55 * fade).toFixed(3)})`)
    halo.addColorStop(1, "rgba(255,220,130,0)")
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(headPoint.x, headPoint.y, haloR, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

export async function createShareVideo({
    baseImageBlob,
    width,
    height,
    signal,
    onProgress,
}: {
    baseImageBlob: Blob
    width: number
    height: number
    signal?: AbortSignal
    onProgress?: (progress: number) => void
}): Promise<{ blob: Blob; ext: "mp4" | "webm" }> {
    const baseImage = await createImageBitmap(baseImageBlob)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
        baseImage.close()
        throw new Error("Canvas not supported")
    }

    const scale = Math.min(width, height) / 1080
    const twinkles = makeTwinkleStars(width, height)
    const shooters = makeShootingStars(width, height)
    const glowOrbs = [
        {
            x: width * 0.22,
            y: height * 0.18,
            radius: Math.min(width, height) * 0.4,
            color: "rgba(86,120,220,0.13)",
            speed: 1.5,
            phase: 0,
        },
        {
            x: width * 0.8,
            y: height * 0.74,
            radius: Math.min(width, height) * 0.45,
            color: "rgba(232,198,106,0.11)",
            speed: 1,
            phase: 2.1,
        },
    ]

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

        const start = performance.now()
        const render = (now: number) => {
            if (signal?.aborted) {
                finish(new Error("Video generation aborted"))
                return
            }
            const elapsed = now - start
            const t = Math.min(elapsed / SHARE_VIDEO_DURATION_MS, 1)

            ctx.clearRect(0, 0, width, height)
            ctx.drawImage(baseImage, 0, 0, width, height)

            // Breathing nebula glows.
            for (const orb of glowOrbs) {
                const drift =
                    Math.sin(t * Math.PI * 2 * orb.speed + orb.phase) *
                    26 *
                    scale
                const gx = orb.x + drift
                const gy = orb.y - drift * 0.6
                const gradient = ctx.createRadialGradient(
                    gx,
                    gy,
                    0,
                    gx,
                    gy,
                    orb.radius,
                )
                gradient.addColorStop(0, orb.color)
                gradient.addColorStop(1, "rgba(0,0,0,0)")
                ctx.fillStyle = gradient
                ctx.beginPath()
                ctx.arc(gx, gy, orb.radius, 0, Math.PI * 2)
                ctx.fill()
            }

            // Twinkling stars over the artwork.
            ctx.save()
            ctx.globalCompositeOperation = "screen"
            for (const star of twinkles) {
                const twinkle =
                    0.5 +
                    0.5 *
                        Math.sin(
                            t * Math.PI * 2 * star.speed * 4 + star.offset,
                        )
                const alpha = star.alpha * twinkle
                ctx.fillStyle = star.gold
                    ? `rgba(252,221,130,${alpha.toFixed(3)})`
                    : `rgba(255,255,255,${alpha.toFixed(3)})`
                ctx.beginPath()
                ctx.arc(star.x, star.y, star.size * scale, 0, Math.PI * 2)
                ctx.fill()
            }
            ctx.restore()

            // Shooting stars falling as shining arcs.
            for (const shooter of shooters) {
                const local = (t - shooter.startT) / shooter.duration
                if (local <= 0 || local >= 1) continue
                drawShootingStar(ctx, shooter, local, scale)
            }

            onProgress?.(t)
            if (t < 1) {
                requestAnimationFrame(render)
            } else {
                finish()
            }
        }

        recorder.start(1000)
        requestAnimationFrame(render)
    }).finally(() => {
        baseImage.close()
        stream.getTracks().forEach((track) => track.stop())
    })

    return { blob, ext }
}
