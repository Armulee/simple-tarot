/**
 * Shared wire-protocol for streaming a reasoning model's two channels
 * (`reasoning_content` and `content`) to the browser over a single response
 * body.
 *
 * The stream is newline-delimited JSON ("NDJSON"): one compact JSON object per
 * line. Deltas are JSON-escaped so they never contain a raw newline, which
 * makes the client parser a trivial split on "\n".
 *
 *   {"t":"m","d":"...JSON-encoded metadata object..."}
 *   {"t":"r","d":"...reasoning delta..."}
 *   {"t":"c","d":"...content delta..."}
 *   {"t":"e","d":"...error message..."}
 *
 * `t` = type: "m" metadata (one optional event, sent first), "r" reasoning,
 * "c" content, "e" error.
 * `d` = delta string ("m" carries a JSON-encoded payload).
 */

export type ReasoningStreamEventType = "r" | "c" | "e" | "m"

export interface ReasoningStreamEvent {
    t: ReasoningStreamEventType
    d: string
}

/** Minimal shape of the AI SDK `streamText` full-stream parts we consume. */
type FullStreamPart =
    | { type: "reasoning-delta"; delta: string }
    | { type: "text-delta"; delta: string }
    | { type: "error"; error: unknown }
    | { type: string; [key: string]: unknown }

interface ReasoningStreamSource {
    fullStream: AsyncIterable<FullStreamPart>
}

function encodeEvent(event: ReasoningStreamEvent): string {
    return `${JSON.stringify(event)}\n`
}

/**
 * Server: turn a `streamText()` result into an NDJSON `Response` that keeps the
 * reasoning and content channels separate. Iterates the full stream so we can
 * pick out `reasoning-delta` vs `text-delta` parts as DeepSeek V4 emits them.
 *
 * `options.metadata` (when provided) is JSON-encoded and sent as a single
 * leading "m" event, so the client can attach structured extras (e.g. the
 * aspect events grounding an explanation) to the streamed message.
 */
export function createReasoningStreamResponse(
    result: ReasoningStreamSource,
    options?: { metadata?: unknown },
): Response {
    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            try {
                if (options?.metadata !== undefined) {
                    controller.enqueue(
                        encoder.encode(
                            encodeEvent({
                                t: "m",
                                d: JSON.stringify(options.metadata),
                            }),
                        ),
                    )
                }
                for await (const part of result.fullStream) {
                    switch (part.type) {
                        case "reasoning-delta":
                        case "reasoning": {
                            // v5 emits `reasoning-delta` with `delta`; tolerate a
                            // `reasoning` part carrying `text` as well.
                            const delta =
                                (part as { delta?: string }).delta ??
                                (part as { text?: string }).text
                            if (delta)
                                controller.enqueue(
                                    encoder.encode(
                                        encodeEvent({ t: "r", d: delta }),
                                    ),
                                )
                            break
                        }
                        case "text-delta":
                        case "text": {
                            const delta =
                                (part as { delta?: string }).delta ??
                                (part as { text?: string }).text
                            if (delta)
                                controller.enqueue(
                                    encoder.encode(
                                        encodeEvent({ t: "c", d: delta }),
                                    ),
                                )
                            break
                        }
                        case "error": {
                            const err = (part as { error?: unknown }).error
                            controller.enqueue(
                                encoder.encode(
                                    encodeEvent({
                                        t: "e",
                                        d:
                                            err instanceof Error
                                                ? err.message
                                                : String(err),
                                    }),
                                ),
                            )
                            break
                        }
                        default:
                            break
                    }
                }
                controller.close()
            } catch (error) {
                try {
                    controller.enqueue(
                        encoder.encode(
                            encodeEvent({
                                t: "e",
                                d:
                                    error instanceof Error
                                        ? error.message
                                        : "stream error",
                            }),
                        ),
                    )
                } catch {
                    // controller already errored/closed
                }
                controller.error(error)
            }
        },
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            // Disable proxy buffering so deltas reach the client immediately.
            "X-Accel-Buffering": "no",
        },
    })
}
