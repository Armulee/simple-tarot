import { NextRequest, NextResponse } from "next/server"

interface ContactFormData {
    name: string
    email: string
    subject: string
    message: string
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as ContactFormData
        const { name, email, subject, message } = body

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            )
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            )
        }

        // For now, we'll just log the contact form submission
        // In production, you would integrate with an email service like:
        // - SendGrid
        // - Resend
        // - Nodemailer with SMTP
        // - AWS SES
        console.log("Contact Form Submission:", {
            name,
            email,
            subject,
            message,
            timestamp: new Date().toISOString(),
        })

        // TODO: Implement actual email sending
        // Example with Resend:
        // await resend.emails.send({
        //     from: 'noreply@askingfate.com',
        //     to: 'admin@askingfate.com',
        //     subject: `Contact Form: ${subject}`,
        //     html: `
        //         <h2>New Contact Form Submission</h2>
        //         <p><strong>Name:</strong> ${name}</p>
        //         <p><strong>Email:</strong> ${email}</p>
        //         <p><strong>Subject:</strong> ${subject}</p>
        //         <p><strong>Message:</strong></p>
        //         <p>${message.replace(/\n/g, '<br>')}</p>
        //     `
        // })

        return NextResponse.json(
            {
                success: true,
                message:
                    "Your message has been sent successfully. We'll get back to you within 24-48 hours.",
            },
            { status: 200 }
        )
    } catch (error) {
        console.error("Contact form error:", error)
        return NextResponse.json(
            { error: "Failed to send message. Please try again." },
            { status: 500 }
        )
    }
}