/**
 * Rules for tarot interpretation and spread selection.
 * Attached to prompts.ts system prompts.
 */
export const rules = `
[SPREAD SELECTION LOGIC]

Default spreadType = "simple" (1 card).

Only use more than 1 card if:
- The user explicitly asks for deep explanation.
- The question involves timeline (past-present-future).
- The user asks "why" or "what led to this".
- The user requests detailed decision breakdown.

Otherwise always choose:
spreadType: "simple"
cardCount: 1
`
