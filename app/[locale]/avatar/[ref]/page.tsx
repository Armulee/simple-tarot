import type { Metadata } from "next"

import { supabase } from "@/lib/supabase"
import { AvatarExperience } from "../_components/avatar-experience"

export const metadata: Metadata = {
    title: "Talk to the Fortune Teller · AskingFate",
    robots: { index: false, follow: false },
}

/**
 * /avatar/{ref} — entered when a question is sent from the composer with the
 * avatar toggle on. We reuse the chat_sessions store the text chat uses; the
 * stored question opens as the avatar's initial reveal.
 */
async function getInitialQuestion(ref: string): Promise<string | undefined> {
    const { data } = await supabase
        .from("chat_sessions")
        .select("question")
        .eq("id", ref)
        .maybeSingle()
    const q = (data as { question?: string } | null)?.question
    return typeof q === "string" && q.trim() ? q : undefined
}

export default async function AvatarSessionPage({
    params,
}: {
    params: Promise<{ ref: string }>
}) {
    const { ref } = await params
    const initialQuestion = await getInitialQuestion(ref)
    return <AvatarExperience initialQuestion={initialQuestion} />
}
