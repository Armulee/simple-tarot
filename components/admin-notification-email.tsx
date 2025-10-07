import React from "react"

interface AdminNotificationEmailProps {
    name: string
    email: string
    subject: string
    message: string
}

export function AdminNotificationEmail({
    name,
    email,
    subject,
    message,
}: AdminNotificationEmailProps) {
    return (
        <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ color: "#333", borderBottom: "2px solid #007bff", paddingBottom: "10px" }}>
                New Contact Form Submission
            </h2>
            
            <div style={{ marginTop: "20px" }}>
                <h3 style={{ color: "#555", marginBottom: "10px" }}>Contact Details:</h3>
                <p><strong>Name:</strong> {name}</p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Subject:</strong> {subject}</p>
            </div>
            
            <div style={{ marginTop: "20px" }}>
                <h3 style={{ color: "#555", marginBottom: "10px" }}>Message:</h3>
                <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "15px", 
                    borderRadius: "5px",
                    border: "1px solid #e9ecef",
                    whiteSpace: "pre-wrap"
                }}>
                    {message}
                </div>
            </div>
            
            <div style={{ marginTop: "30px", fontSize: "12px", color: "#666" }}>
                <p>This email was sent from the Asking Fate contact form.</p>
            </div>
        </div>
    )
}