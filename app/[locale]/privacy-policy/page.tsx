import type { Metadata } from "next"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export const metadata: Metadata = {
    title: "Privacy Policy - Your Data Protection & Privacy Rights | Asking Fate",
    description:
        "Learn how Asking Fate protects your privacy and personal information when using our AI tarot reading service. Read our comprehensive privacy policy.",
    keywords:
        "privacy policy, data protection, AI tarot privacy, personal information security, tarot reading privacy, user data protection",
    openGraph: {
        title: "Privacy Policy - Your Data Protection & Privacy Rights",
        description:
            "Learn how Asking Fate protects your privacy and personal information when using our AI tarot reading service.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Privacy Policy - Your Data Protection & Privacy Rights",
        description:
            "Learn how Asking Fate protects your privacy and personal information when using our AI tarot reading service.",
    },
}

export default function PrivacyPage() {
    return (
        <div className='min-h-screen relative overflow-hidden'>
            <main className='relative z-10 max-w-4xl mx-auto px-6 pt-8'>
                <div className='space-y-8'>
                    <div className='text-center space-y-4'>
                        <h1 className='font-serif font-bold text-4xl'>
                            Privacy Policy
                        </h1>
                        <p className='text-muted-foreground'>
                            Last updated: September 13, 2025
                        </p>
                    </div>

                    <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20'>
                        <div className='prose prose-invert max-w-none space-y-8'>
                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    1. Introduction
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Asking Fate (&quot;we,&quot;
                                    &quot;our,&quot; or &quot;us&quot;) is
                                    committed to protecting your privacy and
                                    personal information. This Privacy Policy
                                    explains how we collect, use, disclose, and
                                    safeguard your information when you use our
                                    AI-powered tarot reading service, including
                                    our website, mobile applications, and
                                    related services (collectively, the
                                    &quot;Service&quot;).
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    By using our Service, you agree to the
                                    collection and use of information in
                                    accordance with this Privacy Policy. If you
                                    do not agree with the terms of this Privacy
                                    Policy, please do not access or use the
                                    Service.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    2. Information We Collect
                                </h2>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    2.1 Personal Information
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We collect information you provide directly
                                    to us, including:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Account information (name, email
                                        address, password)
                                    </li>
                                    <li>
                                        • Profile information (preferences,
                                        spiritual interests)
                                    </li>
                                    <li>
                                        • Communication data (messages, support
                                        requests, feedback)
                                    </li>
                                    <li>
                                        • Tarot reading data (questions asked,
                                        cards selected, interpretations
                                        received)
                                    </li>
                                </ul>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    2.2 Automatically Collected Information
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We automatically collect certain information
                                    when you use our Service:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Device information (IP address,
                                        browser type, operating system)
                                    </li>
                                    <li>
                                        • Usage data (pages visited, features
                                        used, time spent)
                                    </li>
                                    <li>
                                        • Log data (access times, error logs,
                                        performance metrics)
                                    </li>
                                    <li>
                                        • Cookies and similar tracking
                                        technologies
                                    </li>
                                    <li>
                                        • Location data (if you grant
                                        permission)
                                    </li>
                                </ul>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    2.3 Third-Party Information
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We may receive information about you from
                                    third parties, including:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Social media platforms (if you connect
                                        your accounts)
                                    </li>
                                    <li>
                                        • Payment processors (transaction
                                        confirmations)
                                    </li>
                                    <li>
                                        • Analytics providers (usage statistics)
                                    </li>
                                    <li>
                                        • Marketing partners (referral
                                        information)
                                    </li>
                                </ul>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    3. How We Use Your Information
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We use the information we collect for
                                    various purposes, including:
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    3.1 Service Provision
                                </h3>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Provide and maintain our tarot reading
                                        service
                                    </li>
                                    <li>
                                        • Generate personalized AI
                                        interpretations
                                    </li>
                                    <li>
                                        • Provide customer support and technical
                                        assistance
                                    </li>
                                </ul>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    3.2 Communication
                                </h3>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Send service-related notifications and
                                        updates
                                    </li>
                                    <li>
                                        • Respond to your inquiries and support
                                        requests
                                    </li>
                                    <li>
                                        • Send marketing communications (with
                                        your consent)
                                    </li>
                                    <li>
                                        • Provide important security and policy
                                        updates
                                    </li>
                                </ul>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    3.3 Service Improvement
                                </h3>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Analyze usage patterns and user
                                        behavior
                                    </li>
                                    <li>
                                        • Improve our AI algorithms and
                                        interpretations
                                    </li>
                                    <li>
                                        • Develop new features and functionality
                                    </li>
                                    <li>• Conduct research and analytics</li>
                                    <li>
                                        • Ensure service security and prevent
                                        fraud
                                    </li>
                                </ul>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    4. Information Sharing and Disclosure
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We do not sell, trade, or otherwise transfer
                                    your personal information to third parties,
                                    except in the following circumstances:
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    4.1 Service Providers
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We may share your information with trusted
                                    third-party service providers who assist us
                                    in operating our Service, including:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Payment processors (Stripe, PayPal)
                                    </li>
                                    <li>
                                        • Cloud hosting providers (AWS, Google
                                        Cloud)
                                    </li>
                                    <li>
                                        • Analytics services (Google Analytics,
                                        Mixpanel)
                                    </li>
                                    <li>
                                        • Customer support platforms (Zendesk,
                                        Intercom)
                                    </li>
                                    <li>
                                        • Email marketing services (Mailchimp,
                                        SendGrid)
                                    </li>
                                </ul>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    4.2 Legal Requirements
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We may disclose your information if required
                                    to do so by law or in response to valid
                                    legal processes, such as:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>• Court orders or subpoenas</li>
                                    <li>• Government investigations</li>
                                    <li>• Legal compliance requirements</li>
                                    <li>
                                        • Protection of our rights and property
                                    </li>
                                </ul>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    4.3 Business Transfers
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    In the event of a merger, acquisition, or
                                    sale of assets, your information may be
                                    transferred as part of the transaction. We
                                    will notify you of any such change in
                                    ownership or control.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    5. Data Security
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We implement comprehensive security measures
                                    to protect your personal information:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Encryption in transit and at rest
                                        using industry-standard protocols
                                    </li>
                                    <li>
                                        • Secure authentication and access
                                        controls
                                    </li>
                                    <li>
                                        • Regular security audits and
                                        vulnerability assessments
                                    </li>
                                    <li>
                                        • Employee training on data protection
                                        best practices
                                    </li>
                                    <li>
                                        • Incident response procedures for
                                        security breaches
                                    </li>
                                </ul>
                                <p className='text-muted-foreground leading-relaxed'>
                                    However, no method of transmission over the
                                    internet or electronic storage is 100%
                                    secure. While we strive to protect your
                                    personal information, we cannot guarantee
                                    absolute security.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    6. Data Retention
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We retain your personal information for as
                                    long as necessary to provide our Service and
                                    fulfill the purposes outlined in this
                                    Privacy Policy. Specifically:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Account information: Until you delete
                                        your account
                                    </li>
                                    <li>
                                        • Usage analytics: Aggregated and
                                        anonymized data may be retained
                                        indefinitely
                                    </li>
                                    <li>
                                        • Legal compliance: As required by
                                        applicable laws and regulations
                                    </li>
                                </ul>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    7. Your Rights and Choices
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Depending on your location, you may have
                                    certain rights regarding your personal
                                    information:
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    7.1 Access and Portability
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    You have the right to access and receive a
                                    copy of your personal information in a
                                    structured, machine-readable format.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    7.2 Correction and Updates
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    You can update or correct your personal
                                    information through your account settings or
                                    by contacting us.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    7.3 Deletion
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    You have the right to request deletion of
                                    your personal information, subject to
                                    certain legal and operational requirements.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    7.4 Opt-out of Communications
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    You can unsubscribe from marketing
                                    communications at any time using the
                                    unsubscribe link in our emails or by
                                    contacting us.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    7.5 Data Processing Objection
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    You may object to certain types of data
                                    processing, such as marketing or analytics,
                                    where legally permitted.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    8. Cookies and Tracking Technologies
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We use cookies and similar tracking
                                    technologies to enhance your experience:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Essential cookies: Required for basic
                                        service functionality
                                    </li>
                                    <li>
                                        • Analytics cookies: Help us understand
                                        how you use our Service
                                    </li>
                                    <li>
                                        • Preference cookies: Remember your
                                        settings and preferences
                                    </li>
                                    <li>
                                        • Marketing cookies: Used for targeted
                                        advertising (with consent)
                                    </li>
                                </ul>
                                <p className='text-muted-foreground leading-relaxed'>
                                    You can control cookie settings through your
                                    browser preferences, but disabling certain
                                    cookies may affect Service functionality.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    9. International Data Transfers
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Your information may be transferred to and
                                    processed in countries other than your own.
                                    We ensure appropriate safeguards are in
                                    place for international transfers,
                                    including:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Standard contractual clauses approved
                                        by relevant authorities
                                    </li>
                                    <li>
                                        • Adequacy decisions by data protection
                                        authorities
                                    </li>
                                    <li>
                                        • Certification schemes and codes of
                                        conduct
                                    </li>
                                    <li>
                                        • Binding corporate rules for
                                        intra-group transfers
                                    </li>
                                </ul>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    10. Children&apos;s Privacy
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Our Service is not intended for children
                                    under 13 years of age. We do not knowingly
                                    collect personal information from children
                                    under 13. If you are a parent or guardian
                                    and believe your child has provided us with
                                    personal information, please contact us
                                    immediately.
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    For users between 13 and 18 years of age, we
                                    recommend parental guidance and supervision
                                    when using our Service.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    11. Changes to This Privacy Policy
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We may update this Privacy Policy from time
                                    to time to reflect changes in our practices
                                    or legal requirements. We will notify you of
                                    any material changes by:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>
                                        • Posting the updated policy on our
                                        website
                                    </li>
                                    <li>• Sending you an email notification</li>
                                    <li>
                                        • Displaying a prominent notice in our
                                        Service
                                    </li>
                                </ul>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Your continued use of the Service after any
                                    changes constitutes acceptance of the
                                    updated Privacy Policy.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    12. Contact Information
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    If you have any questions, concerns, or
                                    requests regarding this Privacy Policy or
                                    our data practices, please contact us:
                                </p>
                                <div className='bg-card/20 p-4 rounded-lg space-y-2'>
                                    <p className='text-muted-foreground'>
                                        <strong>Email:</strong>{" "}
                                        privacy@askingfate.com
                                    </p>
                                    <p className='text-muted-foreground'>
                                        <strong>Support:</strong>{" "}
                                        <Link
                                            href='/support'
                                            className='text-primary hover:text-primary/80'
                                        >
                                            support@askingfate.com
                                        </Link>
                                    </p>
                                    <p className='text-muted-foreground'>
                                        <strong>Contact Form:</strong>{" "}
                                        <Link
                                            href='/contact'
                                            className='text-primary hover:text-primary/80'
                                        >
                                            Visit our contact page
                                        </Link>
                                    </p>
                                    <p className='text-muted-foreground'>
                                        <strong>Terms of Service:</strong>{" "}
                                        <Link
                                            href='/terms-of-service'
                                            className='text-primary hover:text-primary/80'
                                        >
                                            View our terms
                                        </Link>
                                    </p>
                                </div>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We will respond to your inquiry within 30
                                    days of receipt.
                                </p>
                            </section>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    )
}
