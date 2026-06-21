import type { JSONValue } from "ai"

export type DeepSeekReasoningEffort =
    | "low"
    | "medium"
    | "high"
    | "xhigh"
    | "max"

/**
 * Provider options for DeepSeek models routed through the Vercel AI Gateway.
 *
 * Reasoning ("thinking") must be opted into explicitly via
 * `providerOptions.deepseek.thinking`. We keep it OFF for `streamObject`
 * endpoints — a reasoner thinking before emitting JSON adds large latency and
 * can corrupt the partial-JSON stream the client parses — and ON only for the
 * `streamText` paths whose UI actually renders the chain-of-thought.
 */
export function deepseekThinking(
    enabled: boolean,
    reasoningEffort: DeepSeekReasoningEffort = "low",
): Record<string, Record<string, JSONValue>> {
    return {
        deepseek: enabled
            ? { thinking: { type: "enabled" }, reasoningEffort }
            : { thinking: { type: "disabled" } },
    }
}
