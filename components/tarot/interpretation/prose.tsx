"use client"

import { cn } from "@/lib/utils"

interface InterpretationProseProps {
    text: string
    className?: string
    /**
     * When true, applies the muted/translucent palette used inside the share view.
     * When false (default), uses the foreground palette used in the main reading card.
     */
    variant?: "default" | "muted"
}

/**
 * Splits the interpretation text into paragraph chunks. We rely on the model's
 * natural paragraph breaks (\n\n) so we don't have to introspect language-specific
 * sentence boundaries (Thai, for example, doesn't use full stops the way English does).
 * If no paragraph breaks are present we fall back to a single chunk so partial /
 * streaming text still renders.
 */
function splitIntoParagraphs(text: string): string[] {
    const trimmed = text.trim()
    if (!trimmed) return []
    const paragraphs = trimmed
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    return paragraphs.length > 0 ? paragraphs : [trimmed]
}

export default function InterpretationProse({
    text,
    className,
    variant = "default",
}: InterpretationProseProps) {
    const paragraphs = splitIntoParagraphs(text)

    if (paragraphs.length === 0) return null

    const textColor =
        variant === "muted" ? "text-white/85" : "text-foreground/90"

    return (
        <div className={cn("space-y-5", className)}>
            {paragraphs.map((paragraph, index) => (
                <div
                    key={index}
                    className='relative flex gap-3 rounded-r-md border-l-2 border-primary/40 bg-primary/[0.04] py-2 pl-4 pr-3'
                >
                    <span
                        aria-hidden
                        className='select-none text-primary/60 leading-[1.6] text-sm'
                    >
                        ✦
                    </span>
                    <p
                        className={cn(
                            "flex-1 whitespace-pre-wrap leading-relaxed",
                            textColor,
                        )}
                    >
                        {paragraph}
                    </p>
                </div>
            ))}
        </div>
    )
}
