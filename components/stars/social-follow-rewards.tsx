"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ExternalLink, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import {
    FaFacebook,
    FaInstagram,
    FaThreads,
    FaTiktok,
    FaXTwitter,
} from "react-icons/fa6"

type SocialPlatformId = "facebook" | "instagram" | "threads" | "tiktok" | "x"

type SocialPlatform = {
    id: SocialPlatformId
    url: string
    Logo: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
    {
        id: "facebook",
        url: "https://www.facebook.com/share/17kKrNfrSG/?mibextid=wwXIfr",
        Logo: FaFacebook,
    },
    {
        id: "instagram",
        url: "https://www.instagram.com/askingfate?igsh=MWhuYWNnMmtzNjk5NQ%3D%3D&utm_source=qr",
        Logo: FaInstagram,
    },
    {
        id: "threads",
        url: "https://www.threads.com/@askingfate?igshid=NTc4MTIwNjQ2YQ==",
        Logo: FaThreads,
    },
    {
        id: "tiktok",
        url: "https://www.tiktok.com/@askingfate?_r=1&_t=ZS-91s6jFCbi9y",
        Logo: FaTiktok,
    },
    {
        id: "x",
        url: "https://x.com/asking_fate?s=21",
        Logo: FaXTwitter,
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
                const payload = (await response.json().catch(() => ({}))) as {
                    error?: string
                }
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

    // Platform-specific brand colors
    const platformColors: Record<
        SocialPlatformId,
        {
            icon: string
            bg: string
            hoverBg: string
            border: string
            text: string
        }
    > = {
        facebook: {
            icon: "text-[#1877F2]",
            bg: "bg-[#1877F2]/10",
            hoverBg: "hover:bg-[#1877F2]/20",
            border: "border-[#1877F2]/30",
            text: "text-[#1877F2]",
        },
        instagram: {
            icon: "text-[#E4405F]",
            bg: "bg-gradient-to-r from-[#E4405F]/10 via-[#F56040]/10 to-[#FCAF45]/10",
            hoverBg:
                "hover:from-[#E4405F]/20 hover:via-[#F56040]/20 hover:to-[#FCAF45]/20",
            border: "border-[#E4405F]/30",
            text: "text-[#E4405F]",
        },
        threads: {
            icon: "text-white",
            bg: "bg-white/10",
            hoverBg: "hover:bg-white/20",
            border: "border-white/30",
            text: "text-white",
        },
        tiktok: {
            icon: "text-[#25F4EE]",
            bg: "bg-gradient-to-r from-[#25F4EE]/10 to-[#FE2C55]/10",
            hoverBg: "hover:from-[#25F4EE]/20 hover:to-[#FE2C55]/20",
            border: "border-[#25F4EE]/30",
            text: "text-[#25F4EE]",
        },
        x: {
            icon: "text-white",
            bg: "bg-white/10",
            hoverBg: "hover:bg-white/20",
            border: "border-white/30",
            text: "text-white",
        },
    }

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
                const claimed = claimedPlatforms.has(platform.id)
                const Logo = platform.Logo
                return (
                    <div
                        key={platform.id}
                        className='flex flex-wrap items-center gap-4 py-3 border-b border-white/10 last:border-b-0'
                    >
                        <div className='flex items-center gap-3 min-w-[180px]'>
                            <Logo
                                className={`w-5 h-5 ${claimed ? platformColors[platform.id].icon : ""}`}
                            />
                            <div>
                                <p
                                    className={`font-semibold ${claimed ? platformColors[platform.id].text : ""}`}
                                >
                                    {t(`earn.platforms.${platform.id}`)}
                                </p>
                                {!claimed && (
                                    <p className='text-xs text-muted-foreground'>
                                        {t("earn.social.rewardLabel")}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button
                            size='sm'
                            className={`ml-auto gap-2 transition-all duration-300 ${
                                claimed
                                    ? "bg-transparent text-white/50"
                                    : "bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-orange-500/20 text-yellow-200 hover:from-yellow-400/30 hover:via-amber-500/30 hover:to-orange-500/30 border border-yellow-500/40"
                            }`}
                            disabled={claiming === platform.id || loadingClaims}
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
