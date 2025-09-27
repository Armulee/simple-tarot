// Utility to provide a stable anonymous device identifier stored in a cookie

import { hasCookieConsent } from "@/components/cookie-consent"

const COOKIE_NAME = "anon_device_id"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2 // 2 years

function generateId(): string {
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
  return template.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\/+^])/g, "\\$1") + "=([^;]*)"))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return
  const sameSite = "Lax"
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=${sameSite}${secure}`
}

export function getAnonDeviceId(): string | null {
  if (typeof window === "undefined") return null
  // Require explicit consent before creating/reading identifier cookies
  if (!hasCookieConsent()) return null

  // Cookie-only
  const fromCookie = readCookie(COOKIE_NAME)
  if (fromCookie && fromCookie.length > 0) {
    return fromCookie
  }

  const next = generateId()
  try { writeCookie(COOKIE_NAME, next, COOKIE_MAX_AGE) } catch {}
  return next
}

