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
    assert.ok(block.includes("Session context (background only"))
    assert.ok(block.includes("User's current focus"))
})

test("drops unrelated history for a new question", () => {
    const context = buildConversationContextFromMessages(
        [
            { role: "user", text: "Should I switch my job this year?" },
            {
                role: "assistant",
                text: "April looks stronger for career moves.",
                variant: "plain",
            },
        ],
        "How is my relationship this month?"
    )

    assert.equal(context.userMessageTimeline.length, 0)
    assert.equal(context.assistantSummaryTimeline.length, 0)
    assert.ok(context.userMainPoint.includes("relationship"))
})

test("keeps latest context when question has follow-up cues", () => {
    const context = buildConversationContextFromMessages(
        [
            { role: "user", text: "งานปีนี้จะดีไหม?" },
            {
                role: "assistant",
                text: "ภาพรวมงานดีขึ้นช่วงกลางปี",
                variant: "plain",
            },
        ],
        "แล้วควรรออีกหน่อยไหม"
    )

    assert.equal(context.userMessageTimeline.length, 1)
    assert.equal(context.assistantSummaryTimeline.length, 1)
})

test("keeps only semantically related lines in mixed history", () => {
    const context = buildConversationContextFromMessages(
        [
            { role: "user", text: "Should I switch my career this year?" },
            {
                role: "assistant",
                text: "Career timing improves after May.",
                variant: "plain",
            },
            { role: "user", text: "How is my love life lately?" },
            {
                role: "assistant",
                text: "Love life needs more patience.",
                variant: "plain",
            },
        ],
        "Is this a good month for career switch?"
    )

    assert.equal(context.userMessageTimeline.length, 1)
    assert.equal(context.assistantSummaryTimeline.length, 1)
    assert.ok(context.userMessageTimeline[0].toLowerCase().includes("career"))
    assert.ok(
        context.assistantSummaryTimeline[0].toLowerCase().includes("career"),
    )
})
