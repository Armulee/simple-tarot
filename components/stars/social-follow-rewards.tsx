"use client"

import { useTranslations } from "next-intl"
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactElement,
} from "react"
import { ExternalLink, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

type LogoProps = React.SVGProps<SVGSVGElement>

const FacebookLogo = (props: LogoProps) => (
    <svg
        viewBox='0 0 24 24'
        aria-hidden='true'
        className='w-7 h-7 text-[#1877F2]'
        {...props}
    >
        <path
            fill='currentColor'
            d='M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.988h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.095 0 2.238.196 2.238.196v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.128 22 16.99 22 12Z'
        />
    </svg>
)

const InstagramLogo = (props: LogoProps) => (
    <svg
        viewBox='0 0 24 24'
        aria-hidden='true'
        className='w-7 h-7 text-[#F56040]'
        {...props}
    >
        <path
            fill='currentColor'
            d='M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7Zm0 2h10c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3Zm9.5 1.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5ZM12 7.5A4.5 4.5 0 1 0 16.5 12 4.505 4.505 0 0 0 12 7.5Zm0 2a2.5 2.5 0 1 1-2.5 2.5A2.503 2.503 0 0 1 12 9.5Z'
        />
    </svg>
)

const ThreadsLogo = (props: LogoProps) => (
    <svg
        viewBox='0 0 24 24'
        aria-hidden='true'
        className='w-7 h-7 text-white'
        {...props}
    >
        <path
            fill='currentColor'
            d='M12.002 2C7.03 2 2 5.532 2 12.292 2 18.15 6.125 22 11.176 22c4.21 0 7.384-2.317 8.438-6.006l-2.725-.75c-.68 2.424-2.65 3.77-5.443 3.77-3.315 0-5.689-2.315-5.689-5.841 0-3.756 2.64-5.91 5.696-5.91 2.77 0 4.592 1.516 5.182 3.62l-4.014.002v2.482h6.7c.022-.262.03-.53.03-.804C19.35 5.583 15.63 2 12.002 2Z'
        />
    </svg>
)

const TiktokLogo = (props: LogoProps) => (
    <svg
        viewBox='0 0 24 24'
        aria-hidden='true'
        className='w-7 h-7 text-[#25F4EE]'
        {...props}
    >
        <path
            fill='currentColor'
            d='M21 8.25c-1.77-.02-3.583-.72-4.867-2.01A6.112 6.112 0 0 1 14.75 2h-3v13.156a2.308 2.308 0 0 1-4.23 1.183 2.307 2.307 0 0 1 2.807-3.465V8.8a5.03 5.03 0 0 0-6.07 3.497 5.03 5.03 0 0 0 8.285 4.86V22h2.75v-7.089a9.07 9.07 0 0 0 4.708 1.336V13.5a5.61 5.61 0 0 1-3-1.015V9.19a8.2 8.2 0 0 0 3 1.06V8.25Z'
        />
    </svg>
)

const TwitterLogo = (props: LogoProps) => (
    <svg
        viewBox='0 0 24 24'
        aria-hidden='true'
        className='w-7 h-7 text-white'
        {...props}
    >
        <path
            fill='currentColor'
            d='M19.633 7.997c.013.18.013.36.013.54 0 5.507-4.195 11.856-11.856 11.856-2.36 0-4.554-.69-6.4-1.874.332.04.651.053.997.053a8.36 8.36 0 0 0 5.18-1.782 4.177 4.177 0 0 1-3.896-2.892c.26.04.522.066.797.066.384 0 .768-.053 1.126-.146a4.17 4.17 0 0 1-3.344-4.096v-.053c.56.312 1.204.5 1.89.526a4.163 4.163 0 0 1-1.857-3.473c0-.768.205-1.47.56-2.082a11.842 11.842 0 0 0 8.595 4.357 4.706 4.706 0 0 1-.105-.955 4.167 4.167 0 0 1 7.214-2.85 8.21 8.21 0 0 0 2.646-1.01 4.158 4.158 0 0 1-1.83 2.297 8.31 8.31 0 0 0 2.398-.64 8.95 8.95 0 0 1-2.09 2.162Z'
        />
    </svg>
)

type SocialPlatformId = "facebook" | "instagram" | "threads" | "tiktok" | "x"

type SocialPlatform = {
    id: SocialPlatformId
    url: string
    Logo: (props: LogoProps) => ReactElement
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
    {
        id: "facebook",
        url: "https://www.facebook.com/share/17kKrNfrSG/?mibextid=wwXIfr",
        Logo: FacebookLogo,
    },
    {
        id: "instagram",
        url: "https://www.instagram.com/askingfate?igsh=MWhuYWNnMmtzNjk5NQ%3D%3D&utm_source=qr",
        Logo: InstagramLogo,
    },
    {
        id: "threads",
        url: "https://www.threads.com/@askingfate?igshid=NTc4MTIwNjQ2YQ==",
        Logo: ThreadsLogo,
    },
    {
        id: "tiktok",
        url: "https://www.tiktok.com/@askingfate?_r=1&_t=ZS-91s6jFCbi9y",
        Logo: TiktokLogo,
    },
    {
        id: "x",
        url: "https://x.com/asking_fate?s=21",
        Logo: TwitterLogo,
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
                const claimed = claimedPlatforms.has(platform.id)
                const Logo = platform.Logo
                return (
                    <div
                        key={platform.id}
                        className='flex flex-wrap items-center gap-4 py-3 border-b border-white/10 last:border-b-0'
                    >
                        <div className='flex items-center gap-3 min-w-[180px]'>
                            <Logo />
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
                            className='ml-auto gap-2'
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
