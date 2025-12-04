import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.split(" ")[1]
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin!.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Try to get existing settings first
        const { data: existingSettings, error: fetchError } =
            await supabaseAdmin!
                .from("user_settings")
                .select("*")
                .eq("user_id", user.id)
                .single()

        // If settings exist, return them
        if (existingSettings && !fetchError) {
            return NextResponse.json({ settings: existingSettings })
        }

        // If no settings found and it's not a "not found" error, try RPC function
        if (fetchError && fetchError.code !== "PGRST116") {
            console.error("Settings fetch error:", fetchError)
            // Try RPC function as fallback
            const { data: settingsData, error: rpcError } =
                await supabaseAdmin!.rpc("get_or_create_user_settings", {
                    p_user_id: user.id,
                })

            if (rpcError) {
                console.error("RPC error:", rpcError)
                // If RPC also fails, create default settings directly
                const defaultSettings = {
                    user_id: user.id,
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
                }

                const { data: newSettings, error: insertError } =
                    await supabaseAdmin!
                        .from("user_settings")
                        .insert(defaultSettings)
                        .select()
                        .single()

                if (insertError) {
                    console.error("Insert error:", insertError)
                    return NextResponse.json(
                        {
                            error: "Failed to fetch or create settings",
                            details: insertError.message,
                        },
                        { status: 500 }
                    )
                }

                return NextResponse.json({ settings: newSettings })
            }

            const settings = settingsData?.[0] || null
            return NextResponse.json({ settings })
        }

        // If settings don't exist (PGRST116), create default settings
        const defaultSettings = {
            user_id: user.id,
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
        }

        const { data: newSettings, error: insertError } = await supabaseAdmin!
            .from("user_settings")
            .insert(defaultSettings)
            .select()
            .single()

        if (insertError) {
            console.error("Insert error:", insertError)
            return NextResponse.json(
                {
                    error: "Failed to create settings",
                    details: insertError.message,
                },
                { status: 500 }
            )
        }

        return NextResponse.json({ settings: newSettings })
    } catch (error) {
        console.error("Settings fetch error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.split(" ")[1]
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin!.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()

        // Prepare settings data
        const settingsData: Record<string, unknown> = {
            user_id: user.id,
            updated_at: new Date().toISOString(),
        }

        // Email Marketing
        if (typeof body.emailMarketingEnabled === "boolean") {
            settingsData.email_marketing_enabled = body.emailMarketingEnabled
        }
        if (typeof body.emailPromotional === "boolean") {
            settingsData.email_promotional = body.emailPromotional
        }
        if (typeof body.emailNewsletter === "boolean") {
            settingsData.email_newsletter = body.emailNewsletter
        }
        if (typeof body.emailProductUpdates === "boolean") {
            settingsData.email_product_updates = body.emailProductUpdates
        }
        if (typeof body.emailReadingReminders === "boolean") {
            settingsData.email_reading_reminders = body.emailReadingReminders
        }
        if (typeof body.emailSpecialOffers === "boolean") {
            settingsData.email_special_offers = body.emailSpecialOffers
        }

        // Push Notifications
        if (typeof body.pushNotificationsEnabled === "boolean") {
            settingsData.push_notifications_enabled =
                body.pushNotificationsEnabled
        }
        if (typeof body.pushReadingReminders === "boolean") {
            settingsData.push_reading_reminders = body.pushReadingReminders
        }
        if (typeof body.pushSpecialOffers === "boolean") {
            settingsData.push_special_offers = body.pushSpecialOffers
        }
        if (typeof body.pushSystemUpdates === "boolean") {
            settingsData.push_system_updates = body.pushSystemUpdates
        }

        // Privacy
        if (body.profileVisibility) {
            settingsData.profile_visibility = body.profileVisibility
        }
        if (typeof body.showEmail === "boolean") {
            settingsData.show_email = body.showEmail
        }
        if (typeof body.showBirthDate === "boolean") {
            settingsData.show_birth_date = body.showBirthDate
        }
        if (typeof body.allowMessages === "boolean") {
            settingsData.allow_messages = body.allowMessages
        }

        // Reading Preferences
        if (body.defaultReadingType !== undefined) {
            settingsData.default_reading_type = body.defaultReadingType
        }
        if (typeof body.autoSaveReadings === "boolean") {
            settingsData.auto_save_readings = body.autoSaveReadings
        }
        if (typeof body.shareReadingsByDefault === "boolean") {
            settingsData.share_readings_by_default = body.shareReadingsByDefault
        }

        // Language and Localization
        if (body.preferredLanguage) {
            settingsData.preferred_language = body.preferredLanguage
        }
        if (body.timezone) {
            settingsData.timezone = body.timezone
        }
        if (body.dateFormat) {
            settingsData.date_format = body.dateFormat
        }
        if (body.timeFormat) {
            settingsData.time_format = body.timeFormat
        }

        // Accessibility
        if (typeof body.reducedMotion === "boolean") {
            settingsData.reduced_motion = body.reducedMotion
        }
        if (typeof body.highContrast === "boolean") {
            settingsData.high_contrast = body.highContrast
        }
        if (body.fontSize) {
            settingsData.font_size = body.fontSize
        }

        // Upsert settings
        const { data: settings, error } = await supabaseAdmin!
            .from("user_settings")
            .upsert(settingsData, { onConflict: "user_id" })
            .select()
            .single()

        if (error) {
            console.error("Settings update error:", error)
            return NextResponse.json(
                { error: "Failed to update settings" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            settings,
            message: "Settings updated successfully",
        })
    } catch (error) {
        console.error("Settings update error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
