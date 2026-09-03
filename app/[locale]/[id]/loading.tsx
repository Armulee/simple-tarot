"use client"

import { usePathname } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { ConsultingBadge } from "@/components/consulting-badge"
import { usePendingMessage } from "@/contexts/pending-message-context"

/**
 * Shown while the session's server component fetches.
 *
 * Arriving from the home composer we already know what was sent, so this
 * renders the real message and the same consulting badge the home page was
 * showing a moment ago — the hand-off looks continuous instead of blinking
 * through grey placeholder bars. The skeleton stays for every other way in
 * (a shared link, a reload), where there is genuinely nothing to show yet.
 */
export default function Loading() {
    const { pending } = usePendingMessage()
    const pathname = usePathname()

    // Only for the session this message actually belongs to: a stale pending
    // message must never be painted onto somebody else's chat.
    const routeId = pathname?.split("/").filter(Boolean).pop()
    const isThisSession =
        !!pending?.text &&
        !!pending.sessionId &&
        pending.sessionId === routeId

    return (
        <div className='relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'>
            <div className='mx-auto w-full max-w-3xl px-4 py-6 space-y-4'>
                {isThisSession ? (
                    <div className='space-y-6 text-left'>
                        <div className='flex flex-col items-end gap-2'>
                            <div className='max-w-[80%] rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 px-4 py-3 text-white shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)]'>
                                {pending.text}
                            </div>
                        </div>
                        <div className='flex flex-col items-start gap-4'>
                            <ConsultingBadge />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* User message skeleton */}
                        <div className='flex justify-end'>
                            <div className='w-full max-w-[80%] rounded-2xl border border-white/10 bg-white/5 p-4'>
                                <Skeleton className='h-3 w-[70%] bg-white/10' />
                                <Skeleton className='mt-2 h-3 w-[55%] bg-white/10' />
                            </div>
                        </div>

                        {/* Assistant message skeleton */}
                        <div className='flex justify-start gap-3'>
                            <Skeleton className='h-9 w-9 rounded-full bg-white/10 shrink-0' />
                            <div className='w-full max-w-[80%] rounded-2xl border border-white/10 bg-white/5 p-4'>
                                <Skeleton className='h-3 w-[85%] bg-white/10' />
                                <Skeleton className='mt-2 h-3 w-[80%] bg-white/10' />
                                <Skeleton className='mt-2 h-3 w-[62%] bg-white/10' />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
