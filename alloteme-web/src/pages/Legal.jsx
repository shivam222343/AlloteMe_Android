import React from 'react';
import { motion } from 'framer-motion';

const Legal = ({ docType }) => {
    const isPrivacy = docType === 'privacy';

    return (
        <div style={{ background: '#f8fafc', minHeight: '90vh', padding: '100px 5%' }}>
            <motion.div
                className="container"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'white', borderRadius: '48px', padding: '80px 10%', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}
            >
                <h1 style={{ fontSize: '48px', marginBottom: '16px', textAlign: 'center', fontWeight: 900 }}>
                    {isPrivacy ? 'Privacy Policy' : 'Terms & Conditions'}
                </h1>
                <p style={{ textAlign: 'center', color: 'var(--text-soft)', marginBottom: '60px', fontSize: '18px' }}>
                    Effective Date: March 27, 2026
                </p>

                <div style={{ color: 'var(--text)', fontSize: '16px', lineHeight: 1.8, textAlign: 'left' }}>
                    {isPrivacy ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                            <div>
                                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--dark)' }}>1. Introduction</h2>
                                <p>Welcome to AlloteMe. We respect your privacy and are committed to protecting your personal data. This Privacy Policy informs you how we look after your data when you visit our website (the "Platform") and tells you about your privacy rights and how the law protects you.</p>
                            </div>

                            <div>
                                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--dark)' }}>2. The Data We Collect</h2>
                                <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                                <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                                    <li><strong>Identity Data:</strong> includes first name, last name, and username.</li>
                                    <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
                                    <li><strong>Academic Data:</strong> includes your percentile, rank, category, and preferred branches which are necessary for the college prediction engine.</li>
                                    <li><strong>Technical Data:</strong> includes internet protocol (IP) address, login data, browser type and version, and operating system.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--dark)' }}>3. How We Use Your Data</h2>
                                <p>We will only use your personal data when the law allows us to. Most commonly, we will use your data in the following circumstances:</p>
                                <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                                    <li>To provide the College Prediction service based on your rank.</li>
                                    <li>To power our AI Counselors (using secure API integrations where data is anonymized).</li>
                                    <li>To enable your account features and secure your history.</li>
                                    <li>For internal analytics to improve our cutoff accuracy.</li>
                                </ul>
                            </div>

                            <div>
                                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--dark)' }}>4. Third-Party Integrations</h2>
                                <p>We use trusted third-party providers such as OpenAI and Groq for our AI counseling features. We do not sell your academic data to third-party ad networks. We use Google Analytics and Firebase for platform stability and performance monitoring.</p>
                            </div>

                            <div>
                                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--dark)' }}>5. Your Legal Rights</h2>
                                <p>Under data protection laws, you have rights including the right to access, correct, or erase your personal data. You can exercise these rights through your app settings or by contacting us.</p>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '24px' }}>
                                <h3 style={{ marginBottom: '10px' }}>Contact Information</h3>
                                <p>Email: <strong>alloteme1@gmail.com</strong></p>
                                <p>Address: Kolhapur, Maharashtra, India</p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                            <div>
                                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--dark)' }}>1. Services Provided</h2>
                                <p>AlloteMe provides a platform for educational data analysis and college allotment prediction based on historical DTE Maharashtra data. We do not guarantee admission to any institution.</p>
                            </div>

                            <div>
                                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--dark)' }}>2. Accuracy & Disclaimer</h2>
                                <p>The predictions provided by the AlloteMe engine and AI Counselors are meant as a guide only. Final allotments are exclusively managed by the State Common Entrance Test Cell (CET Cell), Maharashtra. Users are encouraged to verify critical data with the official DTE Information Brochure.</p>
                            </div>

                            <div>
                                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--dark)' }}>3. Termination</h2>
                                <p>We reserve the right to suspend or terminate your access to the platform without notice if we believe you are scraping our data for commercial purposes or providing fraudulent merit information.</p>
                            </div>

                            <div>
                                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--dark)' }}>4. Intellectual Property</h2>
                                <p>All software, proprietary algorithms, and aggregated cutoff databases are the intellectual property of AlloteMe. Unauthorized reproduction of our analytical outputs is strictly prohibited.</p>
                            </div>

                            <div>
                                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--dark)' }}>5. Governing Law</h2>
                                <p>These terms are governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Kolhapur, Maharashtra.</p>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '24px' }}>
                                <p>By using AlloteMe, you acknowledge that you have read and understood these terms.</p>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Legal;
