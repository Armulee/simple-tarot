import React from "react"

interface UserAutoReplyEmailProps {
    name: string
    subject: string
    message: string
}

export function UserAutoReplyEmail({
    name,
    subject,
    message,
}: UserAutoReplyEmailProps) {
    return (
        <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ color: "#333", borderBottom: "2px solid #007bff", paddingBottom: "10px" }}>
                Thank You for Contacting Asking Fate
            </h2>
            
            <div style={{ marginTop: "20px" }}>
                <p>Dear {name},</p>
                
                <p>Thank you for reaching out to us! We have received your message and will get back to you as soon as possible.</p>
                
                <div style={{ 
                    backgroundColor: "#f8f9fa", 
                    padding: "15px", 
                    borderRadius: "5px",
                    border: "1px solid #e9ecef",
                    margin: "20px 0"
                }}>
                    <h3 style={{ color: "#555", marginTop: "0" }}>Your Message:</h3>
                    <p><strong>Subject:</strong> {subject}</p>
                    <div style={{ 
                        backgroundColor: "white", 
                        padding: "10px", 
                        borderRadius: "3px",
                        border: "1px solid #dee2e6",
                        whiteSpace: "pre-wrap",
                        marginTop: "10px"
                    }}>
                        {message}
                    </div>
                </div>
                
                <p>We typically respond within 24-48 hours. If you have any urgent inquiries, please don&apos;t hesitate to reach out to us directly.</p>
                
                <p>Best regards,<br />
                The Asking Fate Team</p>
            </div>
            
            <div style={{ marginTop: "30px", fontSize: "12px", color: "#666", borderTop: "1px solid #e9ecef", paddingTop: "15px" }}>
                <p>This is an automated response. Please do not reply to this email.</p>
                <p>If you need immediate assistance, please contact us through our website.</p>
            </div>
        </div>
    )
}