import type { InterpretationMode } from "@/lib/interpretation-mode-storage"

/**
 * Per-mode border/focus colours and ambient glow for the chat composer input.
 * Shared by the plain composer textarea (question-input) and the mention-aware
 * overlay textarea (mention-textarea) so both stay visually identical.
 */
export const INPUT_BORDER_BY_MODE: Record<InterpretationMode, string> = {
    auto: "border-border/60 focus:border-primary/60 focus:ring-primary/40",
    chat: "border-emerald-400/30 focus:border-emerald-400/60 focus:ring-emerald-400/30",
    tarot: "border-purple-400/30 focus:border-purple-400/60 focus:ring-purple-400/30",
    horoscope:
        "border-blue-400/30 focus:border-blue-400/60 focus:ring-blue-400/30",
    oracle: "border-amber-300/40 focus:border-amber-300/70 focus:ring-amber-300/30",
}

export const INPUT_GLOW_BY_MODE: Record<InterpretationMode, string> = {
    auto: "shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)]",
    chat: "shadow-[0_10px_30px_-10px_rgba(52,211,153,0.3)]",
    tarot: "shadow-[0_10px_30px_-10px_rgba(168,85,247,0.3)]",
    horoscope: "shadow-[0_10px_30px_-10px_rgba(96,165,250,0.3)]",
    oracle: "shadow-[0_10px_30px_-10px_rgba(252,211,77,0.35)]",
}
