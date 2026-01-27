export const AI_STAR_COST_CAP = 5 as const

export const AI_MEDIA_OPTIONS = [
    { value: "instagram", label: "Instagram" },
    { value: "x", label: "X (Twitter)" },
    { value: "facebook", label: "Facebook" },
    { value: "tiktok", label: "TikTok" },
    { value: "youtube", label: "YouTube" },
    { value: "blog", label: "Blog / Website" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "other", label: "Other Platform" },
] as const

export type MediaPlatform = (typeof AI_MEDIA_OPTIONS)[number]["value"]

export const AI_LANGUAGE_OPTIONS = [
    { value: "en", label: "English", flag: "🇺🇸" },
    { value: "th", label: "ไทย (Thai)", flag: "🇹🇭" },
    { value: "es", label: "Español (Spanish)", flag: "🇪🇸" },
    { value: "fr", label: "Français (French)", flag: "🇫🇷" },
    { value: "de", label: "Deutsch (German)", flag: "🇩🇪" },
    { value: "pt", label: "Português (Portuguese)", flag: "🇵🇹" },
    { value: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
    { value: "ja", label: "日本語 (Japanese)", flag: "🇯🇵" },
    { value: "ko", label: "한국어 (Korean)", flag: "🇰🇷" },
    { value: "zh", label: "简体中文 (Chinese Simplified)", flag: "🇨🇳" },
    { value: "hi", label: "हिन्दी (Hindi)", flag: "🇮🇳" },
    { value: "it", label: "Italiano (Italian)", flag: "🇮🇹" },
    { value: "ar", label: "العربية (Arabic)", flag: "🇸🇦" },
    { value: "ru", label: "Русский (Russian)", flag: "🇷🇺" },
    { value: "vi", label: "Tiếng Việt (Vietnamese)", flag: "🇻🇳" },
    { value: "ms", label: "Bahasa Melayu (Malay)", flag: "🇲🇾" },
    { value: "fil", label: "Filipino", flag: "🇵🇭" },
    { value: "tr", label: "Türkçe (Turkish)", flag: "🇹🇷" },
    { value: "fa", label: "فارسی (Farsi)", flag: "🇮🇷" },
    { value: "bn", label: "বাংলা (Bengali)", flag: "🇧🇩" },
    { value: "other", label: "Other / Specify in notes", flag: "🌐" },
] as const

export type LanguageOption = (typeof AI_LANGUAGE_OPTIONS)[number]
export type LanguageCode = LanguageOption["value"]

export const CONTENT_TYPE_CATALOG = {
    shortText: {
        label: "Short Text",
        cost: 1,
        guidance:
            "Keep it concise and scroll-stopping. Include a clear call-to-action that invites followers to experience AskingFate.",
    },
    blog: {
        label: "Blog Story",
        cost: 5,
        guidance:
            "Outline a rich narrative with intro, body, and conclusion. Highlight a personal or community story that spotlights AskingFate’s value.",
    },
    image: {
        label: "Image + Caption",
        cost: 2,
        guidance:
            "Suggest a visual concept and deliver a caption with a hook, mystical detail, and CTA.",
    },
    carousel: {
        label: "Carousel",
        cost: 3,
        guidance:
            "Provide a slide-by-slide breakdown with punchy headlines and brief supporting text.",
    },
    shortVideo: {
        label: "Short Video Script",
        cost: 4,
        guidance:
            "Deliver a hook, key beats, and CTA in under 60 seconds. Include tone or camera cues when helpful.",
    },
    other: {
        label: "Creative Concept",
        cost: 2,
        guidance:
            "Suggest an innovative idea tailored to the chosen platform while remaining true to AskingFate’s brand.",
    },
} as const

export type ContentTypeKey = keyof typeof CONTENT_TYPE_CATALOG

export const CONTENT_TYPE_OPTIONS_BY_MEDIA: Record<
    MediaPlatform,
    ContentTypeKey[]
> = {
    instagram: ["shortText", "image", "carousel", "shortVideo", "other"],
    x: ["shortText", "image", "shortVideo", "other"],
    facebook: ["shortText", "image", "carousel", "shortVideo", "other", "blog"],
    tiktok: ["shortVideo", "shortText", "image", "other"],
    youtube: ["shortVideo", "shortText", "other", "blog"],
    blog: ["blog", "shortText", "image", "other"],
    linkedin: ["shortText", "blog", "image", "other"],
    other: ["shortText", "image", "shortVideo", "blog", "other"],
}

export const PLATFORM_PROMPT_HINTS: Record<MediaPlatform, string> = {
    instagram:
        "Reference Reels or Stories when relevant. Encourage viewers to explore the link in bio for a mystical AskingFate experience.",
    x: "Stay within 260 characters. Use at most two purposeful hashtags. Sound sharp and timely.",
    facebook:
        "Craft a friendly, community-oriented tone. Encourage sharing and comments from friends discovering AskingFate together.",
    tiktok:
        "Prioritize energetic hooks and quick, cinematic beats. Mention visual transitions or on-screen text where useful.",
    youtube:
        "Design for short-form clips or video intros. Highlight storytelling arcs and calls to subscribe or click through to AskingFate.",
    blog:
        "Offer a structured outline or ready-to-publish draft that balances storytelling with clear takeaways and CTAs.",
    linkedin:
        "Adopt a professional yet warm voice. Tie AskingFate’s guidance to personal growth, leadership, or workplace wellbeing.",
    other:
        "Stay adaptable but always highlight AskingFate’s promise of insightful, mystical guidance and reward opportunities.",
}
