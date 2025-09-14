"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Clock } from "lucide-react"

interface TimePickerProps {
    value: { hour: string; minute: string }
    onChange: (time: { hour: string; minute: string }) => void
    className?: string
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [isOpen, setIsOpen] = useState(false)

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = Array.from({ length: 60 }, (_, i) => i)

    const handleHourSelect = (hour: number) => {
        onChange({ ...value, hour: hour.toString().padStart(2, "0") })
    }

    const handleMinuteSelect = (minute: number) => {
        onChange({ ...value, minute: minute.toString().padStart(2, "0") })
    }

    const formatTime = () => {
        if (!value.hour || !value.minute) return "Select Time"
        return `${value.hour}:${value.minute}`
    }

    return (
        <div className={cn("space-y-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant='outline'
                        className='w-full justify-between text-white backdrop-blur-md bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-xl shadow-sm hover:shadow-cosmic-purple/20 min-h-[84px] py-5 px-4'
                    >
                        <div className='text-center flex-1'>
                            <div className='text-2xl font-bold text-white tracking-wider'>
                                {formatTime()}
                            </div>
                            <div className='text-xs text-white/50 uppercase tracking-wider'>
                                Time
                            </div>
                        </div>
                        <Clock className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className='w-80 p-4 bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl ring-1 ring-white/10'>
                    <div className='space-y-4'>
                        <div className='text-center'>
                            <h3 className='text-lg font-semibold text-white mb-2'>
                                Select Time
                            </h3>
                            <div className='text-2xl font-mono text-cosmic-purple'>
                                {formatTime()}
                            </div>
                        </div>

                        <div className='grid grid-cols-2 gap-4'>
                            {/* Hour Selection */}
                            <div className='space-y-2'>
                                <div className='text-sm font-medium text-white/80 text-center'>
                                    Hour
                                </div>
                                <div className='max-h-48 overflow-y-auto border border-white/10 rounded-lg'>
                                    {hours.map((hour) => (
                                        <Button
                                            key={hour}
                                            variant='ghost'
                                            onClick={() =>
                                                handleHourSelect(hour)
                                            }
                                            className={cn(
                                                "w-full justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-none",
                                                value.hour ===
                                                    hour
                                                        .toString()
                                                        .padStart(2, "0") &&
                                                    "bg-cosmic-purple/20 text-cosmic-purple font-semibold"
                                            )}
                                        >
                                            {hour.toString().padStart(2, "0")}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Minute Selection */}
                            <div className='space-y-2'>
                                <div className='text-sm font-medium text-white/80 text-center'>
                                    Minute
                                </div>
                                <div className='max-h-48 overflow-y-auto border border-white/10 rounded-lg'>
                                    {minutes.map((minute) => (
                                        <Button
                                            key={minute}
                                            variant='ghost'
                                            onClick={() =>
                                                handleMinuteSelect(minute)
                                            }
                                            className={cn(
                                                "w-full justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-none",
                                                value.minute ===
                                                    minute
                                                        .toString()
                                                        .padStart(2, "0") &&
                                                    "bg-cosmic-purple/20 text-cosmic-purple font-semibold"
                                            )}
                                        >
                                            {minute.toString().padStart(2, "0")}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className='flex justify-end space-x-2'>
                            <Button
                                variant='outline'
                                onClick={() => setIsOpen(false)}
                                className='border-white/20 bg-white/5 hover:bg-white/10 text-white'
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => setIsOpen(false)}
                                className='bg-cosmic-purple hover:bg-cosmic-purple/80 text-white'
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
