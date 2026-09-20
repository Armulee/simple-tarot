"use client"

import { useEffect, useRef } from "react"
import { Keyboard, Mic, Send, Square } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import type { UseVoiceInput } from "@/hooks/use-voice-input"

/**
 * The immerse input bar: a single glowing pill with a keyboard affordance on
 * the left, the question field, and the mic on the right.
 *
 * Deliberately not `components/question-input.tsx` — that composer carries
 * attachments, mentions, the settings menu, the mode selector and the
 * avatar/chat toggle, none of which belong in front of a talking avatar.
 */
export function ImmerseComposer({
    value,
    onChange,
    onSubmit,
    isLoading,
    voice,
    interim,
}: {
    value: string
    onChange: (value: string) => void
    onSubmit: (value: string) => void
    isLoading: boolean
    voice: UseVoiceInput
    /** Live partial speech, rendered dimmed after the committed text. */
    interim: string
}) {
    const t = useTranslations("Immerse")
    const inputRef = useRef<HTMLTextAreaElement | null>(null)
    const listening = voice.state === "listening"

    // Grow with the question, but never take over the stage.
    useEffect(() => {
        const el = inputRef.current
        if (!el) return
        el.style.height = "auto"
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }, [value])

    const submit = () => {
        const trimmed = value.trim()
        if (!trimmed || isLoading) return
        onSubmit(trimmed)
    }

    return (
        <div className="w-full">
            <div
                className={cn(
                    "relative flex items-end gap-2 rounded-[28px] border px-3 py-2 backdrop-blur-xl transition-all",
                    listening
                        ? "border-primary/70 bg-black/55 shadow-[0_0_28px_-4px_var(--color-primary)]"
                        : "border-white/15 bg-black/40 shadow-[0_0_24px_-8px_rgba(129,140,248,0.7)]",
                )}
            >
                <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    aria-label={t("keyboard")}
                    className="mb-1.5 shrink-0 rounded-full p-2 text-white/55 transition-colors hover:text-white/85"
                >
                    <Keyboard className="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1 py-1.5">
                    <textarea
                        ref={inputRef}
                        rows={1}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                submit()
                            }
                        }}
                        placeholder={listening ? t("listening") : t("placeholder")}
                        aria-label={t("placeholder")}
                        className="w-full resize-none bg-transparent text-base text-white placeholder:text-white/45 focus:outline-none"
                    />
                    {interim && (
                        <p className="pointer-events-none truncate text-base text-white/40">
                            {interim}
                        </p>
                    )}
                </div>

                <div className="mb-0.5 flex shrink-0 items-center gap-1">
                    {voice.supported && (
                        <button
                            type="button"
                            onClick={() => (listening ? voice.stop() : voice.start())}
                            disabled={voice.state === "denied"}
                            aria-label={listening ? t("stopListening") : t("askByVoice")}
                            aria-pressed={listening}
                            className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-full transition-all",
                                "bg-gradient-to-br from-indigo-500 to-violet-600 text-white",
                                listening && "animate-pulse ring-4 ring-primary/40",
                                voice.state === "denied" &&
                                    "cursor-not-allowed opacity-40",
                            )}
                        >
                            {listening ? (
                                <Square className="h-4 w-4 fill-current" />
                            ) : (
                                <Mic className="h-5 w-5" />
                            )}
                        </button>
                    )}
                    {/* With no mic available the send button is the only control,
                        so it has to be visible rather than implied by Enter. */}
                    {(!voice.supported || value.trim().length > 0) && (
                        <button
                            type="button"
                            onClick={submit}
                            disabled={!value.trim() || isLoading}
                            aria-label={t("send")}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {voice.state === "denied" && (
                <p className="mt-2 text-center text-xs text-amber-200/90">
                    {t("micDenied")}
                </p>
            )}
        </div>
    )
}
