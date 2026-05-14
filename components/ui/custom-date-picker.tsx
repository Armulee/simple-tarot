"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from "@/components/ui/popover"

interface CustomDatePickerProps {
    value: string
    onChange: (value: string) => void
    min: number
    max: number
    placeholder: string
    label: string
    className?: string
}

export function CustomDatePicker({
    value,
    onChange,
    min,
    max,
    placeholder,
    label,
    className,
}: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [localInput, setLocalInput] = useState(value || "")
    const listRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const anchorRef = useRef<HTMLDivElement>(null)

    const numericValue = Number.parseInt(value, 10)
    const currentValue = Number.isFinite(numericValue) ? numericValue : min
    const hasValue = Boolean(value)

    const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i)

    const clamp = useCallback(
        (n: number) => Math.max(min, Math.min(max, n)),
        [min, max],
    )

    useEffect(() => {
        if (!isFocused) setLocalInput(value || "")
    }, [value, isFocused])

    useEffect(() => {
        if (!isOpen || !listRef.current) return
        const id = requestAnimationFrame(() => {
            const el = listRef.current?.querySelector(
                `[data-value="${currentValue}"]`,
            )
            if (el instanceof HTMLElement) {
                el.scrollIntoView({ block: "center", behavior: "auto" })
            }
        })
        return () => cancelAnimationFrame(id)
    }, [isOpen, currentValue])

    const displayedValue = isFocused
        ? localInput
        : hasValue
            ? value.padStart(placeholder.length, "0")
            : ""

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -1 : 1
        const next = clamp(currentValue + delta).toString()
        onChange(next)
        setLocalInput(next)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp") {
            e.preventDefault()
            const next = clamp(currentValue + 1).toString()
            onChange(next)
            setLocalInput(next)
            if (!isOpen) setIsOpen(true)
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            const next = clamp(currentValue - 1).toString()
            onChange(next)
            setLocalInput(next)
            if (!isOpen) setIsOpen(true)
        } else if (e.key === "Enter") {
            e.preventDefault()
            commitInput()
            setIsOpen(false)
            inputRef.current?.blur()
        } else if (e.key === "Escape") {
            setLocalInput(value || "")
            setIsFocused(false)
            setIsOpen(false)
            inputRef.current?.blur()
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        if (!/^\d*$/.test(v)) return
        setLocalInput(v)
        if (!isOpen) setIsOpen(true)
        if (v === "") {
            onChange("")
            return
        }
        const parsed = Number.parseInt(v, 10)
        if (!Number.isFinite(parsed)) return
        if (parsed >= min && parsed <= max) {
            onChange(parsed.toString())
        }
    }

    const commitInput = () => {
        setIsFocused(false)
        if (localInput === "") {
            return
        }
        const parsed = Number.parseInt(localInput, 10)
        if (!Number.isFinite(parsed)) {
            setLocalInput(value || "")
            return
        }
        const clamped = clamp(parsed)
        onChange(clamped.toString())
        setLocalInput(clamped.toString())
    }

    return (
        <div className={cn("relative w-full", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverAnchor asChild>
                    <div
                        ref={anchorRef}
                        className={cn(
                            "group relative flex min-h-[78px] w-full flex-col items-center justify-center gap-1",
                            "rounded-[3px] border-[0.5px] border-[rgba(200,180,140,0.22)] bg-[rgba(255,255,255,0.02)]",
                            "px-3 py-3 transition-all duration-200",
                            "hover:border-[rgba(200,180,140,0.44)] hover:bg-[rgba(200,180,140,0.04)]",
                            isFocused &&
                                "border-[rgba(200,180,140,0.6)] bg-[rgba(200,180,140,0.06)] shadow-[inset_0_0_20px_-10px_rgba(200,180,140,0.3)]",
                            isOpen &&
                                !isFocused &&
                                "border-[rgba(200,180,140,0.55)] bg-[rgba(200,180,140,0.06)] shadow-[inset_0_0_20px_-10px_rgba(200,180,140,0.25)]",
                        )}
                        onClick={() => inputRef.current?.focus()}
                    >
                        <label
                            onClick={(e) => {
                                e.stopPropagation()
                                inputRef.current?.focus()
                            }}
                            className='cursor-text text-[9px] font-normal uppercase tracking-[0.28em] text-[rgba(200,180,140,0.58)]'
                        >
                            {label}
                        </label>
                        <input
                            ref={inputRef}
                            type='text'
                            inputMode='numeric'
                            autoComplete='off'
                            value={displayedValue}
                            placeholder={placeholder}
                            maxLength={placeholder.length}
                            onFocus={(e) => {
                                setIsFocused(true)
                                setLocalInput(value || "")
                                setIsOpen(true)
                                requestAnimationFrame(() => e.target.select())
                            }}
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsOpen(true)
                            }}
                            onBlur={commitInput}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onWheel={handleWheel}
                            aria-label={label}
                            className={cn(
                                "w-full border-none bg-transparent text-center font-serif text-[22px] leading-none tracking-[0.18em] outline-none",
                                "placeholder:text-[rgba(232,224,208,0.3)]",
                                hasValue || isFocused
                                    ? "text-[rgba(245,239,227,0.95)]"
                                    : "text-[rgba(232,224,208,0.3)]",
                            )}
                        />
                    </div>
                </PopoverAnchor>
                <PopoverContent
                    align='center'
                    sideOffset={6}
                    collisionPadding={12}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => {
                        const target = e.target as Node | null
                        if (
                            target &&
                            anchorRef.current?.contains(target)
                        ) {
                            e.preventDefault()
                        }
                    }}
                    onFocusOutside={(e) => {
                        const target = e.target as Node | null
                        if (
                            target &&
                            anchorRef.current?.contains(target)
                        ) {
                            e.preventDefault()
                        }
                    }}
                    className={cn(
                        "min-w-[140px] overflow-hidden p-0",
                        "rounded-[3px] border-[0.5px] border-[rgba(200,180,140,0.28)]",
                        "bg-[#171522]/95 backdrop-blur-xl",
                        "shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(200,180,140,0.08)]",
                    )}
                    style={{
                        width: "var(--radix-popover-trigger-width)",
                    }}
                >
                    <div className='pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-[#171522] via-[#171522]/80 to-transparent' />
                    <div className='pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-[#171522] via-[#171522]/80 to-transparent' />
                    <div
                        ref={listRef}
                        onWheel={(e) => {
                            const el = listRef.current
                            if (!el) return
                            e.stopPropagation()
                            el.scrollTop += e.deltaY
                        }}
                        onTouchMove={(e) => e.stopPropagation()}
                        className='consent-scrollbar relative max-h-[220px] overflow-y-auto overscroll-contain py-1'
                    >
                        {numbers.map((num) => {
                            const isSelected = num === currentValue
                            return (
                                <button
                                    type='button'
                                    key={num}
                                    data-value={num}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        onChange(num.toString())
                                        setLocalInput(num.toString())
                                        setIsOpen(false)
                                    }}
                                    className={cn(
                                        "block w-full px-3 py-1.5 text-center font-serif text-[15px] tracking-[0.14em] transition-colors duration-150",
                                        isSelected
                                            ? "bg-[rgba(200,180,140,0.14)] text-[rgba(245,239,227,0.96)]"
                                            : "text-[rgba(232,224,208,0.68)] hover:bg-[rgba(200,180,140,0.08)] hover:text-[rgba(245,239,227,0.92)]",
                                    )}
                                >
                                    {num
                                        .toString()
                                        .padStart(placeholder.length, "0")}
                                </button>
                            )
                        })}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
