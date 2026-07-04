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
    getShareImageBlob,
    peekShareImageBlob,
    type ShareImageProgress,
    type ShareImageRequest,
} from "@/lib/share-image-client"
import {
    createShareVideo,
    getShareVideoBackgroundSrc,
    SHARE_VIDEO_DURATION_MS,
} from "@/lib/share-video"

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
    /**
     * Background set + layout flavor. "tarot" (default) renders the
     * card-spread poster; "astrology" swaps in the solar-system skies and
     * drops the card sections for the daily-verdict share.
     */
    theme?: "tarot" | "astrology" | "astrology-technical"
    /** Transit positions stamped under the painted planets (astrology only). */
    planets?: Array<{
        name: string
        sign?: string | null
        degree?: number | null
        retrograde?: boolean | null
    }>
    /**
     * Resolved timing-window date for a "when will X happen?" verdict, stamped
     * as a date crest on the poster. Set ONLY by the timing verdict strategy;
     * left unset by every other strategy so their posters are unchanged.
     */
    verdictDate?: { primary: string; secondary?: string }
    /**
     * Whether the animated video export is offered. The astrology theme has
     * no background film yet, so callers pass `false` to show image-only.
     * Defaults to `true`.
     */
    allowVideo?: boolean
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
    theme = "tarot",
    planets,
    verdictDate,
    allowVideo = true,
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

    // Images live in the shared two-tier client cache (memory + Cache
    // API); only the recorded videos stay component-local.
    const videoCacheRef = useRef<
        Map<string, { blob: Blob; ext: "mp4" | "webm" }>
    >(new Map())

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
                theme,
                planets,
                verdictDate,
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
            theme,
            planets,
            verdictDate,
        ],
    )

    // The reading changed — stale cached entries are simply never keyed
    // again (the shared cache keys on the full payload); only the local
    // video cache and preview object URLs need resetting.
    useEffect(() => {
        void payloadKey
        videoCacheRef.current.clear()
        setRealPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            return null
        })
        setVideoUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            return null
        })
    }, [payloadKey])

    const buildRequest = useCallback(
        (style: ShareDownloadStyle): ShareImageRequest => ({
            question,
            cards,
            interpretation,
            headline,
            subtitle,
            keyMessage,
            detailedHtml,
            insights,
            cta: t("actions.shareCta"),
            width: style.width,
            height: style.height,
            theme,
            planets,
            verdictDate,
        }),
        [
            question,
            cards,
            interpretation,
            headline,
            subtitle,
            keyMessage,
            detailedHtml,
            insights,
            theme,
            planets,
            verdictDate,
            t,
        ],
    )

    /** Real server PNG for a style, from the shared cache or rendered. */
    const getStyleImage = useCallback(
        async (
            style: ShareDownloadStyle,
            onProgress?: ShareImageProgress,
        ): Promise<Blob> => {
            const blob = await getShareImageBlob(
                buildRequest(style),
                onProgress,
            )
            if (style.id === selectedStyle.id) {
                const nextUrl = URL.createObjectURL(blob)
                setRealPreviewUrl((current) => {
                    if (current) URL.revokeObjectURL(current)
                    return nextUrl
                })
            }
            return blob
        },
        [buildRequest, selectedStyle.id],
    )

    const handleSelectStyle = (id: ShareDownloadStyle["id"]) => {
        if (id === styleId) return
        setStyleId(id)
        // The cached real PNG / video belong to the previous style.
        const style = DOWNLOAD_STYLES.find((entry) => entry.id === id)
        setRealPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current)
            const cached = style
                ? peekShareImageBlob(buildRequest(style))
                : null
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
        if (!peekShareImageBlob(buildRequest(selectedStyle))) {
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
    }, [
        selectedStyle,
        getStyleImage,
        buildRequest,
        filenameBase,
        onExportStatus,
        t,
    ])

    const handleVideoDownload = useCallback(async () => {
        setIsDownloading(true)
        const emit = (status: ReadingImageExportStatus | null) =>
            onExportStatus?.(status)
        try {
            let cached = videoCacheRef.current.get(selectedStyle.id)
            if (!cached) {
                // Phase 1: transparent overlay poster from the server
                // (first ~25% of the bar) — frame, cards and text only,
                // the cosmic film shows through; phase 2: the 15s canvas
                // recording over the background video (remaining 75%).
                setDownloadPhase("render")
                setDownloadProgress(0)
                const overlayBlob = await getShareImageBlob(
                    { ...buildRequest(selectedStyle), transparent: true },
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
                    overlayBlob,
                    aspect: selectedStyle.id,
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
    }, [selectedStyle, buildRequest, filenameBase, onExportStatus, t])

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
                className='max-h-[88vh] overflow-x-hidden overflow-y-auto border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 shadow-[0_12px_40px_-12px_rgba(234,179,8,0.35)] backdrop-blur-xl'
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
                <SheetHeader className='items-center text-center'>
                    <SheetTitle className='font-serif text-xl tracking-wide text-[#f3e5bf]'>
                        {t(
                            format === "video"
                                ? "actions.downloadSheetTitleVideo"
                                : "actions.downloadSheetTitleImage",
                        )}
                    </SheetTitle>
                    {/* Gold diamond rule, echoing the poster's section labels */}
                    <div
                        aria-hidden
                        className='mx-auto flex items-center gap-2'
                    >
                        <span className='h-px w-12 bg-gradient-to-r from-transparent to-amber-300/60' />
                        <span className='h-1.5 w-1.5 rotate-45 bg-amber-300/80' />
                        <span className='h-px w-12 bg-gradient-to-l from-transparent to-amber-300/60' />
                    </div>
                    <SheetDescription className='text-white/55'>
                        {t("actions.downloadSheetDesc")}
                    </SheetDescription>
                    <div
                        className={`mt-2 flex justify-center ${allowVideo ? "" : "hidden"}`}
                    >
                        <div className='inline-flex h-10 items-center justify-center rounded-full border border-amber-300/20 bg-white/5 p-1 text-white'>
                            {(["image", "video"] as const).map((value) => (
                                <button
                                    key={value}
                                    type='button'
                                    onClick={() => setFormat(value)}
                                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
                                        format === value
                                            ? "bg-gradient-to-r from-amber-400/90 via-yellow-300/90 to-amber-400/90 text-[#241a05] shadow-[0_2px_14px_-2px_rgba(252,211,77,0.55)]"
                                            : "text-white/65 hover:text-white/90"
                                    }`}
                                >
                                    {t(
                                        value === "video"
                                            ? "actions.downloadTabVideo"
                                            : "actions.downloadTabImage",
                                    )}
                                    {value === "video" && (
                                        <span
                                            className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                                format === "video"
                                                    ? "bg-[#241a05]/15 text-[#241a05]"
                                                    : "bg-yellow-400/15 text-yellow-200"
                                            }`}
                                        >
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
                <div className='mx-auto w-full max-w-xl space-y-4 px-4 pb-4'>
                    <div className='space-y-1.5'>
                        <div className='flex items-baseline justify-between'>
                            <span className='text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/80'>
                                {t("actions.downloadStylesTitle")}
                            </span>
                            <span className='text-[11px] text-white/40'>
                                {t("actions.downloadStylesHint")}
                            </span>
                        </div>
                        {/* All styles on one line — compact shape-icon chips */}
                        <div className='grid grid-cols-4 gap-1.5'>
                            {DOWNLOAD_STYLES.map((style) => {
                                const active = styleId === style.id
                                // Largest box of this aspect ratio that fits
                                // the 34×30 icon frame — a quick shape cue.
                                const scale = Math.min(
                                    34 / style.width,
                                    30 / style.height,
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
                                        className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-all duration-200 ${
                                            active
                                                ? "border-amber-300/70 bg-gradient-to-b from-amber-300/15 to-amber-400/5 shadow-[0_4px_18px_-6px_rgba(252,211,77,0.45)]"
                                                : "border-white/10 bg-white/[0.04] hover:border-amber-300/35 hover:bg-white/[0.07]"
                                        }`}
                                    >
                                        <div className='flex h-[30px] w-full items-center justify-center'>
                                            <div
                                                className={`rounded-[2px] border-[1.5px] transition ${
                                                    active
                                                        ? "border-amber-300 bg-amber-300/15 shadow-[0_0_10px_-1px_rgba(252,211,77,0.6)]"
                                                        : "border-white/40 bg-white/5"
                                                }`}
                                                style={{
                                                    width: boxW,
                                                    height: boxH,
                                                }}
                                            />
                                        </div>
                                        <div
                                            className={`text-[11px] font-medium leading-none ${
                                                active
                                                    ? "text-amber-100"
                                                    : "text-white/80"
                                            }`}
                                        >
                                            {styleLabels[style.id]}
                                        </div>
                                        <div
                                            className={`text-[9px] leading-none ${
                                                active
                                                    ? "text-amber-200/80"
                                                    : "text-white/40"
                                            }`}
                                        >
                                            {styleRatios[style.id]}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className='space-y-1.5'>
                        <div className='flex items-baseline justify-between'>
                            <span className='text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/80'>
                                {t("actions.downloadPreviewTitle")}
                            </span>
                            <span className='text-[11px] text-white/40'>
                                {styleSizes[styleId]}
                            </span>
                        </div>
                        <div
                            className={`relative mx-auto w-full overflow-hidden rounded-xl bg-black/30 ring-1 ring-amber-300/30 shadow-[0_10px_40px_-12px_rgba(252,211,77,0.3)] ${previewAspectClass}`}
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
                            ) : format === "image" && realPreviewUrl ? (
                                <Image
                                    src={realPreviewUrl}
                                    alt={t("actions.downloadPreviewAlt")}
                                    fill
                                    unoptimized
                                    className='object-contain'
                                />
                            ) : (
                                /* Video tab previews the elements live over
                                   the looping cosmic film before recording */
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
                                    theme={theme}
                                    planets={planets}
                                    verdictDate={verdictDate}
                                    videoBackgroundSrc={
                                        format === "video"
                                            ? getShareVideoBackgroundSrc(
                                                  styleId,
                                              )
                                            : undefined
                                    }
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
                <SheetFooter className='sticky bottom-0 z-10 border-t border-amber-300/15 bg-gradient-to-t from-[#0a0a1a]/95 via-[#0a0a1a]/90 to-transparent px-4 pb-4 pt-3'>
                    <div className='mx-auto flex w-full max-w-xl gap-2'>
                        <button
                            type='button'
                            className='rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white/75 transition hover:border-white/30 hover:text-white'
                            onClick={() => onOpenChange(false)}
                        >
                            {t("actions.downloadCancel")}
                        </button>
                        <button
                            type='button'
                            className='flex-1 rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 px-5 py-2.5 text-sm font-semibold text-[#241a05] shadow-[0_6px_24px_-6px_rgba(252,211,77,0.6)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60'
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
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
