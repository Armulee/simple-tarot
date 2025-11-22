"use client"

import { useState } from "react"
import { TypewriterText } from "../../typewriter-text"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { CustomTimePicker } from "@/components/ui/custom-time-picker"
import { LocationSelector } from "@/components/ui/location-selector"

export default function BirthChart() {
    const [day, setDay] = useState("")
    const [month, setMonth] = useState("")
    const [year, setYear] = useState("")
    const [hour, setHour] = useState("")
    const [minute, setMinute] = useState("")
    const [country, setCountry] = useState<string>("")
    const [stateProv, setStateProv] = useState<string>("")

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
                <Card className='w-full p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                    <div className='space-y-6'>
                        {/* Date Inputs */}
                        <div className='grid grid-cols-3 gap-4'>
                            <CustomDatePicker
                                value={day}
                                onChange={setDay}
                                min={1}
                                max={31}
                                placeholder={"DD"}
                                label={"Day"}
                            />
                            <CustomDatePicker
                                value={month}
                                onChange={setMonth}
                                min={1}
                                max={12}
                                placeholder={"MM"}
                                label={"Month"}
                            />
                            <CustomDatePicker
                                value={year}
                                onChange={setYear}
                                min={1900}
                                max={new Date().getFullYear()}
                                placeholder={"YYYY"}
                                label={"Year"}
                            />
                        </div>

                        {/* Time Inputs */}
                        <div className='grid grid-cols-2 gap-4'>
                            <CustomTimePicker
                                value={hour}
                                onChange={setHour}
                                min={0}
                                max={23}
                                placeholder={"HH"}
                                label={"Hour"}
                            />
                            <CustomTimePicker
                                value={minute}
                                onChange={setMinute}
                                min={0}
                                max={59}
                                placeholder={"MM"}
                                label={"Minute"}
                            />
                        </div>

                        {/* Location Input */}
                        <div>
                            <LocationSelector
                                selectedCountry={country}
                                selectedState={stateProv}
                                onCountryChange={setCountry}
                                onStateChange={setStateProv}
                            />
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