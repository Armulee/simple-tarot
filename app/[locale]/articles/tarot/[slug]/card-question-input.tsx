"use client"

import { useRef, useState } from "react"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import QuestionInput from "@/components/question-input"
import { useAuth } from "@/hooks/use-auth"
import { sanitizePromptOnClient } from "@/lib/privacy/sanitize-client"
import {
    buildPrivacyStorageKey,
    saveRawPromptToSession,
} from "@/lib/privacy/prompt-redaction"
import {
    detectInputLanguage,
    resolveSessionLocale,
} from "@/lib/detect-input-language"

/**
 * The home-page question composer, reused on the tarot article page. Typing a
 * question creates a chat session (same flow as home) and redirects into it.
 */
export function CardQuestionInput({ placeholder }: { placeholder?: string }) {
    const locale = useLocale()
    const router = useRouter()
    const { user } = useAuth()
    const [question, setQuestion] = useState("")
    const [isLinking, setIsLinking] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const abortRef = useRef<AbortController | null>(null)

    const createPendingSessionId = () =>
        Array.from(crypto.getRandomValues(new Uint8Array(12)))
            .map((value) => value.toString(36))
            .join("")
            .slice(0, 12)

    const createSessionAndRedirect = async (value: string) => {
        const trimmed = value.trim()
        if (!trimmed || isLinking) return
        const pendingSessionId = createPendingSessionId()
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        setError(null)
        setIsLinking(true)
        setQuestion("")
        try {
            const sanitizeResult = await sanitizePromptOnClient(trimmed, {
                sessionId: pendingSessionId,
                locale,
                signal: controller.signal,
            })
            if (controller.signal.aborted) return
            const sanitizedQuestion = sanitizeResult.sanitized || trimmed
            const userMessageId = `user-${Date.now()}`
            const privacyStorageKey = sanitizeResult.redacted
                ? buildPrivacyStorageKey(userMessageId)
                : undefined
            if (privacyStorageKey) {
                saveRawPromptToSession(privacyStorageKey, trimmed)
            }
            const response = await fetch("/api/chat-sessions/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    id: pendingSessionId,
                    question: sanitizedQuestion,
                    user_id: user?.id ?? null,
                    messages: [
                        {
                            id: userMessageId,
                            role: "user",
                            text: sanitizedQuestion,
                            ...(privacyStorageKey && {
                                privacyStorageKey,
                                privacyRedacted: true,
                                privacyRedactionTypes:
                                    sanitizeResult.redactionTypes,
                            }),
                        },
                    ],
                }),
            })
            if (controller.signal.aborted) return
            const payload = await response.json()
            if (!response.ok || !payload?.id) {
                throw new Error("Failed to create session")
            }
            const detectedLocale = detectInputLanguage(trimmed)
            const targetLocale = resolveSessionLocale(detectedLocale, locale)
            try {
                router.prefetch(`/${targetLocale}/${payload.id}`)
            } catch {}
            router.push(`/${targetLocale}/${payload.id}`)
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                setIsLinking(false)
                setQuestion(trimmed)
                return
            }
            setIsLinking(false)
            setQuestion(trimmed)
            setError("Sorry, something went wrong. Please try again.")
        }
    }

    const handleStop = () => {
        abortRef.current?.abort()
        setIsLinking(false)
    }

    return (
        <QuestionInput
            id='card-question-input'
            value={question}
            onChange={setQuestion}
            onSubmit={createSessionAndRedirect}
            onStop={handleStop}
            isLoading={isLinking}
            centered
            className='w-full'
            placeholder={placeholder}
            showDisclaimer={false}
            inputWrapperClassName='max-w-md md:max-w-lg mx-auto'
            error={
                error ? (
                    <p className='text-xs text-red-400 text-center'>{error}</p>
                ) : undefined
            }
        />
    )
}
