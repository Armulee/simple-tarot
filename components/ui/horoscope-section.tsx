import { useState, useEffect, useRef } from "react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Dialog, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Calendar,
    Clock,
    MapPin,
    Info,
    ChevronLeft,
    Loader2,
    Send,
    X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const Section = ({
    title,
    tooltip,
    selectedDate,
    onSelectDate,
    // dateValue,
    currentTime,
    // timeValue,
    locationValue,
    // calendarOpen,
    setCalendarOpen,
    // timeOpen,
    setTimeOpen,
    locationOpen,
    setLocationOpen,
    // timeStep,
    // setTimeStep,
    // hourInput,
    // setHourInput,
    // minuteInput,
    // setMinuteInput,
    setTime,
    locationStep,
    setLocationStep,
    searchCountry,
    setSearchCountry,
    searchState,
    setSearchState,
    filteredCountries,
    filteredStates,
    onSelectCountry,
    onSelectState,
    onUseCurrentLocation,
    type,
    containerClassName,
    // Optional button props
    buttonLabel,
    buttonLoadingLabel,
    onButtonClick,
    buttonDisabled,
    buttonLoading,
}: {
    title: string
    tooltip: string
    selectedDate: Date | undefined
    onSelectDate: (d: Date | undefined) => void
    dateValue: string
    currentTime: { hour: string; minute: string }
    timeValue: string
    locationValue: string
    calendarOpen: boolean
    setCalendarOpen: (v: boolean) => void
    timeOpen: boolean
    setTimeOpen: (v: boolean) => void
    locationOpen: boolean
    setLocationOpen: (v: boolean) => void
    timeStep: "hour" | "minute"
    setTimeStep: (v: "hour" | "minute") => void
    hourInput: string
    setHourInput: (v: string) => void
    minuteInput: string
    setMinuteInput: (v: string) => void
    setTime: (v: { hour: string; minute: string }) => void
    locationStep: "country" | "state"
    setLocationStep: (v: "country" | "state") => void
    searchCountry: string
    setSearchCountry: (v: string) => void
    searchState: string
    setSearchState: (v: string) => void
    filteredCountries: Array<{ name: string; code: string }>
    filteredStates: Array<{ name: string; code: string }>
    onSelectCountry: (name: string) => void
    onSelectState: (name: string) => void
    onUseCurrentLocation: () => void
    type: "birth" | "transit"
    containerClassName?: string
    // Optional button props
    buttonLabel?: string
    buttonLoadingLabel?: string
    onButtonClick?: () => void
    buttonDisabled?: boolean
    buttonLoading?: boolean
}) => {
    // Date input state
    const [dateStep, setDateStep] = useState<"year" | "month" | "day">("year")
    const [dateInput, setDateInput] = useState("")
    const [dateDialogOpen, setDateDialogOpen] = useState(false)

    // Partial date state
    const [tempYear, setTempYear] = useState<number | null>(null)
    const [tempMonth, setTempMonth] = useState<number | null>(null)
    const [tempDay, setTempDay] = useState<number | null>(null)

    // Calendar month state for syncing with typed dates
    const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())

    // Time input state (hh:mm format)
    const [timeInput, setTimeInput] = useState("")
    const [timeDialogOpen, setTimeDialogOpen] = useState(false)
    const timeInputRef = useRef<HTMLInputElement | null>(null)
    const prevTimeInputRef = useRef<string>("")
    const hourWheelRef = useRef<HTMLDivElement | null>(null)
    const minuteWheelRef = useRef<HTMLDivElement | null>(null)
    const isProgrammaticScrollRef = useRef(false)
    const isUserScrollingRef = useRef(false)
    const scrollEndTimerRef = useRef<{
        hour?: NodeJS.Timeout
        minute?: NodeJS.Timeout
    }>({})

    // Helper to format hour for 12h display
    const formatHour12 = (h24: number): string => {
        const h12 = h24 % 12 || 12
        const ampm = h24 >= 12 ? "PM" : "AM"
        return `${h12.toString().padStart(2, "0")} ${ampm}`
    }

    // Helper to get ordinal suffix (st, nd, rd, th)
    const getOrdinalSuffix = (day: number): string => {
        if (day > 3 && day < 21) return "th"
        switch (day % 10) {
            case 1:
                return "st"
            case 2:
                return "nd"
            case 3:
                return "rd"
            default:
                return "th"
        }
    }

    // Use a ref to focus the input when it appears
    const dateInputRef = useRef<HTMLInputElement | null>(null)

    // Initialize dateInput when dialog opens
    useEffect(() => {
        if (dateDialogOpen) {
            setDateStep("year")
            setDateInput("")
            setTempYear(null)
            setTempMonth(null)
            setTempDay(null)
            if (selectedDate) {
                const year = selectedDate.getFullYear()
                const month = selectedDate.getMonth()
                const day = selectedDate.getDate()
                setTempYear(year)
                setTempMonth(month)
                setTempDay(day)
                setCalendarMonth(selectedDate)
            } else {
                setCalendarMonth(new Date())
            }
        }
    }, [dateDialogOpen, selectedDate])

    // Focus small input when dialog opens or step changes
    useEffect(() => {
        if (dateDialogOpen && dateInputRef.current) {
            setTimeout(() => {
                dateInputRef.current?.focus()
            }, 100)
        }
    }, [dateDialogOpen, dateStep])

    // Sync timeInput with currentTime (only when dialog is closed or not typing)
    useEffect(() => {
        if (isProgrammaticScrollRef.current) return

        if (currentTime.hour && currentTime.minute) {
            const formatted = `${currentTime.hour}:${currentTime.minute}`
            setTimeInput(formatted)
            prevTimeInputRef.current = formatted
        } else if (!timeDialogOpen) {
            // Only clear if dialog is closed
            setTimeInput("")
            prevTimeInputRef.current = ""
        }
    }, [currentTime.hour, currentTime.minute, timeDialogOpen])

    // Initialize time input when dialog opens
    useEffect(() => {
        if (timeDialogOpen) {
            // Wait for DOM to be ready
            const timer = setTimeout(() => {
                if (currentTime.hour && hourWheelRef.current) {
                    hourWheelRef.current.scrollTop =
                        parseInt(currentTime.hour) * 40
                }
                if (currentTime.minute && minuteWheelRef.current) {
                    minuteWheelRef.current.scrollTop =
                        parseInt(currentTime.minute) * 40
                }
            }, 50)

            // Focus input when dialog opens
            setTimeout(() => {
                timeInputRef.current?.focus()
            }, 100)

            return () => clearTimeout(timer)
        }
    }, [currentTime.hour, currentTime.minute, timeDialogOpen])

    // Update wheel scroll positions when typing
    useEffect(() => {
        if (
            timeDialogOpen &&
            !isProgrammaticScrollRef.current &&
            !isUserScrollingRef.current
        ) {
            const h = parseInt(currentTime.hour)
            const m = parseInt(currentTime.minute)

            if (hourWheelRef.current && !isNaN(h)) {
                const targetTop = h * 40
                if (Math.abs(hourWheelRef.current.scrollTop - targetTop) > 2) {
                    isProgrammaticScrollRef.current = true
                    hourWheelRef.current.scrollTo({
                        top: targetTop,
                        behavior: "smooth",
                    })
                    setTimeout(() => {
                        isProgrammaticScrollRef.current = false
                    }, 500)
                }
            }
            if (minuteWheelRef.current && !isNaN(m)) {
                const targetTop = m * 40
                if (
                    Math.abs(minuteWheelRef.current.scrollTop - targetTop) > 2
                ) {
                    isProgrammaticScrollRef.current = true
                    minuteWheelRef.current.scrollTo({
                        top: targetTop,
                        behavior: "smooth",
                    })
                    setTimeout(() => {
                        isProgrammaticScrollRef.current = false
                    }, 500)
                }
            }
        }
    }, [currentTime.hour, currentTime.minute, timeDialogOpen])

    // Format date input based on current step
    const handleDateInputChange = (value: string) => {
        const digits = value.replace(/\D/g, "")
        setDateInput(value)

        if (dateStep === "year") {
            if (digits.length === 4) {
                const year = parseInt(digits)
                const isBirthValid =
                    year >= 1900 && year <= new Date().getFullYear()
                const isTransitValid = year >= 100 && year <= 9999 // Relaxed for transit

                if (type === "transit" ? isTransitValid : isBirthValid) {
                    setTempYear(year)
                    setCalendarMonth(new Date(year, 0, 1))
                    // Delay and transition to month
                    setTimeout(() => {
                        setDateStep("month")
                        setDateInput("")
                    }, 1000)
                }
            }
        } else if (dateStep === "month") {
            const monthVal = parseInt(digits)
            if (digits.length >= 1 && monthVal >= 1 && monthVal <= 12) {
                // If it's a 2-digit month or user typed 2-9
                if (digits.length === 2 || monthVal >= 2) {
                    const monthIdx = monthVal - 1
                    setTempMonth(monthIdx)
                    if (tempYear) {
                        setCalendarMonth(new Date(tempYear, monthIdx, 1))
                    }
                    // Delay and transition to day
                    setTimeout(() => {
                        setDateStep("day")
                        setDateInput("")
                    }, 1000)
                }
            }
        } else if (dateStep === "day") {
            const dayVal = parseInt(digits)
            if (digits.length >= 1 && dayVal >= 1 && dayVal <= 31) {
                // If it's 2 digits or first digit is > 3
                if (digits.length === 2 || dayVal >= 4) {
                    if (tempYear && tempMonth != null) {
                        const date = new Date(tempYear, tempMonth, dayVal)
                        // Basic validation for days in month
                        if (date.getMonth() === tempMonth) {
                            setTempDay(dayVal)
                            onSelectDate(date)
                            // Delay and close
                            setTimeout(() => {
                                setDateDialogOpen(false)
                                setCalendarOpen(false)
                            }, 1000)
                        }
                    }
                }
            }
        }
    }

    // Format time input with automatic colon and cap values
    const handleTimeInputChange = (value: string) => {
        // Remove all non-digits
        const digits = value.replace(/\D/g, "").slice(0, 4)

        // Format with colon: hh:mm
        let formatted = ""
        if (digits.length > 0) {
            formatted = digits.slice(0, 2)
            if (digits.length >= 2) {
                formatted += ":"
                if (digits.length > 2) {
                    formatted += digits.slice(2, 4)
                }
            }
        }

        prevTimeInputRef.current = formatted
        setTimeInput(formatted)

        // Parse and update time state
        if (digits.length >= 2) {
            let hour = parseInt(digits.slice(0, 2))
            if (hour > 23) hour = 23

            // If we have at least 2 digits for hour, but no minute yet,
            // use "00" as default to keep the state complete
            let minute = currentTime.minute || "00"
            if (digits.length === 4) {
                const m = parseInt(digits.slice(2, 4))
                minute = (m > 59 ? 59 : m).toString().padStart(2, "0")
            }

            isProgrammaticScrollRef.current = true
            setTime({
                hour: hour.toString().padStart(2, "0"),
                minute: minute,
            })
            setTimeout(() => {
                isProgrammaticScrollRef.current = false
            }, 500)
        } else if (digits.length === 0) {
            setTime({ hour: "", minute: "" })
        }
    }
    return (
        <div
            className={`flex flex-col gap-4 justify-center items-center pt-8 w-full max-w-md px-4 ${containerClassName ?? ""}`}
        >
            <div className='w-full flex items-center gap-2'>
                <h2 className='font-serif font-semibold text-xl text-white text-left'>
                    {title}
                </h2>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type='button'
                            className='text-white/60 hover:text-white/80 transition-colors'
                            aria-label={`Information about ${title}`}
                        >
                            <Info className='w-4 h-4' />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent
                        className='max-w-xs bg-[#0A0F26] border-white/20 text-[#E6EAFF] text-xs p-3'
                        side='right'
                    >
                        <p>{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </div>

            <div
                className='w-full p-4 rounded-[20px] bg-gradient-to-br from-[#0A0F26] to-[#131A3A] border border-white/[0.1] shadow-2xl relative overflow-hidden'
                style={{
                    boxShadow:
                        "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                }}
            >
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none' />

                <div className='relative z-10 space-y-4'>
                    <div className='grid grid-cols-2 gap-4'>
                        <div className='relative flex items-center'>
                            <Dialog
                                open={dateDialogOpen}
                                onOpenChange={(open) => {
                                    setDateDialogOpen(open)
                                    setCalendarOpen(open)
                                }}
                            >
                                <button
                                    type='button'
                                    onClick={() => {
                                        setDateDialogOpen(true)
                                        setCalendarOpen(true)
                                    }}
                                    className='w-full pl-10 pr-4 py-1 rounded-md bg-white/[0.1] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.12] transition-all duration-300 text-left relative'
                                >
                                    <Calendar className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E6EAFF]/70 pointer-events-none z-10' />
                                    <span
                                        className={`text-sm font-medium ${selectedDate ? "text-[#E6EAFF]" : "text-transparent"}`}
                                    >
                                        {selectedDate ? (
                                            <span className='flex items-baseline'>
                                                <span>
                                                    {selectedDate.getFullYear()}
                                                    ,{" "}
                                                    {
                                                        [
                                                            "Jan",
                                                            "Feb",
                                                            "Mar",
                                                            "Apr",
                                                            "May",
                                                            "Jun",
                                                            "Jul",
                                                            "Aug",
                                                            "Sep",
                                                            "Oct",
                                                            "Nov",
                                                            "Dec",
                                                        ][
                                                            selectedDate.getMonth()
                                                        ]
                                                    }{" "}
                                                    {selectedDate.getDate()}
                                                </span>
                                                <span className='text-[10px] leading-none'>
                                                    {getOrdinalSuffix(
                                                        selectedDate.getDate()
                                                    )}
                                                </span>
                                            </span>
                                        ) : (
                                            "dd/mm/yyyy"
                                        )}
                                    </span>
                                </button>
                                {/* Custom Dialog Content with overlay and large text */}
                                <DialogPortal>
                                    <DialogPrimitive.Overlay
                                        className='fixed inset-0 z-[55] bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 cursor-pointer'
                                        onClick={() => {
                                            setDateDialogOpen(false)
                                            setCalendarOpen(false)
                                        }}
                                    />
                                    {/* Large date text input at top (between top of screen and calendar) */}
                                    <div
                                        className='fixed top-0 left-0 right-0 z-[56] flex items-center justify-center pointer-events-none'
                                        style={{
                                            height: "calc(100vh - 500px)",
                                            paddingTop: "80px",
                                        }}
                                    >
                                        <div
                                            className='text-white text-4xl font-serif font-bold text-center w-full max-w-4xl opacity-90 transition-opacity flex items-center justify-center'
                                            style={{
                                                textShadow:
                                                    "0 2px 8px rgba(0, 0, 0, 0.3)",
                                            }}
                                        >
                                            {tempYear ? (
                                                <div className='flex items-baseline gap-1'>
                                                    <span>{tempYear}</span>
                                                    {tempMonth != null && (
                                                        <>
                                                            <span>,</span>
                                                            <span className='ml-2'>
                                                                {
                                                                    [
                                                                        "Jan",
                                                                        "Feb",
                                                                        "Mar",
                                                                        "Apr",
                                                                        "May",
                                                                        "Jun",
                                                                        "Jul",
                                                                        "Aug",
                                                                        "Sep",
                                                                        "Oct",
                                                                        "Nov",
                                                                        "Dec",
                                                                    ][tempMonth]
                                                                }
                                                            </span>
                                                        </>
                                                    )}
                                                    {tempDay && (
                                                        <div className='flex items-start ml-2 self-baseline'>
                                                            <span>
                                                                {tempDay}
                                                            </span>
                                                            <span className='text-[16px] ml-0.5 leading-none mt-1'>
                                                                {getOrdinalSuffix(
                                                                    tempDay
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className='opacity-30'>
                                                    {dateStep === "year"
                                                        ? "Year"
                                                        : dateStep === "month"
                                                          ? "Month"
                                                          : "Day"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Dialog box at bottom */}
                                    <div className='fixed inset-0 z-[60] flex items-end justify-center p-4 pointer-events-none'>
                                        <DialogPrimitive.Content
                                            onInteractOutside={() => {
                                                // Allow closing on outside click
                                                setDateDialogOpen(false)
                                                setCalendarOpen(false)
                                            }}
                                            onEscapeKeyDown={() => {
                                                // Allow escape to close
                                                setDateDialogOpen(false)
                                                setCalendarOpen(false)
                                            }}
                                            onClick={(e) => {
                                                // Prevent closing when clicking inside dialog
                                                e.stopPropagation()
                                            }}
                                            className='pointer-events-auto max-w-sm w-full mb-0 rounded-t-2xl rounded-b-none border-b-0 bg-transparent backdrop-blur-xl border-white/10 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom'
                                        >
                                            <DialogTitle className='sr-only'>
                                                Select Date
                                            </DialogTitle>
                                            <button
                                                onClick={() => {
                                                    setDateDialogOpen(false)
                                                    setCalendarOpen(false)
                                                }}
                                                className='absolute right-4 top-4 rounded-xs opacity-70 hover:opacity-100 transition-opacity text-[#E6EAFF]/70 hover:text-[#E6EAFF]'
                                                aria-label='Close'
                                            >
                                                <X />
                                            </button>
                                            <div className='space-y-6 pb-6 pt-6 px-6'>
                                                {/* Input field */}
                                                <div className='relative'>
                                                    {dateStep === "year" ? (
                                                        <Calendar className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E6EAFF]/70 pointer-events-none z-10' />
                                                    ) : (
                                                        <button
                                                            type='button'
                                                            onClick={() => {
                                                                if (
                                                                    dateStep ===
                                                                    "month"
                                                                ) {
                                                                    setDateStep(
                                                                        "year"
                                                                    )
                                                                    setTempYear(
                                                                        null
                                                                    )
                                                                } else if (
                                                                    dateStep ===
                                                                    "day"
                                                                ) {
                                                                    setDateStep(
                                                                        "month"
                                                                    )
                                                                    setTempMonth(
                                                                        null
                                                                    )
                                                                }
                                                                setDateInput("")
                                                            }}
                                                            className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E6EAFF]/70 hover:text-[#E6EAFF] z-20 transition-colors'
                                                        >
                                                            <ChevronLeft className='w-5 h-5' />
                                                        </button>
                                                    )}
                                                    <input
                                                        ref={dateInputRef}
                                                        type='text'
                                                        placeholder={
                                                            dateStep === "year"
                                                                ? "Enter your birth year"
                                                                : dateStep ===
                                                                    "month"
                                                                  ? "Enter your birth month"
                                                                  : "Enter your birth day"
                                                        }
                                                        value={dateInput}
                                                        onChange={(e) => {
                                                            handleDateInputChange(
                                                                e.target.value
                                                            )
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (
                                                                e.key ===
                                                                "Enter"
                                                            ) {
                                                                // Manual Enter logic if needed
                                                            }
                                                        }}
                                                        className='w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-[#E6EAFF] placeholder:text-[#E6EAFF]/50 text-base font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                                                    />
                                                </div>
                                                {/* Calendar */}
                                                <div className='w-full flex justify-center'>
                                                    <CalendarComponent
                                                        mode='single'
                                                        selected={selectedDate}
                                                        month={calendarMonth}
                                                        onMonthChange={(
                                                            month
                                                        ) => {
                                                            // Update calendar month when user navigates
                                                            setCalendarMonth(
                                                                month
                                                            )
                                                        }}
                                                        startMonth={
                                                            new Date(100, 0)
                                                        }
                                                        endMonth={
                                                            new Date(9999, 11)
                                                        }
                                                        onSelect={(d) => {
                                                            if (d) {
                                                                onSelectDate(d)
                                                                setCalendarMonth(
                                                                    d
                                                                )
                                                                setTempYear(
                                                                    d.getFullYear()
                                                                )
                                                                setTempMonth(
                                                                    d.getMonth()
                                                                )
                                                                setTempDay(
                                                                    d.getDate()
                                                                )
                                                                // Close dialog after selection immediately for calendar
                                                                setTimeout(
                                                                    () => {
                                                                        setDateDialogOpen(
                                                                            false
                                                                        )
                                                                        setCalendarOpen(
                                                                            false
                                                                        )
                                                                    },
                                                                    1000
                                                                )
                                                            }
                                                        }}
                                                        captionLayout='dropdown'
                                                        disabled={(date) => {
                                                            if (
                                                                type === "birth"
                                                            ) {
                                                                return (
                                                                    date >
                                                                        new Date() ||
                                                                    date <
                                                                        new Date(
                                                                            "1900-01-01"
                                                                        )
                                                                )
                                                            }
                                                            // Transit allows any date
                                                            return false
                                                        }}
                                                        className='rounded-md border-0 bg-transparent'
                                                    />
                                                </div>
                                            </div>
                                        </DialogPrimitive.Content>
                                    </div>
                                </DialogPortal>
                            </Dialog>
                        </div>

                        <div className='relative flex items-center'>
                            <Dialog
                                open={timeDialogOpen}
                                onOpenChange={(open) => {
                                    setTimeDialogOpen(open)
                                    setTimeOpen(open)
                                }}
                            >
                                <button
                                    type='button'
                                    onClick={() => {
                                        setTimeDialogOpen(true)
                                        setTimeOpen(true)
                                    }}
                                    className='w-full pl-10 pr-4 py-1 rounded-md bg-white/[0.1] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.12] transition-all duration-300 text-left relative'
                                >
                                    <Clock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E6EAFF]/70 pointer-events-none z-10' />
                                    <span
                                        className={`text-sm font-medium ${currentTime.hour && currentTime.minute ? "text-[#E6EAFF]" : "text-[#E6EAFF]/50"}`}
                                    >
                                        {currentTime.hour && currentTime.minute
                                            ? formatHour12(
                                                  parseInt(currentTime.hour)
                                              ).replace(
                                                  /\d{2}/,
                                                  (h) =>
                                                      `${h}:${currentTime.minute}`
                                              )
                                            : "hh:mm"}
                                    </span>
                                </button>
                                {/* Custom Dialog Content with time wheels */}
                                <DialogPortal>
                                    <DialogPrimitive.Overlay
                                        className='fixed inset-0 z-[55] bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 cursor-pointer'
                                        onClick={() => {
                                            setTimeDialogOpen(false)
                                            setTimeOpen(false)
                                        }}
                                    />
                                    {/* Dialog box at bottom */}
                                    <div className='fixed inset-0 z-[60] flex items-end justify-center p-4 pointer-events-none'>
                                        <DialogPrimitive.Content
                                            onInteractOutside={() => {
                                                setTimeDialogOpen(false)
                                                setTimeOpen(false)
                                            }}
                                            onEscapeKeyDown={() => {
                                                setTimeDialogOpen(false)
                                                setTimeOpen(false)
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                            }}
                                            className='pointer-events-auto max-w-2xl w-full mb-0 rounded-t-2xl rounded-b-none border-b-0 bg-[#0A0F26]/95 backdrop-blur-xl border-white/10 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom'
                                        >
                                            <DialogTitle className='sr-only'>
                                                Select Time
                                            </DialogTitle>
                                            <button
                                                onClick={() => {
                                                    setTimeDialogOpen(false)
                                                    setTimeOpen(false)
                                                }}
                                                className='absolute right-4 top-4 rounded-xs opacity-70 hover:opacity-100 transition-opacity text-[#E6EAFF]/70 hover:text-[#E6EAFF]'
                                                aria-label='Close'
                                            >
                                                <svg
                                                    className='w-5 h-5'
                                                    fill='none'
                                                    stroke='currentColor'
                                                    viewBox='0 0 24 24'
                                                >
                                                    <path
                                                        strokeLinecap='round'
                                                        strokeLinejoin='round'
                                                        strokeWidth={2}
                                                        d='M6 18L18 6M6 6l12 12'
                                                    />
                                                </svg>
                                            </button>
                                            <div className='space-y-6 pb-6 pt-6 px-6'>
                                                {/* Input field */}
                                                <div className='relative'>
                                                    <Clock className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E6EAFF]/70 pointer-events-none z-10' />
                                                    <input
                                                        ref={timeInputRef}
                                                        type='text'
                                                        placeholder='hh:mm'
                                                        value={timeInput}
                                                        onChange={(e) => {
                                                            const cursorPos =
                                                                e.target
                                                                    .selectionStart ||
                                                                0
                                                            handleTimeInputChange(
                                                                e.target.value
                                                            )
                                                            requestAnimationFrame(
                                                                () => {
                                                                    if (
                                                                        timeInputRef.current
                                                                    ) {
                                                                        const targetPos =
                                                                            Math.min(
                                                                                cursorPos,
                                                                                timeInputRef
                                                                                    .current
                                                                                    .value
                                                                                    .length
                                                                            )
                                                                        timeInputRef.current.setSelectionRange(
                                                                            targetPos,
                                                                            targetPos
                                                                        )
                                                                    }
                                                                }
                                                            )
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (
                                                                e.key ===
                                                                "Enter"
                                                            ) {
                                                                const digits =
                                                                    timeInput.replace(
                                                                        /\D/g,
                                                                        ""
                                                                    )
                                                                if (
                                                                    digits.length ===
                                                                    4
                                                                ) {
                                                                    const hour =
                                                                        parseInt(
                                                                            digits.slice(
                                                                                0,
                                                                                2
                                                                            )
                                                                        )
                                                                    const minute =
                                                                        parseInt(
                                                                            digits.slice(
                                                                                2,
                                                                                4
                                                                            )
                                                                        )
                                                                    if (
                                                                        hour >=
                                                                            0 &&
                                                                        hour <=
                                                                            23 &&
                                                                        minute >=
                                                                            0 &&
                                                                        minute <=
                                                                            59
                                                                    ) {
                                                                        setTimeDialogOpen(
                                                                            false
                                                                        )
                                                                        setTimeOpen(
                                                                            false
                                                                        )
                                                                        e.preventDefault()
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        className='w-full pl-12 pr-16 py-3 rounded-lg bg-white/5 border border-white/10 text-[#E6EAFF] placeholder:text-[#E6EAFF]/50 text-base font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                                                    />
                                                    {currentTime.hour && (
                                                        <span className='absolute right-3 top-1/2 -translate-y-1/2 text-accent pointer-events-none font-bold text-xs bg-accent/10 px-2 py-1 rounded border border-accent/20 tracking-wider'>
                                                            {parseInt(
                                                                currentTime.hour
                                                            ) >= 12
                                                                ? "PM"
                                                                : "AM"}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Time wheels */}
                                                <div className='flex gap-8 justify-center items-center h-48'>
                                                    {/* Hour wheel */}
                                                    <div className='flex-1 max-w-[120px] h-full relative'>
                                                        <div className='absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-white/10 rounded-lg pointer-events-none' />
                                                        <div
                                                            ref={hourWheelRef}
                                                            className='h-full overflow-y-auto scroll-smooth snap-y snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                                                            onScroll={(e) => {
                                                                if (
                                                                    isProgrammaticScrollRef.current
                                                                )
                                                                    return

                                                                isUserScrollingRef.current = true
                                                                const top =
                                                                    e
                                                                        .currentTarget
                                                                        .scrollTop
                                                                const index =
                                                                    Math.round(
                                                                        top / 40
                                                                    )

                                                                if (
                                                                    index >=
                                                                        0 &&
                                                                    index <= 23
                                                                ) {
                                                                    if (
                                                                        scrollEndTimerRef
                                                                            .current
                                                                            .hour
                                                                    )
                                                                        clearTimeout(
                                                                            scrollEndTimerRef
                                                                                .current
                                                                                .hour
                                                                        )
                                                                    scrollEndTimerRef.current.hour =
                                                                        setTimeout(
                                                                            () => {
                                                                                isUserScrollingRef.current = false
                                                                                const val =
                                                                                    index
                                                                                        .toString()
                                                                                        .padStart(
                                                                                            2,
                                                                                            "0"
                                                                                        )
                                                                                if (
                                                                                    val !==
                                                                                    currentTime.hour
                                                                                ) {
                                                                                    setTime(
                                                                                        {
                                                                                            ...currentTime,
                                                                                            hour: val,
                                                                                        }
                                                                                    )
                                                                                }
                                                                            },
                                                                            200
                                                                        )
                                                                }
                                                            }}
                                                        >
                                                            <div className='h-[76px]' />
                                                            {Array.from(
                                                                { length: 24 },
                                                                (_, i) => (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() =>
                                                                            setTime(
                                                                                {
                                                                                    ...currentTime,
                                                                                    hour: i
                                                                                        .toString()
                                                                                        .padStart(
                                                                                            2,
                                                                                            "0"
                                                                                        ),
                                                                                }
                                                                            )
                                                                        }
                                                                        className={`w-full h-10 flex items-center justify-center text-base snap-center transition-opacity ${
                                                                            parseInt(
                                                                                currentTime.hour
                                                                            ) ===
                                                                            i
                                                                                ? "text-white font-bold opacity-100"
                                                                                : "text-white/40 opacity-50"
                                                                        }`}
                                                                    >
                                                                        {formatHour12(
                                                                            i
                                                                        )}
                                                                    </button>
                                                                )
                                                            )}
                                                            <div className='h-[76px]' />
                                                        </div>
                                                    </div>

                                                    {/* Minute wheel */}
                                                    <div className='flex-1 max-w-[100px] h-full relative'>
                                                        <div className='absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-white/10 rounded-lg pointer-events-none' />
                                                        <div
                                                            ref={minuteWheelRef}
                                                            className='h-full overflow-y-auto scroll-smooth snap-y snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                                                            onScroll={(e) => {
                                                                if (
                                                                    isProgrammaticScrollRef.current
                                                                )
                                                                    return

                                                                isUserScrollingRef.current = true
                                                                const top =
                                                                    e
                                                                        .currentTarget
                                                                        .scrollTop
                                                                const index =
                                                                    Math.round(
                                                                        top / 40
                                                                    )

                                                                if (
                                                                    index >=
                                                                        0 &&
                                                                    index <= 59
                                                                ) {
                                                                    if (
                                                                        scrollEndTimerRef
                                                                            .current
                                                                            .minute
                                                                    )
                                                                        clearTimeout(
                                                                            scrollEndTimerRef
                                                                                .current
                                                                                .minute
                                                                        )
                                                                    scrollEndTimerRef.current.minute =
                                                                        setTimeout(
                                                                            () => {
                                                                                isUserScrollingRef.current = false
                                                                                const val =
                                                                                    index
                                                                                        .toString()
                                                                                        .padStart(
                                                                                            2,
                                                                                            "0"
                                                                                        )
                                                                                if (
                                                                                    val !==
                                                                                    currentTime.minute
                                                                                ) {
                                                                                    setTime(
                                                                                        {
                                                                                            ...currentTime,
                                                                                            minute: val,
                                                                                        }
                                                                                    )
                                                                                }
                                                                            },
                                                                            200
                                                                        )
                                                                }
                                                            }}
                                                        >
                                                            <div className='h-[76px]' />
                                                            {Array.from(
                                                                { length: 60 },
                                                                (_, i) => (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() =>
                                                                            setTime(
                                                                                {
                                                                                    ...currentTime,
                                                                                    minute: i
                                                                                        .toString()
                                                                                        .padStart(
                                                                                            2,
                                                                                            "0"
                                                                                        ),
                                                                                }
                                                                            )
                                                                        }
                                                                        className={`w-full h-10 flex items-center justify-center text-lg snap-center transition-opacity ${
                                                                            parseInt(
                                                                                currentTime.minute
                                                                            ) ===
                                                                            i
                                                                                ? "text-white font-bold opacity-100"
                                                                                : "text-white/40 opacity-50"
                                                                        }`}
                                                                    >
                                                                        {i
                                                                            .toString()
                                                                            .padStart(
                                                                                2,
                                                                                "0"
                                                                            )}
                                                                    </button>
                                                                )
                                                            )}
                                                            <div className='h-[76px]' />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </DialogPrimitive.Content>
                                    </div>
                                </DialogPortal>
                            </Dialog>
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <div className='flex items-center gap-2'>
                            <Popover
                                open={locationOpen}
                                onOpenChange={(open) => {
                                    if (!open) {
                                        setLocationStep("country")
                                        setSearchCountry("")
                                        setSearchState("")
                                    }
                                    setLocationOpen(open)
                                }}
                            >
                                <PopoverTrigger asChild>
                                    <button
                                        onClick={() => {
                                            setLocationOpen(true)
                                        }}
                                        className='flex-1 px-4 py-1 rounded-md bg-white/[0.1] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.12] transition-all duration-300 text-left flex items-center justify-between group'
                                    >
                                        <div className='flex items-center gap-3'>
                                            <MapPin className='w-4 h-4 text-[#E6EAFF]/70 group-hover:text-[#E6EAFF] transition-colors' />
                                            <span
                                                className={`text-sm font-medium ${locationValue && !locationValue.toLowerCase().includes("select") ? "text-[#E6EAFF]" : "text-[#E6EAFF]/50"}`}
                                            >
                                                {locationValue}
                                            </span>
                                        </div>
                                        <svg
                                            className='w-4 h-4 text-[#E6EAFF]/50'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M9 5l7 7-7 7'
                                            />
                                        </svg>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className='w-80 p-0 bg-[#0A0F26]/95 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                    <div className='p-4 space-y-4'>
                                        {locationStep === "state" && (
                                            <button
                                                onClick={() => {
                                                    setLocationStep("country")
                                                    setSearchState("")
                                                }}
                                                className='flex items-center gap-2 text-sm text-[#E6EAFF]/70 hover:text-[#E6EAFF] transition-colors mb-2'
                                            >
                                                <ChevronLeft className='w-4 h-4' />
                                                Back to countries
                                            </button>
                                        )}
                                        {locationStep === "country" ? (
                                            <div>
                                                <input
                                                    type='text'
                                                    placeholder='Search countries...'
                                                    value={searchCountry}
                                                    onChange={(e) =>
                                                        setSearchCountry(
                                                            e.target.value
                                                        )
                                                    }
                                                    className='w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[#E6EAFF] placeholder-[#E6EAFF]/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                                                />
                                                <div className='max-h-40 overflow-y-auto mt-2 space-y-1'>
                                                    <button
                                                        onClick={
                                                            onUseCurrentLocation
                                                        }
                                                        className='w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]'
                                                    >
                                                        <MapPin className='w-4 h-4' />
                                                        Use my location
                                                    </button>
                                                    {filteredCountries.map(
                                                        (c) => (
                                                            <button
                                                                key={c.code}
                                                                onClick={() => {
                                                                    onSelectCountry(
                                                                        c.name
                                                                    )
                                                                    setSearchCountry(
                                                                        ""
                                                                    )
                                                                    setLocationStep(
                                                                        "state"
                                                                    )
                                                                }}
                                                                className='w-full text-left px-3 py-2 rounded-lg text-sm transition-colors text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]'
                                                            >
                                                                {c.name}
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <input
                                                    type='text'
                                                    placeholder='Search states...'
                                                    value={searchState}
                                                    onChange={(e) =>
                                                        setSearchState(
                                                            e.target.value
                                                        )
                                                    }
                                                    className='w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[#E6EAFF] placeholder-[#E6EAFF]/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                                                />
                                                <div className='max-h-40 overflow-y-auto mt-2 space-y-1'>
                                                    {filteredStates.map((s) => (
                                                        <button
                                                            key={s.code}
                                                            onClick={() => {
                                                                onSelectState(
                                                                    s.name
                                                                )
                                                                setSearchState(
                                                                    ""
                                                                )
                                                                setLocationOpen(
                                                                    false
                                                                )
                                                                setLocationStep(
                                                                    "country"
                                                                )
                                                            }}
                                                            className='w-full text-left px-3 py-2 rounded-lg text-sm transition-colors text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]'
                                                        >
                                                            {s.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            {onButtonClick && (
                                <Button
                                    onClick={onButtonClick}
                                    disabled={buttonDisabled || buttonLoading}
                                    className='py-1.5 px-3 md:px-5 rounded-md bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 hover:border-primary/60 text-white font-medium text-sm shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)] hover:shadow-[0_10px_30px_-10px_rgba(56,189,248,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 h-auto'
                                >
                                    {buttonLoading ? (
                                        <>
                                            <Loader2 className='w-4 h-4 animate-spin' />
                                            <span className='hidden md:inline'>
                                                {buttonLoadingLabel ||
                                                    "Generating..."}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className='w-2 h-2' />
                                            <span className='hidden md:inline'>
                                                {buttonLabel || "Generate"}
                                            </span>
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Section
