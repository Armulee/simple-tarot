import type { Metadata } from "next"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export const metadata: Metadata = {
    title: "Terms of Service - AI Tarot Reading Terms & Conditions | Asking Fate",
    description: "Read the terms of service for Asking Fate's AI-powered tarot reading platform. Understand your rights and responsibilities when using our spiritual guidance service.",
    keywords: "terms of service, terms and conditions, AI tarot terms, tarot reading terms, service agreement, user agreement",
    openGraph: {
        title: "Terms of Service - AI Tarot Reading Terms & Conditions",
        description: "Read the terms of service for Asking Fate's AI-powered tarot reading platform and understand your rights and responsibilities.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Terms of Service - AI Tarot Reading Terms & Conditions",
        description: "Read the terms of service for Asking Fate's AI-powered tarot reading platform and understand your rights and responsibilities.",
    },
}

export default function TermsPage() {
    return (
        <div className='min-h-screen relative overflow-hidden'>
            {/* Navigation */}
            <nav className='relative z-10 flex items-center justify-between p-6 backdrop-blur-sm bg-card/10 border-b border-border/20'>
                <Link href='/' className='flex items-center space-x-2'>
                    <div className='w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center'>
                        <span className='text-primary font-serif font-bold'>
                            ✦
                        </span>
                    </div>
                    <h1 className='font-serif font-bold text-xl text-foreground'>
                        Asking Fate
                    </h1>
                </Link>

                <div className='flex items-center space-x-4'>
                    <Link
                        href='/'
                        className='text-muted-foreground hover:text-foreground transition-colors'
                    >
                        Back to Home
                    </Link>
                </div>
            </nav>

            <main className='relative z-10 max-w-4xl mx-auto px-6 py-16'>
                <div className='space-y-8'>
                    <div className='text-center space-y-4'>
                        <h1 className='font-serif font-bold text-4xl'>
                            Terms of Service
                        </h1>
                        <p className='text-muted-foreground'>
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </div>

                    <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20'>
                        <div className='prose prose-invert max-w-none space-y-8'>
                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    1. Acceptance of Terms
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you and Asking Fate (&quot;Company,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) regarding your use of our AI-powered tarot reading service, including our website, mobile applications, and related services (collectively, the &quot;Service&quot;).
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    By accessing, browsing, or using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use our Service.
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the updated Terms on our website and updating the &quot;Last updated&quot; date. Your continued use of the Service after such modifications constitutes acceptance of the updated Terms.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    2. Service Description
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Asking Fate provides an AI-powered tarot card reading service that combines traditional tarot symbolism with modern artificial intelligence technology. Our Service includes:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>• AI-generated tarot card interpretations and readings</li>
                                    <li>• Multiple reading types and card spreads</li>
                                    <li>• Personalized spiritual guidance and insights</li>
                                    <li>• Community features and sharing capabilities</li>
                                </ul>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Our Service is designed for entertainment, spiritual guidance, and personal reflection purposes. It is not intended to replace professional advice in any field, including but not limited to medical, legal, financial, or psychological counseling.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    3. Eligibility and Account Requirements
                                </h2>
                                
                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    3.1 Age Requirements
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    You must be at least 13 years old to use our Service. If you are between 13 and 18 years of age, you must have parental or guardian consent to use our Service. We do not knowingly collect personal information from children under 13.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    3.2 Account Creation
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    To access certain features of our Service, you may be required to create an account. When creating an account, you agree to:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>• Provide accurate, current, and complete information</li>
                                    <li>• Maintain and update your information to keep it accurate and current</li>
                                    <li>• Maintain the security of your password and account</li>
                                    <li>• Accept responsibility for all activities under your account</li>
                                    <li>• Notify us immediately of any unauthorized use of your account</li>
                                </ul>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    3.3 Account Termination
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We reserve the right to suspend or terminate your account at any time, with or without notice, for any reason, including violation of these Terms or fraudulent, abusive, or illegal activity.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    4. User Conduct and Prohibited Activities
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    You agree to use our Service only for lawful purposes and in accordance with these Terms. You agree not to:
                                </p>
                                
                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    4.1 Prohibited Uses
                                </h3>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>• Use the Service for any unlawful purpose or to solicit others to perform unlawful acts</li>
                                    <li>• Violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                                    <li>• Infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                                    <li>• Harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                                    <li>• Submit false or misleading information</li>
                                    <li>• Upload or transmit viruses or any other type of malicious code</li>
                                    <li>• Spam, phish, pharm, pretext, spider, crawl, or scrape</li>
                                    <li>• Use the Service for any obscene or immoral purpose</li>
                                    <li>• Interfere with or circumvent the security features of the Service</li>
                                    <li>• Attempt to gain unauthorized access to any portion of the Service</li>
                                </ul>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    4.2 Content Guidelines
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    When using our Service, you agree not to submit content that:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>• Is illegal, harmful, threatening, abusive, or defamatory</li>
                                    <li>• Violates any third party&apos;s rights, including privacy and publicity rights</li>
                                    <li>• Contains hate speech or promotes discrimination</li>
                                    <li>• Is sexually explicit or contains adult content</li>
                                    <li>• Contains personal information of others without consent</li>
                                    <li>• Promotes violence or illegal activities</li>
                                </ul>
                            </section>


                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    5. Intellectual Property Rights
                                </h2>
                                
                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    5.1 Our Content
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    The Service and its original content, features, and functionality are and will remain the exclusive property of Asking Fate and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    5.2 User Content
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    You retain ownership of any content you submit, post, or display on or through the Service (&quot;User Content&quot;). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, and distribute such content in connection with the Service.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    5.3 Third-Party Content
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Our Service may contain content from third parties, including but not limited to tarot card imagery, interpretations, and spiritual guidance. Such content is protected by copyright and other intellectual property laws and is used with permission or under appropriate licenses.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    6. Disclaimers and Limitations of Liability
                                </h2>
                                
                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    6.1 Service Disclaimers
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Our Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We disclaim all warranties, including but not limited to:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>• Warranties of merchantability, fitness for a particular purpose, and non-infringement</li>
                                    <li>• Warranties regarding the accuracy, reliability, or completeness of content</li>
                                    <li>• Warranties regarding the availability, security, or performance of the Service</li>
                                    <li>• Warranties regarding the results obtained from using the Service</li>
                                </ul>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    6.2 Tarot Reading Disclaimers
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Tarot readings provided through our Service are for entertainment and spiritual guidance purposes only. They should not be used as a substitute for professional advice in any field, including:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>• Medical, psychological, or psychiatric advice</li>
                                    <li>• Legal, financial, or investment advice</li>
                                    <li>• Professional counseling or therapy</li>
                                    <li>• Life coaching or decision-making guidance</li>
                                </ul>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We are not responsible for any decisions made based on our readings, and you use our Service at your own risk.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    6.3 Limitation of Liability
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    To the maximum extent permitted by law, Asking Fate shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Our total liability to you for any damages arising from or related to these Terms or the Service shall not exceed the amount you paid us for the Service in the 12 months preceding the claim.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    7. Privacy and Data Protection
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Your privacy is important to us. Our collection and use of personal information in connection with the Service is described in our Privacy Policy, which is incorporated into these Terms by reference.
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    By using our Service, you consent to the collection and use of information as described in our Privacy Policy. We implement appropriate security measures to protect your personal information, but we cannot guarantee absolute security.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    8. Indemnification
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    You agree to defend, indemnify, and hold harmless Asking Fate and its officers, directors, employees, and agents from and against any claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including attorney&apos;s fees) arising from:
                                </p>
                                <ul className='space-y-2 text-muted-foreground ml-4'>
                                    <li>• Your use of the Service</li>
                                    <li>• Your violation of these Terms</li>
                                    <li>• Your violation of any third-party rights</li>
                                    <li>• Any content you submit, post, or transmit through the Service</li>
                                </ul>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    9. Termination
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms.
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Upon termination, your right to use the Service will cease immediately. If you wish to terminate your account, you may simply discontinue using the Service or contact us to request account deletion.
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    All provisions of these Terms which by their nature should survive termination shall survive termination, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    10. Governing Law and Dispute Resolution
                                </h2>
                                
                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    10.1 Governing Law
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    These Terms shall be interpreted and governed by the laws of Thailand, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    10.2 Dispute Resolution
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Any disputes arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the Thai Arbitration Institute. The arbitration shall be conducted in Bangkok, Thailand, in the English language.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    11. General Provisions
                                </h2>
                                
                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    11.1 Entire Agreement
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    These Terms, together with our Privacy Policy, constitute the entire agreement between you and Asking Fate regarding the use of the Service and supersede all prior and contemporaneous understandings, agreements, representations, and warranties.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    11.2 Severability
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    11.3 Assignment
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We may assign or transfer these Terms, in whole or in part, without restriction. You may not assign or transfer these Terms without our prior written consent.
                                </p>

                                <h3 className='font-serif font-semibold text-xl text-foreground'>
                                    11.4 Force Majeure
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We shall not be liable for any failure or delay in performance under these Terms which is due to fire, flood, earthquake, elements of nature, or acts of God, acts of war, terrorism, strikes, labor disputes, or any other cause which is beyond our reasonable control.
                                </p>
                            </section>

                            <section className='space-y-4'>
                                <h2 className='font-serif font-semibold text-2xl text-foreground'>
                                    12. Contact Information
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    If you have any questions about these Terms of Service, please contact us:
                                </p>
                                <div className='bg-card/20 p-4 rounded-lg space-y-2'>
                                    <p className='text-muted-foreground'>
                                        <strong>Email:</strong> legal@askingfate.com
                                    </p>
                                    <p className='text-muted-foreground'>
                                        <strong>Support:</strong> <Link href='/support' className='text-primary hover:text-primary/80'>support@askingfate.com</Link>
                                    </p>
                                    <p className='text-muted-foreground'>
                                        <strong>Contact Form:</strong> <Link href='/contact' className='text-primary hover:text-primary/80'>Visit our contact page</Link>
                                    </p>
                                    <p className='text-muted-foreground'>
                                        <strong>Privacy Policy:</strong> <Link href='/privacy-policy' className='text-primary hover:text-primary/80'>View our privacy policy</Link>
                                    </p>
                                </div>
                                <p className='text-muted-foreground leading-relaxed'>
                                    We will respond to your inquiry within 5 business days.
                                </p>
                            </section>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    )
}
