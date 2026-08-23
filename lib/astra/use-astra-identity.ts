"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import {
    ASTRA_MESSAGES_NAMESPACE,
    buildAstraIdentity,
    type AstraIdentity,
} from "@/lib/astra/identity"

/** Client-side accessor for the fortune teller's name / honorific / role. */
export function useAstraIdentity(): AstraIdentity {
    const t = useTranslations(ASTRA_MESSAGES_NAMESPACE)
    return useMemo(() => buildAstraIdentity((key) => t(key)), [t])
}
