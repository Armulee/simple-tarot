"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    User,
    Save,
    Calendar,
    Sparkles,
    Star,
    Moon,
    Sun,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useProfile } from "@/contexts/profile-context"

export default function ProfilePage() {
    const { user } = useAuth()
    const { profile, updateProfile } = useProfile()
    const [isLoading, setIsLoading] = useState(false)
    const [profileData, setProfileData] = useState({
        name: "",
        bio: "",
        birthDate: "",
        birthTime: "",
        birthPlace: "",
        job: "",
        gender: "",
    })

    // Update profile data when profile context changes
    useEffect(() => {
        if (profile) {
            setProfileData({
                name: profile.name || user?.user_metadata?.name || "",
                bio: profile.bio || "",
                birthDate: profile.birth_date || "",
                birthTime: profile.birth_time || "",
                birthPlace: profile.birth_place || "",
                job: profile.job || "",
                gender: profile.gender || "",
            })
        }
    }, [profile, user])

    const handleInputChange = (field: string, value: string) => {
        setProfileData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                toast.error("Please sign in to update your profile")
                return
            }

            const response = await fetch("/api/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    name: profileData.name,
                    bio: profileData.bio,
                    birthDate: profileData.birthDate,
                    birthTime: profileData.birthTime,
                    birthPlace: profileData.birthPlace,
                    job: profileData.job,
                    gender: profileData.gender,
                }),
            })

            if (response.ok) {
                const { profile: updatedProfile } = await response.json()
                updateProfile(updatedProfile)
                toast.success("Profile updated successfully!")
            } else {
                const errorData = await response.json()
                toast.error(errorData.error || "Failed to update profile")
            }
        } catch (error) {
            console.error("Profile update error:", error)
            toast.error("Failed to update profile. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const genderOptions = [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "non-binary", label: "Non-binary" },
        { value: "prefer-not-to-say", label: "Prefer not to say" },
    ]

    return (
        <div className='min-h-screen relative overflow-x-hidden'>
            <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-full'>
                <div className='text-center space-y-6 mb-12'>
                    <div className='flex items-center justify-center space-x-3 mb-4'>
                        <div className='p-3 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 backdrop-blur-sm border border-accent/30'>
                            <Sparkles className='w-8 h-8 text-accent' />
                        </div>
                        <h1 className='text-3xl sm:text-4xl font-bold text-transparent bg-gradient-to-r from-accent to-primary bg-clip-text'>
                            Profile Settings
                        </h1>
                    </div>
                    <p className='text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-4'>
                        Customize your profile information and reading
                        preferences to enhance your mystical journey
                    </p>
                </div>

                <div className='max-w-4xl mx-auto space-y-6 px-2 sm:px-0 w-full'>
                    <Card className='bg-card/50 border-border/30 p-4 sm:p-6 lg:p-8 shadow-xl shadow-black/20 backdrop-blur-sm hover:border-primary/40 transition-all duration-300 w-full max-w-full overflow-hidden'>
                        <div className='space-y-6'>
                            <div className='flex items-center space-x-3 mb-6'>
                                <div className='p-2 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30'>
                                    <User className='w-5 h-5 text-accent' />
                                </div>
                                <h2 className='text-xl sm:text-2xl font-bold text-white'>
                                    Profile Information
                                </h2>
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                <div className='space-y-2'>
                                    <Label
                                        htmlFor='name'
                                        className='text-white font-semibold flex items-center gap-2'
                                    >
                                        <Star className='w-4 h-4' />
                                        Full Name *
                                    </Label>
                                    <Input
                                        id='name'
                                        value={profileData.name}
                                        onChange={(e) =>
                                            handleInputChange(
                                                "name",
                                                e.target.value
                                            )
                                        }
                                        className='bg-background/40 border-border/40 text-white placeholder-gray-400 focus:border-accent/50 focus:ring-accent/20 transition-all duration-300'
                                        placeholder='Enter your full name'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label
                                        htmlFor='gender'
                                        className='text-white font-semibold flex items-center gap-2'
                                    >
                                        <Moon className='w-4 h-4' />
                                        Gender
                                    </Label>
                                    <Select
                                        value={profileData.gender}
                                        onValueChange={(value) =>
                                            handleInputChange(
                                                "gender",
                                                value
                                            )
                                        }
                                    >
                                        <SelectTrigger className='bg-background/40 border-border/40 text-white focus:border-accent/50 focus:ring-accent/20 transition-all duration-300'>
                                            <SelectValue placeholder='Select gender' />
                                        </SelectTrigger>
                                        <SelectContent className='bg-background/95 border-border/40 backdrop-blur-md'>
                                            {genderOptions.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                    className='text-white hover:bg-accent/20 focus:bg-accent/20'
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className='space-y-2'>
                                <Label
                                    htmlFor='bio'
                                    className='text-accent font-semibold flex items-center gap-2'
                                >
                                    <Sun className='w-4 h-4' />
                                    Bio
                                </Label>
                                <Textarea
                                    id='bio'
                                    value={profileData.bio}
                                    onChange={(e) =>
                                        handleInputChange("bio", e.target.value)
                                    }
                                    className='bg-background/40 border-border/40 text-white placeholder-gray-400 focus:border-accent/50 focus:ring-accent/20 transition-all duration-300 min-h-[100px] resize-none'
                                    placeholder='Tell us about yourself...'
                                />
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                <div className='space-y-2'>
                                    <Label
                                        htmlFor='job'
                                        className='text-white font-semibold flex items-center gap-2'
                                    >
                                        <Star className='w-4 h-4' />
                                        Occupation
                                    </Label>
                                    <Input
                                        id='job'
                                        value={profileData.job}
                                        onChange={(e) =>
                                            handleInputChange(
                                                "job",
                                                e.target.value
                                            )
                                        }
                                        className='bg-background/40 border-border/40 text-white placeholder-gray-400 focus:border-accent/50 focus:ring-accent/20 transition-all duration-300'
                                        placeholder='Your profession or occupation'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label
                                        htmlFor='birthPlace'
                                        className='text-white font-semibold flex items-center gap-2'
                                    >
                                        <Calendar className='w-4 h-4' />
                                        Birth Place
                                    </Label>
                                    <Input
                                        id='birthPlace'
                                        value={profileData.birthPlace}
                                        onChange={(e) =>
                                            handleInputChange(
                                                "birthPlace",
                                                e.target.value
                                            )
                                        }
                                        className='bg-background/40 border-border/40 text-white placeholder-gray-400 focus:border-accent/50 focus:ring-accent/20 transition-all duration-300'
                                        placeholder='City, Country'
                                    />
                                </div>
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                <div className='space-y-2'>
                                    <Label
                                        htmlFor='birthDate'
                                        className='text-white font-semibold flex items-center gap-2'
                                    >
                                        <Calendar className='w-4 h-4' />
                                        Birth Date
                                    </Label>
                                    <Input
                                        id='birthDate'
                                        type='date'
                                        value={profileData.birthDate}
                                        onChange={(e) =>
                                            handleInputChange(
                                                "birthDate",
                                                e.target.value
                                            )
                                        }
                                        className='bg-background/40 border-border/40 text-foreground focus:border-accent/50 focus:ring-accent/20 transition-all duration-300'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label
                                        htmlFor='birthTime'
                                        className='text-white font-semibold flex items-center gap-2'
                                    >
                                        <Calendar className='w-4 h-4' />
                                        Birth Time
                                    </Label>
                                    <Input
                                        id='birthTime'
                                        type='time'
                                        value={profileData.birthTime}
                                        onChange={(e) =>
                                            handleInputChange(
                                                "birthTime",
                                                e.target.value
                                            )
                                        }
                                        className='bg-background/40 border-border/40 text-foreground focus:border-accent/50 focus:ring-accent/20 transition-all duration-300'
                                    />
                                </div>
                            </div>

                            <div className='flex justify-center sm:justify-end pt-4'>
                                <Button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className='bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-accent-foreground font-semibold px-6 sm:px-8 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-accent/25 w-full sm:w-auto'
                                >
                                    {isLoading ? (
                                        <div className='flex items-center space-x-2'>
                                            <div className='w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin' />
                                            <span>Saving...</span>
                                        </div>
                                    ) : (
                                        <div className='flex items-center space-x-2'>
                                            <Save className='w-4 h-4' />
                                            <span>Save Changes</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}