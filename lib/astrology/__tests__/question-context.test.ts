import assert from "node:assert/strict"
import test from "node:test"
import {
    buildConversationContextFromMessages,
    buildConversationContextPromptBlock,
    normalizeConversationContext,
} from "../question-context.ts"

test("extracts user main point from full-session messages", () => {
    const context = buildConversationContextFromMessages(
        [
            { role: "user", text: "I feel stuck in work lately." },
            {
                role: "assistant",
                text: "You may be in a transition period. Let's look deeper.",
                variant: "plain",
            },
            { role: "user", text: "Should I stay or find a new job this year?" },
        ],
        "Should I stay or find a new job this year?"
    )

    assert.ok(context.userMainPoint.includes("Should I stay or find a new job"))
    assert.equal(context.userMessageTimeline.length, 2)
    assert.equal(context.assistantSummaryTimeline.length, 1)
})

test("ignores tool and loading messages as noise", () => {
    const context = buildConversationContextFromMessages([
        { role: "assistant", text: "Loading...", isLoading: true, variant: "box" },
        { role: "assistant", text: "", variant: "tool" },
        { role: "user", text: "How is my relationship next month?" },
    ])

    assert.equal(context.totalMessages, 1)
    assert.equal(context.userMessageTimeline.length, 1)
    assert.equal(context.assistantSummaryTimeline.length, 0)
})

test("normalizes payload and builds prompt block", () => {
    const normalized = normalizeConversationContext({
        userMainPoint: "Will my business grow?",
        userMessageTimeline: ["Will my business grow?"],
        assistantSummaryTimeline: ["Earlier tarot said slow but stable growth."],
        contextText: "Main point: Will my business grow?",
        totalMessages: 4,
    })

    const block = buildConversationContextPromptBlock(normalized)
    assert.ok(block.includes("Session context:"))
    assert.ok(block.includes("Main point to preserve:"))
})
