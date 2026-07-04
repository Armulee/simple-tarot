"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "@/i18n/navigation"
import { ArrowLeft, Send, Mail, Loader2 } from "lucide-react"

import { supabase } from "@/lib/supabase"

type FeatureEntry = { key: string; label: string; emails: string[] }

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

    const current = useMemo(
        () => features.find((f) => f.key === selected),
        [features, selected],
    )
    const isCustom = selected === "custom"
    const recipientCount = isCustom
        ? toText.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).length
        : (current?.emails.length ?? 0)

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

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Form */}
                <div className="space-y-4">
                    <Field label="Subject">
                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                        />
                    </Field>

                    <Field
                        label={`To ${isCustom ? "" : `(${recipientCount} subscribers)`}`}
                    >
                        {isCustom ? (
                            <textarea
                                value={toText}
                                onChange={(e) => setToText(e.target.value)}
                                rows={2}
                                placeholder="comma or newline separated emails"
                                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                            />
                        ) : (
                            <div className="max-h-24 overflow-y-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50">
                                {current?.emails.length
                                    ? current.emails.join(", ")
                                    : "No subscribers yet."}
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
                        disabled={sending || recipientCount === 0 || !subject || !body}
                        className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        Send to {recipientCount}
                    </button>
                    {result && <p className="text-sm text-emerald-400">{result}</p>}
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
