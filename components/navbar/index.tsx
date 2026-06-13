"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { Menu, LogIn, Check, Plus } from "lucide-react"
import { SidebarSheet } from "./sidebar-sheet"
import { StarPill } from "./star-pill"
import { UserProfile } from "@/components/user-profile"
// Avatar imports removed (unused)
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu"

export function Navbar({ locale }: { locale: string }) {
    const t = useTranslations("Navbar")
    const l = useTranslations("Languages")
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const { user, loading } = useAuth()

    // Chat sessions live at `app/[locale]/[id]` where `id` is a NanoID(7).
    // `usePathname()` from next-intl returns the locale-less pathname (e.g. "/a1B2c3D").
    const sessionId = useMemo(() => {
        const parts = pathname.split("/").filter(Boolean)
        if (parts.length !== 1) return null
        const id = parts[0]
        return /^[A-Za-z0-9_-]{12}$/.test(id) ? id : null
    }, [pathname])
    const isChatSessionPage = !!sessionId
    // The avatar page shows a full-bleed character behind the navbar, so the
    // bar is transparent there (no card background / border / blur).
    const isAvatarPage = pathname === "/avatar" || pathname.startsWith("/avatar/")

    const [sessionTopic, setSessionTopic] = useState<string>("")
    const [isEditingTopic, setIsEditingTopic] = useState(false)
    const [topicDraft, setTopicDraft] = useState("")
    const [topicSaving, setTopicSaving] = useState(false)

    const cleanTopic = (raw: string) =>
        raw
            .replace(/\s+/g, " ")
            .trim()
            .replace(/^["'“”‘’]+/, "")
            .replace(/["'“”‘’]+$/, "")
            .replace(/[.。!?！？:：;；]+$/g, "")
            .slice(0, 80)

    const saveTopic = async () => {
        if (!sessionId || topicSaving) return
        const next = cleanTopic(topicDraft)
        setTopicSaving(true)
        try {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            }
            const { data: sess } = await supabase.auth.getSession()
            const token = sess.session?.access_token
            if (token) headers["Authorization"] = `Bearer ${token}`
            const res = await fetch(`/api/chat-sessions/${sessionId}`, {
                method: "PATCH",
                headers,
                body: JSON.stringify({ topic: next }),
            })
            if (!res.ok) throw new Error("Failed to save topic")
            setSessionTopic(next)
            setIsEditingTopic(false)
        } catch {
            // best-effort only
        } finally {
            setTopicSaving(false)
        }
    }

    const cancelEditTopic = () => {
        setIsEditingTopic(false)
        setTopicDraft(sessionTopic)
    }

    useEffect(() => {
        if (!sessionId) {
            setSessionTopic("")
            setIsEditingTopic(false)
            setTopicDraft("")
            return
        }
        const controller = new AbortController()
        ;(async () => {
            try {
                const res = await fetch(`/api/chat-sessions/${sessionId}`, {
                    signal: controller.signal,
                })
                const json = await res.json()
                const data = json?.data
                const topic =
                    typeof data?.topic === "string" && data.topic.trim()
                        ? data.topic.trim()
                        : typeof data?.question === "string"
                          ? data.question.trim()
                          : ""
                const cleaned = cleanTopic(topic)
                setSessionTopic(cleaned)
                setTopicDraft(cleaned)
                setIsEditingTopic(false)
            } catch {
                // best-effort only
                setSessionTopic("")
                setTopicDraft("")
                setIsEditingTopic(false)
            }
        })()
        return () => controller.abort()
    }, [sessionId])

    // removed unused meta
    // const avatarSrc = meta.avatar_url || meta.picture || undefined
    // removed unused displayName
    // const initial = displayName.charAt(0).toUpperCase()

    return (
        <nav
            className={`fixed top-0 left-[var(--app-sidebar-w)] right-0 z-50 transition-[left] duration-300 ease-in-out ${
                isAvatarPage
                    ? "bg-transparent"
                    : "bg-card/5 backdrop-blur-sm border-b border-border/20"
            }`}
        >
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                <div className='flex justify-between items-center h-16'>
                    {/* Left: Mobile menu button / Desktop brand */}
                    <div className='flex items-center min-w-0'>
                        {/* Mobile: menu button (always bars) */}
                        <Button
                            variant='ghost'
                            size='icon'
                            className='lg:hidden text-white hover:bg-white/10'
                            onClick={() => setOpen(true)}
                            aria-label='Open menu'
                        >
                            <Menu className='h-6 w-6' />
                        </Button>

                        {/* Desktop (md–lg): brand. At lg+ the sidebar carries the logo. */}
                        <Link
                            href='/'
                            className='hidden md:flex lg:hidden items-center space-x-2 group px-2 py-1 rounded-md hover:bg-white/5'
                        >
                            <Image
                                src='/assets/logo.png'
                                alt='AskingFate logo'
                                width={32}
                                height={32}
                                className='rounded-md object-contain group-hover:scale-110 transition-transform'
                                priority
                            />
                            <span className='font-playfair text-xl font-bold text-white group-hover:text-cosmic-purple transition-colors'>
                                {t("brand")}
                            </span>
                        </Link>

                        {isChatSessionPage && (
                            <div className='flex items-center min-w-0 ml-2'>
                                {isEditingTopic ? (
                                    <div className='flex items-center gap-2 min-w-0 max-w-[70vw] sm:max-w-[72vw] md:max-w-[34rem]'>
                                        <input
                                            value={topicDraft}
                                            onChange={(e) =>
                                                setTopicDraft(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault()
                                                    void saveTopic()
                                                }
                                                if (e.key === "Escape") {
                                                    e.preventDefault()
                                                    cancelEditTopic()
                                                }
                                            }}
                                            onBlur={() => void saveTopic()}
                                            disabled={topicSaving}
                                            className='h-8 w-full min-w-0 rounded-md border border-white/15 bg-white/5 px-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30'
                                            maxLength={80}
                                            aria-label='Edit session topic'
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                    <button
                                        type='button'
                                        className='text-white/90 text-sm font-medium truncate max-w-[46vw] sm:max-w-[52vw] md:max-w-[28rem] text-left hover:text-white transition-colors'
                                        title={
                                            sessionTopic
                                                ? `${sessionTopic} (click to edit)`
                                                : undefined
                                        }
                                        onClick={() => {
                                            setTopicDraft(sessionTopic)
                                            setIsEditingTopic(true)
                                        }}
                                        aria-label='Edit session topic'
                                    >
                                        {sessionTopic || t("newReading")}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right side: Navigation links, Language dropdown, and Auth */}
                    <div className='flex items-center space-x-2'>
                        <div className='flex items-center mr-4'>
                            <Link
                                href='/'
                                className={`hidden lg:block px-3 py-1.5 rounded-md transition-colors mr-4 ${
                                    pathname === "/"
                                        ? "bg-accent text-white"
                                        : "text-cosmic-light hover:text-white hover:bg-white/5"
                                }`}
                            >
                                {t("home")}
                            </Link>
                            <Link
                                href='/about'
                                className={`hidden lg:block px-3 py-1.5 rounded-md transition-colors mr-4 ${
                                    pathname === "/about"
                                        ? "bg-accent text-white"
                                        : "text-cosmic-light hover:text-white hover:bg-white/5"
                                }`}
                            >
                                {t("about")}
                            </Link>
                            <Link
                                href='/pricing'
                                className={`hidden lg:block px-3 py-1.5 rounded-md transition-colors mr-4 ${
                                    pathname === "/pricing"
                                        ? "bg-accent text-white"
                                        : "text-cosmic-light hover:text-white hover:bg-white/5"
                                }`}
                            >
                                {t("pricing")}
                            </Link>
                        </div>

                        {isChatSessionPage && (
                            <Link href='/' aria-label='New reading'>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='text-white hover:bg-white/10 border border-white/10 bg-white/5'
                                >
                                    <Plus className='h-4 w-4 sm:mr-2 mr-0' />
                                    <span className='hidden sm:inline'>
                                        {t("newReading")}
                                    </span>
                                </Button>
                            </Link>
                        )}

                        {/* Language Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='text-white bg-primary/20 border-white/20 hover:bg-primary/30'
                                    aria-label='Change language'
                                >
                                    {locale.toUpperCase()}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className='w-32 bg-card/95 backdrop-blur-md border-border/30'>
                                {routing.locales.map((loc) => (
                                    <DropdownMenuItem
                                        key={loc}
                                        onClick={() =>
                                            router.replace(pathname, {
                                                locale: loc,
                                            })
                                        }
                                        className='cursor-pointer'
                                    >
                                        <span className='flex-grow'>
                                            {l(loc as keyof typeof l)}
                                        </span>
                                        {locale === loc && (
                                            <Check className='ml-2 h-4 w-4' />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Star balance pill - desktop */}
                        <div className='hidden lg:flex items-center'>
                            <StarPill size='md' />
                        </div>

                        {/* Mobile: Star balance next to sign-in/profile */}
                        <div className='lg:hidden flex items-center'>
                            <StarPill size='sm' />
                        </div>

                        {/* Desktop: User Profile / Sign In button */}
                        {!loading && user ? (
                            <UserProfile variant={"mobile"} />
                        ) : (
                            <Link
                                href={`/signin?callbackUrl=${encodeURIComponent(
                                    pathname,
                                )}`}
                            >
                                <Button
                                    variant='outline'
                                    className='flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white/10 text-white/90 border border-white/10 hover:bg-white/15 transition'
                                >
                                    <LogIn className='w-4 h-4' />
                                    {t("signIn")}
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile sidebar */}
            <SidebarSheet open={open} onOpenChange={setOpen} />
        </nav>
    )
}
