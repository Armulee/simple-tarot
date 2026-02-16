"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
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
import { Link } from "@/i18n/navigation"
import { cardNameToSlug } from "@/lib/tarot/codex-utils"
import NotFound from "@/app/not-found"

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

type PageState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "notfound" }
    | { status: "ready"; data: TarotCodexRow }

export default function AdminTarotCodexEditPage() {
    const params = useParams()
    const router = useRouter()
    const { user, loading } = useAuth()
    const [state, setState] = useState<PageState>({ status: "loading" })
    const [form, setForm] = useState<Partial<TarotCodexRow>>({})
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const id = typeof params.id === "string" ? params.id : null

    const fetchData = useCallback(async () => {
        if (!id) {
            setState({ status: "notfound" })
            return
        }

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
            setState({ status: "error", message: "Failed to load" })
            return
        }

        const all = (await response.json()) as TarotCodexRow[]
        const row = all.find((r) => String(r.id) === id)
        if (!row) {
            setState({ status: "notfound" })
            return
        }

        setState({ status: "ready", data: row })
        setForm({ ...row })
    }, [id])

    useEffect(() => {
        if (loading) return
        if (!user) {
            setState({ status: "notfound" })
            return
        }
        void fetchData()
    }, [loading, user, fetchData])

    const updateField = <K extends keyof TarotCodexRow>(
        key: K,
        value: TarotCodexRow[K]
    ) => {
        setForm((prev) => ({ ...prev, [key]: value }))
        setSaveError(null)
    }

    const save = async () => {
        if (!id) return
        setSaving(true)
        setSaveError(null)

        const {
            data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
            setSaveError("Not authenticated")
            setSaving(false)
            return
        }

        try {
            const response = await fetch(`/api/admin/tarot-codex/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(form),
            })

            if (!response.ok) {
                const json = (await response.json()) as { error?: string }
                setSaveError(json.error ?? "Failed to update")
                setSaving(false)
                return
            }

            const updated = (await response.json()) as TarotCodexRow
            setState((prev) =>
                prev.status === "ready"
                    ? { ...prev, data: updated }
                    : prev
            )
            setForm({ ...updated })
        } catch (e) {
            setSaveError(
                e instanceof Error ? e.message : "Failed to update"
            )
        } finally {
            setSaving(false)
        }
    }

    if (state.status === "loading") {
        return (
            <div className="min-h-screen px-6 py-16">
                <div className="mx-auto max-w-3xl">
                    <p className="text-white/60">Loading...</p>
                </div>
            </div>
        )
    }

    if (state.status === "notfound") return <NotFound />

    if (state.status === "error") {
        return (
            <div className="min-h-screen px-6 py-16">
                <div className="mx-auto max-w-3xl">
                    <p className="text-red-300">{state.message}</p>
                </div>
            </div>
        )
    }

    const row = state.data
    const slug = cardNameToSlug(row.card_name)

    const fields: {
        key: keyof TarotCodexRow
        label: string
        multiline?: boolean
    }[] = [
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
        <div className="min-h-screen px-6 py-16">
            <div className="mx-auto max-w-3xl space-y-8">
                <div>
                    <Link
                        href="/admin/tarot-codex"
                        className="text-sm text-white/60 hover:text-white"
                    >
                        ← Tarot Codex
                    </Link>
                </div>

                <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
                    <div className="shrink-0">
                        <Card className="overflow-hidden border border-white/10 bg-white/5 p-4">
                            <div className="relative aspect-[2/3] w-40 overflow-hidden rounded-lg">
                                <Image
                                    src={`/assets/rider-waite-tarot/${slug}.png`}
                                    alt={row.card_name}
                                    fill
                                    sizes="160px"
                                    className="object-cover"
                                />
                            </div>
                            <p className="mt-3 text-center font-semibold text-white">
                                {row.card_name}
                            </p>
                        </Card>
                    </div>

                    <div className="min-w-0 flex-1 space-y-6">
                        {fields.map(({ key, label, multiline }) => (
                            <div key={key}>
                                <label className="mb-1.5 block text-sm font-medium text-white/80">
                                    {label}
                                </label>
                                {multiline ? (
                                    <Textarea
                                        value={form[key] ?? ""}
                                        onChange={(e) =>
                                            updateField(
                                                key,
                                                e.target.value || null
                                            )
                                        }
                                        className="min-h-[100px] w-full border border-white/20 bg-white/5 text-white placeholder:text-white/40"
                                        placeholder={`${label}…`}
                                    />
                                ) : key === "yes_no" ? (
                                    <Select
                                        value={
                                            (form.yes_no as string) ?? "__none__"
                                        }
                                        onValueChange={(v) =>
                                            updateField(
                                                "yes_no",
                                                v === "__none__" ? null : v
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-full border-white/20 bg-white/5 text-white">
                                            <SelectValue placeholder="Select…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">
                                                —
                                            </SelectItem>
                                            <SelectItem value="Yes">
                                                Yes
                                            </SelectItem>
                                            <SelectItem value="No">
                                                No
                                            </SelectItem>
                                            <SelectItem value="Maybe/Neutral">
                                                Maybe/Neutral
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        value={form[key] ?? ""}
                                        onChange={(e) =>
                                            updateField(
                                                key,
                                                e.target.value || null
                                            )
                                        }
                                        className="border-white/20 bg-white/5 text-white"
                                        placeholder={`${label}…`}
                                    />
                                )}
                            </div>
                        ))}

                        {saveError && (
                            <p className="text-sm text-red-400">{saveError}</p>
                        )}

                        <div className="flex gap-3">
                            <Button
                                onClick={save}
                                disabled={saving}
                                className="bg-amber-600 text-white hover:bg-amber-500"
                            >
                                {saving ? "Saving…" : "Save changes"}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={saving}
                                className="border-white/20 text-white hover:bg-white/10"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
