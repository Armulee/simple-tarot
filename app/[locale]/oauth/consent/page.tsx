"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, ShieldCheck } from "lucide-react"

type ConsentDetails = {
    authorization_id: string
    client: { name: string }
    redirect_uri: string
    scope: string
}

function ConsentInner() {
    const params = useSearchParams()
    const authorizationId = params.get("authorization_id")

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [details, setDetails] = useState<ConsentDetails | null>(null)

    useEffect(() => {
        let cancelled = false

        async function load() {
            if (!authorizationId) {
                setError("Missing authorization_id.")
                setLoading(false)
                return
            }

            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                const callback = `/oauth/consent?authorization_id=${encodeURIComponent(
                    authorizationId,
                )}`
                window.location.href = `/signin?callbackUrl=${encodeURIComponent(callback)}`
                return
            }

            const { data, error: detailsError } =
                await supabase.auth.oauth.getAuthorizationDetails(authorizationId)

            if (cancelled) return

            if (detailsError || !data) {
                setError(detailsError?.message ?? "Invalid authorization request.")
                setLoading(false)
                return
            }

            // Already consented previously → Supabase returns a redirect.
            if (!("authorization_id" in data)) {
                window.location.href = (data as { redirect_url: string }).redirect_url
                return
            }

            setDetails(data as ConsentDetails)
            setLoading(false)
        }

        load()
        return () => {
            cancelled = true
        }
    }, [authorizationId])

    async function decide(decision: "approve" | "deny") {
        if (!authorizationId) return
        setSubmitting(true)
        setError(null)
        try {
            const { data, error: decisionError } =
                decision === "approve"
                    ? await supabase.auth.oauth.approveAuthorization(authorizationId, {
                          skipBrowserRedirect: true,
                      })
                    : await supabase.auth.oauth.denyAuthorization(authorizationId, {
                          skipBrowserRedirect: true,
                      })

            if (decisionError || !data?.redirect_url) {
                setError(decisionError?.message ?? "Something went wrong.")
                setSubmitting(false)
                return
            }
            window.location.href = data.redirect_url
        } catch {
            setError("Something went wrong. Please try again.")
            setSubmitting(false)
        }
    }

    const scopes =
        details?.scope
            ?.split(" ")
            .map((s) => s.trim())
            .filter(Boolean) ?? []

    return (
        <div className='relative min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4'>
            <Card className='w-full max-w-md p-8 space-y-6'>
                <div className='flex items-center gap-2 text-primary'>
                    <Sparkles className='h-5 w-5' />
                    <span className='font-semibold'>AskingFate</span>
                </div>

                {loading ? (
                    <p className='text-sm text-muted-foreground'>Loading authorization…</p>
                ) : error ? (
                    <div className='space-y-2'>
                        <h1 className='text-lg font-semibold'>Authorization error</h1>
                        <p className='text-sm text-destructive'>{error}</p>
                    </div>
                ) : details ? (
                    <>
                        <div className='space-y-2'>
                            <h1 className='text-xl font-semibold'>
                                Authorize {details.client.name}
                            </h1>
                            <p className='text-sm text-muted-foreground'>
                                <span className='font-medium'>{details.client.name}</span>{" "}
                                wants to access your AskingFate account to run readings on
                                your behalf, using your stars (ดวงดาว).
                            </p>
                        </div>

                        {scopes.length > 0 && (
                            <div className='space-y-2'>
                                <p className='text-sm font-medium flex items-center gap-1.5'>
                                    <ShieldCheck className='h-4 w-4' /> Requested permissions
                                </p>
                                <ul className='list-disc pl-5 text-sm text-muted-foreground'>
                                    {scopes.map((s) => (
                                        <li key={s}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className='text-xs text-muted-foreground break-all'>
                            Redirect: {details.redirect_uri}
                        </p>

                        <div className='flex gap-3 pt-2'>
                            <Button
                                className='flex-1'
                                disabled={submitting}
                                onClick={() => decide("approve")}
                            >
                                Approve
                            </Button>
                            <Button
                                variant='outline'
                                className='flex-1'
                                disabled={submitting}
                                onClick={() => decide("deny")}
                            >
                                Deny
                            </Button>
                        </div>
                    </>
                ) : null}
            </Card>
        </div>
    )
}

export default function ConsentPage() {
    return (
        <Suspense
            fallback={
                <div className='min-h-[calc(100vh-4rem)] flex items-center justify-center'>
                    <p className='text-sm text-muted-foreground'>Loading…</p>
                </div>
            }
        >
            <ConsentInner />
        </Suspense>
    )
}
