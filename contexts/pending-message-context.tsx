"use client"

import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react"

/**
 * The message a visitor just sent from the home composer, carried across the
 * navigation into its new chat session.
 *
 * Without it the session route falls back to a skeleton while the server
 * component fetches — three grey bars in place of the sentence the person can
 * still see themselves typing. Holding it in context rather than the URL keeps
 * the link clean and shareable, and it survives router.push() because the
 * provider sits above both routes in the locale layout.
 */
export type PendingMessage = {
    text: string
    /** Null until the session row exists and its id is known. */
    sessionId: string | null
}

type PendingMessageValue = {
    pending: PendingMessage | null
    setPending: (value: PendingMessage | null) => void
}

const PendingMessageContext = createContext<PendingMessageValue | null>(null)

export function PendingMessageProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState<PendingMessage | null>(null)
    const value = useMemo(() => ({ pending, setPending }), [pending])
    return (
        <PendingMessageContext.Provider value={value}>
            {children}
        </PendingMessageContext.Provider>
    )
}

/**
 * Safe outside the provider — returns an inert value rather than throwing, so
 * a component that only wants to know "is a send in flight?" can be dropped
 * anywhere without dragging the provider along.
 */
export function usePendingMessage(): PendingMessageValue {
    const ctx = useContext(PendingMessageContext)
    return ctx ?? { pending: null, setPending: () => {} }
}
