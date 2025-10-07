import React from "react"

interface AdminNotificationEmailProps {
    name: string
    email: string
    subject: string
    message: string
}

export const AdminNotificationEmail: React.FC<AdminNotificationEmailProps> = ({
    name,
    email,
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
            <head>
                <meta charSet='UTF-8' />
                <title>New Contact Form Submission - AskingFate</title>
            </head>
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
                    <img
                        src='https://askingfate.com/assets/logo.png'
                        alt='AskingFate Logo'
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
                            marginBottom: "20px",
                            background:
                                "linear-gradient(90deg,#b891ff,#7de3ff)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        New Contact Form Submission
                    </h2>

                    <div style={{ textAlign: "left", marginTop: "30px" }}>
                        <div
                            style={{
                                marginBottom: "20px",
                                padding: "20px",
                                background: "rgba(255,255,255,0.05)",
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.1)",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "15px",
                                    lineHeight: "1.7",
                                    color: "#d6d6f8",
                                    margin: "8px 0",
                                }}
                            >
                                <strong style={{ color: "#7de3ff" }}>
                                    Name:
                                </strong>{" "}
                                {name}
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
                                    Email:
                                </strong>{" "}
                                {email}
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
                                    Subject:
                                </strong>{" "}
                                {subject}
                            </p>
                        </div>

                        <div
                            style={{
                                marginBottom: "20px",
                                padding: "20px",
                                background: "rgba(255,255,255,0.05)",
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.1)",
                            }}
                        >
                            <h3
                                style={{
                                    fontSize: "16px",
                                    marginBottom: "12px",
                                    color: "#b891ff",
                                }}
                            >
                                Message:
                            </h3>
                            <p
                                style={{
                                    fontSize: "15px",
                                    lineHeight: "1.7",
                                    color: "#d6d6f8",
                                    whiteSpace: "pre-wrap",
                                }}
                            >
                                {message}
                            </p>
                        </div>
                    </div>

                    <p
                        style={{
                            marginTop: "30px",
                            fontSize: "13px",
                            color: "#8888aa",
                        }}
                    >
                        This message was sent from the contact form on your
                        website.
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
                        ✦ Sent from AskingFate Contact Form |{" "}
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