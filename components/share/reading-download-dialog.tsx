"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Sparkle } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import SharePreview from "@/components/tarot/share-preview"
import { warmShareImagePipeline } from "@/lib/share-image-warmup"
import { createShareVideo, SHARE_VIDEO_DURATION_MS } from "@/lib/share-video"

export type ReadingImageExportStatus = {
    phase: "render" | "download" | "animate" | "done"
    /** 0..1 overall progress; null = indeterminate. */
    progress: number | null
}

/**
 * The server can't report paint progress, so the render phase advances on a
 * smooth asymptotic clock toward this ceiling; real download bytes carry the
 * bar from the ceiling to 100%.
 */
const RENDER_PROGRESS_CEILING = 0.72
const RENDER_PROGRESS_TAU_S = 2.8

export type ShareDownloadStyle = {
    id: "story" | "post" | "square" | "landscape"
    width: number
    height: number
}

const DOWNLOAD_STYLES: ShareDownloadStyle[] = [
    { id: "story", width: 1080, height: 1920 },
    { id: "post", width: 1080, height: 1440 },
    { id: "square", width: 1080, height: 1080 },
    { id: "landscape", width: 1920, height: 1080 },
]

function triggerBlobDownload(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob)
    try {
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        a.rel = "noopener"
        document.body.appendChild(a)
        a.click()
        a.remove()
    } finally {
        URL.revokeObjectURL(url)
    }
}

export interface ReadingDownloadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    question?: string
    cards: string[]
    interpretation?: string
    headline?: string
    subtitle?: string
    keyMessage?: string
    detailedHtml?: string
    insights?: string[]
    /** Prefix for the saved file name; a timestamp + style id are appended. */
    filenameBase?: string
    /**
     * Mirrors export progress to an external surface (e.g. the chat
     * composer strip) so the user still sees it after closing the sheet
     * mid-download. Emitted only for user-initiated downloads, not
     * previews. `null` clears the surface after a failure.
     */
    onExportStatus?: (status: ReadingImageExportStatus | null) => void
}

export default function ReadingDownloadDialog({
    open,
    onOpenChange,
    question,
    cards,
    interpretation,
    headline,
    subtitle,
    keyMessage,
    detailedHtml,
    insights,
    filenameBase = "askingfate-reading",
    onExportStatus,
}: ReadingDownloadDialogProps) {
    const t = useTranslations("ReadingPage.interpretation")
    const tProgress = useTranslations("ShareImageProgress")

    const [format, setFormat] = useState<"image" | "video">("image")
    const [styleId, setStyleId] =
        useState<ShareDownloadStyle["id"]>("story")
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewProgress, setPreviewProgress] = useState<number | null>(null)
    const [isPreviewLoading, setIsPreviewLoading] = useState(false)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [videoProgress, setVideoProgress] = useState<number | null>(null)
    const [isVideoGenerating, setIsVideoGenerating] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [thumbnailUrls, setThumbnailUrls] = useState<
        Record<string, string>
    >({})

    const imageCacheRef = useRef<Map<string, Blob>>(new Map())
    const videoCacheRef = useRef<
        Map<string, { blob: Blob; ext: "mp4" | "webm" }>
    >(new Map())
    const inFlightRef = useRef<Map<string, Promise<Blob>>>(new Map())

    const selectedStyle =
        DOWNLOAD_STYLES.find((style) => style.id === styleId) ??
        DOWNLOAD_STYLES[0]

    const styleLabels: Record<ShareDownloadStyle["id"], string> = {
        story: t("actions.downloadStyleStory"),
        post: t("actions.downloadStylePost"),
        square: t("actions.downloadStyleSquare"),
        landscape: t("actions.downloadStyleLandscape"),
    }
    const styleSizes: Record<ShareDownloadStyle["id"], string> = {
        story: "1080 × 1920 · 9:16",
        post: "1080 × 1440 · 3:4",
        square: "1080 × 1080 · 1:1",
        landscape: "1920 × 1080 · 16:9",
    }

    useEffect(() => {
        warmShareImagePipeline()
    }, [])

    const payloadKey = useMemo(
        () =>
            JSON.stringify([
                question,
                cards,
                interpretation,
                headline,
                subtitle,
                keyMessage,
                detailedHtml,
                insights,
            ]),
        [
            question,
            cards,
            interpretation,
            headline,
            subtitle,
            keyMessage,
            detailedHtml,
            insights,
        ],
    )

    // The reading changed — every cached render is stale.
    useEffect(() => {
        void payloadKey
        imageCacheRef.current.clear()
        videoCacheRef.current.clear()
        inFlightRef.current.clear()
        setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            return null
        })
        setVideoUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            return null
        })
        setThumbnailUrls((current) => {
            Object.values(current).forEach((url) => URL.revokeObjectURL(url))
            return {}
        })
    }, [payloadKey])

    useEffect(() => {
        if (open) return
        setIsPreviewLoading(false)
        setPreviewProgress(null)
        setIsVideoGenerating(false)
        setVideoProgress(null)
    }, [open])

    const fetchShareImage = useCallback(
        async ({
            width,
            height,
            onProgress,
        }: {
            width: number
            height: number
            onProgress?: (progress: number | null) => void
        }): Promise<Blob> => {
            const key = `${width}x${height}`
            const existing = inFlightRef.current.get(key)
            if (existing) return existing

            const promise = (async () => {
                const startedAt = Date.now()
                const ticker = window.setInterval(() => {
                    const elapsedS = (Date.now() - startedAt) / 1000
                    onProgress?.(
                        RENDER_PROGRESS_CEILING *
                            (1 -
                                Math.exp(-elapsedS / RENDER_PROGRESS_TAU_S)),
                    )
                }, 120)
                let res: Response
                try {
                    res = await fetch("/api/share-image", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            question,
                            cards,
                            interpretation,
                            headline,
                            subtitle,
                            keyMessage,
                            detailedHtml,
                            insights,
                            cta: t("actions.shareCta"),
                            width,
                            height,
                            branding: "AskingFate",
                        }),
                    })
                } finally {
                    window.clearInterval(ticker)
                }
                if (!res.ok) {
                    throw new Error(
                        `Share image request failed (${res.status})`,
                    )
                }

                const total = Number(res.headers.get("Content-Length"))
                if (!res.body || !Number.isFinite(total) || total <= 0) {
                    onProgress?.(null)
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
                            RENDER_PROGRESS_CEILING +
                                (1 - RENDER_PROGRESS_CEILING) *
                                    Math.min(received / total, 1),
                        )
                    }
                }
                onProgress?.(1)
                return new Blob(chunks, {
                    type: res.headers.get("Content-Type") || "image/png",
                })
            })()

            inFlightRef.current.set(key, promise)
            try {
                return await promise
            } finally {
                inFlightRef.current.delete(key)
            }
        },
        [
            question,
            cards,
            interpretation,
            headline,
            subtitle,
            keyMessage,
            detailedHtml,
            insights,
            t,
        ],
    )

    const getStyleImage = useCallback(
        async (
            style: ShareDownloadStyle,
            onProgress?: (progress: number | null) => void,
        ): Promise<Blob> => {
            const cached = imageCacheRef.current.get(style.id)
            if (cached) {
                onProgress?.(1)
                return cached
            }
            const blob = await fetchShareImage({
                width: style.width,
                height: style.height,
                onProgress,
            })
            imageCacheRef.current.set(style.id, blob)
            return blob
        },
        [fetchShareImage],
    )

    // Big preview for the selected style.
    useEffect(() => {
        if (!open) return
        let active = true
        const run = async () => {
            setIsPreviewLoading(true)
            setPreviewProgress(0)
            try {
                const blob = await getStyleImage(selectedStyle, (progress) => {
                    if (active) setPreviewProgress(progress)
                })
                if (!active) return
                const nextUrl = URL.createObjectURL(blob)
                setPreviewUrl((current) => {
                    if (current) URL.revokeObjectURL(current)
                    return nextUrl
                })
            } catch (error) {
                if (!active) return
                console.error("Preview error:", error)
                toast.error(t("actions.downloadPreviewError"))
                setPreviewProgress(null)
            } finally {
                if (active) setIsPreviewLoading(false)
            }
        }
        void run()
        return () => {
            active = false
        }
    }, [open, selectedStyle, getStyleImage, t, payloadKey])

    // Thumbnails for the style picker (deduped with the preview fetch).
    useEffect(() => {
        if (!open) return
        let cancelled = false
        const run = async () => {
            for (const style of DOWNLOAD_STYLES) {
                if (cancelled) return
                try {
                    const blob = await getStyleImage(style)
                    if (cancelled) return
                    const url = URL.createObjectURL(blob)
                    setThumbnailUrls((current) => {
                        const next = { ...current }
                        if (next[style.id]) URL.revokeObjectURL(next[style.id])
                        next[style.id] = url
                        return next
                    })
                } catch (error) {
                    console.error("Thumbnail error:", error)
                }
            }
        }
        void run()
        return () => {
            cancelled = true
        }
    }, [open, getStyleImage, payloadKey])

    // Video preview — records the 15s animation once per style, then loops.
    useEffect(() => {
        if (!open || format !== "video") return
        const cached = videoCacheRef.current.get(selectedStyle.id)
        if (cached) {
            const nextUrl = URL.createObjectURL(cached.blob)
            setVideoUrl((current) => {
                if (current) URL.revokeObjectURL(current)
                return nextUrl
            })
            return
        }

        const controller = new AbortController()
        let active = true
        const run = async () => {
            try {
                setIsVideoGenerating(true)
                setVideoProgress(0)
                const baseBlob = await getStyleImage(selectedStyle)
                if (!active) return
                const { blob, ext } = await createShareVideo({
                    baseImageBlob: baseBlob,
                    width: selectedStyle.width,
                    height: selectedStyle.height,
                    signal: controller.signal,
                    onProgress: (progress) => {
                        if (active) setVideoProgress(progress)
                    },
                })
                if (!active) return
                videoCacheRef.current.set(selectedStyle.id, { blob, ext })
                const nextUrl = URL.createObjectURL(blob)
                setVideoUrl((current) => {
                    if (current) URL.revokeObjectURL(current)
                    return nextUrl
                })
            } catch (error) {
                if (!active || controller.signal.aborted) return
                console.error("Video preview error:", error)
                toast.error(t("actions.downloadVideoError"))
                setVideoProgress(null)
            } finally {
                if (active) setIsVideoGenerating(false)
            }
        }
        void run()
        return () => {
            active = false
            controller.abort()
        }
    }, [open, format, selectedStyle, getStyleImage, t, payloadKey])

    const handleSelectStyle = (id: ShareDownloadStyle["id"]) => {
        if (id === styleId) return
        setStyleId(id)
        setVideoUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            return null
        })
    }

    const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-")

    const handleImageDownload = useCallback(async () => {
        setIsDownloading(true)
        try {
            const cached = imageCacheRef.current.get(selectedStyle.id)
            if (!cached) onExportStatus?.({ phase: "render", progress: 0 })
            const blob =
                cached ??
                (await getStyleImage(selectedStyle, (progress) => {
                    onExportStatus?.({
                        phase:
                            progress !== null &&
                            progress >= RENDER_PROGRESS_CEILING
                                ? "download"
                                : "render",
                        progress,
                    })
                }))
            triggerBlobDownload(
                `${filenameBase}-${selectedStyle.id}-${timestamp()}.png`,
                blob,
            )
            onExportStatus?.({ phase: "done", progress: 1 })
        } catch (error) {
            console.error("Download error:", error)
            toast.error(t("actions.downloadError"))
            onExportStatus?.(null)
        } finally {
            setIsDownloading(false)
        }
    }, [selectedStyle, getStyleImage, filenameBase, onExportStatus, t])

    const handleVideoDownload = useCallback(async () => {
        setIsDownloading(true)
        try {
            let cached = videoCacheRef.current.get(selectedStyle.id)
            if (!cached) {
                setIsVideoGenerating(true)
                setVideoProgress(0)
                onExportStatus?.({ phase: "animate", progress: 0 })
                const baseBlob = await getStyleImage(selectedStyle)
                cached = await createShareVideo({
                    baseImageBlob: baseBlob,
                    width: selectedStyle.width,
                    height: selectedStyle.height,
                    onProgress: (progress) => {
                        setVideoProgress(progress)
                        onExportStatus?.({ phase: "animate", progress })
                    },
                })
                videoCacheRef.current.set(selectedStyle.id, cached)
                const nextUrl = URL.createObjectURL(cached.blob)
                setVideoUrl((current) => {
                    if (current) URL.revokeObjectURL(current)
                    return nextUrl
                })
            }
            triggerBlobDownload(
                `${filenameBase}-${selectedStyle.id}-${timestamp()}.${cached.ext}`,
                cached.blob,
            )
            onExportStatus?.({ phase: "done", progress: 1 })
        } catch (error) {
            console.error("Video download error:", error)
            toast.error(t("actions.downloadVideoError"))
            onExportStatus?.(null)
        } finally {
            setIsDownloading(false)
            setIsVideoGenerating(false)
        }
    }, [selectedStyle, getStyleImage, filenameBase, onExportStatus, t])

    const previewAspectClass =
        styleId === "story"
            ? "aspect-[9/16] max-w-[300px]"
            : styleId === "post"
              ? "aspect-[3/4] max-w-[330px]"
              : styleId === "square"
                ? "aspect-square max-w-[380px]"
                : "aspect-video max-w-[430px]"
    const previewPhase =
        previewProgress !== null && previewProgress >= RENDER_PROGRESS_CEILING
            ? "download"
            : "render"
    const showVideoOverlay = format === "video" && isVideoGenerating
    const showImageOverlay = format === "image" && isPreviewLoading
    const overlayPhrase = showVideoOverlay
        ? tProgress("animate")
        : tProgress(previewPhase)
    const overlayProgress = showVideoOverlay ? videoProgress : previewProgress

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side='bottom'
                className='max-h-[88vh] overflow-auto border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 shadow-[0_12px_40px_-12px_rgba(234,179,8,0.35)] backdrop-blur-xl'
            >
                <Sparkle
                    className='absolute top-10 left-10 w-3 h-3 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "0.6s" }}
                />
                <Sparkle
                    className='absolute top-20 right-16 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "1.4s" }}
                />
                <Sparkle
                    className='absolute bottom-14 left-16 w-3.5 h-3.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "2.3s" }}
                />
                <Sparkle
                    className='absolute bottom-20 right-20 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "3.1s" }}
                />
                <div className='pointer-events-none absolute inset-0 opacity-40'>
                    <div className='cosmic-stars-layer-3' />
                    <div className='cosmic-stars-layer-4' />
                    <div className='cosmic-stars-layer-5' />
                </div>
                <div className='pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-yellow-300/20 via-yellow-500/10 to-transparent blur-3xl animate-pulse' />
                <div
                    className='pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-tl from-yellow-400/20 via-yellow-600/10 to-transparent blur-[90px] animate-pulse'
                    style={{ animationDelay: "0.8s" }}
                />
                <SheetHeader>
                    <SheetTitle>
                        {t(
                            format === "video"
                                ? "actions.downloadSheetTitleVideo"
                                : "actions.downloadSheetTitleImage",
                        )}
                    </SheetTitle>
                    <SheetDescription>
                        {t("actions.downloadSheetDesc")}
                    </SheetDescription>
                    <div className='mt-3 flex justify-center'>
                        <div className='inline-flex h-10 items-center justify-center rounded-full bg-white/5 border border-white/10 p-1 text-white'>
                            {(["image", "video"] as const).map((value) => (
                                <button
                                    key={value}
                                    type='button'
                                    onClick={() => setFormat(value)}
                                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                                        format === value
                                            ? "bg-white/15 text-white shadow"
                                            : "text-white/70"
                                    }`}
                                >
                                    {t(
                                        value === "video"
                                            ? "actions.downloadTabVideo"
                                            : "actions.downloadTabImage",
                                    )}
                                    {value === "video" && (
                                        <span className='ml-1.5 rounded-full bg-yellow-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-200'>
                                            {Math.round(
                                                SHARE_VIDEO_DURATION_MS /
                                                    1000,
                                            )}
                                            s
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </SheetHeader>
                <div className='px-4 pb-4 space-y-5'>
                    <div className='space-y-2'>
                        <div className='flex items-center justify-between text-sm'>
                            <span className='font-medium text-white'>
                                {t("actions.downloadStylesTitle")}
                            </span>
                            <span className='text-xs text-muted-foreground'>
                                {t("actions.downloadStylesHint")}
                            </span>
                        </div>
                        <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                            {DOWNLOAD_STYLES.map((style) => (
                                <button
                                    key={style.id}
                                    type='button'
                                    onClick={() => handleSelectStyle(style.id)}
                                    className={`flex flex-col rounded-lg border p-2 text-left transition ${
                                        styleId === style.id
                                            ? "border-yellow-400/60 bg-yellow-400/10"
                                            : "border-white/10 bg-white/5 hover:border-yellow-400/30"
                                    }`}
                                >
                                    <div className='flex h-20 w-full items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/30'>
                                        {thumbnailUrls[style.id] ? (
                                            <div className='relative h-full w-full'>
                                                <Image
                                                    src={
                                                        thumbnailUrls[style.id]
                                                    }
                                                    alt={`${styleLabels[style.id]} preview`}
                                                    fill
                                                    unoptimized
                                                    className='object-contain'
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className='h-full animate-pulse rounded-sm bg-white/10'
                                                style={{
                                                    aspectRatio: `${style.width}/${style.height}`,
                                                    maxWidth: "100%",
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className='mt-2 text-xs font-medium text-white'>
                                        {styleLabels[style.id]}
                                    </div>
                                    <div className='text-[11px] text-white/55'>
                                        {styleSizes[style.id]}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className='space-y-2'>
                        <div className='flex items-center justify-between text-sm'>
                            <span className='font-medium text-white'>
                                {t("actions.downloadPreviewTitle")}
                            </span>
                            <span className='text-xs text-muted-foreground'>
                                {styleSizes[styleId]}
                            </span>
                        </div>
                        <div
                            className={`relative mx-auto w-full overflow-hidden rounded-lg border border-white/10 bg-black/30 ${previewAspectClass}`}
                        >
                            {format === "video" && videoUrl ? (
                                <video
                                    src={videoUrl}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className='absolute inset-0 h-full w-full object-contain'
                                />
                            ) : previewUrl ? (
                                <Image
                                    src={previewUrl}
                                    alt={t("actions.downloadPreviewAlt")}
                                    fill
                                    unoptimized
                                    className='object-contain'
                                />
                            ) : (
                                <SharePreview
                                    question={question}
                                    cards={cards}
                                    interpretation={interpretation}
                                    aspectRatio={styleId}
                                />
                            )}
                            {(showImageOverlay || showVideoOverlay) && (
                                <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 backdrop-blur-[2px]'>
                                    <p className='text-center text-xs font-medium tracking-wide text-amber-200/95'>
                                        {overlayPhrase}
                                        {overlayProgress !== null &&
                                            ` · ${Math.round(overlayProgress * 100)}%`}
                                    </p>
                                    <div className='h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/15'>
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 transition-[width] duration-300 ease-out ${
                                                overlayProgress === null
                                                    ? "w-1/3 animate-pulse"
                                                    : ""
                                            }`}
                                            style={
                                                overlayProgress !== null
                                                    ? {
                                                          width: `${Math.max(6, Math.round(overlayProgress * 100))}%`,
                                                      }
                                                    : undefined
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <SheetFooter className='sticky bottom-0 z-10 gap-2 border-t border-white/10 bg-gradient-to-t from-[#0a0a1a]/95 via-[#0a0a1a]/90 to-transparent px-4 pb-4 pt-3 sm:flex-row sm:justify-end'>
                    <button
                        type='button'
                        className='w-full rounded-md border border-border/60 bg-background px-4 py-2 text-sm hover:bg-muted/40 sm:w-auto'
                        onClick={() => onOpenChange(false)}
                    >
                        {t("actions.downloadCancel")}
                    </button>
                    <button
                        type='button'
                        className='w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'
                        onClick={() =>
                            format === "video"
                                ? handleVideoDownload()
                                : handleImageDownload()
                        }
                        disabled={
                            isDownloading ||
                            (format === "video"
                                ? isVideoGenerating
                                : isPreviewLoading)
                        }
                    >
                        {t(
                            format === "video"
                                ? "actions.downloadVideoButton"
                                : "actions.downloadButton",
                        )}
                    </button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
