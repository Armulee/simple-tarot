"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "@/i18n/navigation"
import {
    ArrowLeft,
    ChevronDown,
    Loader2,
    Mail,
    Search,
    Send,
    Users,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import type { BroadcastSubscriber } from "@/app/api/admin/broadcast/route"

type FeatureEntry = {
    key: string
    label: string
    emails: string[]
    subscribers: BroadcastSubscriber[]
}

const PAGE_SIZE = 10

async function adminHeaders(): Promise<Record<string, string>> {
    const {
        data: { session },
    } = await supabase.auth.getSession()
    const headers: Record<string, string> = { "content-type": "application/json" }
    if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
    }
    return headers
}

const DEFAULT_AVATAR_SUBJECT = "The AskingFate fortune-teller avatar is here ✨"
const DEFAULT_AVATAR_BODY = `The moment you've been waiting for has arrived.

Our talking fortune-teller avatar is now live — draw a card and hear your reading spoken aloud, face to face.

Open AskingFate and try it now. The stars have been waiting for you.`

export default function AdminBroadcastPage() {
    const [features, setFeatures] = useState<FeatureEntry[]>([])
    const [selected, setSelected] = useState<string>("avatar")
    const [subject, setSubject] = useState(DEFAULT_AVATAR_SUBJECT)
    const [body, setBody] = useState(DEFAULT_AVATAR_BODY)
    const [toText, setToText] = useState("")
    const [ccText, setCcText] = useState("")
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [result, setResult] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    // Subscriber list controls.
    const [subscriberSearch, setSubscriberSearch] = useState("")
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

    useEffect(() => {
        void (async () => {
            try {
                const res = await fetch("/api/admin/broadcast", {
                    headers: await adminHeaders(),
                })
                if (!res.ok) throw new Error("load failed")
                const data = await res.json()
                setFeatures(data.features ?? [])
            } catch {
                setError("Failed to load features.")
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    // Reset the list paging when switching feature or search text.
    useEffect(() => {
        setVisibleCount(PAGE_SIZE)
    }, [selected, subscriberSearch])

    const current = useMemo(
        () => features.find((f) => f.key === selected),
        [features, selected],
    )
    const isCustom = selected === "custom"
    const recipientCount = isCustom
        ? toText.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).length
        : (current?.emails.length ?? 0)

    const filteredSubscribers = useMemo(() => {
        const list = current?.subscribers ?? []
        const q = subscriberSearch.trim().toLowerCase()
        if (!q) return list
        return list.filter(
            (s) =>
                s.email.toLowerCase().includes(q) ||
                (s.name ?? "").toLowerCase().includes(q),
        )
    }, [current, subscriberSearch])
    const visibleSubscribers = filteredSubscribers.slice(0, visibleCount)
    const hasMore = filteredSubscribers.length > visibleCount

    const send = useCallback(async () => {
        setSending(true)
        setResult(null)
        setError(null)
        try {
            const res = await fetch("/api/admin/broadcast", {
                method: "POST",
                headers: await adminHeaders(),
                body: JSON.stringify({
                    feature: selected,
                    subject,
                    heading: subject,
                    body,
                    to: isCustom ? toText : undefined,
                    cc: ccText,
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data?.error ?? "Send failed.")
            } else {
                setResult(`Sent ${data.sent} of ${data.total} (failed: ${data.failed}).`)
            }
        } catch {
            setError("Send failed.")
        } finally {
            setSending(false)
        }
    }, [selected, subject, body, toText, ccText, isCustom])

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-8">
            <Link
                href="/admin"
                className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
            >
                <ArrowLeft className="h-4 w-4" /> Admin
            </Link>

            <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-300">
                    <Mail className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="font-serif text-2xl font-semibold text-white">
                        Broadcast
                    </h1>
                    <p className="text-sm text-white/60">
                        Email feature-waitlist subscribers.
                    </p>
                </div>
            </div>

            {/* Feature list */}
            <div className="mb-6 flex flex-wrap gap-2">
                {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                ) : (
                    features.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setSelected(f.key)}
                            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                                selected === f.key
                                    ? "border-amber-500/50 bg-amber-500/15 text-amber-100"
                                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                            }`}
                        >
                            {f.label}
                            {f.key !== "custom" && (
                                <span className="ml-2 text-xs text-white/40">
                                    {f.emails.length}
                                </span>
                            )}
                        </button>
                    ))
                )}
            </div>

            {/* Subscribed users — searchable list, 10 at a time. */}
            {!isCustom && (
                <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03]">
                    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                        <Users className="h-4 w-4 text-white/50" />
                        <h2 className="text-sm font-semibold text-white">
                            Subscribed users
                        </h2>
                        <span className="text-xs text-white/40">
                            {filteredSubscribers.length}
                        </span>
                    </div>
                    <div className="p-4">
                        <div className="relative mb-3">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                            <input
                                value={subscriberSearch}
                                onChange={(e) =>
                                    setSubscriberSearch(e.target.value)
                                }
                                placeholder="Search by name or email…"
                                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-amber-500/50"
                            />
                        </div>

                        {filteredSubscribers.length === 0 ? (
                            <p className="py-6 text-center text-sm text-white/45">
                                {(current?.subscribers.length ?? 0) === 0
                                    ? "No subscribers yet."
                                    : "No subscribers match your search."}
                            </p>
                        ) : (
                            <>
                                <ul className="divide-y divide-white/5">
                                    {visibleSubscribers.map((s) => (
                                        <li
                                            key={s.email}
                                            className="flex items-center gap-3 py-2.5"
                                        >
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/30 text-xs font-semibold uppercase text-white">
                                                {(s.name || s.email).charAt(0)}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm text-white">
                                                    {s.name || "—"}
                                                </span>
                                                <span className="block truncate text-xs text-white/50">
                                                    {s.email}
                                                </span>
                                            </span>
                                            {s.createdAt && (
                                                <span className="shrink-0 text-xs text-white/35">
                                                    {new Date(
                                                        s.createdAt,
                                                    ).toLocaleDateString()}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                {hasMore && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setVisibleCount(
                                                (prev) => prev + PAGE_SIZE,
                                            )
                                        }
                                        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                    >
                                        More
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Email composer, boxed with a header. */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03]">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                    <Mail className="h-4 w-4 text-white/50" />
                    <h2 className="text-sm font-semibold text-white">
                        Email Composer
                    </h2>
                </div>
                <div className="grid gap-6 p-4 lg:grid-cols-2">
                    {/* Form */}
                    <div className="space-y-4">
                        <Field label="Subject">
                            <input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                            />
                        </Field>

                        <Field label="To">
                            {isCustom ? (
                                <textarea
                                    value={toText}
                                    onChange={(e) => setToText(e.target.value)}
                                    rows={2}
                                    placeholder="comma or newline separated emails"
                                    className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                                />
                            ) : (
                                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                                    All {recipientCount} subscriber
                                    {recipientCount === 1 ? "" : "s"} of{" "}
                                    {current?.label ?? selected}
                                </div>
                            )}
                        </Field>

                        <Field label="Cc (optional)">
                            <input
                                value={ccText}
                                onChange={(e) => setCcText(e.target.value)}
                                placeholder="comma separated emails"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                            />
                        </Field>

                        <Field label="Body">
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={8}
                                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                            />
                        </Field>

                        <Field label="Template">
                            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                                Default
                            </div>
                        </Field>

                        <button
                            type="button"
                            onClick={send}
                            disabled={
                                sending ||
                                recipientCount === 0 ||
                                !subject ||
                                !body
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {sending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            Send to {recipientCount}
                        </button>
                        {result && (
                            <p className="text-sm text-emerald-400">{result}</p>
                        )}
                        {error && <p className="text-sm text-red-400">{error}</p>}
                    </div>

                    {/* Template preview — how the email will look (default template). */}
                    <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
                            Preview
                        </p>
                        <EmailPreview heading={subject} body={body} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/60">
                {label}
            </span>
            {children}
        </label>
    )
}

/** Visual preview mirroring components/email-templates/feature-broadcast-email. */
function EmailPreview({ heading, body }: { heading: string; body: string }) {
    return (
        <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: "#0a0a14", border: "1px solid #26264a" }}
        >
            <div className="mb-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/assets/logo.png"
                    alt="AskingFate"
                    width={64}
                    height={64}
                    className="mx-auto"
                />
            </div>
            <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: "#14142a", border: "1px solid #26264a" }}
            >
                <h3
                    className="mb-4 text-center text-lg font-semibold"
                    style={{ color: "#ffffff" }}
                >
                    {heading || "Subject"}
                </h3>
                <p
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    style={{ color: "#d6d6f8" }}
                >
                    {body || "Body…"}
                </p>
                <div
                    className="mt-6 border-t pt-3 text-center text-xs"
                    style={{ borderColor: "#26264a", color: "#8888aa" }}
                >
                    You received this because you asked AskingFate to notify you
                    about new features.
                </div>
            </div>
        </div>
    )
}
