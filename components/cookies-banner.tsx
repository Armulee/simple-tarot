"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { usePathname, Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { CookiePreferences } from "@/lib/consent-storage"
import { useStarConsent } from "@/components/star-consent"

/**
 * Pages where the cookie banner is rendered **inline** by the page itself
 * (Home + chat session). These pages place `<CookiesBanner inline />` near the
 * question composer; the layout-level `<CookiesBanner />` instance returns null
 * to avoid duplication.
 *
 * Kept here only for the layout-level instance to know when to step aside.
 */
const localeSet = new Set<string>(routing.locales)
const STATIC_FIRST_SEGMENT = new Set([
    "about",
    "account",
    "admin",
    "articles",
    "astrology",
    "auth",
    "billing",
    "birth-chart",
    "contact",
    "content",
    "demo",
    "manifest.webmanifest",
    "opengraph-image",
    "pricing",
    "privacy-policy",
    "profile",
    "reading",
    "referral",
    "settings",
    "share",
    "signin",
    "signup",
    "stars",
    "structured-data",
    "success",
    "terms-of-service",
    "twitter-image",
])

function isHomeOrChatSession(pathname: string): boolean {
    const clean = pathname.split("?")[0].split("#")[0]
    const seg = clean.split("/").filter(Boolean)
    if (seg.length === 0) return true
    if (seg.length === 1 && localeSet.has(seg[0])) return true
    if (seg.length !== 1) return false
    const [first] = seg
    if (localeSet.has(first)) return false
    if (STATIC_FIRST_SEGMENT.has(first)) return false
    return true
}

/**
 * Site-wide cookie preferences banner. Self-contained: reads consent state and
 * persistence via StarConsentProvider — render without props.
 *
 * Placement strategy:
 * - On home + chat session pages, the page itself renders `<CookiesBanner inline />`
 *   directly inside the question composer container so the banner sits in the
 *   document flow (no portal, no overlay over the input).
 * - On every other page, the layout-level `<CookiesBanner />` renders fixed at the
 *   viewport bottom. That instance returns null on home/chat to avoid duplication.
 *
 * Both modes only render after `mounted = true` (post-hydration). This keeps the
 * SSR HTML and the first client commit identical (both empty), preventing
 * hydration mismatches caused by `localStorage`-backed consent state.
 */
export function CookiesBanner({ inline = false }: { inline?: boolean }) {
    const t = useTranslations("StarConsent.cookies")
    const pathname = usePathname()
    const {
        cookieConsent,
        acceptAllCookies,
        rejectAllCookies,
        saveCookiePreferences,
    } = useStarConsent()

    const visible = !cookieConsent.decisionMade
    const preferences = cookieConsent.preferences

    const [manageOpen, setManageOpen] = useState(false)
    const [draftPreferences, setDraftPreferences] =
        useState<CookiePreferences>(preferences)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setDraftPreferences(preferences)
    }, [preferences])

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null
    if (!visible) return null
    // Layout-level instance steps aside when the page renders its own inline copy.
    if (!inline && isHomeOrChatSession(pathname)) return null

    const panel = (
        <div className='w-full'>
            <section className='relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[rgba(200,180,140,0.22)] bg-[rgba(10,10,26,0.92)] text-left shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl'>
                <div className='pointer-events-none absolute inset-0 opacity-30'>
                    <div className='cosmic-stars-layer-3' />
                </div>
                <div className='relative z-10 p-4 sm:p-5'>
                    <div className='space-y-4'>
                        <div className='max-w-2xl space-y-2'>
                            <div className='flex items-center gap-2 text-[rgba(200,180,140,0.76)]'>
                                <ShieldCheck className='h-4 w-4' />
                                <span className='text-[11px] uppercase tracking-[0.24em]'>
                                    {t("bannerTitle")}
                                </span>
                            </div>
                            <p className='text-xs leading-6 text-[rgba(232,224,208,0.78)]'>
                                {t("bannerDescription")}
                            </p>
                        </div>

                        <div className='flex flex-col gap-3'>
                            <div className='flex items-center justify-between gap-3'>
                                <Link
                                    href='/privacy-policy'
                                    className='inline-flex text-xs text-[rgba(200,180,140,0.82)] underline decoration-dotted underline-offset-4'
                                >
                                    {t("learnMoreLabel")}
                                </Link>
                                <button
                                    type='button'
                                    onClick={() =>
                                        setManageOpen((current) => !current)
                                    }
                                    className='inline-flex text-xs text-[rgba(200,180,140,0.82)] underline decoration-dotted underline-offset-4 transition-colors hover:text-white'
                                >
                                    {t(
                                        manageOpen
                                            ? "closePreferencesMenu"
                                            : "managePreferences",
                                    )}
                                </button>
                            </div>

                            {!manageOpen ? (
                                <div className='grid grid-cols-2 gap-2'>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        onClick={rejectAllCookies}
                                        className='w-full justify-center border border-[rgba(200,180,140,0.18)] bg-transparent text-[rgba(232,224,208,0.88)] hover:bg-[rgba(200,180,140,0.08)] hover:text-white'
                                    >
                                        {t("rejectAll")}
                                    </Button>
                                    <Button
                                        type='button'
                                        onClick={acceptAllCookies}
                                        className='w-full justify-center border border-[rgba(200,180,140,0.38)] bg-[rgba(200,180,140,0.12)] text-[rgba(245,239,227,0.96)] hover:bg-[rgba(200,180,140,0.18)]'
                                    >
                                        {t("acceptAll")}
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div
                        className={cn(
                            "grid transition-[grid-template-rows,margin-top,opacity] duration-300 ease-out",
                            manageOpen
                                ? "mt-4 grid-rows-[1fr] opacity-100"
                                : "mt-0 grid-rows-[0fr] opacity-0",
                        )}
                    >
                        <div className='overflow-hidden'>
                            <div className='rounded-xl border border-[rgba(200,180,140,0.14)] bg-[rgba(19,18,31,0.78)] p-4'>
                                <div className='mb-4 space-y-1'>
                                    <h3 className='text-sm font-medium text-[rgba(245,239,227,0.94)]'>
                                        {t("preferencesTitle")}
                                    </h3>
                                    <p className='text-xs leading-5 text-[rgba(232,224,208,0.62)]'>
                                        {t("preferencesDescription")}
                                    </p>
                                </div>

                                <div className='space-y-3'>
                                    <PreferenceRow
                                        title={t("essentialTitle")}
                                        description={t("essentialDescription")}
                                        checked
                                        disabled
                                        trailingLabel={t("alwaysOnLabel")}
                                    />
                                    <PreferenceRow
                                        title={t("analyticsTitle")}
                                        description={t("analyticsDescription")}
                                        checked={draftPreferences.analytics}
                                        onCheckedChange={(checked) =>
                                            setDraftPreferences((current) => ({
                                                ...current,
                                                analytics: checked,
                                            }))
                                        }
                                    />
                                    <PreferenceRow
                                        title={t("marketingTitle")}
                                        description={t("marketingDescription")}
                                        checked={draftPreferences.marketing}
                                        onCheckedChange={(checked) =>
                                            setDraftPreferences((current) => ({
                                                ...current,
                                                marketing: checked,
                                            }))
                                        }
                                    />
                                </div>

                                <div className='mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end'>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        onClick={rejectAllCookies}
                                        className='border border-[rgba(200,180,140,0.18)] bg-transparent text-[rgba(232,224,208,0.88)] hover:bg-[rgba(200,180,140,0.08)] hover:text-white'
                                    >
                                        {t("rejectAll")}
                                    </Button>
                                    <Button
                                        type='button'
                                        onClick={() => {
                                            saveCookiePreferences(
                                                draftPreferences,
                                            )
                                            setManageOpen(false)
                                        }}
                                        className='border border-[rgba(200,180,140,0.38)] bg-[rgba(200,180,140,0.12)] text-[rgba(245,239,227,0.96)] hover:bg-[rgba(200,180,140,0.18)]'
                                    >
                                        {t("savePreferences")}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )

    if (inline) {
        return (
            <div className='mx-auto w-full max-w-3xl px-4 pb-2'>{panel}</div>
        )
    }

    return (
        <div className='fixed bottom-0 left-0 right-0 z-50 w-full shrink-0 border-t border-white/5 bg-[#0a0a1a]/40 backdrop-blur-sm'>
            <div className='mx-auto w-full max-w-3xl px-4 pb-3 pt-2'>
                {panel}
            </div>
        </div>
    )
}

function PreferenceRow({
    title,
    description,
    checked,
    disabled = false,
    trailingLabel,
    onCheckedChange,
}: {
    title: string
    description: string
    checked: boolean
    disabled?: boolean
    trailingLabel?: string
    onCheckedChange?: (checked: boolean) => void
}) {
    return (
        <div className='flex items-start justify-between gap-4 rounded-xl border border-[rgba(200,180,140,0.12)] bg-[rgba(255,255,255,0.01)] p-3'>
            <div className='space-y-1'>
                <div className='text-sm font-medium text-[rgba(245,239,227,0.94)]'>
                    {title}
                </div>
                <p className='text-xs leading-5 text-[rgba(232,224,208,0.62)]'>
                    {description}
                </p>
            </div>

            <div className='flex shrink-0 items-center gap-3'>
                {trailingLabel ? (
                    <span className='text-[10px] uppercase tracking-[0.2em] text-[rgba(200,180,140,0.62)]'>
                        {trailingLabel}
                    </span>
                ) : null}
                <Switch
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={onCheckedChange}
                    aria-label={title}
                    className='data-[state=checked]:bg-[rgba(200,180,140,0.62)] data-[state=unchecked]:bg-white/20'
                />
            </div>
        </div>
    )
}
