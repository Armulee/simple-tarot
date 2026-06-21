/**
 * Server-only utilities for encrypting the per-user privacy alias vault.
 *
 * Each row in `public.privacy_aliases` stores ciphertext of the original PII
 * (e.g. "Jessica") together with a 12-byte IV and 16-byte GCM auth tag. The
 * encryption key is derived per-user via HKDF-SHA256 from a single master
 * secret in the environment, so the server can decrypt at any time but a
 * compromised ciphertext for one user is not directly usable against another
 * user's ciphertext.
 *
 * This module MUST never be imported from client code.
 */
import {
    createCipheriv,
    createDecipheriv,
    hkdfSync,
    randomBytes,
} from "node:crypto"

const KEY_LENGTH = 32
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const HKDF_INFO_V1 = "askingfate-pii-v1"

let cachedMasterKey: Buffer | null = null

function decodeMasterKey(raw: string): Buffer {
    const cleaned = raw.trim().replace(/^['"]|['"]$/g, "")
    // `openssl rand -hex 32` → 64 hex chars (common in .env files)
    if (/^[0-9a-fA-F]{64}$/.test(cleaned)) {
        return Buffer.from(cleaned, "hex")
    }
    let buf: Buffer
    try {
        buf = Buffer.from(cleaned, "base64")
    } catch {
        throw new Error(
            "PRIVACY_ENCRYPTION_MASTER_KEY must be base64 or 64-char hex (32 bytes)",
        )
    }
    if (buf.length !== KEY_LENGTH) {
        throw new Error(
            `PRIVACY_ENCRYPTION_MASTER_KEY must decode to ${KEY_LENGTH} bytes (got ${buf.length}). Generate with: openssl rand -base64 32  OR  openssl rand -hex 32`,
        )
    }
    return buf
}

export function getMasterKey(): Buffer {
    if (cachedMasterKey) return cachedMasterKey
    const raw = process.env.PRIVACY_ENCRYPTION_MASTER_KEY
    if (!raw) {
        throw new Error(
            "PRIVACY_ENCRYPTION_MASTER_KEY is not set. Generate one with: openssl rand -base64 32",
        )
    }
    cachedMasterKey = decodeMasterKey(raw)
    return cachedMasterKey
}

export function isMasterKeyConfigured(): boolean {
    try {
        getMasterKey()
        return true
    } catch {
        return false
    }
}

function hkdfInfoForVersion(keyVersion: number): string {
    if (keyVersion === 1) return HKDF_INFO_V1
    return `askingfate-pii-v${keyVersion}`
}

export function deriveUserKey(userId: string, keyVersion = 1): Buffer {
    if (typeof userId !== "string" || !userId) {
        throw new Error("deriveUserKey requires a non-empty userId")
    }
    const master = getMasterKey()
    const salt = Buffer.from(userId, "utf8")
    const info = Buffer.from(hkdfInfoForVersion(keyVersion), "utf8")
    const derived = hkdfSync("sha256", master, salt, info, KEY_LENGTH)
    return Buffer.from(derived)
}

export type EncryptedAlias = {
    ciphertext: Buffer
    iv: Buffer
    authTag: Buffer
    keyVersion: number
}

export function encryptAlias(
    plaintext: string,
    userId: string,
): EncryptedAlias {
    if (typeof plaintext !== "string") {
        throw new Error("encryptAlias requires a string plaintext")
    }
    const keyVersion = 1
    const key = deriveUserKey(userId, keyVersion)
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv("aes-256-gcm", key, iv)
    const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ])
    const authTag = cipher.getAuthTag()
    return { ciphertext, iv, authTag, keyVersion }
}

export function decryptAlias(
    payload: { ciphertext: Buffer; iv: Buffer; authTag: Buffer },
    userId: string,
    keyVersion = 1,
): string {
    const { ciphertext, iv, authTag } = payload
    if (iv.length !== IV_LENGTH) {
        throw new Error(`decryptAlias: iv must be ${IV_LENGTH} bytes`)
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error(
            `decryptAlias: authTag must be ${AUTH_TAG_LENGTH} bytes`,
        )
    }
    const key = deriveUserKey(userId, keyVersion)
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)
    const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ])
    return plaintext.toString("utf8")
}

/**
 * Encode a Buffer for the `bytea` columns when going through PostgREST. The
 * Supabase JS client serialises JSON, so we send hex-prefixed `\\x…` strings
 * which Postgres parses into `bytea` on insert.
 */
export function bufferToBytea(buf: Buffer): string {
    return `\\x${buf.toString("hex")}`
}

/**
 * Inverse of {@link bufferToBytea}. PostgREST returns `bytea` columns as either
 * `\\x…` hex strings or base64 depending on configuration; handle both.
 */
export function byteaToBuffer(value: unknown): Buffer {
    if (Buffer.isBuffer(value)) return value
    if (value instanceof Uint8Array) return Buffer.from(value)
    if (typeof value !== "string") {
        throw new Error("byteaToBuffer: expected string, Buffer, or Uint8Array")
    }
    if (value.startsWith("\\x") || value.startsWith("\\X")) {
        return Buffer.from(value.slice(2), "hex")
    }
    return Buffer.from(value, "base64")
}
