// Utility to provide a stable anonymous device identifier stored on the client

const STORAGE_KEY = "anon-device-id-v1"

function generateId(): string {
  // Simple RFC4122-ish random identifier
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
  return template.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getAnonDeviceId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing && existing.length > 0) return existing
  } catch {}

  const next = generateId()
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {}
  return next
}

