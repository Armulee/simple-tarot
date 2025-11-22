"use client"

import { useState } from "react"
import { TypewriterText } from "../../typewriter-text"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { TimePicker } from "@/components/ui/time-picker"
import { LocationSelector } from "@/components/ui/location-selector"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar, Clock } from "lucide-react"

export default function BirthChart() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [selectedTime, setSelectedTime] = useState<{ hour: string; minute: string }>({ hour: "", minute: "" })
    const [country, setCountry] = useState<string>("")
    const [stateProv, setStateProv] = useState<string>("")
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [timePickerOpen, setTimePickerOpen] = useState(false)

    // Format date as "Month dd, yyyy"
    const formattedDate = selectedDate
        ? (() => {
            const months = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ]
            const month = months[selectedDate.getMonth()]
            const day = selectedDate.getDate()
            const year = selectedDate.getFullYear()
            return `${month} ${day.toString().padStart(2, "0")}, ${year}`
        })()
        : "Select date"

    // Format time as "hh:mm am/pm"
    const formattedTime = selectedTime.hour && selectedTime.minute
        ? (() => {
            const hour = parseInt(selectedTime.hour)
            const minute = parseInt(selectedTime.minute)
            const period = hour >= 12 ? "PM" : "AM"
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
            return `${displayHour.toString().padStart(2, "0")}:${selectedTime.minute.padStart(2, "0")} ${period}`
        })()
        : "Select time"

    return (
        <>
            {/* Main Heading */}
            <div className='space-y-4'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                    <TypewriterText
                        text="Decode your cosmic blueprint"
                        speed={60}
                        className='text-white'
                    />
                </h1>
            </div>

            {/* Birth Information Section */}
            <div className='flex flex-col gap-6 justify-center items-center pt-8 w-full max-w-2xl px-4'>
                <div className='text-center space-y-2 w-full'>
                    <h2 className='text-xl font-semibold text-white'>
                        Your birth information
                    </h2>
                </div>

                {/* Input Card */}
                <Card className='w-full p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border-border/20'>
                    <div className='grid grid-cols-3 gap-4'>
                        {/* Date Input */}
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant='outline'
                                    className='w-full justify-between text-white backdrop-blur-md bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-xl min-h-[60px] py-3 px-4'
                                >
                                    <div className='flex items-center gap-2'>
                                        <Calendar className='w-4 h-4' />
                                        <span className={selectedDate ? "text-white text-sm" : "text-white/50 text-sm"}>
                                            {formattedDate}
                                        </span>
                                    </div>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className='w-auto p-3 bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                <CalendarComponent
                                    mode='single'
                                    selected={selectedDate}
                                    onSelect={(date) => {
                                        setSelectedDate(date)
                                        setCalendarOpen(false)
                                    }}
                                    captionLayout='dropdown'
                                    disabled={(date) =>
                                        date > new Date() ||
                                        date < new Date("1900-01-01")
                                    }
                                    className='rounded-md border-0 bg-transparent'
                                />
                            </PopoverContent>
                        </Popover>

                        {/* Time Input */}
                        <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant='outline'
                                    className='w-full justify-between text-white backdrop-blur-md bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-xl min-h-[60px] py-3 px-4'
                                >
                                    <div className='flex items-center gap-2'>
                                        <Clock className='w-4 h-4' />
                                        <span className={selectedTime.hour && selectedTime.minute ? "text-white text-sm" : "text-white/50 text-sm"}>
                                            {formattedTime}
                                        </span>
                                    </div>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className='w-auto p-3 bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                <TimePicker
                                    value={selectedTime}
                                    onChange={(time) => {
                                        setSelectedTime(time)
                                        setTimePickerOpen(false)
                                    }}
                                />
                            </PopoverContent>
                        </Popover>

                        {/* Location Input - Country and State side by side */}
                        <div className='grid grid-cols-2 gap-2'>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant='outline'
                                        className='w-full justify-between text-white backdrop-blur-md bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-xl min-h-[60px] py-3 px-2 text-xs'
                                        onClick={() => {
                                            // This will be handled by LocationSelector logic
                                        }}
                                    >
                                        <span className={country ? "text-white" : "text-white/50"}>
                                            {country || "Country"}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className='w-72 p-0 bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                    <div className='p-2'>
                                        <input
                                            type='text'
                                            placeholder='Search countries...'
                                            className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/50 text-sm'
                                        />
                                    </div>
                                    <div className='max-h-60 overflow-y-auto'>
                                        <Button 
                                            variant='ghost' 
                                            className='w-full justify-start text-white/90 hover:text-white hover:bg-white/10 rounded-none'
                                            onClick={() => {
                                                setCountry("United States")
                                            }}
                                        >
                                            United States
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant='outline'
                                        className='w-full justify-between text-white backdrop-blur-md bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 rounded-xl min-h-[60px] py-3 px-2 text-xs'
                                        disabled={!country}
                                    >
                                        <span className={stateProv ? "text-white" : "text-white/50"}>
                                            {stateProv || "State"}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className='w-72 p-0 bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                    <div className='p-2'>
                                        <input
                                            type='text'
                                            placeholder='Search states...'
                                            className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/50 text-sm'
                                        />
                                    </div>
                                    <div className='max-h-60 overflow-y-auto'>
                                        <Button 
                                            variant='ghost' 
                                            className='w-full justify-start text-white/90 hover:text-white hover:bg-white/10 rounded-none'
                                            onClick={() => {
                                                setStateProv("California")
                                            }}
                                        >
                                            California
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </Card>

                {/* CTA Button */}
                <Link href="/birth-chart">
                    <Button
                        size="lg"
                        className='card-glow text-lg px-8 py-6'
                    >
                        Get Your Birth Chart
                    </Button>
                </Link>
            </div>
        </>
    )
}