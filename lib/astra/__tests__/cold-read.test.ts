import assert from "node:assert/strict"
import test from "node:test"
import { pickColdReadLines, seedHash, type ColdReadRow } from "../cold-read.ts"

const rows: ColdReadRow[] = [
    {
        id: "a",
        slot: 1,
        lagna_sign: null,
        missing_element: null,
        age_star: null,
        text: "generic opener",
        weight: 1,
    },
    {
        id: "b",
        slot: 1,
        lagna_sign: null,
        missing_element: "water",
        age_star: null,
        text: "water opener",
        weight: 1,
    },
    {
        id: "c",
        slot: 2,
        lagna_sign: null,
        missing_element: null,
        age_star: "saturn",
        text: "saturn pressure",
        weight: 1,
    },
    {
        id: "d",
        slot: 2,
        lagna_sign: null,
        missing_element: null,
        age_star: "venus",
        text: "venus pressure",
        weight: 1,
    },
]

const key = {
    lagnaSign: "Leo",
    missingElement: "water" as const,
    ageStar: "saturn" as const,
}

test("a line written for this chart beats the catch-all", () => {
    const picked = pickColdReadLines(rows, key, "seed-1")
    assert.equal(picked[0].text, "water opener")
})

test("keys that do not match the person are never spoken", () => {
    const picked = pickColdReadLines(rows, key, "seed-1")
    assert.equal(picked.some((row) => row.id === "d"), false)
})

test("the same person on the same day gets the same reading", () => {
    const first = pickColdReadLines(rows, key, "device:abc|2026-08-23")
    const second = pickColdReadLines(rows, key, "device:abc|2026-08-23")
    assert.deepEqual(
        first.map((row) => row.id),
        second.map((row) => row.id),
    )
})

test("a slot with nothing to say is skipped rather than faked", () => {
    const picked = pickColdReadLines(rows, key, "seed-1")
    assert.deepEqual(picked.map((row) => row.slot), [1, 2])
})

test("the seed is stable and order-sensitive", () => {
    assert.equal(seedHash("a", "b"), seedHash("a", "b"))
    assert.notEqual(seedHash("a", "b"), seedHash("b", "a"))
})
