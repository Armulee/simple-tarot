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

interface AccessRequestEmailProps {
    requesterName: string
    requesterEmail: string
    sessionQuestion: string
    sessionLink: string
    message?: string | null
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

export const AccessRequestEmail: React.FC<AccessRequestEmailProps> = ({
    requesterName,
    requesterEmail,
    sessionQuestion,
    sessionLink,
    message,
}) => {
    return (
        <Html lang='en'>
            <Head />
            <Preview>{`${requesterEmail} is requesting access to your AskingFate session`}</Preview>
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
                    <Section
                        style={{ textAlign: "center", paddingBottom: "8px" }}
                    >
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
                            Someone wants to join your session
                        </Heading>

                        <Text
                            style={{
                                fontSize: "15px",
                                lineHeight: 1.7,
                                color: COLORS.textMuted,
                                margin: "0 0 16px",
                                textAlign: "center",
                            }}
                        >
                            <strong style={{ color: COLORS.accent }}>
                                {requesterName || requesterEmail}
                            </strong>{" "}
                            is asking for access to compose on your AskingFate
                            session.
                        </Text>

                        <Section
                            style={{
                                backgroundColor: "#1a1a36",
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: "12px",
                                padding: "16px 20px",
                                marginBottom: "16px",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: "13px",
                                    color: COLORS.accentSecondary,
                                    fontWeight: 600,
                                    margin: "0 0 6px",
                                }}
                            >
                                Session
                            </Text>
                            <Text
                                style={{
                                    fontSize: "15px",
                                    lineHeight: 1.5,
                                    color: COLORS.textMuted,
                                    margin: 0,
                                }}
                            >
                                {sessionQuestion || "Untitled session"}
                            </Text>
                        </Section>

                        <Section
                            style={{
                                backgroundColor: "#1a1a36",
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: "12px",
                                padding: "16px 20px",
                                marginBottom: "20px",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: "13px",
                                    color: COLORS.accentSecondary,
                                    fontWeight: 600,
                                    margin: "0 0 6px",
                                }}
                            >
                                Requester
                            </Text>
                            <Text
                                style={{
                                    fontSize: "15px",
                                    lineHeight: 1.6,
                                    color: COLORS.textMuted,
                                    margin: 0,
                                }}
                            >
                                {requesterEmail}
                            </Text>
                            {message ? (
                                <>
                                    <Text
                                        style={{
                                            fontSize: "13px",
                                            color: COLORS.accentSecondary,
                                            fontWeight: 600,
                                            margin: "12px 0 6px",
                                        }}
                                    >
                                        Message
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: "15px",
                                            lineHeight: 1.6,
                                            color: COLORS.textMuted,
                                            margin: 0,
                                            whiteSpace: "pre-wrap",
                                        }}
                                    >
                                        {message}
                                    </Text>
                                </>
                            ) : null}
                        </Section>

                        <Section style={{ textAlign: "center" }}>
                            <Link
                                href={sessionLink}
                                style={{
                                    display: "inline-block",
                                    backgroundColor: COLORS.accent,
                                    color: "#0a0a14",
                                    fontWeight: 600,
                                    padding: "12px 22px",
                                    borderRadius: "999px",
                                    textDecoration: "none",
                                    fontSize: "14px",
                                }}
                            >
                                Review the request
                            </Link>
                        </Section>
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
                        You are receiving this because someone requested access
                        to your AskingFate session ·{" "}
                        <Link
                            href='https://askingfate.com'
                            style={{
                                color: COLORS.accentSecondary,
                                textDecoration: "none",
                            }}
                        >
                            askingfate.com
                        </Link>
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}
