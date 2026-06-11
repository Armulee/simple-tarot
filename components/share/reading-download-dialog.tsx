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
import ShareImageMock from "@/components/share/share-image-mock"
import { warmShareImagePipeline } from "@/lib/share-image-warmup"
import {
    fetchShareImageBlob,
    type ShareImageProgress,
} from "@/lib/share-image-client"
import { createShareVideo, SHARE_VIDEO_DURATION_MS } from "@/lib/share-video"

export type ReadingImageExportStatus = {
    phase: "render" | "download" | "animate" | "done"
    /** 0..1 overall progress; null = indeterminate. */
    progress: number | null
}

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
    // The preview is the instant client-composed mock; once the real PNG
    // has been fetched for a download it replaces the mock pixel-for-pixel.
    const [realPreviewUrl, setRealPreviewUrl] = useState<string | null>(null)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadPhase, setDownloadPhase] = useState<
        "render" | "download" | "animate" | null
    >(null)
    const [downloadProgress, setDownloadProgress] = useState<number | null>(
        null,
    )

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
    const styleRatios: Record<ShareDownloadStyle["id"], string> = {
        story: "9:16",
        post: "3:4",
        square: "1:1",
        landscape: "16:9",
    }
    const styleResolutions: Record<ShareDownloadStyle["id"], string> = {
        story: "1080 × 1920",
        post: "1080 × 1440",
        square: "1080 × 1080",
        landscape: "1920 × 1080",
    }
    const styleSizes: Record<ShareDownloadStyle["id"], string> = {
        story: `${styleResolutions.story} · ${styleRatios.story}`,
        post: `${styleResolutions.post} · ${styleRatios.post}`,
        square: `${styleResolutions.square} · ${styleRatios.square}`,
        landscape: `${styleResolutions.landscape} · ${styleRatios.landscape}`,
    }

    // Pre-warm the server renderer so the real download starts painting
    // immediately when the user asks for it.
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
        setRealPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            return null
        })
        setVideoUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            return null
        })
    }, [payloadKey])

    const fetchShareImage = useCallback(
        async ({
            width,
            height,
            onProgress,
        }: {
            width: number
            height: number
            onProgress?: ShareImageProgress
        }): Promise<Blob> => {
            const key = `${width}x${height}`
            const existing = inFlightRef.current.get(key)
            if (existing) return existing

            const promise = fetchShareImageBlob(
                {
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
                },
                onProgress,
            )

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

    /** Real server PNG for a style, from cache or fetched with progress. */
    const getStyleImage = useCallback(
        async (
            style: ShareDownloadStyle,
            onProgress?: ShareImageProgress,
        ): Promise<Blob> => {
            const cached = imageCacheRef.current.get(style.id)
            if (cached) return cached
            const blob = await fetchShareImage({
                width: style.width,
                height: style.height,
                onProgress,
            })
            imageCacheRef.current.set(style.id, blob)
            if (style.id === selectedStyle.id) {
                const nextUrl = URL.createObjectURL(blob)
                setRealPreviewUrl((current) => {
                    if (current) URL.revokeObjectURL(current)
                    return nextUrl
                })
            }
            return blob
        },
        [fetchShareImage, selectedStyle.id],
    )

    const handleSelectStyle = (id: ShareDownloadStyle["id"]) => {
        if (id === styleId) return
        setStyleId(id)
        // The cached real PNG / video belong to the previous style.
        setRealPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            const cached = imageCacheRef.current.get(id)
            return cached ? URL.createObjectURL(cached) : null
        })
        setVideoUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            const cached = videoCacheRef.current.get(id)
            return cached ? URL.createObjectURL(cached.blob) : null
        })
    }

    const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-")

    const handleImageDownload = useCallback(async () => {
        setIsDownloading(true)
        setDownloadPhase("render")
        setDownloadProgress(0)
        const emit = (status: ReadingImageExportStatus | null) =>
            onExportStatus?.(status)
        if (!imageCacheRef.current.get(selectedStyle.id)) {
            emit({ phase: "render", progress: 0 })
        }
        try {
            const blob = await getStyleImage(
                selectedStyle,
                (phase, progress) => {
                    setDownloadPhase(phase)
                    setDownloadProgress(progress)
                    emit({ phase, progress })
                },
            )
            triggerBlobDownload(
                `${filenameBase}-${selectedStyle.id}-${timestamp()}.png`,
                blob,
            )
            emit({ phase: "done", progress: 1 })
        } catch (error) {
            console.error("Download error:", error)
            toast.error(t("actions.downloadError"))
            emit(null)
        } finally {
            setIsDownloading(false)
            setDownloadPhase(null)
            setDownloadProgress(null)
        }
    }, [selectedStyle, getStyleImage, filenameBase, onExportStatus, t])

    const handleVideoDownload = useCallback(async () => {
        setIsDownloading(true)
        const emit = (status: ReadingImageExportStatus | null) =>
            onExportStatus?.(status)
        try {
            let cached = videoCacheRef.current.get(selectedStyle.id)
            if (!cached) {
                // Phase 1: real poster from the server (first ~25% of the
                // bar); phase 2: the 15s canvas recording (remaining 75%).
                setDownloadPhase("render")
                setDownloadProgress(0)
                const baseBlob = await getStyleImage(
                    selectedStyle,
                    (phase, progress) => {
                        setDownloadPhase(phase)
                        const scaled =
                            progress === null ? null : progress * 0.25
                        setDownloadProgress(scaled)
                        emit({ phase, progress: scaled })
                    },
                )
                setDownloadPhase("animate")
                cached = await createShareVideo({
                    baseImageBlob: baseBlob,
                    width: selectedStyle.width,
                    height: selectedStyle.height,
                    onProgress: (progress) => {
                        const scaled = 0.25 + progress * 0.75
                        setDownloadProgress(scaled)
                        emit({ phase: "animate", progress: scaled })
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
            emit({ phase: "done", progress: 1 })
        } catch (error) {
            console.error("Video download error:", error)
            toast.error(t("actions.downloadVideoError"))
            emit(null)
        } finally {
            setIsDownloading(false)
            setDownloadPhase(null)
            setDownloadProgress(null)
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
                            {DOWNLOAD_STYLES.map((style) => {
                                const active = styleId === style.id
                                // Largest box of this aspect ratio that fits
                                // the 56×52 icon frame — a quick shape cue.
                                const scale = Math.min(
                                    56 / style.width,
                                    52 / style.height,
                                )
                                const boxW = Math.round(style.width * scale)
                                const boxH = Math.round(style.height * scale)
                                return (
                                    <button
                                        key={style.id}
                                        type='button'
                                        onClick={() =>
                                            handleSelectStyle(style.id)
                                        }
                                        aria-pressed={active}
                                        className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition ${
                                            active
                                                ? "border-yellow-400/60 bg-yellow-400/10"
                                                : "border-white/10 bg-white/5 hover:border-yellow-400/30"
                                        }`}
                                    >
                                        <div className='flex h-[56px] w-full items-center justify-center'>
                                            <div
                                                className={`flex items-center justify-center rounded-[3px] border-2 transition ${
                                                    active
                                                        ? "border-yellow-300/90 bg-yellow-300/10"
                                                        : "border-white/40 bg-white/5"
                                                }`}
                                                style={{
                                                    width: boxW,
                                                    height: boxH,
                                                }}
                                            >
                                                <span
                                                    className={`text-[9px] font-semibold leading-none ${
                                                        active
                                                            ? "text-yellow-200"
                                                            : "text-white/70"
                                                    }`}
                                                >
                                                    {styleRatios[style.id]}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='text-xs font-medium text-white'>
                                            {styleLabels[style.id]}
                                        </div>
                                        <div className='text-[11px] text-white/55'>
                                            {styleResolutions[style.id]}
                                        </div>
                                    </button>
                                )
                            })}
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
                            ) : realPreviewUrl ? (
                                <Image
                                    src={realPreviewUrl}
                                    alt={t("actions.downloadPreviewAlt")}
                                    fill
                                    unoptimized
                                    className='object-contain'
                                />
                            ) : (
                                <ShareImageMock
                                    aspect={styleId}
                                    question={question}
                                    cards={cards}
                                    interpretation={interpretation}
                                    headline={headline}
                                    subtitle={subtitle}
                                    keyMessage={keyMessage}
                                    detailedHtml={detailedHtml}
                                    insights={insights}
                                    cta={t("actions.shareCta")}
                                />
                            )}
                            {isDownloading && (
                                <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 backdrop-blur-[2px]'>
                                    <p className='text-center text-xs font-medium tracking-wide text-amber-200/95'>
                                        {tProgress(downloadPhase ?? "render")}
                                        {downloadProgress !== null &&
                                            ` · ${Math.round(downloadProgress * 100)}%`}
                                    </p>
                                    <div className='h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/15'>
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 transition-[width] duration-300 ease-out ${
                                                downloadProgress === null
                                                    ? "w-1/3 animate-pulse"
                                                    : ""
                                            }`}
                                            style={
                                                downloadProgress !== null
                                                    ? {
                                                          width: `${Math.max(6, Math.round(downloadProgress * 100))}%`,
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
                        disabled={isDownloading}
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
