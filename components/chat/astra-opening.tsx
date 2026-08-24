"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { followUpChipClass } from "@/components/question-input"
import {
    BirthDatePickerButton,
    BirthTimePickerButton,
} from "@/components/chat/astra-birth-picker"
import { useAstraIdentity } from "@/lib/astra/use-astra-identity"
import { threadTitleFromQuestion } from "@/lib/chat/thread-title"
import { ageInYears } from "@/lib/astra/thai-astrology"
import {
    parseBirthDate,
    parseBirthTime,
    saysUnknown,
    type ParsedBirthDate,
    type ParsedBirthTime,
} from "@/lib/astra/parse-birth-input"
import { saveBirthToStorage } from "@/lib/birth-storage"
import { supabase } from "@/lib/supabase"
import type {
    AstraOpeningPayload,
    AstraQuickReply,
    AstraReadingBasis,
} from "@/lib/astra/opening-contract"
import type { ChatMessage } from "@/components/chat/types"

/**
 * The opening turn, played out in the chat.
 *
 * She speaks first and keeps speaking in short bubbles, with a pause before
 * each one. She asks for the birth date in conversation: a date picker and
 * then a time picker, both as buttons in the strip ABOVE the composer — and
 * the composer stays open, so the same answers can simply be typed.
 *
 * Everything she says here is server-composed (`/api/astra/opening`) from
 * hand-written lines; this file only decides the pacing and collects answers.
 */

type IntakeStep = "date" | "time"

export type UseAstraOpeningArgs = {
    sessionId: string | null
    locale: string
    messages: ChatMessage[]
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
    /** Hands a tapped answer to the normal chat flow. */
    onSendUserMessage: (text: string) => void
    /** False while the page is still resolving who is viewing. */
    ready: boolean
}

/** The product is not read for children; the age gate applies here too. */
const MIN_AGE_YEARS = 13

function delay(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function useAstraOpening({
    sessionId,
    locale,
    messages,
    setMessages,
    onSendUserMessage,
    ready,
}: UseAstraOpeningArgs) {
    const t = useTranslations("Astra")
    const identity = useAstraIdentity()
    const [typing, setTyping] = useState(false)
    const [stage, setStage] = useState<
        "idle" | "ask_birth" | "cold_read" | "done"
    >("idle")
    const [intakeStep, setIntakeStep] = useState<IntakeStep | null>(null)
    // The step is live the moment she moves on, so a fast typer's answer is
    // never handed to the reading flow; the button only appears once the
    // question it answers is actually on screen.
    const [pickerVisible, setPickerVisible] = useState(false)
    const [quickReplies, setQuickReplies] = useState<AstraQuickReply[]>([])
    const startedRef = useRef(false)
    const basisRef = useRef<AstraReadingBasis | null>(null)
    const pendingDateRef = useRef<ParsedBirthDate | null>(null)

    const hasAssistantMessage = messages.some((m) => m.role === "assistant")

    const appendAssistantBubble = useCallback(
        (id: string, text: string, extra?: Partial<ChatMessage>) => {
            setMessages((prev) =>
                prev.some((m) => m.id === id)
                    ? prev
                    : [
                          ...prev,
                          {
                              id,
                              role: "assistant",
                              text,
                              variant: "plain",
                              ...extra,
                          } as ChatMessage,
                      ],
            )
        },
        [setMessages],
    )

    const appendUserBubble = useCallback(
        (text: string) => {
            setMessages((prev) => [
                ...prev,
                {
                    id: `user-${Date.now()}`,
                    role: "user",
                    text,
                    // Flagged so it is never mistaken for the thread's question.
                    astraIntakeAnswer: true,
                } as ChatMessage,
            ])
        },
        [setMessages],
    )

    /** Plays a server-composed turn: pause, bubble, pause, bubble. */
    const playPayload = useCallback(
        async (payload: AstraOpeningPayload) => {
            for (const b of payload.bubbles) {
                setTyping(true)
                await delay(b.typingMs)
                setTyping(false)
                appendAssistantBubble(b.id, b.text, {
                    astraStage: payload.stage,
                    ...(payload.basis ? { astraBasis: payload.basis } : {}),
                })
                await delay(220)
            }
            basisRef.current = payload.basis
            setStage(payload.stage)
            if (payload.stage === "ask_birth") {
                setIntakeStep("date")
                setPickerVisible(true)
                setQuickReplies([])
            } else {
                setIntakeStep(null)
                setPickerVisible(false)
                setQuickReplies(payload.quickReplies)
            }
        },
        [appendAssistantBubble],
    )

    const fetchOpening = useCallback(async () => {
        const response = await fetch("/api/astra/opening", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale, sessionId }),
        })
        if (!response.ok) throw new Error("OPENING_FAILED")
        return (await response.json()) as AstraOpeningPayload
    }, [locale, sessionId])

    // She opens the room. Only ever once, and only when nobody has spoken yet.
    useEffect(() => {
        if (!ready || !sessionId || startedRef.current) return
        if (hasAssistantMessage || messages.length > 0) return
        startedRef.current = true
        void (async () => {
            try {
                await playPayload(await fetchOpening())
            } catch {
                setTyping(false)
                setStage("done")
            }
        })()
    }, [
        fetchOpening,
        hasAssistantMessage,
        messages.length,
        playPayload,
        ready,
        sessionId,
    ])

    // Reload mid-intake: the bubbles are already persisted, so pick the
    // pickers back up from the stage stamped on her last message.
    useEffect(() => {
        if (startedRef.current || !ready) return
        if (!hasAssistantMessage) return
        const lastStageIndex = messages.findLastIndex(
            (m) => m.role === "assistant" && Boolean(m.astraStage),
        )
        if (lastStageIndex === -1) return
        startedRef.current = true
        const answeredSince = messages
            .slice(lastStageIndex + 1)
            .some((m) => m.role === "user")
        // A half-finished intake is not persisted, so it restarts at the date —
        // she asks once more rather than leaving a dead button.
        if (
            messages[lastStageIndex].astraStage === "ask_birth" &&
            !answeredSince
        ) {
            setStage("ask_birth")
            setIntakeStep("date")
            setPickerVisible(true)
        }
    }, [hasAssistantMessage, messages, ready])

    // Once they answer in their own words the tap-answers are stale — she does
    // not leave chips hanging under a conversation that has moved on.
    useEffect(() => {
        if (quickReplies.length === 0) return
        const spokeForThemselves = messages.some(
            (m) => m.role === "user" && !m.astraIntakeAnswer && m.text.trim(),
        )
        if (!spokeForThemselves) return
        setQuickReplies([])
        setStage("done")
    }, [messages, quickReplies.length])

    // Remember what this thread ended up being about, so the NEXT one can open
    // by referring back to it instead of starting from nothing.
    const topicSyncedRef = useRef(false)
    useEffect(() => {
        if (topicSyncedRef.current || !sessionId) return
        const firstQuestion = messages.find(
            (m) => m.role === "user" && !m.astraIntakeAnswer && m.text.trim(),
        )
        if (!firstQuestion) return
        topicSyncedRef.current = true
        void fetch("/api/astra/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                lastTopic: threadTitleFromQuestion(firstQuestion.text),
                lastSessionId: sessionId,
            }),
        }).catch(() => {})
    }, [messages, sessionId])

    const formatBirthDate = useCallback(
        ({ year, month, day }: ParsedBirthDate) =>
            new Intl.DateTimeFormat(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
            }).format(new Date(Date.UTC(year, month - 1, day))),
        [locale],
    )

    /**
     * Writes the birth details everywhere they are read from, so no other part
     * of the app ever asks for them again: her own cross-thread memory, the
     * local copy the reading flows read, and the account profile when signed in.
     */
    const saveBirth = useCallback(
        async (birth: {
            year: number
            month: number
            day: number
            hour: number | null
            minute: number | null
            timeKnown: boolean
        }) => {
            const timezone = -new Date().getTimezoneOffset() / 60
            await fetch("/api/astra/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ birth: { ...birth, timezone } }),
            })

            const hour = birth.timeKnown ? birth.hour : null
            saveBirthToStorage({
                day: birth.day,
                month: birth.month,
                year: birth.year,
                hour,
                minute: birth.timeKnown ? birth.minute : null,
                timeHint:
                    hour == null
                        ? "unknown"
                        : hour >= 6 && hour < 18
                          ? "day"
                          : "night",
                timezone,
                lat: null,
                lng: null,
                country: null,
                state: null,
                usedLocationFallback: false,
            })

            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session?.access_token) return
            const pad = (value: number) => String(value).padStart(2, "0")
            await fetch("/api/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    birthDate: `${birth.year}-${pad(birth.month)}-${pad(birth.day)}`,
                    birthTime: birth.timeKnown
                        ? `${pad(birth.hour ?? 0)}:${pad(birth.minute ?? 0)}`
                        : null,
                }),
            })
        },
        [],
    )

    const finishIntake = useCallback(
        async (time: ParsedBirthTime | null) => {
            const date = pendingDateRef.current
            if (!date) return
            setIntakeStep(null)
            setPickerVisible(false)

            if (ageInYears(date) < MIN_AGE_YEARS) {
                appendAssistantBubble(
                    `astra-too-young-${Date.now()}`,
                    t("intake.tooYoung"),
                )
                setStage("done")
                return
            }

            setTyping(true)
            try {
                await saveBirth({
                    ...date,
                    hour: time?.hour ?? null,
                    minute: time?.minute ?? null,
                    timeKnown: time != null,
                })
                appendAssistantBubble(
                    `astra-ack-${Date.now()}`,
                    t("intake.ack"),
                    { astraStage: "ask_birth" },
                )
                await playPayload(await fetchOpening())
            } catch {
                setStage("done")
            } finally {
                setTyping(false)
            }
        },
        [appendAssistantBubble, fetchOpening, playPayload, saveBirth, t],
    )

    /** Date in hand — she asks about the time next. */
    const acceptDate = useCallback(
        (date: ParsedBirthDate, echo = true) => {
            pendingDateRef.current = date
            if (echo) appendUserBubble(formatBirthDate(date))
            setIntakeStep("time")
            setPickerVisible(false)
            void (async () => {
                setTyping(true)
                await delay(700)
                setTyping(false)
                appendAssistantBubble(
                    `astra-ask-time-${Date.now()}`,
                    t("intake.askTimeKnown"),
                    { astraStage: "ask_birth" },
                )
                setPickerVisible(true)
            })()
        },
        [appendAssistantBubble, appendUserBubble, formatBirthDate, t],
    )

    const acceptTime = useCallback(
        (time: ParsedBirthTime | null, echo = true) => {
            if (echo) {
                appendUserBubble(
                    time
                        ? `${String(time.hour).padStart(2, "0")}:${String(
                              time.minute,
                          ).padStart(2, "0")}`
                        : t("intake.timeUnknown"),
                )
            }
            void finishIntake(time)
        },
        [appendUserBubble, finishIntake, t],
    )

    const sayNotUnderstood = useCallback(
        (step: IntakeStep) => {
            void (async () => {
                setTyping(true)
                await delay(600)
                setTyping(false)
                appendAssistantBubble(
                    `astra-retry-${Date.now()}`,
                    t(
                        step === "date"
                            ? "intake.notUnderstoodDate"
                            : "intake.notUnderstoodTime",
                    ),
                    { astraStage: "ask_birth" },
                )
            })()
        },
        [appendAssistantBubble, t],
    )

    /**
     * Anything typed while she is collecting birth details belongs to her
     * question, not to the reading flow. Returns true when it was consumed.
     */
    const handleTypedInput = useCallback(
        (raw: string): boolean => {
            const text = raw.trim()
            if (!text || !intakeStep) return false

            if (intakeStep === "date") {
                const date = parseBirthDate(text)
                appendUserBubble(text)
                if (date) acceptDate(date, false)
                else sayNotUnderstood("date")
                return true
            }

            appendUserBubble(text)
            if (saysUnknown(text)) {
                acceptTime(null, false)
                return true
            }
            const time = parseBirthTime(text)
            if (time) acceptTime(time, false)
            else sayNotUnderstood("time")
            return true
        },
        [
            acceptDate,
            acceptTime,
            appendUserBubble,
            intakeStep,
            sayNotUnderstood,
        ],
    )

    const handleQuickReply = useCallback(
        (reply: AstraQuickReply) => {
            setQuickReplies([])
            setStage("done")
            onSendUserMessage(reply.label)
        },
        [onSendUserMessage],
    )

    const node = useMemo(() => {
        if (intakeStep === "date" && pickerVisible) {
            return (
                <AstraAnswerStrip speaker={identity.fullName}>
                    <BirthDatePickerButton
                        label={t("intake.pickDate")}
                        onPick={(date) => acceptDate(date)}
                    />
                </AstraAnswerStrip>
            )
        }
        if (intakeStep === "time" && pickerVisible) {
            return (
                <AstraAnswerStrip speaker={identity.fullName}>
                    <BirthTimePickerButton
                        label={t("intake.pickTime")}
                        hourLabel={t("intake.hour")}
                        minuteLabel={t("intake.minute")}
                        confirmLabel={t("intake.confirm")}
                        onPick={(time) => acceptTime(time)}
                    />
                    <button
                        type='button'
                        onClick={() => acceptTime(null)}
                        className={followUpChipClass}
                    >
                        {t("intake.timeKnownNo")}
                    </button>
                </AstraAnswerStrip>
            )
        }
        if (quickReplies.length > 0) {
            return (
                <AstraAnswerStrip speaker={identity.fullName}>
                    {quickReplies.map((reply) => (
                        <button
                            key={reply.id}
                            type='button'
                            onClick={() => handleQuickReply(reply)}
                            className={followUpChipClass}
                        >
                            {reply.label}
                        </button>
                    ))}
                </AstraAnswerStrip>
            )
        }
        return null
    }, [
        acceptDate,
        acceptTime,
        handleQuickReply,
        identity.fullName,
        intakeStep,
        pickerVisible,
        quickReplies,
        t,
    ])

    return {
        /** True while she is composing a bubble. Never a standing status. */
        typing,
        /** Buttons to render directly above the composer, or null. */
        quickReplyNode: node,
        /** Consumes a typed answer to her intake question. */
        handleTypedInput,
        /** True while she owns the turn, so the page hides its idle hero. */
        active: stage !== "idle" && stage !== "done",
        /** True once she has started, so the first-message bootstrap stands down. */
        started: startedRef.current,
    }
}

function AstraAnswerStrip({
    speaker,
    children,
}: {
    speaker: string
    children: React.ReactNode
}) {
    return (
        <div
            className='flex w-full flex-wrap gap-2'
            role='group'
            aria-label={speaker}
        >
            {children}
        </div>
    )
}
