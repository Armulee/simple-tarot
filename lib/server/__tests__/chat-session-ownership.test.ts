import assert from "node:assert/strict"
import test from "node:test"

import { canAccessChatSession } from "../chat-session-ownership.ts"

test("allows access when the requester owns the session by DID", () => {
    assert.equal(
        canAccessChatSession({
            session: {
                owner_user_id: "user-123",
                did: "device-abc",
            },
            requester: {
                did: "device-abc",
            },
        }),
        true,
    )
})

test("allows access when the requester owns the session by user id", () => {
    assert.equal(
        canAccessChatSession({
            session: {
                owner_user_id: "user-123",
                did: "device-abc",
            },
            requester: {
                userId: "user-123",
                did: "device-other",
            },
        }),
        true,
    )
})

test("rejects access for a different DID even when some DID is present", () => {
    assert.equal(
        canAccessChatSession({
            session: {
                owner_user_id: "user-123",
                did: "device-owner",
            },
            requester: {
                did: "device-attacker",
            },
        }),
        false,
    )
})

test("rejects access for a different signed-in user", () => {
    assert.equal(
        canAccessChatSession({
            session: {
                owner_user_id: "user-owner",
                did: "device-owner",
            },
            requester: {
                userId: "user-attacker",
                did: "device-attacker",
            },
        }),
        false,
    )
})
