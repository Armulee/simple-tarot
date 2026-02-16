"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import NotFound from "@/app/not-found"
import { Link } from "@/i18n/navigation"

export type TarotCodexRow = {
    id: number
    card_name: string
    meaning_general: string
    reversed_meaning_general: string
    meaning_love: string | null
    reversed_meaning_love: string | null
    meaning_career: string | null
    reversed_meaning_career: string | null
    meaning_financial: string | null
    reversed_meaning_financial: string | null
    advice: string | null
    astrology: string | null
    timing: string | null
    yes_no: string | null
}

type AdminState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "notfound" }
    | { status: "ready"; data: TarotCodexRow[] }

export default function AdminTarotCodexPage() {
    const { user, loading } = useAuth()
    const [state, setState] = useState<AdminState>({ status: "loading" })
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editForm, setEditForm] = useState<Partial<TarotCodexRow>>({})
    const [savingId, setSavingId] = useState<number | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        const {
            data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
            setState({ status: "notfound" })
            return
        }

        const response = await fetch("/api/admin/tarot-codex", {
            headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (response.status === 401 || response.status === 403) {
            setState({ status: "notfound" })
            return
        }

        if (!response.ok) {
            setState({ status: "error", message: "Failed to load tarot codex" })
            return
        }

        const data = (await response.json()) as TarotCodexRow[]
        setState({ status: "ready", data })
    }, [])

    useEffect(() => {
        if (loading) return
        if (!user) {
            setState({ status: "notfound" })
            return
        }
        void fetchData()
    }, [loading, user, fetchData])

    const startEdit = (row: TarotCodexRow) => {
        setEditingId(row.id)
        setEditForm({ ...row })
        setSaveError(null)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditForm({})
        setSaveError(null)
    }

    const saveEdit = async () => {
        if (editingId == null) return
        setSavingId(editingId)
        setSaveError(null)

        const {
            data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
            setSaveError("Not authenticated")
            setSavingId(null)
            return
        }

        try {
            const response = await fetch(
                `/api/admin/tarot-codex/${editingId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify(editForm),
                }
            )

            if (!response.ok) {
                const json = (await response.json()) as { error?: string }
                setSaveError(json.error ?? "Failed to update")
                setSavingId(null)
                return
            }

            const updated = (await response.json()) as TarotCodexRow
            setState((prev) => {
                if (prev.status !== "ready") return prev
                const next = prev.data.map((r) =>
                    r.id === updated.id ? updated : r
                )
                return { ...prev, data: next }
            })
            setEditingId(null)
            setEditForm({})
        } catch (e) {
            setSaveError(
                e instanceof Error ? e.message : "Failed to update"
            )
        } finally {
            setSavingId(null)
        }
    }

    const updateField = <K extends keyof TarotCodexRow>(
        key: K,
        value: TarotCodexRow[K]
    ) => {
        setEditForm((prev) => ({ ...prev, [key]: value }))
    }

    if (state.status === "loading") {
        return (
            <div className="min-h-screen px-6 py-16">
                <div className="mx-auto max-w-6xl">
                    <h1 className="mb-4 font-serif text-3xl text-white">
                        Tarot Codex
                    </h1>
                    <p className="text-white/60">Loading...</p>
                </div>
            </div>
        )
    }

    if (state.status === "notfound") return <NotFound />

    if (state.status === "error") {
        return (
            <div className="min-h-screen px-6 py-16">
                <div className="mx-auto max-w-6xl">
                    <h1 className="mb-4 font-serif text-3xl text-white">
                        Tarot Codex
                    </h1>
                    <p className="text-red-300">{state.message}</p>
                </div>
            </div>
        )
    }

    const rows = state.data

    return (
        <div className="min-h-screen px-6 py-16">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <Link
                            href="/admin"
                            className="text-sm text-white/60 hover:text-white"
                        >
                            ← Admin
                        </Link>
                        <h1 className="mt-2 font-serif text-3xl text-white">
                            Tarot Codex
                        </h1>
                        <p className="mt-1 text-white/60">
                            {rows.length} cards · Edit and save to update the
                            database
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {rows.map((row) => (
                        <Card
                            key={row.id}
                            className="border border-white/10 bg-white/5 p-5 text-white"
                        >
                            {editingId === row.id ? (
                                <EditForm
                                    form={editForm}
                                    onUpdate={updateField}
                                    onSave={saveEdit}
                                    onCancel={cancelEdit}
                                    saving={savingId === row.id}
                                    savingError={saveError}
                                />
                            ) : (
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="font-semibold text-white">
                                            {row.card_name}
                                        </div>
                                        <div className="grid gap-2 text-sm text-white/80 sm:grid-cols-2">
                                            <div>
                                                <span className="text-white/50">
                                                    General:
                                                </span>{" "}
                                                {truncate(row.meaning_general)}
                                            </div>
                                            <div>
                                                <span className="text-white/50">
                                                    Reversed:
                                                </span>{" "}
                                                {truncate(
                                                    row.reversed_meaning_general
                                                )}
                                            </div>
                                            {row.meaning_love && (
                                                <div>
                                                    <span className="text-white/50">
                                                        Love:
                                                    </span>{" "}
                                                    {truncate(row.meaning_love)}
                                                </div>
                                            )}
                                            {row.meaning_career && (
                                                <div>
                                                    <span className="text-white/50">
                                                        Career:
                                                    </span>{" "}
                                                    {truncate(
                                                        row.meaning_career
                                                    )}
                                                </div>
                                            )}
                                            {row.yes_no && (
                                                <div>
                                                    <span className="text-white/50">
                                                        Yes/No:
                                                    </span>{" "}
                                                    {row.yes_no}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => startEdit(row)}
                                        className="shrink-0 border-white/20 text-white hover:bg-white/10"
                                    >
                                        Edit
                                    </Button>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}

function truncate(s: string, len = 80) {
    if (!s) return ""
    return s.length > len ? s.slice(0, len) + "…" : s
}

function EditForm({
    form,
    onUpdate,
    onSave,
    onCancel,
    saving,
    savingError,
}: {
    form: Partial<TarotCodexRow>
    onUpdate: <K extends keyof TarotCodexRow>(
        key: K,
        value: TarotCodexRow[K]
    ) => void
    onSave: () => void
    onCancel: () => void
    saving: boolean
    savingError: string | null
}) {
    const fields: { key: keyof TarotCodexRow; label: string; multiline?: boolean }[] = [
        { key: "card_name", label: "Card name" },
        { key: "meaning_general", label: "Meaning (general)", multiline: true },
        {
            key: "reversed_meaning_general",
            label: "Reversed meaning (general)",
            multiline: true,
        },
        { key: "meaning_love", label: "Meaning (love)", multiline: true },
        {
            key: "reversed_meaning_love",
            label: "Reversed meaning (love)",
            multiline: true,
        },
        { key: "meaning_career", label: "Meaning (career)", multiline: true },
        {
            key: "reversed_meaning_career",
            label: "Reversed meaning (career)",
            multiline: true,
        },
        {
            key: "meaning_financial",
            label: "Meaning (financial)",
            multiline: true,
        },
        {
            key: "reversed_meaning_financial",
            label: "Reversed meaning (financial)",
            multiline: true,
        },
        { key: "advice", label: "Advice", multiline: true },
        { key: "astrology", label: "Astrology" },
        { key: "timing", label: "Timing" },
        { key: "yes_no", label: "Yes/No" },
    ]

    return (
        <div className="space-y-4">
            {fields.map(({ key, label, multiline }) => (
                <div key={key}>
                    <label className="mb-1 block text-sm text-white/60">
                        {label}
                    </label>
                    {multiline ? (
                        <Textarea
                            value={form[key] ?? ""}
                            onChange={(e) =>
                                onUpdate(key, e.target.value || null)
                            }
                            className="min-h-[80px] border-white/20 bg-white/5 text-white"
                            placeholder={`${label}…`}
                        />
                    ) : key === "yes_no" ? (
                        <Select
                            value={(form.yes_no as string) ?? "__none__"}
                            onValueChange={(v) =>
                                onUpdate(
                                    "yes_no",
                                    v === "__none__" ? null : v
                                )
                            }
                        >
                            <SelectTrigger className="w-full border-white/20 bg-white/5 text-white">
                                <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">—</SelectItem>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                                <SelectItem value="Maybe/Neutral">
                                    Maybe/Neutral
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input
                            value={form[key] ?? ""}
                            onChange={(e) =>
                                onUpdate(key, e.target.value || null)
                            }
                            className="border-white/20 bg-white/5 text-white"
                            placeholder={`${label}…`}
                        />
                    )}
                </div>
            ))}
            {savingError && (
                <p className="text-sm text-red-400">{savingError}</p>
            )}
            <div className="flex gap-2">
                <Button
                    onClick={onSave}
                    disabled={saving}
                    className="bg-white/20 text-white hover:bg-white/30"
                >
                    {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={saving}
                    className="border-white/20 text-white hover:bg-white/10"
                >
                    Cancel
                </Button>
            </div>
        </div>
    )
}
