import { getUserFromBearer } from "@/lib/server/auth"
import { readAndVerifyDid } from "@/lib/server/did"

/**
 * Who the fortune teller is remembering.
 *
 * Signed-in visitors are keyed by their account so memory follows them across
 * devices; anonymous visitors by the signed DID cookie. Never by anything the
 * client can hand us.
 */
export type AstraSubject = {
    type: "user" | "device"
    id: string
}

export async function resolveAstraSubject(
    req: Request,
): Promise<AstraSubject | null> {
    const user = await getUserFromBearer(req)
    if (user) return { type: "user", id: user.id }
    const did = await readAndVerifyDid()
    return did ? { type: "device", id: did } : null
}
