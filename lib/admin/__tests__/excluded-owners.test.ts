import assert from "node:assert/strict"
import test from "node:test"
import type { SupabaseClient } from "@supabase/supabase-js"
import { excludeOwners, excludedOwnerIds } from "../excluded-owners.ts"

/** Stubs `admin.from("admins").select("user_id")`. */
function stubClient(reply: { data: unknown; error: unknown }) {
    const tables: string[] = []
    const client = {
        from: (table: string) => {
            tables.push(table)
            return { select: async () => reply }
        },
    } as unknown as SupabaseClient
    return { client, tables }
}

/** Records the PostgREST filters a query builder would receive. */
function stubQuery() {
    const filters: string[] = []
    const query = {
        or(filter: string) {
            filters.push(filter)
            return this
        },
    }
    return { query, filters }
}

test("reads the admin ids from the admins table", async () => {
    const { client, tables } = stubClient({
        data: [{ user_id: "admin-a" }, { user_id: "admin-b" }],
        error: null,
    })
    assert.deepEqual(await excludedOwnerIds(client), ["admin-a", "admin-b"])
    assert.deepEqual(tables, ["admins"])
})

test("de-duplicates and drops unusable ids", async () => {
    const { client } = stubClient({
        data: [
            { user_id: "admin-a" },
            { user_id: "admin-a" },
            { user_id: "" },
            { user_id: null },
            { user_id: 42 },
            // Anything that could break out of the filter string is dropped.
            { user_id: "bad,id" },
            { user_id: "bad)id" },
        ],
        error: null,
    })
    assert.deepEqual(await excludedOwnerIds(client), ["admin-a"])
})

test("a failed admins read excludes nobody rather than throwing", async () => {
    const { client } = stubClient({
        data: null,
        error: { message: "permission denied for table admins" },
    })
    assert.deepEqual(await excludedOwnerIds(client), [])
})

test("the filter keeps anonymous rows, which a bare neq would drop", () => {
    const { query, filters } = stubQuery()
    excludeOwners(query, ["admin-a", "admin-b"])
    assert.equal(filters.length, 1)
    assert.equal(
        filters[0],
        "owner_user_id.is.null,owner_user_id.not.in.(admin-a,admin-b)",
    )
})

test("no ids means no filter at all", () => {
    const { query, filters } = stubQuery()
    const returned = excludeOwners(query, [])
    assert.equal(returned, query)
    assert.deepEqual(filters, [])
})
