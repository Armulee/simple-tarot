import assert from "node:assert/strict"
import test from "node:test"
import { textToBubbles, tidyBubbles } from "../bubbles.ts"

test("short bubbles are left exactly as spoken", () => {
    assert.deepEqual(tidyBubbles(["Yes, but not smoothly.", "Watch the first two weeks."]), [
        "Yes, but not smoothly.",
        "Watch the first two weeks.",
    ])
})

test("blank bubbles are dropped rather than rendered empty", () => {
    assert.deepEqual(tidyBubbles(["", "   ", "Only this."]), ["Only this."])
})

test("a long block is split at sentence ends, never truncated", () => {
    const long = `${"A".repeat(200)}. ${"B".repeat(200)}.`
    const result = tidyBubbles([long])
    assert.equal(result.length, 2)
    // Nothing is lost: both halves survive in full.
    assert.ok(result[0].includes("A".repeat(200)))
    assert.ok(result[1].includes("B".repeat(200)))
})

test("she never speaks more than four bubbles at once", () => {
    const result = tidyBubbles(["one", "two", "three", "four", "five", "six"])
    assert.equal(result.length, 4)
    assert.deepEqual(result, ["one", "two", "three", "four"])
})

test("plain prose becomes one bubble per paragraph", () => {
    assert.deepEqual(
        textToBubbles("It holds.\n\nTwo weeks, then it settles.\n\nWatch his first reply."),
        ["It holds.", "Two weeks, then it settles.", "Watch his first reply."],
    )
})

test("prose with no paragraph breaks still yields a bubble", () => {
    assert.deepEqual(textToBubbles("Just one line."), ["Just one line."])
    assert.deepEqual(textToBubbles(""), [])
})
