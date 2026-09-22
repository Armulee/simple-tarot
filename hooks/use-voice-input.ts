"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { toSpeechLang } from "@/lib/voice/speech-locales"

export type VoiceState =
    | "unsupported"
    | "idle"
    | "listening"
    | "denied"
    | "error"

export type VoiceErrorCode = "DENIED" | "NO_MIC" | "NO_SPEECH" | "NETWORK" | "FAILED"

export type UseVoiceInput = {
    state: VoiceState
    /** True once we know the browser can do this — drives whether the mic shows at all. */
    supported: boolean
    errorCode: VoiceErrorCode | null
    start: () => void
    stop: () => void
}

/**
 * Speech-to-text for the immerse composer, via the browser's own Web Speech API.
 *
 * Free and low-latency: recognition happens in the browser, so no audio is
 * uploaded and there is no per-use cost. `interimResults` gives live partial
 * text, which the composer renders dimmed so words appear as they are spoken.
 *
 * Firefox has no Web Speech API and Chrome's service has no Lao or Burmese
 * model, so `supported` is false there and the caller hides the mic entirely
 * rather than showing a dead button. A MediaRecorder → server-transcription
 * fallback can be added behind this same signature later.
 */
export function useVoiceInput({
    locale,
    onInterim,
    onFinal,
}: {
    locale: string
    onInterim?: (text: string) => void
    onFinal?: (text: string) => void
}): UseVoiceInput {
    const [state, setState] = useState<VoiceState>("unsupported")
    const [errorCode, setErrorCode] = useState<VoiceErrorCode | null>(null)

    const recognitionRef = useRef<SpeechRecognition | null>(null)
    // Callbacks live in refs so re-renders don't tear down a live recognition.
    const onInterimRef = useRef(onInterim)
    const onFinalRef = useRef(onFinal)
    onInterimRef.current = onInterim
    onFinalRef.current = onFinal

    const speechLang = toSpeechLang(locale)

    useEffect(() => {
        if (!speechLang) {
            setState("unsupported")
            return
        }
        const Ctor =
            typeof window === "undefined"
                ? undefined
                : window.SpeechRecognition ?? window.webkitSpeechRecognition
        if (!Ctor || !window.isSecureContext) {
            setState("unsupported")
            return
        }

        const recognition = new Ctor()
        recognition.lang = speechLang
        recognition.interimResults = true
        recognition.continuous = false
        recognition.maxAlternatives = 1

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = ""
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i]
                const text = result[0]?.transcript ?? ""
                if (result.isFinal) {
                    const trimmed = text.trim()
                    if (trimmed) onFinalRef.current?.(trimmed)
                } else {
                    interim += text
                }
            }
            if (interim) onInterimRef.current?.(interim)
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            switch (event.error) {
                case "not-allowed":
                case "service-not-allowed":
                    setErrorCode("DENIED")
                    setState("denied")
                    return
                case "audio-capture":
                    setErrorCode("NO_MIC")
                    break
                case "no-speech":
                    setErrorCode("NO_SPEECH")
                    break
                case "network":
                    setErrorCode("NETWORK")
                    break
                case "aborted":
                    // We aborted it ourselves via stop() — not an error.
                    return
                default:
                    setErrorCode("FAILED")
            }
            setState("error")
        }

        recognition.onend = () => {
            // A denial is sticky: the button stays blocked until the user
            // changes it in browser settings, so don't reset to idle.
            setState((prev) => (prev === "denied" ? prev : "idle"))
        }

        recognitionRef.current = recognition
        setState("idle")

        return () => {
            recognition.onresult = null
            recognition.onerror = null
            recognition.onend = null
            try {
                recognition.abort()
            } catch {
                /* already stopped */
            }
            recognitionRef.current = null
        }
    }, [speechLang])

    const start = useCallback(() => {
        const recognition = recognitionRef.current
        if (!recognition) return
        setErrorCode(null)
        try {
            recognition.start()
            setState("listening")
        } catch {
            // start() throws if it is already running — harmless.
        }
    }, [])

    const stop = useCallback(() => {
        try {
            recognitionRef.current?.stop()
        } catch {
            /* not running */
        }
    }, [])

    return {
        state,
        supported: state !== "unsupported",
        errorCode,
        start,
        stop,
    }
}
