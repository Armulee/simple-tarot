"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { followUpChipClass } from "@/components/question-input"
import {
    BirthDatePickerButton,
    BirthTimePickerButton,
} from "@/components/chat/astra-birth-picker"
import { useAstraIdentity } from "@/lib/astra/use-astra-identity"
import { ageInYears } from "@/lib/astra/thai-astrology"
import {
    parseBirthDate,
    parseBirthTime,
    saysUnknown,
    type ParsedBirthDate,
    type ParsedBirthTime,
} from "@/lib/astra/parse-birth-input"
import { classifyQuestion, type AstraTopic } from "@/lib/astra/intent"
import type { AstraReadingResponse } from "@/lib/astra/reading-contract"
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

/** How many turns back she carries. Enough for a thread, not a diary. */
const TRANSCRIPT_TURNS = 12
/** And a character ceiling, so a long thread cannot bloat every request. */
const TRANSCRIPT_BUDGET = 3000

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
    // A room that starts empty is hers to open, from the very first paint —
    // otherwise the idle typewriter hero flashes while she is still fetching
    // her opening line, and the page looks like two screens fighting.
    const [sheOwnsTheRoom] = useState(() => messages.length === 0)
    const [typing, setTyping] = useState(false)
    const [stage, setStage] = useState<
        "idle" | "ask_birth" | "cold_read" | "follow_up" | "done"
    >("idle")
    const followUpRef = useRef<string | null>(null)
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

    // What she last said, read at call time: a reply of "Work" only makes
    // sense next to the question it answers.
    const messagesRef = useRef(messages)
    useEffect(() => {
        messagesRef.current = messages
    }, [messages])

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

    /** Pause, bubble, pause, bubble — the pacing of someone speaking. */
    const playBubbles = useCallback(
        async (
            bubbles: { id: string; text: string; typingMs: number }[],
            lastExtra?: Partial<ChatMessage>,
            stamp?: Partial<ChatMessage>,
        ) => {
            for (let index = 0; index < bubbles.length; index += 1) {
                const b = bubbles[index]
                setTyping(true)
                await delay(b.typingMs)
                setTyping(false)
                appendAssistantBubble(b.id, b.text, {
                    ...stamp,
                    ...(index === bubbles.length - 1 ? lastExtra : {}),
                })
                await delay(220)
            }
        },
        [appendAssistantBubble],
    )

    /** Plays a server-composed turn: pause, bubble, pause, bubble. */
    const playPayload = useCallback(
        async (payload: AstraOpeningPayload) => {
            await playBubbles(payload.bubbles, undefined, {
                astraStage: payload.stage,
                ...(payload.basis ? { astraBasis: payload.basis } : {}),
            })
            basisRef.current = payload.basis
            followUpRef.current = payload.followUpPredictionId
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
        [playBubbles],
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
                // An empty room with nothing said is the worst failure this
                // page has; say something rather than nothing.
                setTyping(false)
                appendAssistantBubble(
                    `astra-open-failed-${Date.now()}`,
                    t("reading.failed"),
                )
                setStage("done")
            }
        })()
    }, [
        appendAssistantBubble,
        fetchOpening,
        hasAssistantMessage,
        messages.length,
        playPayload,
        ready,
        sessionId,
        t,
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

    // Which thread she last spoke in, so a new one knows to open by referring
    // back. What it was ABOUT is recorded by the reading itself, as the life
    // area it routed to — a whole typed sentence does not fit the sentence
    // that reads it back.
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
            body: JSON.stringify({ lastSessionId: sessionId }),
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
            // Her memory is the one write that must land: everything after
            // this reads the birth date back from it, so a silent failure
            // here is what sends the intake round in a circle.
            const saved = await fetch("/api/astra/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ birth: { ...birth, timezone } }),
            })
            const savedBody = await saved.json().catch(() => null)
            if (!saved.ok || savedBody?.hasBirth !== true) {
                console.error("[astra] birth details were not stored", savedBody)
                throw new Error("BIRTH_NOT_SAVED")
            }

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
                // Say what happened and offer the picker again, instead of
                // quietly re-asking as if they had never answered.
                setTyping(false)
                appendAssistantBubble(
                    `astra-save-failed-${Date.now()}`,
                    t("intake.saveFailed"),
                    { astraStage: "ask_birth" },
                )
                pendingDateRef.current = null
                setIntakeStep("date")
                setPickerVisible(true)
                setStage("ask_birth")
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

    const appendPlainUserBubble = useCallback(
        (text: string) => {
            setMessages((prev) => [
                ...prev,
                {
                    id: `user-${Date.now()}`,
                    role: "user",
                    text,
                } as ChatMessage,
            ])
        },
        [setMessages],
    )

    /**
     * The last stretch of the thread, oldest first, as she and they said it.
     *
     * Her turns arrive as several bubbles in a row; those are one thing said,
     * so they are joined back together. Trimmed from the end, because the near
     * past is what a follow-up is about.
     */
    const buildTranscript = useCallback((all: ChatMessage[]) => {
        const turns: { role: "astra" | "them"; text: string }[] = []
        for (const message of all) {
            const text = message.text?.trim()
            if (!text) continue
            const role = message.role === "user" ? "them" : "astra"
            const previous = turns.at(-1)
            if (previous?.role === role) previous.text += "\n" + text
            else turns.push({ role, text })
        }
        const recent = turns.slice(-TRANSCRIPT_TURNS)
        let budget = TRANSCRIPT_BUDGET
        const kept: typeof recent = []
        for (let i = recent.length - 1; i >= 0; i -= 1) {
            const turn = recent[i]
            if (turn.text.length > budget) {
                if (budget > 200) kept.unshift({ ...turn, text: turn.text.slice(-budget) })
                break
            }
            budget -= turn.text.length
            kept.unshift(turn)
        }
        return kept
    }, [])

    /**
     * A routed reading: the question picks the craft, the craft computes, and
     * only then does she speak. Failures say so instead of inventing a chart.
     */
    const runReading = useCallback(
        async (question: string, topicHint?: AstraTopic) => {
            // What she is answering into. Sending only her own last bubble
            // meant every turn arrived as if it were the first: she repeated
            // herself, contradicted what she had just said, and asked things
            // the person had already answered.
            const transcript = buildTranscript(messagesRef.current)
            appendPlainUserBubble(question)
            setQuickReplies([])
            setStage("done")
            try {
                setTyping(true)
                const response = await fetch("/api/astra/reading", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        question,
                        sessionId,
                        locale,
                        timezone: -new Date().getTimezoneOffset() / 60,
                        topicHint,
                        transcript,
                    }),
                })
                setTyping(false)
                if (!response.ok) {
                    // Surface the server's reason in the console: a failed
                    // reading is otherwise indistinguishable from any other.
                    const detail = await response.json().catch(() => null)
                    console.error("[astra] reading request failed", {
                        status: response.status,
                        detail,
                    })
                    throw new Error("READING_FAILED")
                }
                const payload = (await response.json()) as AstraReadingResponse

                if (payload.kind === "needs_birth") {
                    await playPayload(await fetchOpening())
                    return
                }
                if (payload.kind === "unsure") {
                    await playBubbles(payload.bubbles)
                    setQuickReplies(payload.quickReplies)
                    return
                }
                if (payload.kind === "tarot") return
                // She was talking, not reading: no proof link under it and no
                // date written down, because there is nothing to prove or
                // check. It is just her answering.
                if (payload.kind === "talk") {
                    await playBubbles(payload.bubbles)
                    return
                }
                await playBubbles(payload.bubbles, {
                    astraSource: payload.source,
                    ...(payload.prediction
                        ? { astraPrediction: payload.prediction }
                        : {}),
                })
            } catch {
                setTyping(false)
                appendAssistantBubble(
                    `astra-reading-failed-${Date.now()}`,
                    t("reading.failed"),
                )
            }
        },
        [
            appendAssistantBubble,
            appendPlainUserBubble,
            buildTranscript,
            fetchOpening,
            locale,
            playBubbles,
            playPayload,
            sessionId,
            t,
        ],
    )

    /** Records how an earlier forecast actually turned out. */
    const recordFollowUp = useCallback(
        async (outcome: "hit" | "miss" | "unclear", label: string) => {
            const predictionId = followUpRef.current
            followUpRef.current = null
            setQuickReplies([])
            appendPlainUserBubble(label)
            if (predictionId) {
                await fetch("/api/astra/prediction", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: predictionId, outcome }),
                }).catch(() => {})
            }
            await playBubbles([
                {
                    id: `astra-followup-ack-${Date.now()}`,
                    text: t(
                        outcome === "miss"
                            ? "followUp.thanksMiss"
                            : "followUp.thanks",
                    ),
                    typingMs: 700,
                },
            ])
            await playPayload(await fetchOpening())
        },
        [appendPlainUserBubble, fetchOpening, playBubbles, playPayload, t],
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
            if (!text) return false

            if (!intakeStep) {
                // A tarot draw and anything about the product itself belong
                // to the flows that already handle them; everything else about
                // this person's life, she answers.
                const routed = classifyQuestion(text).kind
                if (routed === "tarot" || routed === "passthrough") return false
                void runReading(text)
                return true
            }

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
            runReading,
            sayNotUnderstood,
        ],
    )

    const handleQuickReply = useCallback(
        (reply: AstraQuickReply) => {
            if (followUpRef.current) {
                void recordFollowUp(
                    reply.id as "hit" | "miss" | "unclear",
                    reply.label,
                )
                return
            }
            setQuickReplies([])
            setStage("done")
            // The chip already says which life area it stands for, so it goes
            // straight to the reading rather than back through the classifier.
            if (reply.topic) {
                void runReading(reply.label, reply.topic)
                return
            }
            onSendUserMessage(reply.label)
        },
        [onSendUserMessage, recordFollowUp, runReading],
    )

    const node = useMemo(() => {
        if (intakeStep === "date" && pickerVisible) {
            return (
                <AstraAnswerStrip speaker={identity.fullName}>
                    <BirthDatePickerButton
                        label={t("intake.pickDate")}
                        confirmLabel={t("intake.confirm")}
                        dayLabel={t("intake.day")}
                        monthLabel={t("intake.month")}
                        yearLabel={t("intake.year")}
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
        active:
            sheOwnsTheRoom || (stage !== "idle" && stage !== "done"),
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
