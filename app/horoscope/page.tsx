"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, MapPin, Clock, Star } from "lucide-react"

interface LocationData {
    latitude: number
    longitude: number
    city?: string
    country?: string
}

export default function HoroscopePage() {
    const [birthDate, setBirthDate] = useState({
        day: "",
        month: "",
        year: "",
        hour: "",
        minute: "",
    })
    const [transitDate, setTransitDate] = useState({
        day: "",
        month: "",
        year: "",
    })
    const [location, setLocation] = useState<LocationData | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    // Get user's current location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                ({ coords }) => {
                    setLocation({
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                    })
                },
                (error) => {
                    console.error("Error getting location:", error)
                    setError(
                        "Unable to get your location. Please enter manually."
                    )
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            )
        } else {
            setError("Geolocation is not supported by this browser.")
        }
    }, [])

    const handleBirthDateChange = (field: string, value: string) => {
        setBirthDate((prev) => ({ ...prev, [field]: value }))
    }

    const handleTransitDateChange = (field: string, value: string) => {
        setTransitDate((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            // Validate required fields
            if (
                !birthDate.day ||
                !birthDate.month ||
                !birthDate.year ||
                !birthDate.hour ||
                !birthDate.minute
            ) {
                throw new Error("Please fill in all birth date fields")
            }

            if (!transitDate.day || !transitDate.month || !transitDate.year) {
                throw new Error("Please fill in all transit date fields")
            }

            if (!location) {
                throw new Error("Location is required")
            }

            // Create birth date string
            const birthDateTime = new Date(
                parseInt(birthDate.year),
                parseInt(birthDate.month) - 1,
                parseInt(birthDate.day),
                parseInt(birthDate.hour),
                parseInt(birthDate.minute)
            )

            // Create transit date string
            const transitDateTime = new Date(
                parseInt(transitDate.year),
                parseInt(transitDate.month) - 1,
                parseInt(transitDate.day)
            )

            // Here you would typically send the data to your horoscope API
            console.log("Birth Date:", birthDateTime)
            console.log("Transit Date:", transitDateTime)
            console.log("Location:", location)

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 2000))

            // For now, just show success message
            alert("Horoscope data submitted successfully! (This is a demo)")
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className='space-y-6'>
            {/* 'Horoscope Reading' */}
            {/* 'Discover your cosmic destiny with personalized astrological insights' */}

            {/* Birth Date Section */}
            <Card className='bg-black/20 backdrop-blur-sm border-white/10 p-6'>
                <div className='flex items-center gap-2 mb-4'>
                    <Calendar className='w-5 h-5 text-cosmic-purple' />
                    <h3 className='text-lg font-semibold text-white'>
                        Birth Information
                    </h3>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
                    <div>
                        <Label htmlFor='birth-day' className='text-white/80'>
                            Day
                        </Label>
                        <Input
                            id='birth-day'
                            type='number'
                            min='1'
                            max='31'
                            value={birthDate.day}
                            onChange={(e) =>
                                handleBirthDateChange("day", e.target.value)
                            }
                            className='bg-white/5 border-white/20 text-white placeholder:text-white/50'
                            placeholder='DD'
                        />
                    </div>
                    <div>
                        <Label htmlFor='birth-month' className='text-white/80'>
                            Month
                        </Label>
                        <Input
                            id='birth-month'
                            type='number'
                            min='1'
                            max='12'
                            value={birthDate.month}
                            onChange={(e) =>
                                handleBirthDateChange("month", e.target.value)
                            }
                            className='bg-white/5 border-white/20 text-white placeholder:text-white/50'
                            placeholder='MM'
                        />
                    </div>
                    <div>
                        <Label htmlFor='birth-year' className='text-white/80'>
                            Year
                        </Label>
                        <Input
                            id='birth-year'
                            type='number'
                            min='1900'
                            max='2025'
                            value={birthDate.year}
                            onChange={(e) =>
                                handleBirthDateChange("year", e.target.value)
                            }
                            className='bg-white/5 border-white/20 text-white placeholder:text-white/50'
                            placeholder='YYYY'
                        />
                    </div>
                    <div>
                        <Label htmlFor='birth-hour' className='text-white/80'>
                            Hour
                        </Label>
                        <Input
                            id='birth-hour'
                            type='number'
                            min='0'
                            max='23'
                            value={birthDate.hour}
                            onChange={(e) =>
                                handleBirthDateChange("hour", e.target.value)
                            }
                            className='bg-white/5 border-white/20 text-white placeholder:text-white/50'
                            placeholder='HH'
                        />
                    </div>
                    <div>
                        <Label htmlFor='birth-minute' className='text-white/80'>
                            Minute
                        </Label>
                        <Input
                            id='birth-minute'
                            type='number'
                            min='0'
                            max='59'
                            value={birthDate.minute}
                            onChange={(e) =>
                                handleBirthDateChange("minute", e.target.value)
                            }
                            className='bg-white/5 border-white/20 text-white placeholder:text-white/50'
                            placeholder='MM'
                        />
                    </div>
                </div>
            </Card>

            {/* Location Section */}
            <Card className='bg-black/20 backdrop-blur-sm border-white/10 p-6'>
                <div className='flex items-center gap-2 mb-4'>
                    <MapPin className='w-5 h-5 text-cosmic-purple' />
                    <h3 className='text-lg font-semibold text-white'>
                        Birth Location
                    </h3>
                </div>

                {location ? (
                    <div className='space-y-2'>
                        <p className='text-white/80'>
                            <strong>Latitude:</strong>{" "}
                            {location.latitude.toFixed(6)}
                        </p>
                        <p className='text-white/80'>
                            <strong>Longitude:</strong>{" "}
                            {location.longitude.toFixed(6)}
                        </p>
                        {location.city && (
                            <p className='text-white/80'>
                                <strong>Location:</strong> {location.city},{" "}
                                {location.country}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className='text-white/60'>
                        {error ? (
                            <p className='text-red-400'>{error}</p>
                        ) : (
                            <p>Getting your location...</p>
                        )}
                    </div>
                )}
            </Card>

            {/* Transit Date Section */}
            <Card className='bg-black/20 backdrop-blur-sm border-white/10 p-6'>
                <div className='flex items-center gap-2 mb-4'>
                    <Clock className='w-5 h-5 text-cosmic-purple' />
                    <h3 className='text-lg font-semibold text-white'>
                        Transit Date
                    </h3>
                </div>
                <p className='text-white/60 text-sm mb-4'>
                    Select the date you want to predict for
                </p>

                <div className='grid grid-cols-3 gap-4'>
                    <div>
                        <Label htmlFor='transit-day' className='text-white/80'>
                            Day
                        </Label>
                        <Input
                            id='transit-day'
                            type='number'
                            min='1'
                            max='31'
                            value={transitDate.day}
                            onChange={(e) =>
                                handleTransitDateChange("day", e.target.value)
                            }
                            className='bg-white/5 border-white/20 text-white placeholder:text-white/50'
                            placeholder='DD'
                        />
                    </div>
                    <div>
                        <Label
                            htmlFor='transit-month'
                            className='text-white/80'
                        >
                            Month
                        </Label>
                        <Input
                            id='transit-month'
                            type='number'
                            min='1'
                            max='12'
                            value={transitDate.month}
                            onChange={(e) =>
                                handleTransitDateChange("month", e.target.value)
                            }
                            className='bg-white/5 border-white/20 text-white placeholder:text-white/50'
                            placeholder='MM'
                        />
                    </div>
                    <div>
                        <Label htmlFor='transit-year' className='text-white/80'>
                            Year
                        </Label>
                        <Input
                            id='transit-year'
                            type='number'
                            min='2024'
                            max='2030'
                            value={transitDate.year}
                            onChange={(e) =>
                                handleTransitDateChange("year", e.target.value)
                            }
                            className='bg-white/5 border-white/20 text-white placeholder:text-white/50'
                            placeholder='YYYY'
                        />
                    </div>
                </div>
            </Card>

            {/* Error Message */}
            {error && <div className='text-red-400 text-center'>{error}</div>}

            {/* Submit Button */}
            <Button
                type='submit'
                disabled={isLoading || !location}
                className='w-full bg-gradient-to-r from-cosmic-purple to-cosmic-blue hover:from-cosmic-purple/80 hover:to-cosmic-blue/80 text-white font-semibold py-3 rounded-lg transition-all duration-300'
            >
                {isLoading ? (
                    <div className='flex items-center gap-2'>
                        <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                        Generating Horoscope...
                    </div>
                ) : (
                    <div className='flex items-center gap-2'>
                        <Star className='w-4 h-4' />
                        Generate Horoscope Reading
                    </div>
                )}
            </Button>
        </form>
    )
}
