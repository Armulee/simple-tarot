"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronDown } from "lucide-react"

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
    const [isDragging, setIsDragging] = useState(false)
    const [dragStartY, setDragStartY] = useState(0)
    const [dragStartValue, setDragStartValue] = useState(0)
    const [isTyping, setIsTyping] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const currentValue = parseInt(value) || min
    const displayValue = value
        ? value.padStart(placeholder.length, "0")
        : placeholder

    // Generate array of numbers from min to max
    const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i)

    const handleClick = () => {
        if (!isTyping) {
            setIsOpen(!isOpen)
        }
    }

    const handleDoubleClick = () => {
        setIsTyping(true)
        setInputValue(value || "")
        setTimeout(() => {
            inputRef.current?.focus()
            inputRef.current?.select()
        }, 0)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setInputValue(newValue)

        // Only allow numbers
        if (/^\d*$/.test(newValue)) {
            const numValue = parseInt(newValue)
            if (!isNaN(numValue) && numValue >= min && numValue <= max) {
                onChange(newValue)
            }
        }
    }

    const handleInputBlur = () => {
        setIsTyping(false)
        const numValue = parseInt(inputValue)
        if (isNaN(numValue) || numValue < min || numValue > max) {
            // Reset to current value if invalid
            setInputValue(value || "")
        } else {
            onChange(inputValue.padStart(placeholder.length, "0"))
        }
    }

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleInputBlur()
        } else if (e.key === "Escape") {
            setIsTyping(false)
            setInputValue(value || "")
        }
    }

    const handleNumberClick = (num: number) => {
        onChange(num.toString())
        setIsOpen(false)
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging(true)
        setDragStartY(e.clientY)
        setDragStartValue(currentValue)
    }

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging) return

            const deltaY = dragStartY - e.clientY
            const sensitivity = 3
            const deltaValue = Math.round(deltaY / sensitivity)
            const newValue = Math.max(
                min,
                Math.min(max, dragStartValue + deltaValue)
            )

            onChange(newValue.toString())
        },
        [dragStartValue, dragStartY, isDragging, min, max, onChange]
    )

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const delta = e.deltaY > 0 ? -1 : 1
        const newValue = Math.max(min, Math.min(max, currentValue + delta))
        onChange(newValue.toString())
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowUp") {
            e.preventDefault()
            const newValue = Math.max(min, Math.min(max, currentValue + 1))
            onChange(newValue.toString())
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            const newValue = Math.max(min, Math.min(max, currentValue - 1))
            onChange(newValue.toString())
        } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setIsOpen(!isOpen)
        } else if (e.key === "Escape") {
            setIsOpen(false)
        }
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
            return () => {
                document.removeEventListener("mousedown", handleClickOutside)
            }
        }
    }, [isOpen])

    useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
            return () => {
                document.removeEventListener("mousemove", handleMouseMove)
                document.removeEventListener("mouseup", handleMouseUp)
            }
        }
    }, [
        isDragging,
        dragStartY,
        dragStartValue,
        min,
        max,
        handleMouseMove,
        handleMouseUp,
    ])

    // Scroll to current value when dropdown opens
    useEffect(() => {
        if (isOpen && listRef.current) {
            const selectedElement = listRef.current.querySelector(
                `[data-value="${currentValue}"]`
            )
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                })
            }
        }
    }, [isOpen, currentValue])

    return (
        <div className={cn("space-y-2", className)}>
            <Label className='text-white/80 text-sm font-medium'>{label}</Label>
            <div className='relative' ref={containerRef}>
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant='outline'
                            role='combobox'
                            aria-expanded={isOpen}
                            className={cn(
                                "w-full justify-between bg-white/5 border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/30",
                                isDragging &&
                                    "border-cosmic-purple bg-white/10 scale-105",
                                isOpen && "border-cosmic-purple bg-white/10"
                            )}
                            onClick={handleClick}
                            onDoubleClick={handleDoubleClick}
                            onMouseDown={handleMouseDown}
                            onWheel={handleWheel}
                            onKeyDown={handleKeyDown}
                        >
                            <div className='text-center flex-1'>
                                {isTyping ? (
                                    <Input
                                        ref={inputRef}
                                        type='text'
                                        value={inputValue}
                                        onChange={handleInputChange}
                                        onBlur={handleInputBlur}
                                        onKeyDown={handleInputKeyDown}
                                        className='text-3xl font-bold text-white bg-transparent border-none outline-none text-center w-full h-auto p-0'
                                        maxLength={placeholder.length}
                                    />
                                ) : (
                                    <div className='text-3xl font-bold text-white'>
                                        {displayValue}
                                    </div>
                                )}
                                <div className='text-xs text-white/50 uppercase tracking-wider'>
                                    {label}
                                </div>
                            </div>
                            <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className='w-full p-0 bg-black/90 backdrop-blur-sm border-white/20'
                        align='start'
                    >
                        <div className='max-h-48 overflow-y-auto' ref={listRef}>
                            {numbers.map((num) => (
                                <Button
                                    key={num}
                                    variant='ghost'
                                    data-value={num}
                                    onClick={() => handleNumberClick(num)}
                                    className={cn(
                                        "w-full justify-center text-white hover:bg-white/10",
                                        num === currentValue &&
                                            "bg-cosmic-purple/20 text-cosmic-purple font-semibold"
                                    )}
                                >
                                    {num
                                        .toString()
                                        .padStart(placeholder.length, "0")}
                                </Button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Drag indicator */}
                <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                    <div
                        className={cn(
                            "w-6 h-0.5 bg-gradient-to-r from-cosmic-purple to-cosmic-blue rounded-full opacity-0 transition-opacity",
                            isDragging && "opacity-100"
                        )}
                    />
                </div>
            </div>
        </div>
    )
}
