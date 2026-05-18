const USER_SIDEBAR_ROUTE_PREFIXES = [
    "/reading/history",
    "/calendar",
    "/birth-chart",
    "/profile",
    "/account",
    "/billing",
    "/settings",
] as const

/** True when the path matches any route shown under the sidebar User submenu. */
export function isUserSidebarSectionActive(pathname: string): boolean {
    return USER_SIDEBAR_ROUTE_PREFIXES.some(
        (h) => pathname === h || pathname.startsWith(`${h}/`),
    )
}
