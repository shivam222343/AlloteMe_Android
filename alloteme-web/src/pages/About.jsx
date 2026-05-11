import React from 'react';
import { motion } from 'framer-motion';
import { Target, Users, Heart, Shield } from 'lucide-react';

const founders = [
    { name: "Shivam Dombe", role: "Founder & Lead Architect", img: "/founders/shivam.png", bio: "Visionary behind AlloteMe's AI architecture." },
    { name: "Rohan Mane", role: "Co-Founder & Production Lead", img: "/founders/rohan.png", bio: "Ensures seamless delivery and production quality." },
    { name: "Tejas Choudhari", role: "Co-Founder & Management Lead", img: "/founders/tejas.png", bio: "Driving business strategy and institutional relations." },
    { name: "Omkar Kapare", role: "Co-Founder & Marketing Lead", img: "/founders/omkar.png", bio: "Connecting AlloteMe with students across India." },
];

const About = () => {
    return (
        <div style={{ background: '#fff' }}>
            {/* Mission Hero */}
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
                            Our Mission <br />
                            <span style={{ color: '#1a1d23' }}>Defining the Allotment Future</span>
                        </h1>
                        <p style={{ fontSize: '20px', color: '#5e6b7e', lineHeight: 1.6 }}>
                            AlloteMe is a specialized platform founded in Maharashtra to simplify the high-stakes journey of college admissions.
                            We believe that with the right data, every student can find their perfect academic home.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Core Values */}
            <section className="section-padding">
                <div className="container">
                    <div className="horizontal-carousel">
                        {[
                            { title: "Transparency", icon: <Target size={24} color="#245df1" />, desc: "Clear, data-driven insights without the fluff." },
                            { title: "Innovation", icon: <Heart size={24} color="#245df1" />, desc: "AI-native tools built for the modern student." },
                            { title: "Empowerment", icon: <Users size={24} color="#245df1" />, desc: "Helping you take control of your academic future." },
                            { title: "Integrity", icon: <Shield size={24} color="#245df1" />, desc: "Reliable data from verified official sources." }
                        ].map((item, i) => (
                            <div key={i} className="carousel-item">
                                <div className="glass-card" style={{ padding: '32px', borderRadius: '16px', border: '1px solid #f1f5f9', height: '100%' }}>
                                    <div style={{ background: '#eef2ff', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                        {item.icon}
                                    </div>
                                    <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>{item.title}</h3>
                                    <p style={{ color: '#5e6b7e', fontSize: '15px' }}>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Founders */}
            <section className="section-padding" style={{ background: '#f8faff' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <h2 style={{ fontSize: '42px', marginBottom: '16px' }}>Meet Our Founders</h2>
                        <p style={{ color: '#5e6b7e', fontSize: '18px' }}>The minds building the future of educational infrastructure.</p>
                    </div>

                    <div className="horizontal-carousel">
                        {founders.map((founder, i) => (
                            <div key={i} className="carousel-item">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    whileHover={{ y: -10 }}
                                    style={{ 
                                        background: 'white', 
                                        borderRadius: '24px', 
                                        padding: '40px 24px', 
                                        textAlign: 'center', 
                                        boxShadow: 'var(--shadow-md)',
                                        border: '1px solid #f1f5f9',
                                        margin: '0 10px',
                                        height: '100%'
                                    }}
                                >
                                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
                                        <div style={{ 
                                            position: 'absolute', 
                                            top: '0', 
                                            left: '0', 
                                            width: '100%', 
                                            height: '100%', 
                                            borderRadius: '50%', 
                                            border: '2px solid #245df1',
                                            transform: 'scale(1.1)'
                                        }} />
                                        <img 
                                            src={founder.img} 
                                            alt={founder.name} 
                                            style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }} 
                                        />
                                    </div>
                                    <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>{founder.name}</h3>
                                    <p style={{ color: '#245df1', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', marginBottom: '16px' }}>{founder.role}</p>
                                    <p style={{ color: '#5e6b7e', fontSize: '14px' }}>{founder.bio}</p>
                                </motion.div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;

