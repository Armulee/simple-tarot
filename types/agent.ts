export type AgentActionType =
    | "NAVIGATE"
    | "DRAW_TAROT_CARD"
    | "START_READING"
    | "OPEN_MODAL"

export type AgentActionPayloads = {
    NAVIGATE: { page: string }
    DRAW_TAROT_CARD: { count: number }
    START_READING: { type: "love" | "career" | "future" }
    OPEN_MODAL: { modalId: string }
}

export type AgentAction =
    | { type: "NAVIGATE"; payload: AgentActionPayloads["NAVIGATE"] }
    | { type: "DRAW_TAROT_CARD"; payload: AgentActionPayloads["DRAW_TAROT_CARD"] }
    | { type: "START_READING"; payload: AgentActionPayloads["START_READING"] }
    | { type: "OPEN_MODAL"; payload: AgentActionPayloads["OPEN_MODAL"] }

export type AgentResponse = {
    message: string
    action: AgentAction | null
}

export type AgentContext = {
    current_page: string
    user_state: "first_time_user" | "returning_user"
    has_paid: boolean
}

export type AgentMessage = {
    role: "user" | "assistant"
    content: string
}

export type AgentEvent =
    | {
          type: "TAROT_RESULT"
          cards: { name: string; isReversed: boolean }[]
          readingType: "love" | "career" | "future" | null
      }
    | {
          type: "CONTEXT_UPDATE"
          note: string
      }

export type AgentRequestPayload = {
    messages: AgentMessage[]
    context: AgentContext
    event?: AgentEvent | null
}
