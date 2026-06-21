import React from "react"
import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components"

interface AdminNotificationEmailProps {
    name: string
    email: string
    subject: string
    message: string
}

const COLORS = {
    pageBg: "#0a0a14",
    cardBg: "#14142a",
    border: "#26264a",
    text: "#ffffff",
    textMuted: "#d6d6f8",
    textDim: "#8888aa",
    accent: "#b891ff",
    accentSecondary: "#7de3ff",
}

const fontStack =
    "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif"

export const AdminNotificationEmail: React.FC<AdminNotificationEmailProps> = ({
    name,
    email,
    subject,
    message,
}) => {
    return (
        <Html lang='en'>
            <Head />
            <Preview>{`New contact form: ${subject}`}</Preview>
            <Body
                style={{
                    margin: 0,
                    padding: 0,
                    backgroundColor: COLORS.pageBg,
                    color: COLORS.text,
                    fontFamily: fontStack,
                }}
            >
                <Container
                    style={{
                        maxWidth: "520px",
                        margin: "0 auto",
                        padding: "40px 20px",
                    }}
                >
                    <Section style={{ textAlign: "center", paddingBottom: "8px" }}>
                        <Img
                            src='https://askingfate.com/assets/logo.png'
                            alt='AskingFate'
                            width='80'
                            height='80'
                            style={{
                                display: "block",
                                margin: "0 auto",
                                width: "80px",
                                height: "auto",
                            }}
                        />
                    </Section>

                    <Section
                        style={{
                            backgroundColor: COLORS.cardBg,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: "16px",
                            padding: "32px 28px",
                            marginTop: "20px",
                        }}
                    >
                        <Heading
                            as='h2'
                            style={{
                                fontSize: "22px",
                                lineHeight: 1.3,
                                margin: "0 0 24px",
                                color: COLORS.text,
                                textAlign: "center",
                            }}
                        >
                            New Contact Form Submission
                        </Heading>

                        <Section
                            style={{
                                backgroundColor: "#1a1a36",
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: "12px",
                                padding: "20px",
                                marginBottom: "16px",
                            }}
                        >
                            <Field label='Name' value={name} />
                            <Field label='Email' value={email} />
                            <Field label='Subject' value={subject} />
                        </Section>

                        <Section
                            style={{
                                backgroundColor: "#1a1a36",
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: "12px",
                                padding: "20px",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: "14px",
                                    margin: "0 0 12px",
                                    color: COLORS.accent,
                                    fontWeight: 600,
                                }}
                            >
                                Message
                            </Text>
                            <Text
                                style={{
                                    fontSize: "15px",
                                    lineHeight: 1.7,
                                    color: COLORS.textMuted,
                                    margin: 0,
                                    whiteSpace: "pre-wrap",
                                }}
                            >
                                {message}
                            </Text>
                        </Section>

                        <Text
                            style={{
                                marginTop: "24px",
                                marginBottom: 0,
                                fontSize: "13px",
                                color: COLORS.textDim,
                                textAlign: "center",
                            }}
                        >
                            This message was sent from the contact form on your
                            website.
                        </Text>
                    </Section>

                    <Hr
                        style={{
                            border: "none",
                            borderTop: `1px solid ${COLORS.border}`,
                            margin: "28px auto",
                            width: "40%",
                        }}
                    />

                    <Text
                        style={{
                            fontSize: "12px",
                            color: COLORS.textDim,
                            textAlign: "center",
                            margin: 0,
                        }}
                    >
                        Sent from AskingFate Contact Form ·{" "}
                        <Link
                            href='https://askingfate.com'
                            style={{
                                color: COLORS.accentSecondary,
                                textDecoration: "none",
                            }}
                        >
                            Visit Us
                        </Link>
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <Text
            style={{
                fontSize: "15px",
                lineHeight: 1.6,
                color: COLORS.textMuted,
                margin: "6px 0",
            }}
        >
            <strong style={{ color: COLORS.accentSecondary, fontWeight: 600 }}>
                {label}:
            </strong>{" "}
            {value}
        </Text>
    )
}
