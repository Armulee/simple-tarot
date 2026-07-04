"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
    fetchAvatarStatus,
    startAvatarSession,
    speakReading,
    stopAvatarSession,
    AvatarApiError,
    type AvatarStatus,
    type SpokenReading,
} from "@/lib/avatar/client"
import { connectLiveAvatar, type LiveConnection } from "@/lib/avatar/live-connection"

/**
 * Phases of the ritual:
 *   idle       — poster shown, waiting for a question
 *   shuffling  — session warming up + "แม่หมอกำลังสับไพ่…" animation (masks latency)
 *   revealing  — card flips, live video swapping in
 *   speaking   — avatar is speaking the reading live
 *   live       — paid session, avatar idle & ready for the next question
 *   ended      — session closed (free reveal done / time up / wishes out)
 *   error      — something failed (shown with in-character copy)
 */
export type AvatarPhase =
    | "idle"
    | "shuffling"
    | "revealing"
    | "speaking"
    | "live"
    | "ended"
    | "error"

export type RevealResult = SpokenReading & { question: string }

type UseAvatarSession = {
    phase: AvatarPhase
    status: AvatarStatus | null
    mode: "free" | "paid" | null
    caption: string
    card: { name: string; isReversed: boolean } | null
    remainingSeconds: number | null
    errorCode: string | null
    connected: boolean
    videoRef: React.RefObject<HTMLVideoElement | null>
    submit: (question: string) => Promise<void>
    end: () => Promise<void>
    refreshStatus: () => Promise<void>
    transcript: RevealResult[]
}

export function useAvatarSession(): UseAvatarSession {
    const [phase, setPhase] = useState<AvatarPhase>("idle")
    const [status, setStatus] = useState<AvatarStatus | null>(null)
    const [mode, setMode] = useState<"free" | "paid" | null>(null)
    const [caption, setCaption] = useState("")
    const [card, setCard] = useState<{ name: string; isReversed: boolean } | null>(null)
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
    const [errorCode, setErrorCode] = useState<string | null>(null)
    const [connected, setConnected] = useState(false)
    const [transcript, setTranscript] = useState<RevealResult[]>([])

    const videoRef = useRef<HTMLVideoElement | null>(null)
    const connectionRef = useRef<LiveConnection | null>(null)
    const sessionIdRef = useRef<string | null>(null)
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const refreshStatus = useCallback(async () => {
        try {
            setStatus(await fetchAvatarStatus())
        } catch {
            setStatus(null)
        }
    }, [])

    useEffect(() => {
        void refreshStatus()
    }, [refreshStatus])

    const clearCountdown = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
        }
    }, [])

    const teardown = useCallback(async () => {
        clearCountdown()
        const sid = sessionIdRef.current
        sessionIdRef.current = null
        const conn = connectionRef.current
        connectionRef.current = null
        setConnected(false)
        if (conn) await conn.disconnect()
        if (sid) await stopAvatarSession(sid)
    }, [clearCountdown])

    const end = useCallback(async () => {
        await teardown()
        setPhase("ended")
        void refreshStatus()
    }, [teardown, refreshStatus])

    // Ensure the session is closed if the user navigates away.
    useEffect(() => {
        const handler = () => {
            const sid = sessionIdRef.current
            if (sid) void stopAvatarSession(sid)
        }
        window.addEventListener("pagehide", handler)
        window.addEventListener("beforeunload", handler)
        return () => {
            window.removeEventListener("pagehide", handler)
            window.removeEventListener("beforeunload", handler)
            void teardown()
        }
    }, [teardown])

    const startCountdown = useCallback(
        (seconds: number) => {
            clearCountdown()
            setRemainingSeconds(seconds)
            countdownRef.current = setInterval(() => {
                setRemainingSeconds((prev) => {
                    if (prev === null) return null
                    const next = prev - 1
                    if (next <= 0) {
                        clearCountdown()
                        // Time up — server also force-closes via HeyGen's cap.
                        void end()
                        return 0
                    }
                    return next
                })
            }, 1000)
        },
        [clearCountdown, end],
    )

    // Speak one reading on an already-open session. Used for follow-up
    // questions during a paid minute — does NOT start a new session or charge
    // another wish.
    const askOnLiveSession = useCallback(
        async (sessionId: string, q: string) => {
            setErrorCode(null)
            setPhase("revealing")
            let spoken: SpokenReading
            try {
                spoken = await speakReading(sessionId, q)
            } catch (err) {
                const code = err instanceof AvatarApiError ? err.code : "REQUEST_FAILED"
                setErrorCode(code)
                setPhase("live")
                return
            }
            setCard(spoken.card)
            setCaption(spoken.text)
            setTranscript((prev) => [...prev, { ...spoken, question: q }])
            setPhase("live")
        },
        [],
    )

    const submit = useCallback(
        async (question: string) => {
            const q = question.trim()
            if (!q) return

            // Follow-up within a live (paid) session: speak on it, no new charge.
            if (phase === "live" && sessionIdRef.current) {
                await askOnLiveSession(sessionIdRef.current, q)
                return
            }

            setErrorCode(null)
            setCaption("")
            setCard(null)
            setPhase("shuffling")

            // 1. Start session (auth + gating happen server-side).
            let session
            try {
                session = await startAvatarSession()
            } catch (err) {
                const code = err instanceof AvatarApiError ? err.code : "REQUEST_FAILED"
                setErrorCode(code)
                setPhase("error")
                return
            }

            sessionIdRef.current = session.sessionId
            setMode(session.mode)

            // 2. Connect the live WebRTC video.
            const videoEl = videoRef.current
            if (videoEl) {
                connectionRef.current = await connectLiveAvatar(
                    {
                        url: session.url,
                        accessToken: session.accessToken,
                        videoEl,
                    },
                    {
                        onVideoReady: () => setConnected(true),
                        onDisconnected: () => setConnected(false),
                    },
                )
            }
            // Even if the live connection isn't available, we proceed: the
            // reading still generates and the caption/transcript still persist.
            setPhase("revealing")

            // 3. Generate the reading with our LLM and speak it live.
            let spoken: SpokenReading
            try {
                spoken = await speakReading(session.sessionId, q)
            } catch (err) {
                const code = err instanceof AvatarApiError ? err.code : "REQUEST_FAILED"
                setErrorCode(code)
                setPhase("error")
                await teardown()
                void refreshStatus()
                return
            }

            setCard(spoken.card)
            setCaption(spoken.text)
            setPhase("speaking")
            setTranscript((prev) => [...prev, { ...spoken, question: q }])

            if (spoken.closeAfter) {
                // Free reveal = exactly one reading, then close.
                await teardown()
                setPhase("ended")
                void refreshStatus()
            } else {
                // Paid minute: keep the session live for follow-up questions.
                setPhase("live")
                startCountdown(session.durationSeconds)
            }
        },
        [phase, askOnLiveSession, startCountdown, teardown, refreshStatus],
    )

    return {
        phase,
        status,
        mode,
        caption,
        card,
        remainingSeconds,
        errorCode,
        connected,
        videoRef,
        submit,
        end,
        refreshStatus,
        transcript,
    }
}
