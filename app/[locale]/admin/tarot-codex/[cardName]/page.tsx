"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { supabase } from "@/lib/supabase"
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

function Field({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">
                {label}
            </label>
            {children}
        </div>
    )
}

export default function AdminTarotCodexEditPage() {
    const params = useParams()
    const router = useRouter()
    const [state, setState] = useState<PageState>({ status: "loading" })
    const [form, setForm] = useState<Partial<TarotCodexRow>>({})
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const cardName = typeof params.cardName === "string" ? params.cardName : null

    const fetchData = useCallback(async () => {
        if (!cardName) {
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
        const row = all.find(
            (r) => cardNameToSlug(r.card_name) === cardName
        )
        if (!row) {
            setState({ status: "notfound" })
            return
        }

        setState({ status: "ready", data: row })
        setForm({ ...row })
    }, [cardName])

    useEffect(() => {
        void fetchData()
    }, [fetchData])

    const updateField = <K extends keyof TarotCodexRow>(
        key: K,
        value: TarotCodexRow[K]
    ) => {
        setForm((prev) => ({ ...prev, [key]: value }))
        setSaveError(null)
    }

    const save = async () => {
        if (state.status !== "ready") return
        const id = state.data.id
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
            router.replace(
                `/admin/tarot-codex/${cardNameToSlug(updated.card_name)}`
            )
        } catch (e) {
            setSaveError(
                e instanceof Error ? e.message : "Failed to update"
            )
        } finally {
            setSaving(false)
        }
    }

    if (state.status === "loading" || state.status === "notfound") {
        return <NotFound />
    }

    if (state.status === "error") {
        return (
            <div className="min-h-screen px-6 py-16">
                <div className="mx-auto max-w-4xl">
                    <p className="text-red-300">{state.message}</p>
                </div>
            </div>
        )
    }

    const row = state.data
    const slug = cardNameToSlug(row.card_name)

    return (
        <div className="min-h-screen px-6 py-16">
            <div className="mx-auto max-w-4xl space-y-12">
                <div>
                    <Link
                        href="/admin/tarot-codex"
                        className="text-sm text-white/60 hover:text-white"
                    >
                        ← Tarot Codex
                    </Link>
                </div>

                {/* Upright section */}
                <section className="space-y-6">
                    <h2 className="border-b border-amber-500/30 pb-2 font-serif text-xl text-amber-200">
                        Upright
                    </h2>
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                        <div className="shrink-0">
                            <div className="relative aspect-[2/3] w-44 overflow-hidden rounded-lg">
                                <Image
                                    src={`/assets/rider-waite-tarot/${slug}.png`}
                                    alt={`${row.card_name} upright`}
                                    fill
                                    sizes="176px"
                                    className="object-cover"
                                />
                            </div>
                        </div>
                        <div className="min-w-0 flex-1 space-y-5">
                            <Field label="Card name">
                                <Input
                                    value={form.card_name ?? ""}
                                    onChange={(e) =>
                                        updateField("card_name", e.target.value)
                                    }
                                    className="border-white/20 bg-white/5 text-white"
                                    placeholder="Card name…"
                                />
                            </Field>
                            <Field label="Meaning (general)">
                                <Textarea
                                    value={form.meaning_general ?? ""}
                                    onChange={(e) =>
                                        updateField(
                                            "meaning_general",
                                            e.target.value
                                        )
                                    }
                                    className="min-h-[100px] w-full border border-white/20 bg-white/5 text-white placeholder:text-white/40"
                                    placeholder="General meaning…"
                                />
                            </Field>
                            <Field label="Meaning (love)">
                                <Textarea
                                    value={form.meaning_love ?? ""}
                                    onChange={(e) =>
                                        updateField(
                                            "meaning_love",
                                            e.target.value || null
                                        )
                                    }
                                    className="min-h-[80px] w-full border border-white/20 bg-white/5 text-white placeholder:text-white/40"
                                    placeholder="Love meaning…"
                                />
                            </Field>
                            <Field label="Meaning (career)">
                                <Textarea
                                    value={form.meaning_career ?? ""}
                                    onChange={(e) =>
                                        updateField(
                                            "meaning_career",
                                            e.target.value || null
                                        )
                                    }
                                    className="min-h-[80px] w-full border border-white/20 bg-white/5 text-white placeholder:text-white/40"
                                    placeholder="Career meaning…"
                                />
                            </Field>
                            <Field label="Meaning (financial)">
                                <Textarea
                                    value={form.meaning_financial ?? ""}
                                    onChange={(e) =>
                                        updateField(
                                            "meaning_financial",
                                            e.target.value || null
                                        )
                                    }
                                    className="min-h-[80px] w-full border border-white/20 bg-white/5 text-white placeholder:text-white/40"
                                    placeholder="Financial meaning…"
                                />
                            </Field>
                            <Field label="Advice">
                                <Textarea
                                    value={form.advice ?? ""}
                                    onChange={(e) =>
                                        updateField(
                                            "advice",
                                            e.target.value || null
                                        )
                                    }
                                    className="min-h-[60px] w-full border border-white/20 bg-white/5 text-white placeholder:text-white/40"
                                    placeholder="Advice…"
                                />
                            </Field>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label="Astrology">
                                    <Input
                                        value={form.astrology ?? ""}
                                        onChange={(e) =>
                                            updateField(
                                                "astrology",
                                                e.target.value || null
                                            )
                                        }
                                        className="border-white/20 bg-white/5 text-white"
                                        placeholder="Astrology…"
                                    />
                                </Field>
                                <Field label="Timing">
                                    <Input
                                        value={form.timing ?? ""}
                                        onChange={(e) =>
                                            updateField(
                                                "timing",
                                                e.target.value || null
                                            )
                                        }
                                        className="border-white/20 bg-white/5 text-white"
                                        placeholder="Timing…"
                                    />
                                </Field>
                            </div>
                            <Field label="Yes/No">
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
                                        <SelectItem value="Yes">Yes</SelectItem>
                                        <SelectItem value="No">No</SelectItem>
                                        <SelectItem value="Maybe/Neutral">
                                            Maybe/Neutral
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </div>
                </section>

                {/* Reversed section */}
                <section className="space-y-6">
                    <h2 className="border-b border-amber-500/30 pb-2 font-serif text-xl text-amber-200">
                        Reversed
                    </h2>
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                        <div className="shrink-0">
                            <div className="relative aspect-[2/3] w-44 overflow-hidden rounded-lg">
                                <Image
                                    src={`/assets/rider-waite-tarot/${slug}.png`}
                                    alt={`${row.card_name} reversed`}
                                    fill
                                    sizes="176px"
                                    className="object-cover rotate-180"
                                />
                            </div>
                        </div>
                        <div className="min-w-0 flex-1 space-y-5">
                            <Field label="Reversed meaning (general)">
                                <Textarea
                                    value={form.reversed_meaning_general ?? ""}
                                    onChange={(e) =>
                                        updateField(
                                            "reversed_meaning_general",
                                            e.target.value
                                        )
                                    }
                                    className="min-h-[100px] w-full border border-white/20 bg-white/5 text-white placeholder:text-white/40"
                                    placeholder="Reversed general meaning…"
                                />
                            </Field>
                            <Field label="Reversed meaning (love)">
                                <Textarea
                                    value={form.reversed_meaning_love ?? ""}
                                    onChange={(e) =>
                                        updateField(
                                            "reversed_meaning_love",
                                            e.target.value || null
                                        )
                                    }
                                    className="min-h-[80px] w-full border border-white/20 bg-white/5 text-white placeholder:text-white/40"
                                    placeholder="Reversed love meaning…"
                                />
                            </Field>
                            <Field label="Reversed meaning (career)">
                                <Textarea
                                    value={form.reversed_meaning_career ?? ""}
                                    onChange={(e) =>
                                        updateField(
                                            "reversed_meaning_career",
                                            e.target.value || null
                                        )
                                    }
                                    className="min-h-[80px] w-full border border-white/20 bg-white/5 text-white placeholder:text-white/40"
                                    placeholder="Reversed career meaning…"
                                />
                            </Field>
                            <Field label="Reversed meaning (financial)">
                                <Textarea
                                    value={form.reversed_meaning_financial ?? ""}
                                    onChange={(e) =>
                                        updateField(
                                            "reversed_meaning_financial",
                                            e.target.value || null
                                        )
                                    }
                                    className="min-h-[80px] w-full border border-white/20 bg-white/5 text-white placeholder:text-white/40"
                                    placeholder="Reversed financial meaning…"
                                />
                            </Field>
                        </div>
                    </div>
                </section>

                {saveError && (
                    <p className="text-sm text-red-400">{saveError}</p>
                )}

                <div className="flex gap-3 pt-4">
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
    )
}
