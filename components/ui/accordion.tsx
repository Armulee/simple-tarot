"use client"

import React, { createContext, useContext, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

type AccordionContextType = {
  open: boolean
  setOpen: (v: boolean) => void
}

const ItemContext = createContext<AccordionContextType | null>(null)

export function Accordion({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {children}
    </div>
  )
}

export function AccordionItem({
  className,
  children,
  defaultOpen = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { defaultOpen?: boolean }) {
  const [open, setOpen] = useState<boolean>(defaultOpen)
  const value = useMemo(() => ({ open, setOpen }), [open])
  return (
    <ItemContext.Provider value={value}>
      <div className={cn("border-b border-border/20", className)} {...props}>
        {children}
      </div>
    </ItemContext.Provider>
  )
}

export function AccordionTrigger({
  className,
  children,
  showIndicator = true,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { showIndicator?: boolean }) {
  const ctx = useContext(ItemContext)
  const isOpen = !!ctx?.open
  const toggle = () => ctx?.setOpen(!isOpen)
  return (
    <div className="flex">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex flex-1 items-center justify-between py-4 text-left text-sm font-medium transition-all hover:underline text-white",
          className
        )}
        aria-expanded={isOpen}
        {...props}
      >
        {children}
        {showIndicator ? (
          <span
            className={cn(
              "ml-2 h-4 w-4 text-muted-foreground transition-transform",
              isOpen ? "rotate-180" : "rotate-0"
            )}
          >
            ▾
          </span>
        ) : null}
      </button>
    </div>
  )
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(ItemContext)
  const isOpen = !!ctx?.open
  return (
    <div
      className={cn(
        "overflow-hidden text-sm text-muted-foreground",
        isOpen ? "block" : "hidden",
        className
      )}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  )
}

