"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { followUpChipClass } from "@/components/question-input"
import { useAstraIdentity } from "@/lib/astra/use-astra-identity"
import { threadTitleFromQuestion } from "@/lib/chat/thread-title"
import { ageInYears } from "@/lib/astra/thai-astrology"
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
 * each one. When she needs the birth date she asks for it in conversation and
 * the answers are tapped, not typed — the chips sit ABOVE the composer, which
 * stays usable the whole time.
 *
 * Everything she says here is server-composed (`/api/astra/opening`) from
 * hand-written lines; this file only decides the pacing and collects taps.
 */

type IntakeStep =
    | "decade"
    | "year"
    | "month"
    | "day"
    | "time-known"
    | "hour"
    | "minute"

type IntakeState = {
    step: IntakeStep
    decade?: number
    year?: number
    month?: number
    day?: number
    hour?: number
}

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

const CURRENT_YEAR = new Date().getFullYear()
const OLDEST_DECADE = 1930
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
    const [stage, setStage] = useState<"idle" | "ask_birth" | "cold_read" | "done">(
        "idle",
    )
    const [intake, setIntake] = useState<IntakeState | null>(null)
    const [quickReplies, setQuickReplies] = useState<AstraQuickReply[]>([])
    const startedRef = useRef(false)
    const basisRef = useRef<AstraReadingBasis | null>(null)

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
                setIntake({ step: "decade" })
                setQuickReplies([])
            } else {
                setIntake(null)
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

    // Reload mid-intake: the bubbles are already persisted, so pick the chips
    // back up from the stage stamped on her last message.
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
        // Partial taps are not persisted, so an interrupted intake restarts at
        // the date — she asks once more rather than leaving dead chips.
        if (messages[lastStageIndex].astraStage === "ask_birth" && !answeredSince) {
            setStage("ask_birth")
            setIntake({ step: "decade" })
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

    const formatYear = useCallback(
        (year: number) =>
            new Intl.DateTimeFormat(locale, { year: "numeric" }).format(
                new Date(Date.UTC(year, 0, 1)),
            ),
        [locale],
    )

    const formatBirthDate = useCallback(
        (year: number, month: number, day: number) =>
            new Intl.DateTimeFormat(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
            }).format(new Date(Date.UTC(year, month - 1, day))),
        [locale],
    )

    const monthNames = useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { month: "short" })
        return Array.from({ length: 12 }, (_, index) =>
            format.format(new Date(Date.UTC(2024, index, 1))),
        )
    }, [locale])

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
                timeHint: hour == null ? "unknown" : hour >= 6 && hour < 18 ? "day" : "night",
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
        async (state: Required<Pick<IntakeState, "year" | "month" | "day">> & {
            hour: number | null
            minute: number | null
            timeKnown: boolean
        }) => {
            setIntake(null)

            if (ageInYears(state) < MIN_AGE_YEARS) {
                appendAssistantBubble(
                    `astra-too-young-${Date.now()}`,
                    t("intake.tooYoung"),
                )
                setStage("done")
                return
            }

            setTyping(true)
            try {
                await saveBirth(state)
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

    /** One tap on one chip; advances the conversation by exactly one answer. */
    const handleIntakeChoice = useCallback(
        (value: number | "known" | "unknown") => {
            setIntake((current) => {
                if (!current) return current
                switch (current.step) {
                    case "decade":
                        return { ...current, decade: value as number, step: "year" }
                    case "year":
                        return { ...current, year: value as number, step: "month" }
                    case "month":
                        return { ...current, month: value as number, step: "day" }
                    case "day": {
                        const day = value as number
                        const { year, month } = current
                        if (year == null || month == null) return current
                        appendUserBubble(formatBirthDate(year, month, day))
                        void (async () => {
                            setTyping(true)
                            await delay(700)
                            setTyping(false)
                            appendAssistantBubble(
                                `astra-ask-time-${Date.now()}`,
                                t("intake.askTimeKnown"),
                                { astraStage: "ask_birth" },
                            )
                        })()
                        return { ...current, day, step: "time-known" }
                    }
                    case "time-known": {
                        if (value === "unknown") {
                            appendUserBubble(t("intake.timeUnknown"))
                            void finishIntake({
                                year: current.year!,
                                month: current.month!,
                                day: current.day!,
                                hour: null,
                                minute: null,
                                timeKnown: false,
                            })
                            return null
                        }
                        return { ...current, step: "hour" }
                    }
                    case "hour":
                        return { ...current, hour: value as number, step: "minute" }
                    case "minute": {
                        const minute = value as number
                        const hour = current.hour ?? 0
                        appendUserBubble(
                            `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
                        )
                        void finishIntake({
                            year: current.year!,
                            month: current.month!,
                            day: current.day!,
                            hour,
                            minute,
                            timeKnown: true,
                        })
                        return null
                    }
                    default:
                        return current
                }
            })
        },
        [
            appendAssistantBubble,
            appendUserBubble,
            finishIntake,
            formatBirthDate,
            t,
        ],
    )

    const intakeChips = useMemo(() => {
        if (!intake) return null
        switch (intake.step) {
            case "decade": {
                const start = Math.floor(CURRENT_YEAR / 10) * 10
                const decades: number[] = []
                for (let year = start; year >= OLDEST_DECADE; year -= 10) {
                    decades.push(year)
                }
                return {
                    label: t("intake.askYear"),
                    options: decades.map((decade) => ({
                        key: `d-${decade}`,
                        label: `${formatYear(decade)}s`,
                        value: decade,
                    })),
                }
            }
            case "year": {
                const decade = intake.decade ?? CURRENT_YEAR
                const years = Array.from({ length: 10 }, (_, i) => decade + i).filter(
                    (year) => year <= CURRENT_YEAR,
                )
                return {
                    label: t("intake.askYear"),
                    options: years.map((year) => ({
                        key: `y-${year}`,
                        label: formatYear(year),
                        value: year,
                    })),
                }
            }
            case "month":
                return {
                    label: t("intake.askMonth"),
                    options: monthNames.map((name, index) => ({
                        key: `m-${index}`,
                        label: name,
                        value: index + 1,
                    })),
                }
            case "day": {
                const days = new Date(
                    Date.UTC(intake.year ?? 2000, intake.month ?? 1, 0),
                ).getUTCDate()
                return {
                    label: t("intake.askDay"),
                    options: Array.from({ length: days }, (_, i) => ({
                        key: `day-${i + 1}`,
                        label: String(i + 1),
                        value: i + 1,
                    })),
                }
            }
            case "time-known":
                return {
                    label: "",
                    options: [
                        {
                            key: "known",
                            label: t("intake.timeKnownYes"),
                            value: "known" as const,
                        },
                        {
                            key: "unknown",
                            label: t("intake.timeKnownNo"),
                            value: "unknown" as const,
                        },
                    ],
                }
            case "hour":
                return {
                    label: t("intake.askHour"),
                    options: Array.from({ length: 24 }, (_, hour) => ({
                        key: `h-${hour}`,
                        label: `${String(hour).padStart(2, "0")}:00`,
                        value: hour,
                    })),
                }
            case "minute":
                return {
                    label: t("intake.askMinute"),
                    options: [0, 15, 30, 45].map((minute) => ({
                        key: `min-${minute}`,
                        label: `:${String(minute).padStart(2, "0")}`,
                        value: minute,
                    })),
                }
            default:
                return null
        }
    }, [formatYear, intake, monthNames, t])

    const handleQuickReply = useCallback(
        (reply: AstraQuickReply) => {
            setQuickReplies([])
            setStage("done")
            onSendUserMessage(reply.label)
        },
        [onSendUserMessage],
    )

    const node = useMemo(() => {
        if (intakeChips) {
            return (
                <AstraChipRow
                    label={intakeChips.label}
                    speaker={identity.fullName}
                    options={intakeChips.options.map((option) => ({
                        key: option.key,
                        label: option.label,
                        onSelect: () => handleIntakeChoice(option.value),
                    }))}
                />
            )
        }
        if (quickReplies.length > 0) {
            return (
                <AstraChipRow
                    label=''
                    speaker={identity.fullName}
                    options={quickReplies.map((reply) => ({
                        key: reply.id,
                        label: reply.label,
                        onSelect: () => handleQuickReply(reply),
                    }))}
                />
            )
        }
        return null
    }, [
        handleIntakeChoice,
        handleQuickReply,
        identity.fullName,
        intakeChips,
        quickReplies,
    ])

    return {
        /** True while she is composing a bubble. Never a standing status. */
        typing,
        /** Chips to render directly above the composer, or null. */
        quickReplyNode: node,
        /** True while she owns the turn, so the page hides its idle hero. */
        active: stage !== "idle" && stage !== "done",
        /** True once she has started, so the old first-message bootstrap stands down. */
        started: startedRef.current,
    }
}

function AstraChipRow({
    label,
    speaker,
    options,
}: {
    label: string
    speaker: string
    options: { key: string; label: string; onSelect: () => void }[]
}) {
    return (
        <div className='w-full space-y-2'>
            {label ? (
                <p className='text-[11px] uppercase tracking-[0.18em] text-white/50'>
                    {label}
                </p>
            ) : null}
            <div
                className='flex flex-wrap gap-2 max-h-32 overflow-y-auto'
                role='group'
                aria-label={speaker}
            >
                {options.map((option) => (
                    <button
                        key={option.key}
                        type='button'
                        onClick={option.onSelect}
                        className={followUpChipClass}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
