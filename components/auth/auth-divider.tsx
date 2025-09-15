"use client"

import { Separator } from "@/components/ui/separator"

interface AuthDividerProps {
  text?: string
}

export function AuthDivider({ text = "or" }: AuthDividerProps) {
  return (
    <div className="relative flex items-center justify-center my-6">
      <Separator className="w-full bg-border/30" />
      <span className="absolute bg-background px-4 text-sm text-muted-foreground">
        {text}
      </span>
    </div>
  )
}