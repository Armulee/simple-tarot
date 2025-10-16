"use client"

import { useEffect } from "react"

interface ShareAwardClientProps {
  sharedId: string
  ownerUserId: string | null
  ownerDid: string | null
}

export default function ShareAwardClient({
  sharedId,
  ownerUserId,
  ownerDid,
}: ShareAwardClientProps) {
  useEffect(() => {
    if (!sharedId) return
    const key = `reading:${sharedId}:awarded`

    const broadcast = () => {
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("earned-stars-updated"))
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("tarot-earned-stars")
            bc.postMessage({ sharedId, ts: Date.now() })
            bc.close()
          }
        }
      } catch {}
    }

    if (typeof window !== "undefined") {
      if (sessionStorage.getItem(key)) {
        // Already awarded in this tab/session; still broadcast to notify listeners
        broadcast()
        return
      }
    }

    const run = async () => {
      try {
        const res = await fetch("/api/stars/share-award", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: null,
            owner_user_id: ownerUserId,
            owner_did: ownerDid,
            shared_id: sharedId,
          }),
        })
        if (res.ok) {
          try {
            if (typeof window !== "undefined") {
              sessionStorage.setItem(key, "1")
            }
          } catch {}
          broadcast()
        }
      } catch {
        // ignore network errors; server-side attempt may have succeeded
      }
    }

    run()
  }, [sharedId, ownerUserId, ownerDid])

  return null
}
