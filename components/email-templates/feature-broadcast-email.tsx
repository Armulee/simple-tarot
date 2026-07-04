import React from "react"
import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Preview,
    Section,
    Text,
} from "@react-email/components"

interface FeatureBroadcastEmailProps {
    /** The headline shown at the top of the card (defaults to the subject). */
    heading: string
    /** The message body. Newlines are preserved. */
    body: string
    preview?: string
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

/**
 * Default template for feature-announcement / broadcast emails sent to the
 * feature-waitlist subscribers from the admin broadcast tool.
 */
export const FeatureBroadcastEmail: React.FC<FeatureBroadcastEmailProps> = ({
    heading,
    body,
    preview,
}) => {
    return (
        <Html lang="en">
            <Head />
            <Preview>{preview || heading}</Preview>
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
                            src="https://askingfate.com/assets/logo.png"
                            alt="AskingFate"
                            width="80"
                            height="80"
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
                            as="h2"
                            style={{
                                fontSize: "22px",
                                lineHeight: 1.3,
                                margin: "0 0 20px",
                                color: COLORS.text,
                                textAlign: "center",
                            }}
                        >
                            {heading}
                        </Heading>

                        <Text
                            style={{
                                fontSize: "15px",
                                lineHeight: 1.7,
                                color: COLORS.textMuted,
                                margin: 0,
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {body}
                        </Text>

                        <Hr
                            style={{
                                borderColor: COLORS.border,
                                margin: "28px 0 16px",
                            }}
                        />
                        <Text
                            style={{
                                fontSize: "13px",
                                lineHeight: 1.6,
                                color: COLORS.textDim,
                                margin: 0,
                                textAlign: "center",
                            }}
                        >
                            You received this because you asked AskingFate to
                            notify you about new features.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}
