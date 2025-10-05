"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Palette,
    Moon,
    Sun,
    Sparkles,
    Star,
    Zap,
    Eye,
    Check,
    Wand2,
} from "lucide-react"

interface Theme {
    id: string
    name: string
    description: string
    icon: React.ReactNode
    preview: string
    colors: {
        primary: string
        secondary: string
        accent: string
    }
    available: boolean
}

export default function ThemePage() {
    const [selectedTheme, setSelectedTheme] = useState("default")

    const themes: Theme[] = [
        {
            id: "default",
            name: "Default",
            description:
                "The classic Asking Fate experience with cosmic purple and golden accents",
            icon: <Palette className='w-6 h-6' />,
            preview:
                "bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900",
            colors: {
                primary: "#8B5CF6",
                secondary: "#F59E0B",
                accent: "#10B981",
            },
            available: true,
        },
        {
            id: "antiverse",
            name: "Anti-Verse",
            description:
                "A dark, mysterious theme with inverted colors and cosmic shadows",
            icon: <Moon className='w-6 h-6' />,
            preview: "bg-gradient-to-br from-gray-900 via-black to-slate-900",
            colors: {
                primary: "#1F2937",
                secondary: "#6B7280",
                accent: "#EF4444",
            },
            available: true,
        },
        {
            id: "zodiac",
            name: "Zodiac",
            description:
                "Astrological theme with celestial blues and starry gold accents",
            icon: <Star className='w-6 h-6' />,
            preview:
                "bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900",
            colors: {
                primary: "#3B82F6",
                secondary: "#FBBF24",
                accent: "#8B5CF6",
            },
            available: true,
        },
        {
            id: "singularity",
            name: "Singularity",
            description:
                "Minimalist black hole theme with deep space gradients",
            icon: <Eye className='w-6 h-6' />,
            preview: "bg-gradient-to-br from-black via-gray-900 to-black",
            colors: {
                primary: "#000000",
                secondary: "#FFFFFF",
                accent: "#FFD700",
            },
            available: true,
        },
        {
            id: "luminous",
            name: "Luminous",
            description:
                "Bright and ethereal theme with soft pastels and gentle glows",
            icon: <Sun className='w-6 h-6' />,
            preview:
                "bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-100",
            colors: {
                primary: "#FEF3C7",
                secondary: "#F3E8FF",
                accent: "#A78BFA",
            },
            available: true,
        },
        {
            id: "mystic",
            name: "Mystic",
            description:
                "Enchanted forest theme with deep greens and mystical purples",
            icon: <Wand2 className='w-6 h-6' />,
            preview:
                "bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900",
            colors: {
                primary: "#059669",
                secondary: "#7C3AED",
                accent: "#F59E0B",
            },
            available: true,
        },
    ]

    const handleThemeSelect = (themeId: string) => {
        setSelectedTheme(themeId)
        // TODO: Implement theme switching logic
        console.log("Selected theme:", themeId)
    }

    const getThemeStatus = (theme: Theme) => {
        if (!theme.available) {
            return (
                <Badge
                    variant='outline'
                    className='bg-gray-500/20 text-gray-400 border-gray-400/40'
                >
                    Coming Soon
                </Badge>
            )
        }
        if (selectedTheme === theme.id) {
            return (
                <Badge
                    variant='outline'
                    className='bg-green-500/20 text-green-300 border-green-400/40'
                >
                    Active
                </Badge>
            )
        }
        return (
            <Badge
                variant='outline'
                className='bg-blue-500/20 text-blue-300 border-blue-400/40'
            >
                Available
            </Badge>
        )
    }

    return (
        <div className='min-h-screen bg-background p-6 relative overflow-hidden'>
            <div className='max-w-6xl mx-auto space-y-8 pt-10 relative z-10'>
                {/* Header */}
                <div className='text-center space-y-4'>
                    <h1 className='text-4xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                        Theme Settings
                    </h1>
                    <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
                        Choose your preferred visual theme to personalize your
                        Asking Fate experience
                    </p>
                </div>

                {/* Current Theme Preview */}
                <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                    <div className='text-center space-y-4'>
                        <div className='flex items-center justify-center space-x-2'>
                            <Sparkles className='w-6 h-6 text-primary' />
                            <h2 className='text-2xl font-bold text-white'>
                                Current Theme
                            </h2>
                        </div>
                        <div
                            className={`w-full h-32 rounded-lg ${
                                themes.find((t) => t.id === selectedTheme)
                                    ?.preview
                            } border border-white/20`}
                        ></div>
                        <h3 className='text-xl font-semibold text-white'>
                            {themes.find((t) => t.id === selectedTheme)?.name}
                        </h3>
                        <p className='text-gray-300 max-w-md mx-auto'>
                            {
                                themes.find((t) => t.id === selectedTheme)
                                    ?.description
                            }
                        </p>
                    </div>
                </Card>

                {/* Theme Grid */}
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {themes.map((theme) => (
                        <Card
                            key={theme.id}
                            className={`bg-card/50 border-border/30 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 backdrop-blur-sm cursor-pointer ${
                                selectedTheme === theme.id
                                    ? "border-primary/50 ring-2 ring-primary/30"
                                    : "border-border/30 hover:border-primary/30"
                            } ${
                                !theme.available
                                    ? "opacity-60 cursor-not-allowed"
                                    : ""
                            }`}
                            onClick={() =>
                                theme.available && handleThemeSelect(theme.id)
                            }
                        >
                            <div className='p-6 space-y-4'>
                                {/* Theme Preview */}
                                <div
                                    className={`w-full h-24 rounded-lg ${theme.preview} border border-white/20 relative overflow-hidden`}
                                >
                                    {selectedTheme === theme.id && (
                                        <div className='absolute inset-0 bg-black/20 flex items-center justify-center'>
                                            <Check className='w-8 h-8 text-green-400' />
                                        </div>
                                    )}
                                    {!theme.available && (
                                        <div className='absolute inset-0 bg-black/40 flex items-center justify-center'>
                                            <span className='text-gray-400 text-sm font-medium'>
                                                Coming Soon
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Theme Info */}
                                <div className='space-y-3'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center space-x-2'>
                                            {theme.icon}
                                            <h3 className='text-lg font-semibold text-white'>
                                                {theme.name}
                                            </h3>
                                        </div>
                                        {getThemeStatus(theme)}
                                    </div>

                                    <p className='text-sm text-gray-300 leading-relaxed'>
                                        {theme.description}
                                    </p>

                                    {/* Color Palette */}
                                    <div className='flex space-x-2'>
                                        {Object.entries(theme.colors).map(
                                            ([key, color]) => (
                                                <div
                                                    key={key}
                                                    className='w-6 h-6 rounded-full border border-white/20'
                                                    style={{
                                                        backgroundColor: color,
                                                    }}
                                                    title={`${key}: ${color}`}
                                                ></div>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Action Button */}
                                {theme.available && (
                                    <Button
                                        variant={
                                            selectedTheme === theme.id
                                                ? "default"
                                                : "outline"
                                        }
                                        size='sm'
                                        className={`w-full transition-all duration-300 ${
                                            selectedTheme === theme.id
                                                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                                : "border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                                        }`}
                                        disabled={!theme.available}
                                    >
                                        {selectedTheme === theme.id ? (
                                            <>
                                                <Check className='w-4 h-4 mr-2' />
                                                Active
                                            </>
                                        ) : (
                                            "Select Theme"
                                        )}
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Theme Information */}
                <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                    <div className='text-center space-y-4'>
                        <div className='flex items-center justify-center space-x-2'>
                            <Zap className='w-6 h-6 text-primary' />
                            <h2 className='text-2xl font-bold text-white'>
                                Theme Features
                            </h2>
                        </div>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-6'>
                            <div className='text-center space-y-2'>
                                <div className='w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto'>
                                    <Eye className='w-6 h-6 text-primary' />
                                </div>
                                <h3 className='font-semibold text-white'>
                                    Visual Experience
                                </h3>
                                <p className='text-sm text-gray-300'>
                                    Each theme offers a unique visual experience
                                    with custom colors and gradients
                                </p>
                            </div>
                            <div className='text-center space-y-2'>
                                <div className='w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mx-auto'>
                                    <Palette className='w-6 h-6 text-secondary' />
                                </div>
                                <h3 className='font-semibold text-white'>
                                    Custom Colors
                                </h3>
                                <p className='text-sm text-gray-300'>
                                    Themes include carefully selected color
                                    palettes for optimal reading experience
                                </p>
                            </div>
                            <div className='text-center space-y-2'>
                                <div className='w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto'>
                                    <Sparkles className='w-6 h-6 text-accent' />
                                </div>
                                <h3 className='font-semibold text-white'>
                                    Mood Setting
                                </h3>
                                <p className='text-sm text-gray-300'>
                                    Choose a theme that matches your mood and
                                    enhances your mystical journey
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
