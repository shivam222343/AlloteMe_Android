import React from 'react';
import { motion } from 'framer-motion';

const Legal = ({ docType }) => {
    const isPrivacy = docType === 'privacy';

    return (
        <div style={{ background: '#fff', minHeight: '90vh' }}>
            {/* Legal Hero */}
            <section className="section-padding" style={{ 
                background: 'radial-gradient(50% 50% at 50% 50%, rgba(36, 93, 241, 0.05) 0%, rgba(255, 255, 255, 0) 100%)',
                paddingTop: '120px'
            }}>
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}
                    >
                        <h1 style={{ fontSize: '64px', color: '#245df1', marginBottom: '24px' }}>
                            {isPrivacy ? 'Privacy Policy' : 'Terms & Conditions'}
                        </h1>
                        <p style={{ fontSize: '20px', color: '#5e6b7e', lineHeight: 1.6 }}>
                            Effective Date: March 27, 2026. <br />
                            Please read these documents carefully to understand our commitment to your data and security.
                        </p>
                    </motion.div>
                </div>
            </section>

            <section className="section-padding" style={{ paddingTop: 0 }}>
                <div style={{ width: '100%', maxWidth: '100%' }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        style={{ 
                            padding: '60px 40px', 
                            background: '#fff',
                            width: '100%'
                        }}
                    >
                        <div style={{ color: '#1a1d23', fontSize: '17px', lineHeight: 1.8, maxWidth: '1200px', margin: '0 auto' }}>
                            {isPrivacy ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                    <div>
                                        <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#1a1d23' }}>1. Introduction</h2>
                                        <p>Welcome to AlloteMe. We respect your privacy and are committed to protecting your personal data. This Privacy Policy informs you how we look after your data when you visit our website (the "Platform") and tells you about your privacy rights and how the law protects you.</p>
                                    </div>

                                    <div>
                                        <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#1a1d23' }}>2. The Data We Collect</h2>
                                        <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                                        <ul style={{ paddingLeft: '24px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <li><strong>Identity Data:</strong> includes first name, last name, and username.</li>
                                            <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
                                            <li><strong>Academic Data:</strong> includes your percentile, rank, category, and preferred branches.</li>
                                            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, login data, browser type and version.</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#1a1d23' }}>3. How We Use Your Data</h2>
                                        <p>We will only use your personal data when the law allows us to. Most commonly, we will use your data in the following circumstances:</p>
                                        <ul style={{ paddingLeft: '24px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <li>To provide the College Prediction service based on your rank.</li>
                                            <li>To power our AI Counselors (using secure API integrations).</li>
                                            <li>To enable your account features and secure your history.</li>
                                            <li>For internal analytics to improve our cutoff accuracy.</li>
                                        </ul>
                                    </div>

                                    <div style={{ background: '#f8faff', padding: '40px', borderRadius: '24px', border: '1px solid #eef2ff' }}>
                                        <h3 style={{ fontSize: '22px', marginBottom: '16px' }}>Contact Information</h3>
                                        <p>Email: <strong style={{ color: '#245df1' }}>alloteme1@gmail.com</strong></p>
                                        <p>Address: Kolhapur, Maharashtra, India</p>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                    <div>
                                        <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#1a1d23' }}>1. Services Provided</h2>
                                        <p>AlloteMe provides a platform for educational data analysis and college allotment prediction based on historical DTE Maharashtra data. We do not guarantee admission to any institution.</p>
                                    </div>

                                    <div>
                                        <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#1a1d23' }}>2. Accuracy & Disclaimer</h2>
                                        <p>The predictions provided by the AlloteMe engine and AI Counselors are meant as a guide only. Final allotments are exclusively managed by the State Common Entrance Test Cell (CET Cell), Maharashtra. Users are encouraged to verify critical data with the official DTE Information Brochure.</p>
                                    </div>

                                    <div>
                                        <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#1a1d23' }}>3. Intellectual Property</h2>
                                        <p>All software, proprietary algorithms, and aggregated cutoff databases are the intellectual property of AlloteMe. Unauthorized reproduction of our analytical outputs is strictly prohibited.</p>
                                    </div>

                                    <div>
                                        <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#1a1d23' }}>4. Governing Law</h2>
                                        <p>These terms are governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Kolhapur, Maharashtra.</p>
                                    </div>

                                    <div style={{ background: '#f8faff', padding: '40px', borderRadius: '24px', border: '1px solid #eef2ff' }}>
                                        <p>By using AlloteMe, you acknowledge that you have read and understood these terms.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default Legal;
