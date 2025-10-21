"use client"

import { usePathname } from "next/navigation"
import NormalFooter from "./normal-footer"

export default function Footer() {
    const pathname = usePathname()

    // Only show footer on the root path
    if (pathname !== "/") {
        return <NormalFooter />
    }

    return null
}
