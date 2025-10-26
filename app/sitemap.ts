import { MetadataRoute } from "next"
import { getPathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

const host = "https://askingfate.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const currentDate = new Date()

    async function withAlternates(
        href: string,
        opts: {
            changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
            priority: number
            lastModified?: Date
        },
        query?: string
    ) {
        const urlDefault =
            host +
            (await getPathname({ locale: routing.defaultLocale, href })) +
            (query || "")
        const languages: Record<string, string> = {}
        for (const locale of routing.locales) {
            languages[locale] =
                host + (await getPathname({ locale, href })) + (query || "")
        }
        return {
            url: urlDefault === host + "/" ? host : urlDefault,
            lastModified: opts.lastModified ?? currentDate,
            changeFrequency: opts.changeFrequency,
            priority: opts.priority,
            alternates: {
                languages,
            },
        } satisfies MetadataRoute.Sitemap[number]
    }

    const entries: MetadataRoute.Sitemap = [
        await withAlternates("/", { changeFrequency: "daily", priority: 1 }),
        await withAlternates("/tarot", {
            changeFrequency: "daily",
            priority: 0.9,
        }),
        await withAlternates("/about", {
            changeFrequency: "weekly",
            priority: 0.8,
        }),
        await withAlternates("/contact", {
            changeFrequency: "monthly",
            priority: 0.7,
        }),
        await withAlternates("/privacy-policy", {
            changeFrequency: "yearly",
            priority: 0.4,
        }),
        await withAlternates("/terms-of-service", {
            changeFrequency: "yearly",
            priority: 0.4,
        }),
        // Dynamic reading types (query params)
        await withAlternates(
            "/tarot",
            { changeFrequency: "weekly", priority: 0.8 },
            "?type=simple"
        ),
        await withAlternates(
            "/tarot",
            { changeFrequency: "weekly", priority: 0.8 },
            "?type=intermediate"
        ),
        await withAlternates(
            "/tarot",
            { changeFrequency: "weekly", priority: 0.8 },
            "?type=advanced"
        ),
        // Articles hub and documentation pages
        await withAlternates("/articles", {
            changeFrequency: "weekly",
            priority: 0.7,
        }),
        await withAlternates("/articles/create-content", {
            changeFrequency: "monthly",
            priority: 0.6,
        }),
        await withAlternates("/articles/share-reading", {
            changeFrequency: "monthly",
            priority: 0.6,
        }),
        await withAlternates("/articles/refer-a-friend", {
            changeFrequency: "monthly",
            priority: 0.6,
        }),
        await withAlternates("/articles/how-to-play", {
            changeFrequency: "monthly",
            priority: 0.6,
        }),
        await withAlternates("/articles/help-support", {
            changeFrequency: "monthly",
            priority: 0.6,
        }),
        await withAlternates("/articles/faq", {
            changeFrequency: "monthly",
            priority: 0.6,
        }),
    ]

    return entries
}
