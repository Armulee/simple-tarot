import React from "react"
import Head from "next/head"
import Image from "next/image"

interface UserAutoReplyEmailProps {
    name: string
    subject: string
    message: string
}

export const UserAutoReplyEmail: React.FC<UserAutoReplyEmailProps> = ({
    name,
    subject,
    message,
}) => {
    return (
        <html
            lang='en'
            style={{
                margin: 0,
                padding: 0,
                background: "#03030a",
                color: "#fff",
                fontFamily: "'Poppins','Helvetica Neue',Arial,sans-serif",
            }}
        >
            <Head>
                <meta charSet='UTF-8' />
                <title>Thank you for contacting Asking Fate</title>
            </Head>
            <body
                style={{
                    margin: 0,
                    padding: 0,
                    background:
                        "radial-gradient(circle at top, #0a0a2a 0%, #000 100%)",
                    color: "#fff",
                    textAlign: "center",
                }}
            >
                <div
                    style={{
                        maxWidth: "520px",
                        margin: "60px auto",
                        background: "rgba(20,20,40,0.8)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "18px",
                        padding: "40px 30px",
                        boxShadow: "0 0 30px rgba(100,100,255,0.2)",
                        backdropFilter: "blur(6px)",
                    }}
                >
                    <Image
                        src='https://askingfate.com/assets/logo.png'
                        alt='AskingFate Logo'
                        width={100}
                        height={100}
                        style={{
                            width: "100px",
                            height: "auto",
                            marginBottom: "18px",
                            filter: "drop-shadow(0 0 8px rgba(125,227,255,0.6))",
                        }}
                    />

                    <h2
                        style={{
                            fontSize: "24px",
                            marginBottom: "10px",
                            background:
                                "linear-gradient(90deg,#b891ff,#7de3ff)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        Thank you for contacting us!
                    </h2>

                    <p
                        style={{
                            fontSize: "15px",
                            lineHeight: "1.7",
                            color: "#d6d6f8",
                            marginBottom: "20px",
                        }}
                    >
                        Dear{" "}
                        <strong style={{ color: "#b891ff" }}>{name}</strong>,
                    </p>

                    <p
                        style={{
                            fontSize: "15px",
                            lineHeight: "1.7",
                            color: "#d6d6f8",
                            marginBottom: "30px",
                        }}
                    >
                        We have received your message and will get back to you
                        as soon as possible. Your spiritual journey with{" "}
                        <strong style={{ color: "#7de3ff" }}>AskingFate</strong>{" "}
                        is important to us.
                    </p>

                    <div
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            padding: "25px",
                            margin: "25px 0",
                            borderRadius: "12px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderLeft: "4px solid #7de3ff",
                            textAlign: "left",
                        }}
                    >
                        <h3
                            style={{
                                fontSize: "16px",
                                marginBottom: "15px",
                                color: "#b891ff",
                            }}
                        >
                            Your Message Details:
                        </h3>
                        <p
                            style={{
                                fontSize: "15px",
                                lineHeight: "1.7",
                                color: "#d6d6f8",
                                margin: "8px 0",
                            }}
                        >
                            <strong style={{ color: "#7de3ff" }}>
                                Subject:
                            </strong>{" "}
                            {subject}
                        </p>
                        <p
                            style={{
                                fontSize: "15px",
                                lineHeight: "1.7",
                                color: "#d6d6f8",
                                margin: "8px 0",
                            }}
                        >
                            <strong style={{ color: "#7de3ff" }}>
                                Message:
                            </strong>
                        </p>
                        <p
                            style={{
                                fontSize: "15px",
                                lineHeight: "1.7",
                                color: "#d6d6f8",
                                whiteSpace: "pre-wrap",
                                marginTop: "8px",
                            }}
                        >
                            {message}
                        </p>
                    </div>

                    <p
                        style={{
                            fontSize: "15px",
                            lineHeight: "1.7",
                            color: "#d6d6f8",
                            marginTop: "30px",
                        }}
                    >
                        Best regards,
                        <br />
                        <span style={{ color: "#b891ff" }}>
                            The AskingFate Team
                        </span>
                    </p>

                    <p
                        style={{
                            marginTop: "30px",
                            fontSize: "13px",
                            color: "#8888aa",
                        }}
                    >
                        This is an automated response. Please do not reply to
                        this email.
                    </p>

                    <hr
                        style={{
                            margin: "30px auto",
                            width: "40%",
                            border: "none",
                            borderTop: "1px solid rgba(255,255,255,0.1)",
                        }}
                    />

                    <p style={{ fontSize: "12px", color: "#5a5a80" }}>
                        ✦ Sent from AskingFate |{" "}
                        <a
                            href='https://askingfate.com'
                            style={{ color: "#7de3ff", textDecoration: "none" }}
                        >
                            Visit Us
                        </a>{" "}
                        ✦
                    </p>
                </div>
            </body>
        </html>
    )
}
