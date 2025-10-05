"use client"

import { useState } from "react"
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
import { User, Camera, Save, Calendar, Sparkles } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function ProfilePage() {
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [profileData, setProfileData] = useState({
        name: user?.user_metadata?.name || "",
        bio: "",
        birthDate: "",
        birthTime: "",
        birthPlace: "",
        job: "",
        gender: "",
        profilePicture:
            user?.user_metadata?.avatar_url ||
            user?.user_metadata?.picture ||
            "",
    })

    const handleInputChange = (field: string, value: string) => {
        setProfileData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            // TODO: Implement profile update API call
            console.log("Saving profile:", profileData)

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000))

            // Show success message
            alert("Profile updated successfully!")
        } catch (error) {
            console.error("Failed to update profile:", error)
            alert("Failed to update profile. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // TODO: Implement image upload
            console.log("Uploading image:", file)
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
            <div className='max-w-4xl mx-auto space-y-8 pt-10 relative z-10'>
                {/* Header */}
                <div className='text-center space-y-4'>
                    <h1 className='text-4xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                        Profile Settings
                    </h1>
                    <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
                        Customize your profile information and reading
                        preferences
                    </p>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                    {/* Profile Picture Section */}
                    <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                        <div className='text-center space-y-6'>
                            <div className='flex items-center justify-center space-x-2 mb-4'>
                                <User className='w-6 h-6 text-primary' />
                                <h2 className='text-2xl font-bold text-white'>
                                    Profile Picture
                                </h2>
                            </div>

                            <div className='relative inline-block'>
                                <Avatar className='w-32 h-32 mx-auto border-4 border-primary/30'>
                                    <AvatarImage
                                        src={profileData.profilePicture}
                                        alt='Profile'
                                    />
                                    <AvatarFallback className='bg-primary/20 text-primary text-3xl font-bold'>
                                        {getUserInitials()}
                                    </AvatarFallback>
                                </Avatar>
                                <label className='absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors'>
                                    <Camera className='w-4 h-4' />
                                    <input
                                        type='file'
                                        accept='image/*'
                                        onChange={handleImageUpload}
                                        className='hidden'
                                    />
                                </label>
                            </div>

                            <p className='text-sm text-gray-400'>
                                Click the camera icon to upload a new profile
                                picture
                            </p>
                        </div>
                    </Card>

                    {/* Basic Information */}
                    <div className='lg:col-span-2 space-y-6'>
                        <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                            <div className='space-y-6'>
                                <div className='flex items-center space-x-2 mb-6'>
                                    <User className='w-6 h-6 text-secondary' />
                                    <h2 className='text-2xl font-bold text-white'>
                                        Basic Information
                                    </h2>
                                </div>

                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                    <div>
                                        <Label
                                            htmlFor='name'
                                            className='text-white font-medium'
                                        >
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
                                            className='bg-background/30 border-border/30 text-foreground placeholder-muted-foreground focus:border-primary/50'
                                            placeholder='Enter your full name'
                                        />
                                    </div>
                                    <div>
                                        <Label
                                            htmlFor='gender'
                                            className='text-white font-medium'
                                        >
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
                                            <SelectTrigger className='bg-background/30 border-border/30 text-foreground focus:border-primary/50'>
                                                <SelectValue placeholder='Select gender' />
                                            </SelectTrigger>
                                            <SelectContent className='bg-background/90 border-border/30'>
                                                {genderOptions.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                        className='text-foreground hover:bg-background/10'
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <Label
                                        htmlFor='bio'
                                        className='text-white font-medium'
                                    >
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
                                        className='bg-background/30 border-border/30 text-foreground placeholder-muted-foreground focus:border-primary/50 resize-none'
                                        placeholder='Tell us about yourself...'
                                    />
                                </div>

                                <div>
                                    <Label
                                        htmlFor='job'
                                        className='text-white font-medium'
                                    >
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
                                        className='bg-background/30 border-border/30 text-foreground placeholder-muted-foreground focus:border-primary/50'
                                        placeholder='Your profession or job title'
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Birth Information */}
                        <Card className='bg-card/50 border-border/30 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                            <div className='space-y-6'>
                                <div className='flex items-center space-x-2 mb-6'>
                                    <Calendar className='w-6 h-6 text-primary' />
                                    <h2 className='text-2xl font-bold text-white'>
                                        Birth Information
                                    </h2>
                                    <Badge
                                        variant='outline'
                                        className='bg-primary/20 text-primary border-primary/40 text-xs'
                                    >
                                        For Readings
                                    </Badge>
                                </div>

                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                    <div>
                                        <Label
                                            htmlFor='birthDate'
                                            className='text-white font-medium'
                                        >
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
                                            className='bg-background/30 border-border/30 text-foreground focus:border-primary/50'
                                        />
                                    </div>
                                    <div>
                                        <Label
                                            htmlFor='birthTime'
                                            className='text-white font-medium'
                                        >
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
                                            className='bg-background/30 border-border/30 text-foreground focus:border-primary/50'
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label
                                        htmlFor='birthPlace'
                                        className='text-white font-medium'
                                    >
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
                                        className='bg-background/30 border-border/30 text-foreground placeholder-muted-foreground focus:border-primary/50'
                                        placeholder='City, Country'
                                    />
                                </div>

                                <div className='bg-primary/10 border border-primary/20 rounded-lg p-4'>
                                    <div className='flex items-start space-x-3'>
                                        <Sparkles className='w-5 h-5 text-primary mt-0.5' />
                                        <div>
                                            <h4 className='text-sm font-medium text-primary'>
                                                Reading Enhancement
                                            </h4>
                                            <p className='text-xs text-primary/80 mt-1'>
                                                Birth information helps us
                                                provide more accurate and
                                                personalized tarot readings and
                                                horoscopes.
                                            </p>
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
                                className='bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-lg transition-all duration-300 shadow-lg shadow-primary/25'
                            >
                                {isLoading ? (
                                    <>
                                        <div className='w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2' />
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
