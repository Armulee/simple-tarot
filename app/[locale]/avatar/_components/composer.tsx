"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Mic, MessageCircle, Send, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type ComposerMode = "avatar" | "chat"

/**
 * Bottom input composer with the avatar ⇄ chat toggle (a separate button, per
 * spec). The toggle lets the user override the default starting mode at any
 * time — e.g. someone with wishes who can't play audio can still type in chat.
 */
export function Composer({
    mode,
    onModeChange,
    onSubmit,
    disabled,
    busy,
    showFreeLabel,
}: {
    mode: ComposerMode
    onModeChange: (mode: ComposerMode) => void
    onSubmit: (question: string) => void
    disabled?: boolean
    busy?: boolean
    /** Show the "this consumes your free reveal" expectation-setting label. */
    showFreeLabel?: boolean
}) {
    const t = useTranslations("Avatar")
    const [value, setValue] = useState("")

    const submit = () => {
        const q = value.trim()
        if (!q || disabled || busy) return
        onSubmit(q)
        setValue("")
    }

    return (
        <div className="space-y-2">
            {showFreeLabel && mode === "avatar" && (
                <div className="flex items-center justify-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-center text-xs text-amber-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{t("freeRevealLabel")}</span>
                </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-primary/25 bg-card/70 p-2 backdrop-blur-md">
                {/* Mode toggle */}
                <button
                    type="button"
                    onClick={() => onModeChange(mode === "avatar" ? "chat" : "avatar")}
                    aria-label={t(mode === "avatar" ? "switchToChat" : "switchToAvatar")}
                    title={t(mode === "avatar" ? "switchToChat" : "switchToAvatar")}
                    className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                        mode === "avatar"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70",
                    )}
                >
                    {mode === "avatar" ? (
                        <Mic className="h-5 w-5" />
                    ) : (
                        <MessageCircle className="h-5 w-5" />
                    )}
                </button>

                <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            submit()
                        }
                    }}
                    rows={1}
                    disabled={disabled}
                    placeholder={t(mode === "avatar" ? "askPlaceholder" : "chatPlaceholder")}
                    className="max-h-32 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />

                <Button
                    type="button"
                    size="icon"
                    onClick={submit}
                    disabled={disabled || busy || !value.trim()}
                    className="h-10 w-10 shrink-0 rounded-xl"
                >
                    <Send className="h-5 w-5" />
                </Button>
            </div>
        </div>
    )
}
