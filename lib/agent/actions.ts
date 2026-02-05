import type { AgentActionType } from "@/types/agent"

export const AGENT_ACTION_REGISTRY: Record<AgentActionType, true> = {
    NAVIGATE: true,
    DRAW_TAROT_CARD: true,
    START_READING: true,
    OPEN_MODAL: true,
}
