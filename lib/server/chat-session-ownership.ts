export type ChatSessionOwnershipRecord = {
    owner_user_id: string | null
    did: string | null
}

export type ChatSessionRequester = {
    userId?: string | null
    did?: string | null
}

export function canAccessChatSession({
    session,
    requester,
}: {
    session: ChatSessionOwnershipRecord
    requester: ChatSessionRequester
}) {
    const requesterUserId = requester.userId?.trim() || null
    const requesterDid = requester.did?.trim() || null

    if (!requesterUserId && !requesterDid) {
        return false
    }

    return (
        (!!requesterUserId && session.owner_user_id === requesterUserId) ||
        (!!requesterDid && session.did === requesterDid)
    )
}
