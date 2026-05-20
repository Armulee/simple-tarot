"use client"

import { AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type PaywallTone = "danger" | "premium"

export type PaywallAction = {
    key?: string
    label: string
    href?: string
    onClick?: () => void
    icon?: ReactNode
    disabled?: boolean
    loading?: boolean
}

export type PaywallBodyProps = {
    tone?: PaywallTone
    icon?: ReactNode
    eyebrow?: string
    title: string
    body: string
    note?: string
    actions?: PaywallAction[]
    footer?: ReactNode
    className?: string
}

const toneStyles: Record<
    PaywallTone,
    {
        container: string
        iconWrap: string
        title: string
        body: string
        note: string
        primaryButton: string
        secondaryButton: string
    }
> = {
    danger: {
        container:
            "border-red-400/40 bg-red-500/10 text-red-100 shadow-[0_0_24px_-12px_rgba(248,113,113,0.55)]",
        iconWrap: "border-red-300/50 bg-red-500/20 text-red-200",
        title: "text-red-50",
        body: "text-red-100/90",
        note: "text-red-100/70",
        primaryButton:
            "border border-red-300/50 bg-red-500/20 hover:bg-red-500/30 text-red-50",
        secondaryButton:
            "border border-red-300/40 bg-transparent hover:bg-red-500/15 text-red-100",
    },
    premium: {
        container:
            "border-amber-300/40 bg-gradient-to-br from-amber-400/15 via-amber-300/5 to-transparent text-white shadow-[0_24px_60px_-30px_rgba(252,211,77,0.5)]",
        iconWrap:
            "border-amber-300/40 bg-amber-300/15 text-amber-200 shadow-[0_0_24px_-6px_rgba(252,211,77,0.5)]",
        title: "text-white",
        body: "text-white/80",
        note: "text-white/55",
        primaryButton:
            "border border-amber-300/0 bg-amber-300 hover:bg-amber-200 text-black",
        secondaryButton:
            "border border-yellow-300/40 bg-yellow-300/10 hover:bg-yellow-300/20 text-yellow-100",
    },
}

export function PaywallBody({
    tone = "danger",
    icon,
    eyebrow,
    title,
    body,
    note,
    actions,
    footer,
    className,
}: PaywallBodyProps) {
    const styles = toneStyles[tone]
    const resolvedIcon = icon ?? <AlertCircle className='h-3.5 w-3.5' />

    return (
        <div
            role='alert'
            className={cn(
                "flex w-full flex-col gap-3 rounded-2xl border px-4 py-3 backdrop-blur-sm",
                styles.container,
                className,
            )}
        >
            <div className='flex items-start gap-3'>
                <span
                    className={cn(
                        "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                        styles.iconWrap,
                    )}
                >
                    {resolvedIcon}
                </span>
                <div className='flex flex-1 flex-col gap-1'>
                    {eyebrow ? (
                        <p
                            className={cn(
                                "text-[10px] font-medium uppercase tracking-[0.22em] opacity-80",
                                styles.body,
                            )}
                        >
                            {eyebrow}
                        </p>
                    ) : null}
                    <p
                        className={cn(
                            "text-sm font-semibold leading-snug",
                            styles.title,
                        )}
                    >
                        {title}
                    </p>
                    <p
                        className={cn(
                            "text-xs leading-relaxed",
                            styles.body,
                        )}
                    >
                        {body}
                    </p>
                    {note ? (
                        <p
                            className={cn(
                                "text-[11px] leading-relaxed",
                                styles.note,
                            )}
                        >
                            {note}
                        </p>
                    ) : null}
                </div>
            </div>
            {actions?.length ? (
                <div className='flex flex-col gap-2 sm:flex-row'>
                    {actions.map((action, index) => {
                        const isPrimary = index === 0
                        const buttonClassName = cn(
                            "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition disabled:opacity-50 disabled:cursor-not-allowed",
                            isPrimary
                                ? styles.primaryButton
                                : styles.secondaryButton,
                        )
                        const iconNode = action.loading ? (
                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                        ) : (
                            action.icon ?? null
                        )
                        if (action.href) {
                            return (
                                <Link
                                    key={action.key ?? index}
                                    href={action.href}
                                    onClick={action.onClick}
                                    className={buttonClassName}
                                    aria-disabled={action.disabled}
                                >
                                    {iconNode}
                                    {action.label}
                                </Link>
                            )
                        }
                        return (
                            <button
                                key={action.key ?? index}
                                type='button'
                                onClick={action.onClick}
                                disabled={action.disabled || action.loading}
                                className={buttonClassName}
                            >
                                {iconNode}
                                {action.label}
                            </button>
                        )
                    })}
                </div>
            ) : null}
            {footer}
        </div>
    )
}

export type PaywallDialogProps = PaywallBodyProps & {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function PaywallDialog({
    open,
    onOpenChange,
    className,
    ...content
}: PaywallDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    "max-w-md w-[92vw] border-0 bg-transparent p-0 shadow-none",
                    className,
                )}
            >
                <PaywallBody {...content} />
            </DialogContent>
        </Dialog>
    )
}
