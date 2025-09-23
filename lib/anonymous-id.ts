const COOKIE_NAME = "anon_id"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

type CookieReader = {
    cookies: { get: (name: string) => { value?: string } | undefined }
}

type CookieWriter = {
	cookies: { set: (name: string, value: string, options?: CookieSetOptions) => void }
}

interface CookieSetOptions {
	httpOnly?: boolean
	sameSite?: "lax" | "strict" | "none"
	secure?: boolean
	path?: string
	domain?: string
	maxAge?: number
	expires?: Date
}

export function getOrCreateAnonymousId(req: CookieReader): { anonymousId: string; isNew: boolean } {
	const existing = req.cookies.get(COOKIE_NAME)?.value
	if (existing) {
		return { anonymousId: existing, isNew: false }
	}
	const id = typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: generateFallbackId()
	return { anonymousId: id, isNew: true }
}

export function attachAnonymousIdCookie(res: CookieWriter, anonymousId: string) {
	res.cookies.set(COOKIE_NAME, anonymousId, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: ONE_YEAR_SECONDS,
	})
}

function generateFallbackId(): string {
	const random = Math.random().toString(36).slice(2)
	const timestamp = Date.now().toString(36)
	return `a_${timestamp}_${random}`
}

