"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Check, Loader2, Mail, Share2, Trash2, X } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type Grant = {
    id: string
    email: string | null
    userId: string | null
    createdAt: string
}

type AccessRequest = {
    id: string
    requesterEmail: string
    message: string | null
    createdAt: string
}

interface ShareAccessDialogProps {
    sessionId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ShareAccessDialog({
    sessionId,
    open,
    onOpenChange,
}: ShareAccessDialogProps) {
    const [grants, setGrants] = useState<Grant[]>([])
    const [requests, setRequests] = useState<AccessRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [email, setEmail] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [removingId, setRemovingId] = useState<string | null>(null)
    const [decidingId, setDecidingId] = useState<string | null>(null)

    const getToken = useCallback(async () => {
        const { data } = await supabase.auth.getSession()
        return data.session?.access_token ?? null
    }, [])

    const load = useCallback(async () => {
        if (!sessionId) return
        setLoading(true)
        try {
            const token = await getToken()
            if (!token) {
                setGrants([])
                setRequests([])
                return
            }
            const headers = { Authorization: `Bearer ${token}` }
            const [accessRes, requestsRes] = await Promise.all([
                fetch(`/api/chat-sessions/${sessionId}/access`, { headers }),
                fetch(
                    `/api/chat-sessions/${sessionId}/access/requests?status=pending`,
                    { headers },
                ),
            ])
            if (accessRes.ok) {
                const json = await accessRes.json()
                setGrants(Array.isArray(json?.grants) ? json.grants : [])
            } else {
                setGrants([])
            }
            if (requestsRes.ok) {
                const json = await requestsRes.json()
                setRequests(
                    Array.isArray(json?.requests) ? json.requests : [],
                )
            } else {
                setRequests([])
            }
        } finally {
            setLoading(false)
        }
    }, [sessionId, getToken])

    const decide = useCallback(
        async (reqId: string, decision: "approve" | "deny") => {
            setDecidingId(reqId)
            try {
                const token = await getToken()
                if (!token) {
                    toast.error("You need to be signed in")
                    return
                }
                const res = await fetch(
                    `/api/chat-sessions/${sessionId}/access/requests/${reqId}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ decision }),
                    },
                )
                if (!res.ok) {
                    const json = await res.json().catch(() => ({}))
                    toast.error(json?.error || "Failed to update request")
                    return
                }
                toast.success(
                    decision === "approve"
                        ? "Access granted"
                        : "Request declined",
                )
                setRequests((prev) => prev.filter((r) => r.id !== reqId))
                if (decision === "approve") {
                    await load()
                }
            } finally {
                setDecidingId(null)
            }
        },
        [sessionId, getToken, load],
    )

    useEffect(() => {
        if (open) {
            void load()
        }
    }, [open, load])

    const submit = useCallback(async () => {
        const value = email.trim().toLowerCase()
        if (!EMAIL_REGEX.test(value)) {
            toast.error("Please enter a valid email")
            return
        }
        setSubmitting(true)
        try {
            const token = await getToken()
            if (!token) {
                toast.error("You need to be signed in")
                return
            }
            const res = await fetch(
                `/api/chat-sessions/${sessionId}/access`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ email: value }),
                },
            )
            if (!res.ok) {
                const json = await res.json().catch(() => ({}))
                if (json?.error === "CANNOT_GRANT_SELF") {
                    toast.error("You already own this session")
                } else if (json?.error === "BAD_EMAIL") {
                    toast.error("Please enter a valid email")
                } else if (res.status === 403) {
                    toast.error("Only the session owner can share access")
                } else {
                    toast.error(json?.error || "Failed to add access")
                }
                return
            }
            const json = await res.json()
            if (json?.alreadyExists) {
                toast.message("This person already has access")
            } else {
                toast.success("Access granted")
            }
            setEmail("")
            await load()
        } finally {
            setSubmitting(false)
        }
    }, [email, sessionId, getToken, load])

    const remove = useCallback(
        async (grantId: string) => {
            setRemovingId(grantId)
            try {
                const token = await getToken()
                if (!token) {
                    toast.error("You need to be signed in")
                    return
                }
                const res = await fetch(
                    `/api/chat-sessions/${sessionId}/access?id=${encodeURIComponent(grantId)}`,
                    {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                    },
                )
                if (!res.ok) {
                    toast.error("Failed to revoke access")
                    return
                }
                setGrants((prev) => prev.filter((g) => g.id !== grantId))
            } finally {
                setRemovingId(null)
            }
        },
        [sessionId, getToken],
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2 text-base'>
                        <Share2 className='h-4 w-4' />
                        Share access
                    </DialogTitle>
                    <DialogDescription>
                        Invite people by email. They&apos;ll be able to continue
                        this conversation after they sign in with that email.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        void submit()
                    }}
                    className='flex items-center gap-2'
                >
                    <div className='relative flex-1'>
                        <Mail className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40' />
                        <input
                            type='email'
                            inputMode='email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder='name@example.com'
                            className='w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30'
                            disabled={submitting}
                        />
                    </div>
                    <button
                        type='submit'
                        disabled={submitting || !email.trim()}
                        className='rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50'
                    >
                        {submitting ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                            "Invite"
                        )}
                    </button>
                </form>

                {requests.length > 0 ? (
                    <div className='mt-2'>
                        <p className='mb-2 text-xs font-medium uppercase tracking-wider text-amber-200/80'>
                            Pending requests
                        </p>
                        <ul className='space-y-2'>
                            {requests.map((r) => (
                                <li
                                    key={r.id}
                                    className='rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-3'
                                >
                                    <div className='flex items-start justify-between gap-3'>
                                        <div className='min-w-0 flex-1'>
                                            <p className='truncate text-sm font-medium text-white'>
                                                {r.requesterEmail}
                                            </p>
                                            {r.message ? (
                                                <p className='mt-1 text-xs leading-relaxed text-white/70'>
                                                    {r.message}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className='flex shrink-0 items-center gap-1.5'>
                                            <button
                                                type='button'
                                                onClick={() =>
                                                    void decide(r.id, "deny")
                                                }
                                                disabled={decidingId === r.id}
                                                className='inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50'
                                                aria-label='Deny request'
                                            >
                                                {decidingId === r.id ? (
                                                    <Loader2 className='h-4 w-4 animate-spin' />
                                                ) : (
                                                    <X className='h-4 w-4' />
                                                )}
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() =>
                                                    void decide(r.id, "approve")
                                                }
                                                disabled={decidingId === r.id}
                                                className='inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-black hover:bg-white/90 disabled:opacity-50'
                                                aria-label='Approve request'
                                            >
                                                {decidingId === r.id ? (
                                                    <Loader2 className='h-4 w-4 animate-spin' />
                                                ) : (
                                                    <Check className='h-4 w-4' />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <div className='mt-2'>
                    <p className='mb-2 text-xs font-medium uppercase tracking-wider text-white/45'>
                        People with access
                    </p>
                    {loading ? (
                        <p className='text-sm text-white/50'>Loading…</p>
                    ) : grants.length === 0 ? (
                        <p className='text-sm text-white/55'>
                            Only you can compose in this session.
                        </p>
                    ) : (
                        <ul className='divide-y divide-white/[0.06] rounded-lg border border-white/[0.06] bg-white/[0.02]'>
                            {grants.map((g) => (
                                <li
                                    key={g.id}
                                    className='flex items-center justify-between gap-3 px-3 py-2'
                                >
                                    <span className='truncate text-sm text-white/85'>
                                        {g.email ?? g.userId}
                                    </span>
                                    <button
                                        type='button'
                                        onClick={() => void remove(g.id)}
                                        disabled={removingId === g.id}
                                        aria-label='Revoke access'
                                        className={cn(
                                            "inline-flex h-8 w-8 items-center justify-center rounded-md text-white/55 hover:bg-white/10 hover:text-white",
                                            removingId === g.id && "opacity-60",
                                        )}
                                    >
                                        {removingId === g.id ? (
                                            <Loader2 className='h-4 w-4 animate-spin' />
                                        ) : (
                                            <Trash2 className='h-4 w-4' />
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className='mt-2 flex justify-end'>
                    <button
                        type='button'
                        onClick={() => onOpenChange(false)}
                        className='inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white'
                    >
                        <X className='h-3.5 w-3.5' />
                        Close
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
