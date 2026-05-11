import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, MessageCircle, ArrowRight } from 'lucide-react';

const Contact = () => {
    return (
        <div style={{ background: '#fff', minHeight: '90vh' }}>
            {/* Contact Hero */}
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
                            Contact Us <br />
                            <span style={{ color: '#1a1d23' }}>We're here to help you</span>
                        </h1>
                        <p style={{ fontSize: '20px', color: '#5e6b7e', lineHeight: 1.6 }}>
                            Have questions about your admission journey? Our team of experts is ready to provide the guidance you need.
                        </p>
                    </motion.div>
                </div>
            </section>

            <section className="section-padding">
                <div className="container">
                    <div className="contact-grid">
                        {[
                            { 
                                title: "Email Support", 
                                desc: "For technical issues and detailed queries.", 
                                value: "alloteme1@gmail.com", 
                                icon: <Mail size={24} color="#245df1" />,
                                link: "mailto:alloteme1@gmail.com"
                            },
                            { 
                                title: "Phone & WhatsApp", 
                                desc: "Direct line to our support team.", 
                                value: "+91 8010961216", 
                                icon: <Phone size={24} color="#245df1" />,
                                link: "tel:+918010961216"
                            },
                            { 
                                title: "Our Location", 
                                desc: "Visit us for collaborations.", 
                                value: "Kolhapur, Maharashtra", 
                                icon: <MapPin size={24} color="#245df1" />,
                                link: "#"
                            }
                        ].map((item, i) => (
                            <motion.a
                                key={i}
                                href={item.link}
                                whileHover={{ y: -5 }}
                                className="glass-card"
                                style={{ 
                                    padding: '40px', 
                                    borderRadius: '24px', 
                                    display: 'block',
                                    border: '1px solid #f1f5f9',
                                    background: '#fff'
                                }}
                            >
                                <div style={{ background: '#eef2ff', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                    {item.icon}
                                </div>
                                <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>{item.title}</h3>
                                <p style={{ color: '#5e6b7e', marginBottom: '24px', fontSize: '15px' }}>{item.desc}</p>
                                <p style={{ fontWeight: 700, color: '#1a1d23', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {item.value} <ArrowRight size={16} color="#245df1" />
                                </p>
                            </motion.a>
                        ))}
                    </div>

                    {/* Support Banner - Wavy Design */}
                    <div className="premium-cta-container" style={{ marginTop: '60px', padding: '60px 40px', borderRadius: '32px' }}>
                        <div className="cta-wave" />
                        <div className="cta-wave-2" />
                        <div className="cta-wave-3" />
                        
                        <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '30px', textAlign: 'left' }}>
                            <div style={{ flex: '1', minWidth: '300px' }}>
                                <h3 style={{ color: '#fff', fontSize: '32px', marginBottom: '12px', fontWeight: 800 }}>Need instant help?</h3>
                                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px' }}>Chat with our experts on WhatsApp for immediate guidance.</p>
                            </div>
                            <a href="https://wa.me/918010961216" className="btn-white-pill" style={{ padding: '16px 40px' }}>
                                <MessageCircle size={22} />
                                Chat on WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Contact;

