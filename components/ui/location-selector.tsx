"use client"

import { useState, useEffect } from "react"
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
import ccs from "countrycitystatejson"

interface Country {
    name: string
    shortName: string
}

interface State {
    name: string
    shortName: string
}

interface LocationSelectorProps {
    selectedCountry: string
    selectedState: string
    onCountryChange: (country: string) => void
    onStateChange: (state: string) => void
    className?: string
}

export function LocationSelector({
    selectedCountry,
    selectedState,
    onCountryChange,
    onStateChange,
    className,
}: LocationSelectorProps) {
    const [isCountryOpen, setIsCountryOpen] = useState(false)
    const [isStateOpen, setIsStateOpen] = useState(false)
    const [searchCountry, setSearchCountry] = useState("")
    const [searchState, setSearchState] = useState("")
    const [countries, setCountries] = useState<Country[]>([])
    const [states, setStates] = useState<State[]>([])

    // Load countries on component mount
    useEffect(() => {
        try {
            const countriesData = ccs.getCountries()
            const mappedCountries: Country[] = countriesData.map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (country: any) => ({
                    name: country.name || country.countryName || "",
                    shortName: country.shortName || country.iso2 || "",
                })
            )
            setCountries(mappedCountries)
        } catch (error) {
            console.error("Error loading countries:", error)
        }
    }, [])

    // Load states when country changes
    useEffect(() => {
        if (selectedCountry) {
            try {
                const countryCode = countries.find(
                    (c) => c.name === selectedCountry
                )?.shortName
                if (countryCode) {
                    const statesData = ccs.getStatesByShort(countryCode)
                    if (statesData) {
                        const mappedStates: State[] = statesData.map(
                            (stateName: string) => ({
                                name: stateName,
                                shortName: stateName, // Use name as shortName for states
                            })
                        )
                        setStates(mappedStates)
                    } else {
                        setStates([])
                    }
                }
            } catch (error) {
                console.error("Error loading states:", error)
                setStates([])
            }
        } else {
            setStates([])
        }
    }, [selectedCountry, countries])

    const filteredCountries = countries.filter((country) =>
        country.name.toLowerCase().includes(searchCountry.toLowerCase())
    )

    const filteredStates = states.filter((state) =>
        state.name.toLowerCase().includes(searchState.toLowerCase())
    )

    const handleCountrySelect = (country: string) => {
        onCountryChange(country)
        onStateChange("") // Reset state when country changes
        setIsCountryOpen(false)
        setSearchCountry("")
    }

    const handleStateSelect = (state: string) => {
        onStateChange(state)
        setIsStateOpen(false)
        setSearchState("")
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Country and State Selectors */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Country Selector */}
                <div className='space-y-2'>
                    <Label className='text-white/80 text-sm font-medium'>
                        Country
                    </Label>
                    <Popover
                        open={isCountryOpen}
                        onOpenChange={setIsCountryOpen}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                variant='outline'
                                role='combobox'
                                aria-expanded={isCountryOpen}
                                className='w-full justify-between bg-white/5 border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/30'
                            >
                                <span
                                    className={
                                        selectedCountry
                                            ? "text-white"
                                            : "text-white/50"
                                    }
                                >
                                    {selectedCountry || "Select Country"}
                                </span>
                                <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className='w-full p-0 bg-black/90 backdrop-blur-sm border-white/20'
                            align='start'
                        >
                            <div className='p-2'>
                                <Input
                                    type='text'
                                    placeholder='Search countries...'
                                    value={searchCountry}
                                    onChange={(e) =>
                                        setSearchCountry(e.target.value)
                                    }
                                    className='w-full bg-white/5 border-white/20 text-white placeholder-white/50'
                                />
                            </div>
                            <div className='max-h-48 overflow-y-auto'>
                                {filteredCountries.map((country) => (
                                    <Button
                                        key={country.shortName}
                                        variant='ghost'
                                        onClick={() =>
                                            handleCountrySelect(country.name)
                                        }
                                        className={cn(
                                            "w-full justify-start text-white hover:bg-white/10",
                                            selectedCountry === country.name &&
                                                "bg-cosmic-purple/20 text-cosmic-purple font-semibold"
                                        )}
                                    >
                                        {country.name}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* State/Province Selector */}
                <div className='space-y-2'>
                    <Label className='text-white/80 text-sm font-medium'>
                        State/Province
                    </Label>
                    <Popover open={isStateOpen} onOpenChange={setIsStateOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant='outline'
                                role='combobox'
                                aria-expanded={isStateOpen}
                                disabled={!selectedCountry}
                                className={cn(
                                    "w-full justify-between bg-white/5 border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/30",
                                    !selectedCountry &&
                                        "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <span
                                    className={
                                        selectedState
                                            ? "text-white"
                                            : "text-white/50"
                                    }
                                >
                                    {selectedState ||
                                        (selectedCountry
                                            ? "Select State/Province"
                                            : "Select Country First")}
                                </span>
                                <ChevronDown
                                    className={cn(
                                        "ml-2 h-4 w-4 shrink-0 opacity-50",
                                        !selectedCountry && "opacity-50"
                                    )}
                                />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className='w-full p-0 bg-black/90 backdrop-blur-sm border-white/20'
                            align='start'
                        >
                            <div className='p-2'>
                                <Input
                                    type='text'
                                    placeholder='Search states...'
                                    value={searchState}
                                    onChange={(e) =>
                                        setSearchState(e.target.value)
                                    }
                                    className='w-full bg-white/5 border-white/20 text-white placeholder-white/50'
                                />
                            </div>
                            <div className='max-h-48 overflow-y-auto'>
                                {filteredStates.map((state) => (
                                    <Button
                                        key={state.shortName}
                                        variant='ghost'
                                        onClick={() =>
                                            handleStateSelect(state.name)
                                        }
                                        className={cn(
                                            "w-full justify-start text-white hover:bg-white/10",
                                            selectedState === state.name &&
                                                "bg-cosmic-purple/20 text-cosmic-purple font-semibold"
                                        )}
                                    >
                                        {state.name}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>
    )
}
