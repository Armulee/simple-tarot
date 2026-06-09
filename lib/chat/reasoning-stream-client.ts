import type { ReasoningStreamEvent } from "@/lib/chat/reasoning-stream"

/**
 * Client: read the NDJSON reasoning stream produced by
 * `createReasoningStreamResponse` and surface the two channels as they arrive.
 *
 * `onReasoning` / `onContent` receive the accumulated text for their channel
 * (plus the latest delta), so callers can render incrementally without keeping
 * their own buffers. Resolves with the final accumulated `{ reasoning, content }`.
 *
 * The reader lock is always released, so an aborted/interrupted stream never
 * leaks the underlying connection.
 */
export async function readReasoningStream(
    response: Response,
    handlers: {
        onReasoning?: (accumulated: string, delta: string) => void
        onContent?: (accumulated: string, delta: string) => void
    } = {},
): Promise<{ reasoning: string; content: string }> {
    if (!response.body) throw new Error("Response has no body")

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let reasoning = ""
    let content = ""

    const handleLine = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed) return
        let event: ReasoningStreamEvent
        try {
            event = JSON.parse(trimmed) as ReasoningStreamEvent
        } catch {
            return
        }
        if (typeof event?.d !== "string") return
        if (event.t === "r") {
            reasoning += event.d
            handlers.onReasoning?.(reasoning, event.d)
        } else if (event.t === "c") {
            content += event.d
            handlers.onContent?.(content, event.d)
        } else if (event.t === "e") {
            throw new Error(event.d || "reasoning stream error")
        }
    }

    try {
        for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let newlineIndex: number
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
                const line = buffer.slice(0, newlineIndex)
                buffer = buffer.slice(newlineIndex + 1)
                handleLine(line)
            }
        }
        buffer += decoder.decode()
        if (buffer) handleLine(buffer)
    } finally {
        reader.releaseLock()
    }

    return { reasoning, content }
}
