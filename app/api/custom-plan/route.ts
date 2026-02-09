import { NextResponse } from "next/server"
import { Resend } from "resend"
import React from "react"
import {
    AdminNotificationEmail,
    UserAutoReplyEmail,
} from "@/components/email-templates"

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key-for-build")

export async function POST(request: Request) {
    try {
        const { name, email, starsPerDay, isRecurring, notes } =
            await request.json()

        if (!name || !email || !starsPerDay) {
            return NextResponse.json(
                {
                    error:
                        "Missing required fields: name, email, starsPerDay",
                },
                { status: 400 }
            )
        }

        const starsPerDayValue = Number(starsPerDay)

        if (Number.isNaN(starsPerDayValue)) {
            return NextResponse.json(
                { error: "Stars per day must be a number." },
                { status: 400 }
            )
        }

        if (starsPerDayValue <= 0) {
            return NextResponse.json(
                { error: "Stars per day must be greater than 0." },
                { status: 400 }
            )
        }

        if (
            !process.env.RESEND_API_KEY ||
            process.env.RESEND_API_KEY === "dummy-key-for-build"
        ) {
            return NextResponse.json(
                { error: "Email service not configured" },
                { status: 500 }
            )
        }

        const subject = "Custom plan request"
        const message = [
            `Name: ${name}`,
            `Email: ${email}`,
            `Stars per day: ${starsPerDayValue}`,
            `Recurring: ${isRecurring ? "Yes" : "No"}`,
            `Notes: ${notes || "None"}`,
        ].join("\n")

        const adminEmailResult = await resend.emails.send({
            from: "Custom Plans <contact@no-reply.askingfate.com>",
            to: ["admin@askingfate.com"],
            subject: `[Custom Plan] ${name}`,
            react: React.createElement(AdminNotificationEmail, {
                name,
                email,
                subject,
                message,
            }),
        })

        const userEmailResult = await resend.emails.send({
            from: "AskingFate Support <support@no-reply.askingfate.com>",
            to: [email],
            subject: "We received your custom plan request",
            react: React.createElement(UserAutoReplyEmail, {
                name,
                subject,
                message,
            }),
        })

        if (adminEmailResult.error || userEmailResult.error) {
            console.error("Custom plan email errors:", {
                adminError: adminEmailResult.error,
                userError: userEmailResult.error,
            })
            return NextResponse.json(
                { error: "Failed to send emails" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            message: "Custom plan request submitted",
            adminEmailId: adminEmailResult.data?.id,
            userEmailId: userEmailResult.data?.id,
        })
    } catch (error) {
        console.error("Custom plan request error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
