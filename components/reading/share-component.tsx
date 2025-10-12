"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FaShareNodes,
  FaFacebook,
  FaTwitter,
  FaLine,
  FaWhatsapp,
  FaTelegram,
  FaReddit,
  FaCheck,
  FaCopy,
} from "react-icons/fa6"
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
  const [open, setOpen] = useState(false)
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
    <>
      <Button
        type='button'
        onClick={() => setOpen(true)}
        className={buttonClassName}
      >
        <span className='relative z-10 flex items-center gap-2'>
          <FaShareNodes className='w-4 h-4' />
          <span className='text-sm font-medium'>{buttonLabel}</span>
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='text-sm text-muted-foreground'>
              Choose a platform to share or copy the link.
            </div>
            <div className='grid grid-cols-3 gap-3'>
              {[
                {
                  id: "facebook",
                  label: "Facebook",
                  icon: <FaFacebook className='w-5 h-5' />,
                  href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
                },
                {
                  id: "twitter",
                  label: "Twitter/X",
                  icon: <FaTwitter className='w-5 h-5' />,
                  href: (u: string, t?: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}${t ? `&text=${encodeURIComponent(t)}` : ""}`,
                },
                {
                  id: "line",
                  label: "LINE",
                  icon: <FaLine className='w-5 h-5' />,
                  href: (u: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(u)}`,
                },
                {
                  id: "whatsapp",
                  label: "WhatsApp",
                  icon: <FaWhatsapp className='w-5 h-5' />,
                  href: (u: string) => `https://api.whatsapp.com/send?text=${encodeURIComponent(u)}`,
                },
                {
                  id: "telegram",
                  label: "Telegram",
                  icon: <FaTelegram className='w-5 h-5' />,
                  href: (u: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}`,
                },
                {
                  id: "reddit",
                  label: "Reddit",
                  icon: <FaReddit className='w-5 h-5' />,
                  href: (u: string, t?: string) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}${t ? `&title=${encodeURIComponent(t)}` : ""}`,
                },
              ].map((p) => (
                <button
                  key={p.id}
                  type='button'
                  onClick={async () => {
                    const link = await ensureShareLink()
                    if (!link) return
                    const text = question ? `"${question}" — AI tarot interpretation` : undefined
                    window.open(p.href(link, text), "_blank", "noopener,noreferrer")
                    await maybeAwardShareStar()
                  }}
                  className='px-3 py-2 rounded-md border border-white/10 hover:bg-white/5 text-center'
                >
                  <div className='flex items-center justify-center'>{p.icon}</div>
                  <div className='text-[10px] mt-1 text-muted-foreground'>{p.label}</div>
                </button>
              ))}
            </div>
            <div className='flex gap-2'>
              <input
                className='flex-1 bg-transparent border rounded px-3 py-2 text-sm'
                readOnly
                value={typeof window !== "undefined" ? window.location.href : ""}
              />
              <Button
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
              >
                {copied ? (
                  <span className='inline-flex items-center gap-2'><FaCheck className='w-4 h-4' /> Copied</span>
                ) : (
                  <span className='inline-flex items-center gap-2'><FaCopy className='w-4 h-4' /> Copy Link</span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
