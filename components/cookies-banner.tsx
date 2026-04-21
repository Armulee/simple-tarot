"use client"

import { useEffect, useState } from "react"
import { ShieldCheck } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { CookiePreferences } from "@/lib/consent-storage"
import type { NoticeTranslations } from "@/lib/notice-translations"

type CookiesBannerProps = {
    visible: boolean
    translations: NoticeTranslations["cookies"]
    preferences: CookiePreferences
    className?: string
    variant?: "default" | "floating-pill"
    onAcceptAll: () => void
    onRejectAll: () => void
    onSavePreferences: (preferences: CookiePreferences) => void
}

export function CookiesBanner({
    visible,
    translations,
    preferences,
    className,
    variant = "default",
    onAcceptAll,
    onRejectAll,
    onSavePreferences,
}: CookiesBannerProps) {
    const [manageOpen, setManageOpen] = useState(false)
    const [draftPreferences, setDraftPreferences] =
        useState<CookiePreferences>(preferences)

    useEffect(() => {
        setDraftPreferences(preferences)
    }, [preferences])

    if (!visible) return null

    return (
        <div className={cn("w-full", className)}>
            <section
                className={cn(
                    "relative mx-auto w-full overflow-hidden border border-[rgba(200,180,140,0.22)] bg-[rgba(10,10,26,0.92)] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl text-left",
                    variant === "floating-pill"
                        ? "max-w-[360px] rounded-[28px]"
                        : "max-w-4xl rounded-2xl",
                )}
            >
                <div className='pointer-events-none absolute inset-0 opacity-30'>
                    <div className='cosmic-stars-layer-3' />
                </div>
                <div className='relative z-10 p-4 sm:p-5'>
                    <div className='space-y-4'>
                        <div className='max-w-2xl space-y-2'>
                            <div className='flex items-center gap-2 text-[rgba(200,180,140,0.76)]'>
                                <ShieldCheck className='h-4 w-4' />
                                <span className='text-[11px] uppercase tracking-[0.24em]'>
                                    {translations.bannerTitle}
                                </span>
                            </div>
                            <p className='text-sm leading-6 text-[rgba(232,224,208,0.78)]'>
                                {translations.bannerDescription}
                            </p>
                        </div>

                        <div className='flex flex-col gap-3'>
                            <div className='flex items-center justify-between gap-3'>
                                <Link
                                    href='/privacy-policy'
                                    className='inline-flex text-xs text-[rgba(200,180,140,0.82)] underline decoration-dotted underline-offset-4'
                                >
                                    {translations.learnMoreLabel}
                                </Link>
                                <button
                                    type='button'
                                    onClick={() =>
                                        setManageOpen((current) => !current)
                                    }
                                    className='inline-flex text-xs text-[rgba(200,180,140,0.82)] underline decoration-dotted underline-offset-4 transition-colors hover:text-white'
                                >
                                    {translations.managePreferences}
                                </button>
                            </div>

                            <div className='grid grid-cols-2 gap-2'>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    onClick={onRejectAll}
                                    className='w-full justify-center border border-[rgba(200,180,140,0.18)] bg-transparent text-[rgba(232,224,208,0.88)] hover:bg-[rgba(200,180,140,0.08)] hover:text-white'
                                >
                                    {translations.rejectAll}
                                </Button>
                                <Button
                                    type='button'
                                    onClick={onAcceptAll}
                                    className='w-full justify-center border border-[rgba(200,180,140,0.38)] bg-[rgba(200,180,140,0.12)] text-[rgba(245,239,227,0.96)] hover:bg-[rgba(200,180,140,0.18)]'
                                >
                                    {translations.acceptAll}
                                </Button>
                            </div>
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
                                        {translations.preferencesTitle}
                                    </h3>
                                    <p className='text-xs leading-5 text-[rgba(232,224,208,0.62)]'>
                                        {translations.preferencesDescription}
                                    </p>
                                </div>

                                <div className='space-y-3'>
                                    <PreferenceRow
                                        title={translations.essentialTitle}
                                        description={
                                            translations.essentialDescription
                                        }
                                        checked
                                        disabled
                                        trailingLabel={
                                            translations.alwaysOnLabel
                                        }
                                    />
                                    <PreferenceRow
                                        title={translations.analyticsTitle}
                                        description={
                                            translations.analyticsDescription
                                        }
                                        checked={
                                            draftPreferences.analytics
                                        }
                                        onCheckedChange={(checked) =>
                                            setDraftPreferences((current) => ({
                                                ...current,
                                                analytics: checked,
                                            }))
                                        }
                                    />
                                    <PreferenceRow
                                        title={translations.marketingTitle}
                                        description={
                                            translations.marketingDescription
                                        }
                                        checked={
                                            draftPreferences.marketing
                                        }
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
                                        onClick={onRejectAll}
                                        className='border border-[rgba(200,180,140,0.18)] bg-transparent text-[rgba(232,224,208,0.88)] hover:bg-[rgba(200,180,140,0.08)] hover:text-white'
                                    >
                                        {translations.rejectAll}
                                    </Button>
                                    <Button
                                        type='button'
                                        onClick={() => {
                                            onSavePreferences(draftPreferences)
                                            setManageOpen(false)
                                        }}
                                        className='border border-[rgba(200,180,140,0.38)] bg-[rgba(200,180,140,0.12)] text-[rgba(245,239,227,0.96)] hover:bg-[rgba(200,180,140,0.18)]'
                                    >
                                        {translations.savePreferences}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
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
