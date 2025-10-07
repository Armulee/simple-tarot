import { NextResponse } from "next/server"
import { Resend } from "resend"
import React from "react"
import { AdminNotificationEmail } from "../../../components/admin-notification-email"
import { UserAutoReplyEmail } from "../../../components/user-auto-reply-email"

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key-for-build")

export async function POST(request: Request) {
    try {
        const { name, email, subject, message } = await request.json()

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                {
                    error: "Missing required fields: name, email, subject, message",
                },
                { status: 400 }
            )
        }

        // Check if Resend API key is configured
        if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "dummy-key-for-build") {
            return NextResponse.json(
                { error: "Email service not configured" },
                { status: 500 }
            )
        }

        // Send email to admin
        const adminEmailResult = await resend.emails.send({
            from: "contact@no-reply.askingfate.com",
            to: ["admin@askingfate.com"],
            subject: `[Contact Form] ${subject}`,
            react: React.createElement(AdminNotificationEmail, {
                name,
                email,
                subject,
                message,
            }),
        })

        // Send auto-reply to user
        const userEmailResult = await resend.emails.send({
            from: "support@no-reply.askingfate.com",
            to: [email],
            subject: `Thank you for your message - ${subject}`,
            react: React.createElement(UserAutoReplyEmail, {
                name,
                subject,
                message,
            }),
        })

        // Check if both emails were sent successfully
        if (adminEmailResult.error || userEmailResult.error) {
            console.error("Email sending errors:", {
                adminError: adminEmailResult.error,
                userError: userEmailResult.error,
            })
            return NextResponse.json(
                { error: "Failed to send emails" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            message: "Form submitted successfully and emails sent",
            adminEmailId: adminEmailResult.data?.id,
            userEmailId: userEmailResult.data?.id,
        })
    } catch (error) {
        console.error("Error processing contact form:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}