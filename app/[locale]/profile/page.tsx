"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    User,
    Camera,
    Save,
    Calendar,
    Sparkles,
    Star,
    Moon,
    Sun,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import CosmicStars from "@/components/cosmic-stars"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useProfile } from "@/contexts/profile-context"

export default function ProfilePage() {
    const { user } = useAuth()
    const { profile, updateProfile } = useProfile()
    const [isLoading, setIsLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [profileData, setProfileData] = useState({
        name: "",
        bio: "",
        birthDate: "",
        birthTime: "",
        birthPlace: "",
        job: "",
        gender: "",
        profilePicture: "",
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
                profilePicture: profile.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "",
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
                toast.error("Authentication required", {
                    description: "Please sign in to update your profile"
                })
                return
            }

            const response = await fetch("/api/profile", {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: profileData.name,
                    bio: profileData.bio,
                    birthDate: profileData.birthDate,
                    birthTime: profileData.birthTime,
                    birthPlace: profileData.birthPlace,
                    job: profileData.job,
                    gender: profileData.gender,
                    avatar_url: profileData.profilePicture,
                }),
            })

            if (response.ok) {
                const { profile: updatedProfile, message } = await response.json()
                updateProfile(updatedProfile)
                toast.success("Profile updated successfully!", {
                    description: message || "Your profile has been saved"
                })
            } else {
                const { error } = await response.json()
                toast.error("Failed to update profile", {
                    description: error || "Please try again"
                })
            }
        } catch (error) {
            console.error("Failed to update profile:", error)
            toast.error("Failed to update profile", {
                description: "Please try again"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast.error("Invalid file type", {
                description: "Please select an image file"
            })
            return
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File too large", {
                description: "File size must be less than 5MB"
            })
            return
        }

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/profile/upload', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Upload failed')
            }

            const data = await response.json()
            
            // Update profile context with new avatar URL
            updateProfile({ avatar_url: data.avatarUrl })
            
            toast.success('Profile picture updated successfully!')
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Failed to upload profile picture')
        } finally {
            setIsUploading(false)
            // Reset file input
            e.target.value = ''
        }
    }



    const getUserInitials = () => {
        const name = profileData.name || user?.email?.split("@")[0] || "U"
        return name.charAt(0).toUpperCase()
    }

    const genderOptions = [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "non-binary", label: "Non-binary" },
        { value: "prefer-not-to-say", label: "Prefer not to say" },
    ]

    return (
        <div className='min-h-screen p-6 relative overflow-hidden'>
            {/* Cosmic Background */}
            <CosmicStars />

            {/* Floating Elements */}
            <div className='absolute inset-0 pointer-events-none'>
                <div className='absolute top-20 left-10 w-2 h-2 bg-accent/60 rounded-full animate-star-twinkle'></div>
                <div className='absolute top-40 right-20 w-1 h-1 bg-accent/40 rounded-full animate-star-twinkle-2'></div>
                <div className='absolute top-60 left-1/4 w-1.5 h-1.5 bg-accent/50 rounded-full animate-star-twinkle-3'></div>
                <div className='absolute bottom-40 right-1/3 w-2 h-2 bg-accent/30 rounded-full animate-star-twinkle'></div>
                <div className='absolute bottom-60 left-1/3 w-1 h-1 bg-accent/60 rounded-full animate-star-twinkle-2'></div>
            </div>

            <div className='max-w-4xl mx-auto space-y-8 pt-10 relative z-10'>
                {/* Header */}
                <div className='text-center space-y-6'>
                    <div className='flex items-center justify-center space-x-3 mb-4'>
                        <div className='p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm border border-primary/30'>
                            <User className='w-8 h-8 text-primary' />
                        </div>
                        <h1 className='text-4xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                            Profile Settings
                        </h1>
                    </div>
                    <p className='text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed'>
                        Customize your profile information and reading
                        preferences to enhance your mystical journey
                    </p>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                    {/* Profile Picture Section */}
                    <Card className='bg-card/60 border-border/40 p-8 shadow-2xl shadow-black/30 backdrop-blur-md hover:shadow-primary/10 transition-all duration-500 group'>
                        <div className='text-center space-y-6'>
                            <div className='flex items-center justify-center space-x-2 mb-4'>
                                <div className='p-2 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30'>
                                    <User className='w-5 h-5 text-accent' />
                                </div>
                                <h2 className='text-2xl font-bold text-accent'>
                                    Profile Picture
                                </h2>
                            </div>

                            <div className='relative inline-block group/avatar'>
                                <Avatar className='w-32 h-32 mx-auto border-4 border-accent/40 shadow-lg shadow-accent/20 group-hover/avatar:shadow-accent/30 transition-all duration-300'>
                                    <AvatarImage
                                        src={profileData.profilePicture}
                                        alt='Profile'
                                        className='group-hover/avatar:scale-105 transition-transform duration-300'
                                    />
                                    <AvatarFallback className='bg-gradient-to-br from-accent/20 to-primary/20 text-accent text-3xl font-bold'>
                                        {getUserInitials()}
                                    </AvatarFallback>
                                </Avatar>
                                <label className={`absolute bottom-0 right-0 bg-accent text-accent-foreground rounded-full p-3 cursor-pointer hover:bg-accent/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                    {isUploading ? (
                                        <div className='w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin' />
                                    ) : (
                                        <Camera className='w-4 h-4' />
                                    )}
                                    <input
                                        type='file'
                                        accept='image/*'
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                        className='hidden'
                                    />
                                </label>
                            </div>

                            <p className='text-sm text-muted-foreground'>
                                Click the camera icon to upload a new profile
                                picture
                            </p>
                        </div>
                    </Card>

                    {/* Profile Information */}
                    <div className='lg:col-span-2 space-y-6'>
                        <Card className='bg-card/60 border-border/40 p-8 shadow-2xl shadow-black/30 backdrop-blur-md hover:shadow-primary/10 transition-all duration-500 group'>
                            <div className='space-y-6'>
                                <div className='flex items-center space-x-3 mb-6'>
                                    <div className='p-2 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30'>
                                        <User className='w-5 h-5 text-accent' />
                                    </div>
                                    <h2 className='text-2xl font-bold text-accent'>
                                        Profile Information
                                    </h2>
                                </div>

                                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                    <div className='space-y-2'>
                                        <Label
                                            htmlFor='name'
                                            className='text-accent font-semibold flex items-center gap-2'
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
                                            className='bg-background/40 border-border/40 text-foreground placeholder-muted-foreground focus:border-accent/50 focus:ring-accent/20 transition-all duration-300'
                                            placeholder='Enter your full name'
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label
                                            htmlFor='gender'
                                            className='text-accent font-semibold flex items-center gap-2'
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
                                            <SelectTrigger className='bg-background/40 border-border/40 text-foreground focus:border-accent/50 focus:ring-accent/20 transition-all duration-300'>
                                                <SelectValue placeholder='Select gender' />
                                            </SelectTrigger>
                                            <SelectContent className='bg-background/95 border-border/40 backdrop-blur-md'>
                                                {genderOptions.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                        className='text-foreground hover:bg-accent/10 focus:bg-accent/10'
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
                                        <Sparkles className='w-4 h-4' />
                                        Bio
                                    </Label>
                                    <Textarea
                                        id='bio'
                                        value={profileData.bio}
                                        onChange={(e) =>
                                            handleInputChange(
                                                "bio",
                                                e.target.value
                                            )
                                        }
                                        rows={4}
                                        className='bg-background/40 border-border/40 text-foreground placeholder-muted-foreground focus:border-accent/50 focus:ring-accent/20 resize-none transition-all duration-300'
                                        placeholder='Tell us about yourself...'
                                    />
                                </div>

                                <div className='space-y-2'>
                                    <Label
                                        htmlFor='job'
                                        className='text-accent font-semibold flex items-center gap-2'
                                    >
                                        <Sun className='w-4 h-4' />
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
                                        className='bg-background/40 border-border/40 text-foreground placeholder-muted-foreground focus:border-accent/50 focus:ring-accent/20 transition-all duration-300'
                                        placeholder='Your profession or job title'
                                    />
                                </div>

                                {/* Birth Information Section */}
                                <div className='space-y-6 pt-6 border-t border-border/20'>
                                    <div className='flex items-center space-x-3'>
                                        <div className='p-2 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30'>
                                            <Calendar className='w-5 h-5 text-accent' />
                                        </div>
                                        <h3 className='text-xl font-bold text-accent'>
                                            Birth Information
                                        </h3>
                                        <Badge
                                            variant='outline'
                                            className='bg-accent/20 text-accent border-accent/40 text-xs hover:bg-accent/30 transition-colors duration-300'
                                        >
                                            For Readings
                                        </Badge>
                                    </div>

                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                        <div className='space-y-2'>
                                            <Label
                                                htmlFor='birthDate'
                                                className='text-accent font-semibold flex items-center gap-2'
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
                                                className='text-accent font-semibold flex items-center gap-2'
                                            >
                                                <Sun className='w-4 h-4' />
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

                                    <div className='space-y-2'>
                                        <Label
                                            htmlFor='birthPlace'
                                            className='text-accent font-semibold flex items-center gap-2'
                                        >
                                            <Star className='w-4 h-4' />
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
                                            className='bg-background/40 border-border/40 text-foreground placeholder-muted-foreground focus:border-accent/50 focus:ring-accent/20 transition-all duration-300'
                                            placeholder='City, Country'
                                        />
                                    </div>

                                    <div className='bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 rounded-xl p-6 backdrop-blur-sm'>
                                        <div className='flex items-start space-x-4'>
                                            <div className='p-2 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30'>
                                                <Sparkles className='w-5 h-5 text-accent' />
                                            </div>
                                            <div>
                                                <h4 className='text-sm font-semibold text-accent mb-2'>
                                                    Reading Enhancement
                                                </h4>
                                                <p className='text-xs text-muted-foreground leading-relaxed'>
                                                    Providing all your profile information including birth details, 
                                                    personal background, and preferences helps us create more 
                                                    accurate and personalized tarot readings and horoscopes 
                                                    tailored specifically to your cosmic profile and life journey.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Save Button */}
                        <div className='flex justify-end'>
                            <Button
                                onClick={handleSave}
                                disabled={isLoading}
                                className='bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-accent-foreground font-semibold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70'
                            >
                                {isLoading ? (
                                    <>
                                        <div className='w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin mr-2' />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className='w-4 h-4 mr-2' />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}
