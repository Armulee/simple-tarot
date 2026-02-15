import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import ChatSession from "@/components/chat/session"
import type { ChatDecision } from "@/components/chat/session"
import { getMetadataBase } from "@/lib/seo"
import { getCleanQuestionText } from "@/lib/question-utils"

type ChatSessionData = {
    id: string
    question: string
    messages: unknown
    decision: unknown
    owner_user_id: string | null
    show_insufficient_stars?: boolean
    show_card_draw?: boolean
}

function isChatDecision(value: unknown): value is ChatDecision {
    if (!value || typeof value !== "object") return false
    const v = value as Record<string, unknown>
    return (
        (v.type === "chat" || v.type === "draw" || v.type === "horoscope") &&
        typeof v.spreadType === "string" &&
        typeof v.cardCount === "number" &&
        typeof v.assistantText === "string"
    )
}

async function getChatSession(id: string) {
    const { data } = await supabase
        .from("chat_sessions")
        .select(
            "id, question, messages, decision, owner_user_id, show_insufficient_stars, show_card_draw",
        )
        .eq("id", id)
        .maybeSingle()
    return data as ChatSessionData | null
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}): Promise<Metadata> {
    const { id, locale } = await params
    const data = await getChatSession(id)
    const baseUrl = getMetadataBase().toString().replace(/\/$/, "")
    const ogImage = `${baseUrl}/${locale}/opengraph-image`
    const twitterImage = `${baseUrl}/${locale}/twitter-image`

    if (!data) {
        return {
            title: "Chat Not Found | Asking Fate",
        }
    }

    const question = getCleanQuestionText(data.question || "Chat Session")
    const title = `"${question}" - Asking Fate`
    const description = `Discover the cosmic insights from this AI-powered chat about "${question}".`

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "article",
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [twitterImage],
        },
    }
}

export default async function ChatSessionPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const data = await getChatSession(id)
    if (!data) return notFound()

    return (
        <ChatSession
            initialSession={{
                id: data.id,
                question: data.question,
                messages: Array.isArray(data.messages) ? data.messages : [],
                decision: isChatDecision(data.decision) ? data.decision : null,
                owner_user_id: data.owner_user_id,
                showInsufficientStars: data.show_insufficient_stars,
                showCardDraw: data.show_card_draw,
            }}
        />
    )
}
