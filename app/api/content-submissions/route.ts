import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import type { PostgrestError } from "@supabase/supabase-js"

const USER_AGENT =
    "AskingFateOwnershipBot/1.0 (+https://askingfate.com/ownership-policy)"
const VERIFY_TIMEOUT_MS = 10_000
const MAX_CONTENT_LENGTH = 300_000
const TEXT_SNIPPET_LENGTH = 600

type VerificationMethod =
    | "public_code"
    | "meta_tag"
    | "profile_bio"
    | "manual_proof"

type VerificationStatus = "pending" | "verified" | "failed" | "manual_review"

const ALLOWED_METHODS: Set<VerificationMethod> = new Set([
    "public_code",
    "meta_tag",
    "profile_bio",
    "manual_proof",
])

type VerificationResult = {
    checkedAt: string
    verificationCode: string
    method: VerificationMethod
    httpStatus?: number
    contentType?: string
    truncated?: boolean
    autoCheck?: boolean
    found?: boolean
    reason?: string
    preview?: string
    fetchError?: string
    evidenceUrl?: string
    [key: string]: string | number | boolean | undefined
}

interface VerificationOutcome {
    status: Exclude<VerificationStatus, "pending">
    autoVerified: boolean
    result: VerificationResult
}

function generateVerificationToken() {
    const randomPart = randomUUID().replace(/-/g, "").slice(0, 8).toLowerCase()
    return `askingfate-${randomPart}`
}

function sanitizeUrl(value: string, field: string) {
    try {
        const url = new URL(value)
        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("Only HTTP(S) URLs are supported")
        }
        return url.toString()
    } catch {
        throw new Error(`Invalid ${field}: must be a valid URL`)
    }
}

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function getAuthenticatedUser(request: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json(
            { error: "Supabase admin client not configured" },
            { status: 503 }
        )
    }

    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice("Bearer ".length)
    try {
        const {
            data: { user },
            error,
        } = await supabaseAdmin.auth.getUser(token)
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        return user
    } catch (error) {
        console.error("Failed to fetch user:", error)
        return NextResponse.json(
            { error: "Failed to verify session" },
            { status: 500 }
        )
    }
}

async function getOrCreateUserVerificationToken(userId: string) {
    const fetchExisting = await supabaseAdmin!
        .from("content_submission_tokens")
        .select("token")
        .eq("user_id", userId)
        .single()

    if (fetchExisting.data?.token) {
        return fetchExisting.data.token as string
    }

    if (fetchExisting.error && fetchExisting.error.code !== "PGRST116") {
        throw fetchExisting.error
    }

    let attempts = 0
    while (attempts < 5) {
        const token = generateVerificationToken()
        const insertResult = await supabaseAdmin!
            .from("content_submission_tokens")
            .insert({ user_id: userId, token })
            .select("token")
            .single()

        const insertError = insertResult.error as PostgrestError | null
        if (!insertError && insertResult.data?.token) {
            return insertResult.data.token as string
        }

        if (insertError?.code === "23505") {
            attempts += 1
            continue
        }

        if (insertError) {
            throw insertError
        }
    }

    throw new Error("Failed to generate unique verification token")
}

async function verifyOwnership(
    url: string,
    verificationCode: string,
    method: VerificationMethod
): Promise<VerificationOutcome> {
    const result: VerificationResult = {
        checkedAt: new Date().toISOString(),
        verificationCode,
        method,
    }

    if (method === "manual_proof") {
        return {
            status: "manual_review" as const,
            autoVerified: false,
            result: {
                ...result,
                autoCheck: false,
                reason: "Manual proof requires reviewer confirmation",
            },
        }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS)

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent": USER_AGENT,
                Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            redirect: "follow",
            signal: controller.signal,
        })

        result.httpStatus = response.status
        const contentType = response.headers.get("content-type") ?? ""
        result.contentType = contentType

        const lowerContentType = contentType.toLowerCase()
        const isTextContent =
            lowerContentType.includes("text/") ||
            lowerContentType.includes("json") ||
            lowerContentType.includes("xml") ||
            lowerContentType.includes("javascript")

        if (!isTextContent) {
            return {
                status: "manual_review" as const,
                autoVerified: false,
                result: {
                    ...result,
                    autoCheck: false,
                    reason: "Content is not text-based; manual review required",
                },
            }
        }

        const rawText = await response.text()
        const truncated = rawText.length > MAX_CONTENT_LENGTH
        const snippet = truncated
            ? rawText.slice(0, MAX_CONTENT_LENGTH)
            : rawText
        result.truncated = truncated

        let isVerified = false
        if (method === "meta_tag") {
            const metaRegex = new RegExp(
                `<meta[^>]+name=["']asking-fate-verification["'][^>]*content=["']${escapeRegex(
                    verificationCode
                )}["']`,
                "i"
            )
            isVerified = metaRegex.test(snippet)
        } else {
            isVerified = snippet.includes(verificationCode)
        }

        if (isVerified) {
            return {
                status: "verified" as const,
                autoVerified: true,
                result: {
                    ...result,
                    autoCheck: true,
                    found: true,
                },
            }
        }

        const preview = snippet
            .replace(/\s+/g, " ")
            .slice(0, TEXT_SNIPPET_LENGTH)

        return {
            status: "failed" as const,
            autoVerified: false,
            result: {
                ...result,
                autoCheck: true,
                found: false,
                preview,
                reason: "Verification code was not found in the retrieved content",
            },
        }
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Unknown verification error"
        return {
            status: "manual_review" as const,
            autoVerified: false,
            result: {
                ...result,
                autoCheck: false,
                reason: "Content could not be fetched automatically",
                fetchError: message,
            },
        }
    } finally {
        clearTimeout(timeout)
    }
}

export async function GET(request: NextRequest) {
    const user = await getAuthenticatedUser(request)
    if (user instanceof NextResponse) {
        return user
    }

    try {
        const verificationToken = await getOrCreateUserVerificationToken(user.id)
        const { data, error } = await supabaseAdmin!
            .from("content_submissions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("Failed to load submissions:", error)
            return NextResponse.json(
                { error: "Failed to load submissions" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            verificationToken,
            submissions: data ?? [],
        })
    } catch (error) {
        console.error("GET /content-submissions error:", error)
        return NextResponse.json(
            { error: "Failed to load submissions" },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    const user = await getAuthenticatedUser(request)
    if (user instanceof NextResponse) {
        return user
    }

    let verificationToken: string
    try {
        verificationToken = await getOrCreateUserVerificationToken(user.id)
    } catch (error) {
        console.error("Failed to prepare verification token:", error)
        return NextResponse.json(
            { error: "Failed to create verification token" },
            { status: 500 }
        )
    }

    let payload: Record<string, unknown>
    try {
        payload = await request.json()
    } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const url = typeof payload.url === "string" ? payload.url.trim() : ""
    const title =
        typeof payload.title === "string" && payload.title.trim().length > 0
            ? payload.title.trim()
            : null
    const platform =
        typeof payload.platform === "string" && payload.platform.trim().length > 0
            ? payload.platform.trim()
            : null
    const notes =
        typeof payload.notes === "string" && payload.notes.trim().length > 0
            ? payload.notes.trim()
            : null
    const verificationCodePayload =
        typeof payload.verificationCode === "string"
            ? payload.verificationCode.trim()
            : ""
    const verificationMethodInput =
        typeof payload.verificationMethod === "string"
            ? (payload.verificationMethod.trim() as VerificationMethod)
            : "public_code"
    const evidenceUrl =
        typeof payload.evidenceUrl === "string" &&
        payload.evidenceUrl.trim().length > 0
            ? payload.evidenceUrl.trim()
            : null

    if (!url) {
        return NextResponse.json({ error: "Content URL is required" }, { status: 400 })
    }

    if (verificationCodePayload && verificationCodePayload !== verificationToken) {
        return NextResponse.json(
            {
                error:
                    "Verification code does not match your assigned token. Please use the code displayed on the submission page.",
            },
            { status: 400 }
        )
    }

    const verificationCode = verificationToken

    if (!verificationCode) {
        return NextResponse.json(
            { error: "Verification code is required" },
            { status: 400 }
        )
    }

    const verificationMethod = ALLOWED_METHODS.has(verificationMethodInput)
        ? verificationMethodInput
        : "public_code"

    if (verificationMethod === "manual_proof" && !evidenceUrl) {
        return NextResponse.json(
            {
                error:
                    "Manual proof submissions require an evidence URL for reviewer reference",
            },
            { status: 400 }
        )
    }

    let normalizedUrl: string
    let normalizedEvidenceUrl: string | null = null
    try {
        normalizedUrl = sanitizeUrl(url, "content URL")
        if (evidenceUrl) {
            normalizedEvidenceUrl = sanitizeUrl(evidenceUrl, "evidence URL")
        }
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Invalid URL" },
            { status: 400 }
        )
    }

    const verificationOutcome = await verifyOwnership(
        normalizedUrl,
        verificationCode,
        verificationMethod
    )

    if (normalizedEvidenceUrl) {
        verificationOutcome.result.evidenceUrl = normalizedEvidenceUrl
    }

    const nowIso = new Date().toISOString()

    try {
        const { data, error } = await supabaseAdmin!
            .from("content_submissions")
            .insert({
                user_id: user.id,
                url: normalizedUrl,
                title,
                platform,
                notes,
                verification_code: verificationCode,
                verification_method: verificationMethod,
                verification_status: verificationOutcome.status,
                verification_result: verificationOutcome.result,
                auto_verified: verificationOutcome.autoVerified,
                verified_at:
                    verificationOutcome.status === "verified" ? nowIso : null,
                created_at: nowIso,
                updated_at: nowIso,
            })
            .select("*")
            .single()

        if (error) {
            console.error("Failed to store submission:", error)
            return NextResponse.json(
                { error: "Failed to store submission" },
                { status: 500 }
            )
        }

        return NextResponse.json(
            {
                submission: data,
                message:
                    verificationOutcome.status === "verified"
                        ? "Ownership verified successfully"
                        : verificationOutcome.status === "failed"
                          ? "Submission received but verification failed. Please double-check the verification code."
                          : "Submission received and queued for manual review.",
            },
            { status: 201 }
        )
    } catch (error) {
        console.error("POST /content-submissions error:", error)
        return NextResponse.json(
            { error: "Failed to store submission" },
            { status: 500 }
        )
    }
}
