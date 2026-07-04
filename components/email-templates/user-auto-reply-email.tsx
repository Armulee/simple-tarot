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

interface UserAutoReplyEmailProps {
    name: string
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

export const UserAutoReplyEmail: React.FC<UserAutoReplyEmailProps> = ({
    name,
    subject,
    message,
}) => {
    return (
        <Html lang='en'>
            <Head />
            <Preview>{`Thank you for contacting AskingFate — ${subject}`}</Preview>
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
                                margin: "0 0 16px",
                                color: COLORS.text,
                                textAlign: "center",
                            }}
                        >
                            Thank you for contacting us!
                        </Heading>

                        <Text
                            style={{
                                fontSize: "15px",
                                lineHeight: 1.7,
                                color: COLORS.textMuted,
                                margin: "0 0 12px",
                            }}
                        >
                            Dear{" "}
                            <strong style={{ color: COLORS.accent }}>{name}</strong>,
                        </Text>

                        <Text
                            style={{
                                fontSize: "15px",
                                lineHeight: 1.7,
                                color: COLORS.textMuted,
                                margin: "0 0 24px",
                            }}
                        >
                            We have received your message and will get back to
                            you as soon as possible. Your spiritual journey with{" "}
                            <strong style={{ color: COLORS.accentSecondary }}>
                                AskingFate
                            </strong>{" "}
                            is important to us.
                        </Text>

                        <Section
                            style={{
                                backgroundColor: "#1a1a36",
                                border: `1px solid ${COLORS.border}`,
                                borderLeft: `4px solid ${COLORS.accentSecondary}`,
                                borderRadius: "12px",
                                padding: "20px",
                                marginBottom: "20px",
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
                                Your Message Details
                            </Text>
                            <Text
                                style={{
                                    fontSize: "15px",
                                    lineHeight: 1.6,
                                    color: COLORS.textMuted,
                                    margin: "6px 0",
                                }}
                            >
                                <strong
                                    style={{
                                        color: COLORS.accentSecondary,
                                        fontWeight: 600,
                                    }}
                                >
                                    Subject:
                                </strong>{" "}
                                {subject}
                            </Text>
                            <Text
                                style={{
                                    fontSize: "15px",
                                    lineHeight: 1.6,
                                    color: COLORS.accentSecondary,
                                    fontWeight: 600,
                                    margin: "6px 0 6px",
                                }}
                            >
                                Message:
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
                                fontSize: "15px",
                                lineHeight: 1.7,
                                color: COLORS.textMuted,
                                margin: "24px 0 0",
                            }}
                        >
                            Best regards,
                            <br />
                            <span style={{ color: COLORS.accent }}>
                                The AskingFate Team
                            </span>
                        </Text>

                        <Text
                            style={{
                                marginTop: "20px",
                                marginBottom: 0,
                                fontSize: "13px",
                                color: COLORS.textDim,
                                textAlign: "center",
                            }}
                        >
                            This is an automated response. Please do not reply
                            to this email.
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
                        Sent from AskingFate ·{" "}
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
