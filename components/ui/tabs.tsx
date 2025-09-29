"use client"

import React, { createContext, useContext, useMemo, useState } from "react"

type TabsContextType = {
  value: string
  setValue: (v: string) => void
}

const TabsContext = createContext<TabsContextType | null>(null)

type TabsProps = {
  defaultValue: string
  className?: string
  children: React.ReactNode
}

export function Tabs({ defaultValue, className, children }: TabsProps) {
  const [value, setValue] = useState(defaultValue)
  const ctx = useMemo(() => ({ value, setValue }), [value])
  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-full bg-white/5 border border-white/10 p-1 text-white ${className ?? ""}`}>
      {children}
    </div>
  )
}

export function TabsTrigger({ className, children, value }: { className?: string; children: React.ReactNode; value: string }) {
  const ctx = useContext(TabsContext)
  const active = ctx?.value === value
  return (
    <button
      type="button"
      onClick={() => ctx?.setValue(value)}
      data-state={active ? "active" : "inactive"}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${active ? "bg-white/15 text-white shadow" : "text-white/70"} ${className ?? ""}`}
    >
      {children}
    </button>
  )
}

export function TabsContent({ className, children, value }: { className?: string; children: React.ReactNode; value: string }) {
  const ctx = useContext(TabsContext)
  if (ctx?.value !== value) return null
  return <div className={className}>{children}</div>
}