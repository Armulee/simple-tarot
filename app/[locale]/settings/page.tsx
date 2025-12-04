"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Settings,
    Mail,
    Bell,
    Lock,
    Eye,
    BookOpen,
    Globe,
    Accessibility,
    Save,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface UserSettings {
    id?: string
    user_id?: string
    email_marketing_enabled: boolean
    email_promotional: boolean
    email_newsletter: boolean
    email_product_updates: boolean
    email_reading_reminders: boolean
    email_special_offers: boolean
    push_notifications_enabled: boolean
    push_reading_reminders: boolean
    push_special_offers: boolean
    push_system_updates: boolean
    profile_visibility: string
    show_email: boolean
    show_birth_date: boolean
    allow_messages: boolean
    default_reading_type: string | null
    auto_save_readings: boolean
    share_readings_by_default: boolean
    preferred_language: string | null
    timezone: string | null
    date_format: string | null
    time_format: string | null
    reduced_motion: boolean
    high_contrast: boolean
    font_size: string | null
}

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const t = useTranslations("Settings")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [settings, setSettings] = useState<Partial<UserSettings>>({
        email_marketing_enabled: true,
        email_promotional: true,
        email_newsletter: true,
        email_product_updates: true,
        email_reading_reminders: true,
        email_special_offers: true,
        push_notifications_enabled: true,
        push_reading_reminders: true,
        push_special_offers: true,
        push_system_updates: true,
        profile_visibility: "private",
        show_email: false,
        show_birth_date: false,
        allow_messages: true,
        auto_save_readings: true,
        share_readings_by_default: false,
        preferred_language: "en",
        date_format: "MM/DD/YYYY",
        time_format: "12h",
        reduced_motion: false,
        high_contrast: false,
        font_size: "medium",
    })

    // Auth guard: redirect to signin if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            toast.error(
                t("authRequired") || "Please sign in to access settings"
            )
            router.push("/signin?callbackUrl=/settings")
        }
    }, [user, authLoading, router, t])

    // Fetch settings
    useEffect(() => {
        if (!user || authLoading) return

        const fetchSettings = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()

                if (!session) {
                    router.push("/signin?callbackUrl=/settings")
                    return
                }

                const response = await fetch("/api/settings", {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    console.error("Settings fetch error:", errorData)
                    throw new Error(
                        errorData.error ||
                            errorData.details ||
                            "Failed to fetch settings"
                    )
                }

                const data = await response.json()
                if (data.settings) {
                    setSettings(data.settings)
                }
            } catch (error) {
                console.error("Error fetching settings:", error)
                toast.error(t("fetchError") || "Failed to load settings")
            } finally {
                setIsLoading(false)
            }
        }

        fetchSettings()
    }, [user, authLoading, router, t])

    const handleToggle = (key: keyof UserSettings, value: boolean) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }))
    }

    const handleSelect = (key: keyof UserSettings, value: string) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }))
    }

    const handleSave = async () => {
        if (!user) return

        setIsSaving(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!session) {
                toast.error(t("authRequired") || "Please sign in")
                router.push("/signin?callbackUrl=/settings")
                return
            }

            // Convert settings to API format
            const payload = {
                emailMarketingEnabled: settings.email_marketing_enabled,
                emailPromotional: settings.email_promotional,
                emailNewsletter: settings.email_newsletter,
                emailProductUpdates: settings.email_product_updates,
                emailReadingReminders: settings.email_reading_reminders,
                emailSpecialOffers: settings.email_special_offers,
                pushNotificationsEnabled: settings.push_notifications_enabled,
                pushReadingReminders: settings.push_reading_reminders,
                pushSpecialOffers: settings.push_special_offers,
                pushSystemUpdates: settings.push_system_updates,
                profileVisibility: settings.profile_visibility,
                showEmail: settings.show_email,
                showBirthDate: settings.show_birth_date,
                allowMessages: settings.allow_messages,
                defaultReadingType: settings.default_reading_type,
                autoSaveReadings: settings.auto_save_readings,
                shareReadingsByDefault: settings.share_readings_by_default,
                preferredLanguage: settings.preferred_language,
                timezone: settings.timezone,
                dateFormat: settings.date_format,
                timeFormat: settings.time_format,
                reducedMotion: settings.reduced_motion,
                highContrast: settings.high_contrast,
                fontSize: settings.font_size,
            }

            const response = await fetch("/api/settings", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                throw new Error("Failed to update settings")
            }

            toast.success(t("saveSuccess") || "Settings saved successfully")
        } catch (error) {
            console.error("Error saving settings:", error)
            toast.error(t("saveError") || "Failed to save settings")
        } finally {
            setIsSaving(false)
        }
    }

    // Show loading state
    if (authLoading || isLoading) {
        return (
            <div className='min-h-screen flex items-center justify-center'>
                <div className='text-center'>
                    <Settings className='w-8 h-8 animate-spin mx-auto mb-4 text-primary' />
                    <p className='text-muted-foreground'>
                        {t("loading") || "Loading settings..."}
                    </p>
                </div>
            </div>
        )
    }

    // Don't render if not authenticated (redirect will happen)
    if (!user) {
        return null
    }

    return (
        <div className='min-h-screen relative overflow-x-hidden'>
            <div className='max-w-4xl mx-auto px-4 sm:px-6 py-8 relative z-10'>
                {/* Header */}
                <div className='text-center space-y-4 mb-8'>
                    <div className='flex items-center justify-center space-x-3 mb-4'>
                        <div className='p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm border border-primary/30'>
                            <Settings className='w-8 h-8 text-accent' />
                        </div>
                        <h1 className='text-3xl sm:text-4xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                            {t("title") || "Settings"}
                        </h1>
                    </div>
                    <p className='text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto'>
                        {t("subtitle") ||
                            "Manage your account preferences and email marketing settings"}
                    </p>
                </div>

                {/* Settings Sections */}
                <div className='space-y-6'>
                    {/* Email Marketing */}
                    <Card className='p-6 bg-card/10 border-border/20'>
                        <div className='flex items-center gap-3 mb-6'>
                            <Mail className='w-5 h-5 text-primary' />
                            <h2 className='text-xl font-semibold'>
                                {t("emailMarketing.title") || "Email Marketing"}
                            </h2>
                        </div>
                        <div className='space-y-4'>
                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label>
                                        {t("emailMarketing.enable") ||
                                            "Enable Email Marketing"}
                                    </Label>
                                    <p className='text-sm text-muted-foreground'>
                                        {t("emailMarketing.enableDesc") ||
                                            "Receive marketing emails from us"}
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.email_marketing_enabled}
                                    onCheckedChange={(checked) =>
                                        handleToggle(
                                            "email_marketing_enabled",
                                            checked
                                        )
                                    }
                                />
                            </div>

                            {settings.email_marketing_enabled && (
                                <div className='ml-6 space-y-4 border-l-2 border-primary/20 pl-6'>
                                    <div className='flex items-center justify-between'>
                                        <div className='space-y-0.5'>
                                            <Label>
                                                {t(
                                                    "emailMarketing.promotional"
                                                ) || "Promotional Emails"}
                                            </Label>
                                            <p className='text-sm text-muted-foreground'>
                                                {t(
                                                    "emailMarketing.promotionalDesc"
                                                ) ||
                                                    "Special offers and discounts"}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.email_promotional}
                                            onCheckedChange={(checked) =>
                                                handleToggle(
                                                    "email_promotional",
                                                    checked
                                                )
                                            }
                                        />
                                    </div>

                                    <div className='flex items-center justify-between'>
                                        <div className='space-y-0.5'>
                                            <Label>
                                                {t(
                                                    "emailMarketing.newsletter"
                                                ) || "Newsletter"}
                                            </Label>
                                            <p className='text-sm text-muted-foreground'>
                                                {t(
                                                    "emailMarketing.newsletterDesc"
                                                ) ||
                                                    "Weekly updates and insights"}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={settings.email_newsletter}
                                            onCheckedChange={(checked) =>
                                                handleToggle(
                                                    "email_newsletter",
                                                    checked
                                                )
                                            }
                                        />
                                    </div>

                                    <div className='flex items-center justify-between'>
                                        <div className='space-y-0.5'>
                                            <Label>
                                                {t(
                                                    "emailMarketing.productUpdates"
                                                ) || "Product Updates"}
                                            </Label>
                                            <p className='text-sm text-muted-foreground'>
                                                {t(
                                                    "emailMarketing.productUpdatesDesc"
                                                ) ||
                                                    "New features and improvements"}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={
                                                settings.email_product_updates
                                            }
                                            onCheckedChange={(checked) =>
                                                handleToggle(
                                                    "email_product_updates",
                                                    checked
                                                )
                                            }
                                        />
                                    </div>

                                    <div className='flex items-center justify-between'>
                                        <div className='space-y-0.5'>
                                            <Label>
                                                {t(
                                                    "emailMarketing.readingReminders"
                                                ) || "Reading Reminders"}
                                            </Label>
                                            <p className='text-sm text-muted-foreground'>
                                                {t(
                                                    "emailMarketing.readingRemindersDesc"
                                                ) ||
                                                    "Reminders to check your readings"}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={
                                                settings.email_reading_reminders
                                            }
                                            onCheckedChange={(checked) =>
                                                handleToggle(
                                                    "email_reading_reminders",
                                                    checked
                                                )
                                            }
                                        />
                                    </div>

                                    <div className='flex items-center justify-between'>
                                        <div className='space-y-0.5'>
                                            <Label>
                                                {t(
                                                    "emailMarketing.specialOffers"
                                                ) || "Special Offers"}
                                            </Label>
                                            <p className='text-sm text-muted-foreground'>
                                                {t(
                                                    "emailMarketing.specialOffersDesc"
                                                ) ||
                                                    "Exclusive deals and promotions"}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={
                                                settings.email_special_offers
                                            }
                                            onCheckedChange={(checked) =>
                                                handleToggle(
                                                    "email_special_offers",
                                                    checked
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Push Notifications */}
                    <Card className='p-6 bg-card/10 border-border/20'>
                        <div className='flex items-center gap-3 mb-6'>
                            <Bell className='w-5 h-5 text-primary' />
                            <h2 className='text-xl font-semibold'>
                                {t("notifications.title") ||
                                    "Push Notifications"}
                            </h2>
                        </div>
                        <div className='space-y-4'>
                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label>
                                        {t("notifications.enable") ||
                                            "Enable Push Notifications"}
                                    </Label>
                                    <p className='text-sm text-muted-foreground'>
                                        {t("notifications.enableDesc") ||
                                            "Receive push notifications on your device"}
                                    </p>
                                </div>
                                <Switch
                                    checked={
                                        settings.push_notifications_enabled
                                    }
                                    onCheckedChange={(checked) =>
                                        handleToggle(
                                            "push_notifications_enabled",
                                            checked
                                        )
                                    }
                                />
                            </div>

                            {settings.push_notifications_enabled && (
                                <div className='ml-6 space-y-4 border-l-2 border-primary/20 pl-6'>
                                    <div className='flex items-center justify-between'>
                                        <div className='space-y-0.5'>
                                            <Label>
                                                {t(
                                                    "notifications.readingReminders"
                                                ) || "Reading Reminders"}
                                            </Label>
                                        </div>
                                        <Switch
                                            checked={
                                                settings.push_reading_reminders
                                            }
                                            onCheckedChange={(checked) =>
                                                handleToggle(
                                                    "push_reading_reminders",
                                                    checked
                                                )
                                            }
                                        />
                                    </div>

                                    <div className='flex items-center justify-between'>
                                        <div className='space-y-0.5'>
                                            <Label>
                                                {t(
                                                    "notifications.specialOffers"
                                                ) || "Special Offers"}
                                            </Label>
                                        </div>
                                        <Switch
                                            checked={
                                                settings.push_special_offers
                                            }
                                            onCheckedChange={(checked) =>
                                                handleToggle(
                                                    "push_special_offers",
                                                    checked
                                                )
                                            }
                                        />
                                    </div>

                                    <div className='flex items-center justify-between'>
                                        <div className='space-y-0.5'>
                                            <Label>
                                                {t(
                                                    "notifications.systemUpdates"
                                                ) || "System Updates"}
                                            </Label>
                                        </div>
                                        <Switch
                                            checked={
                                                settings.push_system_updates
                                            }
                                            onCheckedChange={(checked) =>
                                                handleToggle(
                                                    "push_system_updates",
                                                    checked
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Privacy Settings */}
                    <Card className='p-6 bg-card/10 border-border/20'>
                        <div className='flex items-center gap-3 mb-6'>
                            <Lock className='w-5 h-5 text-primary' />
                            <h2 className='text-xl font-semibold'>
                                {t("privacy.title") || "Privacy Settings"}
                            </h2>
                        </div>
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <Label>
                                    {t("privacy.profileVisibility") ||
                                        "Profile Visibility"}
                                </Label>
                                <Select
                                    value={settings.profile_visibility}
                                    onValueChange={(value) =>
                                        handleSelect(
                                            "profile_visibility",
                                            value
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='private'>
                                            {t("privacy.private") || "Private"}
                                        </SelectItem>
                                        <SelectItem value='public'>
                                            {t("privacy.public") || "Public"}
                                        </SelectItem>
                                        <SelectItem value='friends'>
                                            {t("privacy.friends") ||
                                                "Friends Only"}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label>
                                        {t("privacy.showEmail") || "Show Email"}
                                    </Label>
                                    <p className='text-sm text-muted-foreground'>
                                        {t("privacy.showEmailDesc") ||
                                            "Display your email on your profile"}
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.show_email}
                                    onCheckedChange={(checked) =>
                                        handleToggle("show_email", checked)
                                    }
                                />
                            </div>

                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label>
                                        {t("privacy.showBirthDate") ||
                                            "Show Birth Date"}
                                    </Label>
                                    <p className='text-sm text-muted-foreground'>
                                        {t("privacy.showBirthDateDesc") ||
                                            "Display your birth date on your profile"}
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.show_birth_date}
                                    onCheckedChange={(checked) =>
                                        handleToggle("show_birth_date", checked)
                                    }
                                />
                            </div>

                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label>
                                        {t("privacy.allowMessages") ||
                                            "Allow Messages"}
                                    </Label>
                                    <p className='text-sm text-muted-foreground'>
                                        {t("privacy.allowMessagesDesc") ||
                                            "Allow others to send you messages"}
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.allow_messages}
                                    onCheckedChange={(checked) =>
                                        handleToggle("allow_messages", checked)
                                    }
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Reading Preferences */}
                    <Card className='p-6 bg-card/10 border-border/20'>
                        <div className='flex items-center gap-3 mb-6'>
                            <BookOpen className='w-5 h-5 text-primary' />
                            <h2 className='text-xl font-semibold'>
                                {t("reading.title") || "Reading Preferences"}
                            </h2>
                        </div>
                        <div className='space-y-4'>
                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label>
                                        {t("reading.autoSave") ||
                                            "Auto-save Readings"}
                                    </Label>
                                    <p className='text-sm text-muted-foreground'>
                                        {t("reading.autoSaveDesc") ||
                                            "Automatically save your readings"}
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.auto_save_readings}
                                    onCheckedChange={(checked) =>
                                        handleToggle(
                                            "auto_save_readings",
                                            checked
                                        )
                                    }
                                />
                            </div>

                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label>
                                        {t("reading.shareByDefault") ||
                                            "Share Readings by Default"}
                                    </Label>
                                    <p className='text-sm text-muted-foreground'>
                                        {t("reading.shareByDefaultDesc") ||
                                            "Automatically share new readings"}
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.share_readings_by_default}
                                    onCheckedChange={(checked) =>
                                        handleToggle(
                                            "share_readings_by_default",
                                            checked
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Language & Localization */}
                    <Card className='p-6 bg-card/10 border-border/20'>
                        <div className='flex items-center gap-3 mb-6'>
                            <Globe className='w-5 h-5 text-primary' />
                            <h2 className='text-xl font-semibold'>
                                {t("localization.title") ||
                                    "Language & Localization"}
                            </h2>
                        </div>
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <Label>
                                    {t("localization.language") || "Language"}
                                </Label>
                                <Select
                                    value={settings.preferred_language || "en"}
                                    onValueChange={(value) =>
                                        handleSelect(
                                            "preferred_language",
                                            value
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='en'>
                                            English
                                        </SelectItem>
                                        <SelectItem value='th'>
                                            ไทย (Thai)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className='space-y-2'>
                                <Label>
                                    {t("localization.timeFormat") ||
                                        "Time Format"}
                                </Label>
                                <Select
                                    value={settings.time_format || "12h"}
                                    onValueChange={(value) =>
                                        handleSelect("time_format", value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='12h'>
                                            12-hour
                                        </SelectItem>
                                        <SelectItem value='24h'>
                                            24-hour
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </Card>

                    {/* Accessibility */}
                    <Card className='p-6 bg-card/10 border-border/20'>
                        <div className='flex items-center gap-3 mb-6'>
                            <Accessibility className='w-5 h-5 text-primary' />
                            <h2 className='text-xl font-semibold'>
                                {t("accessibility.title") || "Accessibility"}
                            </h2>
                        </div>
                        <div className='space-y-4'>
                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label>
                                        {t("accessibility.reducedMotion") ||
                                            "Reduced Motion"}
                                    </Label>
                                    <p className='text-sm text-muted-foreground'>
                                        {t("accessibility.reducedMotionDesc") ||
                                            "Reduce animations and transitions"}
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.reduced_motion}
                                    onCheckedChange={(checked) =>
                                        handleToggle("reduced_motion", checked)
                                    }
                                />
                            </div>

                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label>
                                        {t("accessibility.highContrast") ||
                                            "High Contrast"}
                                    </Label>
                                    <p className='text-sm text-muted-foreground'>
                                        {t("accessibility.highContrastDesc") ||
                                            "Increase contrast for better visibility"}
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.high_contrast}
                                    onCheckedChange={(checked) =>
                                        handleToggle("high_contrast", checked)
                                    }
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label>
                                    {t("accessibility.fontSize") || "Font Size"}
                                </Label>
                                <Select
                                    value={settings.font_size || "medium"}
                                    onValueChange={(value) =>
                                        handleSelect("font_size", value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='small'>
                                            {t("accessibility.small") ||
                                                "Small"}
                                        </SelectItem>
                                        <SelectItem value='medium'>
                                            {t("accessibility.medium") ||
                                                "Medium"}
                                        </SelectItem>
                                        <SelectItem value='large'>
                                            {t("accessibility.large") ||
                                                "Large"}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </Card>

                    {/* Save Button */}
                    <div className='flex justify-end'>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className='min-w-32'
                        >
                            {isSaving ? (
                                <>
                                    <Settings className='w-4 h-4 mr-2 animate-spin' />
                                    {t("saving") || "Saving..."}
                                </>
                            ) : (
                                <>
                                    <Save className='w-4 h-4 mr-2' />
                                    {t("save") || "Save Settings"}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
