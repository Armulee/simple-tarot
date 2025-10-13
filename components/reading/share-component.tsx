"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"
import {
  FaShareNodes,
  FaFacebook,
  FaXTwitter,
  FaLine,
  FaWhatsapp,
  FaTelegram,
  FaReddit,
  FaCheck,
  FaCopy,
  FaFacebookMessenger,
} from "react-icons/fa6"
import {
  SiInstagram,
  SiThreads,
  SiTiktok,
  SiSnapchat,
  SiDiscord,
  SiPinterest,
  SiTumblr,
  SiWechat,
} from "react-icons/si"
import { useAuth } from "@/hooks/use-auth"
import { useStars } from "@/contexts/stars-context"

type ShareComponentProps = {
  question: string | null
  cards: string[]
  interpretation: string | null
  buttonClassName?: string
  buttonLabel?: string
}

export default function ShareComponent({
  question,
  cards,
  interpretation,
  buttonClassName,
  buttonLabel = "Share",
}: ShareComponentProps) {
  const [copied, setCopied] = useState(false)
  const { user } = useAuth()
  const { addStars, stars, setStarsBalance } = useStars()

  const SHARE_DAILY_LIMIT = 3
  const SHARE_COOLDOWN_MS = 60 * 60 * 1000

  const getBangkokDateKey = useCallback((): string => {
    const offsetMs = 7 * 60 * 60 * 1000
    const bkk = new Date(Date.now() + offsetMs)
    const y = bkk.getUTCFullYear()
    const m = String(bkk.getUTCMonth() + 1).padStart(2, "0")
    const d = String(bkk.getUTCDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }, [])

  type ShareRewardState = {
    dateKey: string
    count: number
    lastRewardedAtMs: number | null
  }

  const loadShareRewardState = useCallback((): ShareRewardState => {
    try {
      const raw = localStorage.getItem("share-reward-v1")
      if (!raw) return { dateKey: getBangkokDateKey(), count: 0, lastRewardedAtMs: null }
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== "object" || parsed === null)
        return { dateKey: getBangkokDateKey(), count: 0, lastRewardedAtMs: null }
      const obj = parsed as Partial<Record<keyof ShareRewardState, unknown>>
      const dateKey =
        typeof obj.dateKey === "string" && obj.dateKey ? obj.dateKey : getBangkokDateKey()
      const count = typeof obj.count === "number" && Number.isFinite(obj.count)
        ? Math.max(0, Math.floor(obj.count))
        : 0
      const lastRewardedAtMs =
        typeof obj.lastRewardedAtMs === "number" && Number.isFinite(obj.lastRewardedAtMs)
          ? obj.lastRewardedAtMs
          : null
      return { dateKey, count, lastRewardedAtMs }
    } catch {
      return { dateKey: getBangkokDateKey(), count: 0, lastRewardedAtMs: null }
    }
  }, [getBangkokDateKey])

  const saveShareRewardState = (state: ShareRewardState) => {
    try {
      localStorage.setItem("share-reward-v1", JSON.stringify(state))
    } catch {}
  }

  const normalize = useCallback(
    (state: ShareRewardState): ShareRewardState => {
      const today = getBangkokDateKey()
      if (state.dateKey !== today) {
        return { dateKey: today, count: 0, lastRewardedAtMs: state.lastRewardedAtMs }
      }
      return state
    },
    [getBangkokDateKey]
  )

  const maybeAwardShareStar = useCallback(async () => {
    const current = normalize(loadShareRewardState())
    const now = Date.now()
    const used = Math.max(0, Math.min(SHARE_DAILY_LIMIT, current.count))
    const inCooldown =
      typeof current.lastRewardedAtMs === "number" && now - current.lastRewardedAtMs < SHARE_COOLDOWN_MS
    if (used >= SHARE_DAILY_LIMIT || inCooldown) return

    try {
      if (user?.id) {
        const prev = typeof stars === "number" ? stars : 0
        setStarsBalance(prev + 1)
      } else {
        addStars(1)
      }
    } catch {}

    const next: ShareRewardState = {
      dateKey: current.dateKey,
      count: used + 1,
      lastRewardedAtMs: now,
    }
    saveShareRewardState(next)
  }, [addStars, setStarsBalance, stars, user, loadShareRewardState, normalize])

  const ensureShareLink = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/interpretations/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          cards,
          interpretation,
          user_id: user?.id ?? null,
        }),
      })
      if (!res.ok) return null
      const { id } = await res.json()
      const origin = typeof window !== "undefined" ? window.location.origin : "https://dooduang.ai"
      return `${origin}/tarot/${id}`
    } catch {
      return null
    }
  }, [question, cards, interpretation, user?.id])

  return (
    <div className='w-full'>
      <div className='text-sm text-muted-foreground mb-2'>Share your reading</div>
      <Swiper
        modules={[FreeMode]}
        freeMode
        slidesPerView={'auto'}
        spaceBetween={12}
        className='py-1'
      >
              {[
                {
                  id: "messenger",
                  label: "Messenger",
                  icon: <FaFacebookMessenger className='w-5 h-5 text-white' />,
                  bg: "#0084FF",
                  href: (u: string) => `https://www.messenger.com/t/?link=${encodeURIComponent(u)}`,
                },
                {
                  id: "facebook",
                  label: "Facebook",
                  icon: <FaFacebook className='w-5 h-5 text-white' />,
                  bg: "#1877F2",
                  href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
                },
                {
                  id: "instagram",
                  label: "Instagram",
                  icon: <SiInstagram className='w-5 h-5 text-white' />,
                  bg: "#E4405F",
                  href: (_u: string) => null, // not supported via web intent
                },
                {
                  id: "threads",
                  label: "Threads",
                  icon: <SiThreads className='w-5 h-5 text-white' />,
                  bg: "#000000",
                  href: (u: string, t?: string) => `https://www.threads.net/intent/post?url=${encodeURIComponent(u)}${t ? `&text=${encodeURIComponent(t)}` : ""}`,
                },
                {
                  id: "tiktok",
                  label: "TikTok",
                  icon: <SiTiktok className='w-5 h-5 text-white' />,
                  bg: "#000000",
                  href: (_u: string) => null, // not supported via web intent
                },
                {
                  id: "x",
                  label: "X",
                  icon: <FaXTwitter className='w-5 h-5 text-white' />,
                  bg: "#000000",
                  href: (u: string, t?: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}${t ? `&text=${encodeURIComponent(t)}` : ""}`,
                },
                {
                  id: "line",
                  label: "LINE",
                  icon: <FaLine className='w-5 h-5 text-white' />,
                  bg: "#00C300",
                  href: (u: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(u)}`,
                },
                {
                  id: "whatsapp",
                  label: "WhatsApp",
                  icon: <FaWhatsapp className='w-5 h-5 text-white' />,
                  bg: "#25D366",
                  href: (u: string) => `https://api.whatsapp.com/send?text=${encodeURIComponent(u)}`,
                },
                {
                  id: "telegram",
                  label: "Telegram",
                  icon: <FaTelegram className='w-5 h-5 text-white' />,
                  bg: "#24A1DE",
                  href: (u: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}`,
                },
                {
                  id: "snapchat",
                  label: "Snapchat",
                  icon: <SiSnapchat className='w-5 h-5 text-black' />,
                  bg: "#FFFC00",
                  href: (_u: string) => null, // limited web support
                },
                {
                  id: "discord",
                  label: "Discord",
                  icon: <SiDiscord className='w-5 h-5 text-white' />,
                  bg: "#5865F2",
                  href: (_u: string) => null, // no public share intent
                },
                {
                  id: "pinterest",
                  label: "Pinterest",
                  icon: <SiPinterest className='w-5 h-5 text-white' />,
                  bg: "#E60023",
                  href: (u: string, t?: string) => `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}${t ? `&description=${encodeURIComponent(t)}` : ""}`,
                },
                {
                  id: "tumblr",
                  label: "Tumblr",
                  icon: <SiTumblr className='w-5 h-5 text-white' />,
                  bg: "#36465D",
                  href: (u: string, t?: string) => `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(u)}${t ? `&caption=${encodeURIComponent(t)}` : ""}`,
                },
                {
                  id: "wechat",
                  label: "WeChat",
                  icon: <SiWechat className='w-5 h-5 text-white' />,
                  bg: "#07C160",
                  href: (_u: string) => null, // requires WeChat JS SDK in WeChat WebView
                },
                {
                  id: "reddit",
                  label: "Reddit",
                  icon: <FaReddit className='w-5 h-5 text-white' />,
                  bg: "#FF4500",
                  href: (u: string, t?: string) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}${t ? `&title=${encodeURIComponent(t)}` : ""}`,
                },
              ].map((p) => (
                <SwiperSlide key={p.id} style={{ width: 'auto' }}>
                  <button
                    type='button'
                    onClick={async () => {
                      const link = await ensureShareLink()
                      if (!link) return
                      const text = question ? `"${question}" — AI tarot interpretation` : undefined
                      const href = p.href(link, text)
                      if (href) {
                        window.open(href, "_blank", "noopener,noreferrer")
                      } else {
                        try {
                          await navigator.clipboard.writeText(link)
                          setCopied(true)
                          window.setTimeout(() => setCopied(false), 1500)
                          // Optionally notify user
                        } catch {}
                      }
                      await maybeAwardShareStar()
                    }}
                    className='px-2 py-2 rounded-md text-center flex-shrink-0'
                  >
                    <div
                      className='flex items-center justify-center h-10 w-10 rounded-full'
                      style={{ backgroundColor: (p as any).bg || '#444' }}
                    >
                      {p.icon}
                    </div>
                    <div className='text-[10px] mt-1 text-muted-foreground hidden sm:block'>{p.label}</div>
                  </button>
                </SwiperSlide>
              ))}
      </Swiper>
      <div className='mt-3'>
        <div className='flex items-center gap-2'>
              <input
                className='flex-1 bg-transparent border rounded px-3 py-2 text-sm'
                readOnly
                value={typeof window !== "undefined" ? window.location.href : ""}
              />
          <button
            type='button'
            onClick={async () => {
              try {
                const link = await ensureShareLink()
                if (!link) return
                await navigator.clipboard.writeText(link)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
                await maybeAwardShareStar()
              } catch {}
            }}
            className='p-2 rounded-md border border-white/10 hover:bg-white/5'
            aria-label='Copy link'
            title='Copy link'
          >
            {copied ? <FaCheck className='w-4 h-4' /> : <FaCopy className='w-4 h-4' />}
          </button>
        </div>
        <div className='flex gap-2 mt-2'>
          <Button
            variant='outline'
            onClick={async () => {
              try {
                const text = interpretation ? String(interpretation) : ""
                if (!text) return
                await navigator.clipboard.writeText(text)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              } catch {}
            }}
          >Copy Result</Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant='outline' className='px-3 py-2'>Download</Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className='space-y-2'>
                <div className='text-sm font-medium'>Download as</div>
                <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/share-image", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                question,
                                cards,
                                interpretation,
                                width: 1080,
                                height: 1350,
                              }),
                            })
                            const blob = await res.blob()
                            const ts = new Date().toISOString().replace(/[:.]/g, "-")
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement("a")
                            a.href = url
                            a.download = `reading-${ts}.png`
                            document.body.appendChild(a)
                            a.click()
                            a.remove()
                            URL.revokeObjectURL(url)
                          } catch {}
                        }}
                      >Image</Button>
                      <Button
                        variant='outline'
                        onClick={async () => {
                          // Placeholder: implement server video render if available
                          alert("Video download is not available yet.")
                        }}
                      >Video</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
