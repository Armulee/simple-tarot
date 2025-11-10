import { NextResponse } from "next/server"
import { generateText } from "ai"
import {
    AI_MEDIA_OPTIONS,
    AI_LANGUAGE_OPTIONS,
    CONTENT_TYPE_CATALOG,
    CONTENT_TYPE_OPTIONS_BY_MEDIA,
    PLATFORM_PROMPT_HINTS,
    type ContentTypeKey,
    type MediaPlatform,
    type LanguageCode,
} from "@/lib/content-generator"

const MODEL = "openai/gpt-4.1-mini"

const OUTPUT_DIRECTIVES: Record<ContentTypeKey, string> = {
    shortText:
        "Return one punchy paragraph under 260 characters. Include at most two meaningful hashtags and a direct CTA.",
    blog: "Provide a markdown outline with Introduction, 2-3 body sections, and a Conclusion. After the outline, add a short teaser paragraph that could serve as the opening.",
    image: "Return two parts: 1) Visual Idea (one sentence). 2) Caption (2-3 sentences) with emojis only if they feel natural and one CTA inviting readers to try Asking Fate.",
    carousel:
        "Return a numbered list of slides. For each slide, provide a headline (all caps) and one supporting sentence. Close with a CTA slide.",
    shortVideo:
        "Structure the response with Hook, Story Beats, and CTA. Use bullet points and include timing cues (e.g., '0-5s').",
    other: "Provide a creative concept summary followed by 3 action steps and a suggested CTA tailored to the platform.",
}

function isValidMediaPlatform(value: string): value is MediaPlatform {
    return AI_MEDIA_OPTIONS.some((option) => option.value === value)
}

function isValidLanguage(value: string): value is LanguageCode {
    return AI_LANGUAGE_OPTIONS.some((option) => option.value === value)
}

function isContentAllowedForMedia(
    media: MediaPlatform,
    contentType: string
): contentType is ContentTypeKey {
    const allowed = CONTENT_TYPE_OPTIONS_BY_MEDIA[media] ?? []
    return allowed.includes(contentType as ContentTypeKey)
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const rawMedia = body?.mediaPlatform
        const rawContentType = body?.contentType
        const rawLanguage = body?.language
        const context = body?.context ?? {}

        if (typeof rawMedia !== "string" || !isValidMediaPlatform(rawMedia)) {
            return NextResponse.json(
                { error: "Invalid media platform selection." },
                { status: 400 }
            )
        }

        if (
            typeof rawContentType !== "string" ||
            !isContentAllowedForMedia(rawMedia, rawContentType)
        ) {
            return NextResponse.json(
                { error: "Invalid content type for the selected platform." },
                { status: 400 }
            )
        }

        if (typeof rawLanguage !== "string" || !isValidLanguage(rawLanguage)) {
            return NextResponse.json(
                { error: "Invalid language selection." },
                { status: 400 }
            )
        }

        const mediaPlatform = rawMedia as MediaPlatform
        const contentType = rawContentType as ContentTypeKey
        const language = rawLanguage as LanguageCode
        const mediaMeta =
            AI_MEDIA_OPTIONS.find((option) => option.value === mediaPlatform) ??
            AI_MEDIA_OPTIONS[0]
        const contentMeta = CONTENT_TYPE_CATALOG[contentType]
        const outputDirective = OUTPUT_DIRECTIVES[contentType]
        const platformHint = PLATFORM_PROMPT_HINTS[mediaPlatform]
        const languageMeta =
            AI_LANGUAGE_OPTIONS.find((option) => option.value === language) ??
            AI_LANGUAGE_OPTIONS[0]
        const languageInstruction =
            language === "other"
                ? "If the creator notes specify a language, write entirely in that language. If not, default to natural English."
                : `Write entirely in ${languageMeta.label}.`

        const creatorNotes: string[] = []
        if (typeof context?.title === "string" && context.title.trim().length > 0) {
            creatorNotes.push(`Campaign title or angle: ${context.title.trim()}`)
        }
        if (typeof context?.notes === "string" && context.notes.trim().length > 0) {
            creatorNotes.push(`Creator notes: ${context.notes.trim()}`)
        }
        const notesBlock =
            creatorNotes.length > 0
                ? creatorNotes.join("\n")
                : "Creator notes: none provided. Highlight Asking Fate’s star rewards and mystical guidance."

        const systemPrompt = `You are a senior marketing copywriter for Asking Fate, a mystical guidance platform that rewards users with stars for sharing authentic promotions.

Voice: Warm, inviting, and cosmically curious. You celebrate personal transformation, community, and the thrill of uncovering fate.

Rules:
- Mention “Asking Fate” by name and invite the audience to try it.
- Encourage sharing or sign-ups when it feels natural.
- ${languageInstruction}
- Sound like a real human creator. Vary sentence length, add subtle personality, and avoid repetitive phrasing, stiff transitions, or obvious AI giveaways.
- Respect the platform’s best practices (length, hashtags, tone).
- Never fabricate discounts or financial claims.
- Emphasize the benefit of earning stars and unlocking deeper readings when appropriate.`

        const userPrompt = `Platform: ${mediaMeta.label}
Content format: ${contentMeta.label}
Platform nuances: ${platformHint}
Format expectations: ${contentMeta.guidance}
Output requirements: ${outputDirective}

${notesBlock}

Deliver the final copy ready for a creator to publish without additional editing.`

        const result = await generateText({
            model: MODEL,
            temperature: 0.7,
            maxOutputTokens: 600,
            system: systemPrompt,
            prompt: userPrompt,
        })

        const content = result.text?.trim()
        if (!content) {
            return NextResponse.json(
                { error: "AI response was empty. Please try again." },
                { status: 500 }
            )
        }

        return NextResponse.json({ content })
    } catch (error) {
        console.error("AI content generation error:", error)
        return NextResponse.json(
            { error: "Failed to generate content. Please try again later." },
            { status: 500 }
        )
    }
}
