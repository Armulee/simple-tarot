import React from "react"
import {
    Body,
    Button,
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

interface StarsRefilledEmailProps {
    /** Display name; falls back to a generic greeting when absent. */
    name?: string | null
    /** How many daily stars came back (the full batch). */
    stars?: number
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
    gold: "#fcd34d",
}

const fontStack =
    "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif"

/**
 * Reminder email sent when a user's daily stars batch-refill lands (mirrors
 * the in-app "stars refilled" notification). Skipped for users who have the
 * mobile app or who disabled reading-reminder emails.
 */
export const StarsRefilledEmail: React.FC<StarsRefilledEmailProps> = ({
    name,
    stars = 5,
}) => {
    return (
        <Html lang="en">
            <Head />
            <Preview>{`Your ${stars} stars are back — the cards are waiting ✨`}</Preview>
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
                            textAlign: "center",
                        }}
                    >
                        <Text
                            style={{
                                fontSize: "34px",
                                lineHeight: 1,
                                margin: "0 0 12px",
                            }}
                        >
                            ⭐
                        </Text>
                        <Heading
                            as="h2"
                            style={{
                                fontSize: "22px",
                                lineHeight: 1.3,
                                margin: "0 0 16px",
                                color: COLORS.text,
                            }}
                        >
                            Your stars have returned
                        </Heading>

                        <Text
                            style={{
                                fontSize: "15px",
                                lineHeight: 1.7,
                                color: COLORS.textMuted,
                                margin: "0 0 8px",
                            }}
                        >
                            {name ? `Dear ${name},` : "Hello,"}
                        </Text>
                        <Text
                            style={{
                                fontSize: "15px",
                                lineHeight: 1.7,
                                color: COLORS.textMuted,
                                margin: "0 0 24px",
                            }}
                        >
                            All{" "}
                            <strong style={{ color: COLORS.gold }}>
                                {stars} daily stars
                            </strong>{" "}
                            are back in your balance. The cards are shuffled and
                            the stars are listening — come ask your next
                            question.
                        </Text>

                        <Button
                            href="https://askingfate.com"
                            style={{
                                display: "inline-block",
                                backgroundColor: COLORS.accent,
                                color: "#0a0a14",
                                fontSize: "15px",
                                fontWeight: 600,
                                padding: "12px 28px",
                                borderRadius: "12px",
                                textDecoration: "none",
                            }}
                        >
                            Draw a card
                        </Button>

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
                            }}
                        >
                            You can turn off reading reminders anytime in
                            Settings → Notifications.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}
