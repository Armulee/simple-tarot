import assert from "node:assert/strict"
import test from "node:test"
import {
    DEFAULT_HOURLY_SLOT_HOURS,
    hourBucketKey,
} from "../hourly-transits.ts"

test("DEFAULT_HOURLY_SLOT_HOURS contains 6 evenly-spaced anchors covering daylight + night", () => {
    assert.equal(DEFAULT_HOURLY_SLOT_HOURS.length, 6)
    for (const h of DEFAULT_HOURLY_SLOT_HOURS) {
        assert.ok(
            h >= 0 && h < 24,
            `hour ${h} should be a valid 24h clock value`,
        )
    }
    const sorted = [...DEFAULT_HOURLY_SLOT_HOURS].sort((a, b) => a - b)
    assert.deepEqual(
        sorted,
        Array.from(DEFAULT_HOURLY_SLOT_HOURS),
        "slot hours should already be ascending",
    )
})

test("hourBucketKey maps each 24h band to the documented label", () => {
    assert.equal(hourBucketKey(0), "lateNight")
    assert.equal(hourBucketKey(4), "lateNight")
    assert.equal(hourBucketKey(5), "dawn")
    assert.equal(hourBucketKey(7), "dawn")
    assert.equal(hourBucketKey(8), "morning")
    assert.equal(hourBucketKey(10), "morning")
    assert.equal(hourBucketKey(11), "midday")
    assert.equal(hourBucketKey(13), "midday")
    assert.equal(hourBucketKey(14), "afternoon")
    assert.equal(hourBucketKey(16), "afternoon")
    assert.equal(hourBucketKey(17), "evening")
    assert.equal(hourBucketKey(19), "evening")
    assert.equal(hourBucketKey(20), "night")
    assert.equal(hourBucketKey(23), "night")
})

test("hourBucketKey maps every hour deterministically across 0-23", () => {
    const keys = new Set<string>()
    for (let h = 0; h < 24; h++) {
        const key = hourBucketKey(h)
        assert.ok(typeof key === "string" && key.length > 0)
        keys.add(key)
    }
    // All 7 bucket labels should be reachable from at least one hour.
    assert.deepEqual(
        [...keys].sort(),
        [
            "afternoon",
            "dawn",
            "evening",
            "lateNight",
            "midday",
            "morning",
            "night",
        ],
    )
})
