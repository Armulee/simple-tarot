"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
    return <DialogPrimitive.Root data-slot='dialog' {...props} />
}

function DialogTrigger({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
    return <DialogPrimitive.Trigger data-slot='dialog-trigger' {...props} />
}

function DialogClose({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
    return <DialogPrimitive.Close data-slot='dialog-close' {...props} />
}

function DialogPortal({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
    return <DialogPrimitive.Portal data-slot='dialog-portal' {...props} />
}

function DialogOverlay({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
    return (
        <DialogPrimitive.Overlay
            data-slot='dialog-overlay'
            className={cn(
                "fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                className
            )}
            {...props}
        />
    )
}

function DialogContent({
    className,
    children,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                data-slot='dialog-content'
                className={cn(
                    "bg-background fixed left-1/2 top-1/2 z-50 w-full max-w-lg max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-lg overflow-y-auto",
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                    className
                )}
                {...props}
            >
                {children}
                <DialogPrimitive.Close className='ring-offset-background focus:ring-ring absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-offset-2'>
                    <XIcon className='size-4' />
                    <span className='sr-only'>Close</span>
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPortal>
    )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot='dialog-header'
            className={cn("flex flex-col gap-1.5", className)}
            {...props}
        />
    )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot='dialog-footer'
            className={cn("mt-4 flex flex-col gap-2", className)}
            {...props}
        />
    )
}

function DialogTitle({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            data-slot='dialog-title'
            className={cn("text-foreground text-lg font-semibold", className)}
            {...props}
        />
    )
}

function DialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            data-slot='dialog-description'
            className={cn("text-muted-foreground text-sm", className)}
            {...props}
        />
    )
}

export {
    Dialog,
    DialogTrigger,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPortal,
    DialogTitle,
}
