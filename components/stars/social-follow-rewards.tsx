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
    Star,
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

type SocialFollowRewardsProps = {
    onProgress?: (payload: { claimed: number; total: number }) => void
}

export function SocialFollowRewards({ onProgress }: SocialFollowRewardsProps) {
    const t = useTranslations("StarsPage")
    const { user } = useAuth()
    const [claimedPlatforms, setClaimedPlatforms] = useState<
        Set<SocialPlatformId>
    >(new Set())
    const [claiming, setClaiming] = useState<SocialPlatformId | null>(null)
    const [loadingClaims, setLoadingClaims] = useState(false)

    const totalPlatforms = SOCIAL_PLATFORMS.length
    const hasUser = Boolean(user)

    const notifyProgress = useCallback(
        (claimedCount: number) => {
            onProgress?.({ claimed: claimedCount, total: totalPlatforms })
        },
        [onProgress, totalPlatforms]
    )

    const syncClaims = useCallback(
        (platforms: Set<SocialPlatformId>) => {
            setClaimedPlatforms(platforms)
            notifyProgress(platforms.size)
        },
        [notifyProgress]
    )

    const fetchClaims = useCallback(async () => {
        if (!user) {
            syncClaims(new Set())
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
            syncClaims(next)
        } finally {
            setLoadingClaims(false)
        }
    }, [syncClaims, user])

    useEffect(() => {
        fetchClaims()
    }, [fetchClaims])

    const claimPlatform = useCallback(
        async (platform: SocialPlatformId) => {
            if (!user) {
                toast.info(t("earn.social.signIn"))
                return false
            }
            setClaiming(platform)
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (!session) {
                    toast.info(t("earn.social.signIn"))
                    return false
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
                        const copy = new Set(claimedPlatforms)
                        copy.add(platform)
                        syncClaims(copy)
                        return false
                    }
                    toast.error(payload?.error ?? t("earn.social.error"))
                    return false
                }
                const updated = new Set(claimedPlatforms)
                updated.add(platform)
                syncClaims(updated)
                toast.success(
                    t("earn.social.success", {
                        platform: t(`earn.platforms.${platform}`),
                    })
                )
                return true
            } finally {
                setClaiming(null)
            }
        },
        [claimedPlatforms, syncClaims, t, user]
    )

    const handleFollowClick = useCallback(
        async (platform: SocialPlatform) => {
            const claimed = claimedPlatforms.has(platform.id)
            if (typeof window !== "undefined") {
                window.open(platform.url, "_blank", "noopener,noreferrer")
            }
            if (claimed) return
            await claimPlatform(platform.id)
        },
        [claimPlatform, claimedPlatforms]
    )

    const progressLabel = useMemo(
        () =>
            t("earn.social.progress", {
                claimed: claimedPlatforms.size,
                total: totalPlatforms,
            }),
        [claimedPlatforms.size, t, totalPlatforms]
    )

    return (
        <div className='space-y-3'>
            <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <span>{progressLabel}</span>
                {!hasUser && (
                    <span className='text-yellow-200'>
                        {t("earn.social.signIn")}
                    </span>
                )}
            </div>
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
                        <Button
                            size='sm'
                            className='gap-2'
                            disabled={
                                claiming === platform.id ||
                                loadingClaims
                            }
                            onClick={() => handleFollowClick(platform)}
                        >
                            {claimed ? (
                                <>
                                    <ExternalLink className='w-4 h-4' />
                                    {t("earn.social.openCta")}
                                </>
                            ) : (
                                <>
                                    {t("earn.social.followCta")}
                                    <span className='flex items-center gap-1 text-xs font-semibold text-yellow-200'>
                                        +
                                        <Star
                                            className='w-3 h-3'
                                            fill='currentColor'
                                        />
                                        1
                                    </span>
                                </>
                            )}
                        </Button>
                    </div>
                )
            })}
        </div>
    )
}
