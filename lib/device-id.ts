// Utility to provide a stable anonymous device identifier stored on the client

const STORAGE_KEY = "anon-device-id-v1"
const COOKIE_NAME = "anon_device_id"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2 // 2 years

function generateId(): string {
  // Simple RFC4122-ish random identifier
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

  // Prefer cookie (works across subpaths and SSR requests)
  const fromCookie = readCookie(COOKIE_NAME)
  if (fromCookie && fromCookie.length > 0) {
    // Backfill localStorage for legacy reads if present
    try { window.localStorage.setItem(STORAGE_KEY, fromCookie) } catch {}
    return fromCookie
  }

  // Fallback to localStorage then set cookie
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing && existing.length > 0) {
      writeCookie(COOKIE_NAME, existing, COOKIE_MAX_AGE)
      return existing
    }
  } catch {}

  const next = generateId()
  try { window.localStorage.setItem(STORAGE_KEY, next) } catch {}
  try { writeCookie(COOKIE_NAME, next, COOKIE_MAX_AGE) } catch {}
  return next
}

