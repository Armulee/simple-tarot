"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import {
    Facebook,
    Instagram,
    Music2,
    AtSign,
    Twitter,
    ExternalLink,
    type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

type SocialPlatformId = "facebook" | "instagram" | "threads" | "tiktok" | "x"

type SocialPlatform = {
    id: SocialPlatformId
    url: string
    gradient: string
    icon: LucideIcon
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
    {
        id: "facebook",
        url: "https://www.facebook.com/share/17kKrNfrSG/?mibextid=wwXIfr",
        gradient: "from-blue-500/20 via-blue-400/20 to-blue-500/10",
        icon: Facebook,
    },
    {
        id: "instagram",
        url: "https://www.instagram.com/askingfate?igsh=MWhuYWNnMmtzNjk5NQ%3D%3D&utm_source=qr",
        gradient: "from-pink-500/25 via-purple-500/20 to-orange-400/20",
        icon: Instagram,
    },
    {
        id: "threads",
        url: "https://www.threads.com/@askingfate?igshid=NTc4MTIwNjQ2YQ==",
        gradient: "from-slate-600/30 via-slate-500/20 to-black/30",
        icon: AtSign,
    },
    {
        id: "tiktok",
        url: "https://www.tiktok.com/@askingfate?_r=1&_t=ZS-91s6jFCbi9y",
        gradient: "from-emerald-500/25 via-cyan-500/20 to-emerald-500/10",
        icon: Music2,
    },
    {
        id: "x",
        url: "https://x.com/asking_fate?s=21",
        gradient: "from-slate-500/30 via-slate-400/20 to-slate-600/20",
        icon: Twitter,
    },
]

type ClaimResponse = {
    claims?: { platform: SocialPlatformId }[]
}

export function SocialFollowRewards() {
    const t = useTranslations("StarsPage")
    const { user } = useAuth()
    const [claimedPlatforms, setClaimedPlatforms] = useState<
        Set<SocialPlatformId>
    >(new Set())
    const [claiming, setClaiming] = useState<SocialPlatformId | null>(null)
    const [loadingClaims, setLoadingClaims] = useState(false)

    const hasUser = Boolean(user)

    const fetchClaims = useCallback(async () => {
        if (!user) {
            setClaimedPlatforms(new Set())
            return
        }
        setLoadingClaims(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) return
            const response = await fetch("/api/stars/social-follow", {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            })
            if (!response.ok) return
            const payload = (await response.json()) as ClaimResponse
            const next = new Set<SocialPlatformId>(
                payload.claims?.map((claim) => claim.platform) ?? []
            )
            setClaimedPlatforms(next)
        } finally {
            setLoadingClaims(false)
        }
    }, [user])

    useEffect(() => {
        fetchClaims()
    }, [fetchClaims])

    const handleClaim = useCallback(
        async (platform: SocialPlatformId) => {
            if (!user) {
                toast.info(t("earn.social.signIn"))
                return
            }
            setClaiming(platform)
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (!session) {
                    toast.error(t("earn.social.signIn"))
                    return
                }
                const response = await fetch("/api/stars/social-follow", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ platform }),
                })
                const payload = (await response
                    .json()
                    .catch(() => ({}))) as { error?: string }
                if (!response.ok) {
                    if (response.status === 409) {
                        toast.info(
                            t("earn.social.alreadyClaimed", {
                                platform: t(`earn.platforms.${platform}`),
                            })
                        )
                        setClaimedPlatforms((prev) => {
                            const next = new Set(prev)
                            next.add(platform)
                            return next
                        })
                        return
                    }
                    toast.error(
                        payload?.error ?? t("earn.social.error")
                    )
                    return
                }
                setClaimedPlatforms((prev) => {
                    const next = new Set(prev)
                    next.add(platform)
                    return next
                })
                toast.success(
                    t("earn.social.success", {
                        platform: t(`earn.platforms.${platform}`),
                    })
                )
            } finally {
                setClaiming(null)
            }
        },
        [t, user]
    )

    const claimedCount = claimedPlatforms.size
    const totalPlatforms = SOCIAL_PLATFORMS.length
    const progressLabel = useMemo(
        () =>
            t("earn.social.progress", {
                claimed: claimedCount,
                total: totalPlatforms,
            }),
        [claimedCount, totalPlatforms, t]
    )

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                    <h4 className='text-lg font-semibold'>
                        {t("earn.social.title")}
                    </h4>
                    <p className='text-sm text-muted-foreground'>
                        {t("earn.social.subtitle")}
                    </p>
                </div>
                <span className='text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full'>
                    {progressLabel}
                </span>
            </div>

            <div className='space-y-3'>
                {SOCIAL_PLATFORMS.map((platform) => {
                    const Icon = platform.icon
                    const claimed = claimedPlatforms.has(platform.id)
                    return (
                        <div
                            key={platform.id}
                            className='flex flex-col gap-3 rounded-xl border border-white/10 bg-card/20 p-4 md:flex-row md:items-center md:justify-between'
                        >
                            <div className='flex items-center gap-3'>
                                <div
                                    className={`p-3 rounded-full bg-gradient-to-r ${platform.gradient} border border-white/10`}
                                >
                                    <Icon className='w-5 h-5 text-white' />
                                </div>
                                <div>
                                    <p className='font-semibold'>
                                        {t(`earn.platforms.${platform.id}`)}
                                    </p>
                                    <p className='text-xs text-muted-foreground'>
                                        {t("earn.social.rewardLabel")}
                                    </p>
                                </div>
                            </div>
                            <div className='flex flex-wrap items-center gap-2'>
                                <Button
                                    asChild
                                    variant='ghost'
                                    size='sm'
                                    className='gap-2 text-white/80 hover:text-white'
                                >
                                    <a
                                        href={platform.url}
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        <ExternalLink className='w-4 h-4' />
                                        {t("earn.social.followCta")}
                                    </a>
                                </Button>
                                <Button
                                    size='sm'
                                    disabled={
                                        !hasUser ||
                                        claimed ||
                                        claiming === platform.id ||
                                        loadingClaims
                                    }
                                    onClick={() => handleClaim(platform.id)}
                                >
                                    {claimed
                                        ? t("earn.social.claimed")
                                        : t("earn.social.claimCta")}
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>
            {!hasUser && (
                <p className='text-xs text-muted-foreground text-center'>
                    {t("earn.social.signIn")}
                </p>
            )}
        </div>
    )
}
