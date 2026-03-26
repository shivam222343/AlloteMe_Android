import React from 'react';
import { Mail, Phone, MapPin, Target } from 'lucide-react';
import { motion } from 'framer-motion';

const Contact = () => {
    return (
        <div style={{ background: '#f8fafc', minHeight: '90vh' }}>
            <section className="section-padding" style={{ padding: '120px 5% 60px', textAlign: 'center' }}>
                <motion.div
                    className="container"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>Contact our Support</h1>
                    <p style={{ fontSize: '18px', maxWidth: '600px', margin: '0 auto', color: 'var(--text-soft)' }}>
                        We're here to solve any technical issues or guidance queries on your admission journey.
                    </p>

                    <div className="grid-3" style={{ marginTop: '70px', gap: '30px' }}>
                        <div style={{ background: 'white', padding: '40px', borderRadius: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', textAlign: 'left', border: '1px solid #f1f5f9' }}>
                            <div style={{ width: '60px', height: '60px', background: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <Mail color="var(--primary)" size={32} />
                            </div>
                            <h3 style={{ marginBottom: '10px' }}>Email Support</h3>
                            <p style={{ color: 'var(--text-soft)', marginBottom: '15px' }}>For any assistance and reporting bugs.</p>
                            <p style={{ fontWeight: 800, color: 'var(--dark)' }}>alloteme1@gmail.com</p>
                        </div>

                        <div style={{ background: 'white', padding: '40px', borderRadius: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', textAlign: 'left', border: '1px solid #f1f5f9' }}>
                            <div style={{ width: '60px', height: '60px', background: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <Phone color="var(--primary)" size={32} />
                            </div>
                            <h3 style={{ marginBottom: '10px' }}>Call & WhatsApp</h3>
                            <p style={{ color: 'var(--text-soft)', marginBottom: '15px' }}>Talk directly to our Technical team.</p>
                            <p style={{ fontWeight: 800, color: 'var(--dark)' }}>+91 8010961216</p>
                        </div>

                        <div style={{ background: 'white', padding: '40px', borderRadius: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', textAlign: 'left', border: '1px solid #f1f5f9' }}>
                            <div style={{ width: '60px', height: '60px', background: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <MapPin color="var(--primary)" size={32} />
                            </div>
                            <h3 style={{ marginBottom: '10px' }}>Kolhapur</h3>
                            <p style={{ color: 'var(--text-soft)', marginBottom: '15px' }}>Visit us for expert collaborations.</p>
                            <p style={{ fontWeight: 800, color: 'var(--dark)' }}>Kolhapur, Maharashtra</p>
                        </div>
                    </div>
                </motion.div>
            </section>
        </div>
    );
};

export default Contact;
