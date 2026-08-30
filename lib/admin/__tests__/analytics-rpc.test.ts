import assert from "node:assert/strict"
import test from "node:test"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
    AnalyticsRpcError,
    analyticsErrorBody,
    analyticsRpc,
} from "../analytics-rpc.ts"

const TEST_OWNER = ["owner-1"]

type Call = { fn: string; args: unknown }
type Reply = { data: unknown; error: unknown }

/** Minimal PostgREST-shaped stub: one scripted reply per call, in order. */
function stubClient(replies: Reply[]) {
    const calls: Call[] = []
    const client = {
        rpc: async (fn: string, args: unknown) => {
            calls.push({ fn, args })
            return replies[calls.length - 1] ?? { data: null, error: null }
        },
    } as unknown as SupabaseClient
    return { client, calls }
}

/** What PostgREST returns when no function matches the name + signature. */
const fnNotFound = {
    code: "PGRST202",
    message:
        "Could not find the function public.admin_analytics_totals(p_exclude_owners) in the schema cache",
    hint: null,
}

const ok = (data: unknown): Reply => ({ data, error: null })

test("sends p_exclude_owners when test owners are configured", async () => {
    const { client, calls } = stubClient([ok({ totalUsers: 7 })])
    const data = await analyticsRpc(
        client,
        "admin_analytics_totals",
        {},
        TEST_OWNER,
    )
    assert.deepEqual(data, { totalUsers: 7 })
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].args, { p_exclude_owners: TEST_OWNER })
})

test("omits the argument entirely when there are no test owners", async () => {
    const { client, calls } = stubClient([ok({ totalUsers: 7 })])
    await analyticsRpc(client, "admin_analytics_totals", { p_start: "x" })
    assert.deepEqual(calls[0].args, { p_start: "x" })
})

test("retries without the exclusion when the database predates it", async () => {
    const { client, calls } = stubClient([
        { data: null, error: fnNotFound },
        ok({ totalUsers: 7 }),
    ])
    const data = await analyticsRpc(
        client,
        "admin_analytics_totals",
        { p_start: "x" },
        TEST_OWNER,
    )
    // The dashboard still renders, against the un-migrated signature.
    assert.deepEqual(data, { totalUsers: 7 })
    assert.equal(calls.length, 2)
    assert.deepEqual(calls[1].args, { p_start: "x" })
})

test("does not retry when the function is missing outright", async () => {
    const { client, calls } = stubClient([{ data: null, error: fnNotFound }])
    await assert.rejects(
        () => analyticsRpc(client, "admin_analytics_totals"),
        AnalyticsRpcError,
    )
    // No exclusion was sent, so there is nothing to fall back to.
    assert.equal(calls.length, 1)
})

test("a missing function reports how to fix it", async () => {
    const { client } = stubClient([{ data: null, error: fnNotFound }])
    const err = await analyticsRpc(client, "admin_analytics_totals").catch(
        (e) => e,
    )
    const body = analyticsErrorBody(err)
    assert.equal(body.code, "PGRST202")
    assert.match(body.detail, /admin_analytics_totals/)
    assert.match(body.hint ?? "", /database-admin-analytics\.sql/)
})

test("other database errors surface verbatim, without the migration hint", async () => {
    const { client } = stubClient([
        {
            data: null,
            error: {
                code: "57014",
                message: "canceling statement due to statement timeout",
                hint: null,
            },
        },
    ])
    const err = await analyticsRpc(client, "admin_analytics_reading").catch(
        (e) => e,
    )
    const body = analyticsErrorBody(err)
    assert.equal(body.code, "57014")
    assert.match(body.detail, /statement timeout/)
    assert.equal(body.hint, null)
})

test("a failure after the retry still reports the reason", async () => {
    const { client, calls } = stubClient([
        { data: null, error: fnNotFound },
        { data: null, error: { ...fnNotFound, message: "still missing" } },
    ])
    const err = await analyticsRpc(
        client,
        "admin_analytics_totals",
        {},
        TEST_OWNER,
    ).catch((e) => e)
    assert.equal(calls.length, 2)
    assert.match(analyticsErrorBody(err).detail, /still missing/)
})
