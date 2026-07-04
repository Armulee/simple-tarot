"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export type MediaPreview = { src: string; name: string }

/**
 * Lightbox for uploaded media: clicking an image attachment (in the composer
 * or on a sent message) opens it full-size here.
 */
export function AttachmentPreviewDialog({
    media,
    onClose,
}: {
    media: MediaPreview | null
    onClose: () => void
}) {
    return (
        <Dialog open={Boolean(media)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl border-white/10 bg-black/90 p-3 backdrop-blur-xl">
                <DialogTitle className="sr-only">
                    {media?.name ?? "Attachment preview"}
                </DialogTitle>
                {media ? (
                    <figure className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={media.src}
                            alt={media.name}
                            className="mx-auto max-h-[78vh] w-auto max-w-full rounded-xl object-contain"
                        />
                        <figcaption className="truncate text-center text-xs text-white/60">
                            {media.name}
                        </figcaption>
                    </figure>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
