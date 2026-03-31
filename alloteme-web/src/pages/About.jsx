import React from 'react';
import { motion } from 'framer-motion';

const founders = [
    { name: "Shivam Dombe", role: "Founder & Lead Architect", img: "/founders/shivam.png" },
    { name: "Rohan Mane", role: "Co-Founder & Production Lead", img: "/founders/rohan.png" },
    { name: "Tejas Choudhari", role: "Co-Founder & Management Lead", img: "/founders/tejas.png" },
    { name: "Omkar Kapare", role: "Co-Founder & Marketing Lead", img: "/founders/omkar.png" },
];

const About = () => {
    return (
        <div style={{ background: 'white', minHeight: '80vh' }}>
            {/* Mission Hero */}
            <section className="section-padding" style={{ background: 'radial-gradient(circle at bottom right, #f8fafc, white)' }}>
                <motion.div
                    className="container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ textAlign: 'center' }}
                >
                    <h1 style={{ fontSize: '48px', marginBottom: '24px' }}>Defining the Allotment Future.</h1>
                    <p style={{ fontSize: '18px', maxWidth: '800px', margin: '0 auto', color: 'var(--text-soft)' }}>
                        AlloteMe is a specialized platform founded in Maharashtra to simplify the high-stakes journey of college admissions.
                        We believe that with the right data, every student can find their perfect academic home.
                    </p>
                </motion.div>
            </section>

            {/* Founders */}
            <section className="section-padding" style={{ backgroundColor: '#fcfcfd' }}>
                <div className="container">
                    <h2 style={{ fontSize: '32px', textAlign: 'center', marginBottom: '60px' }}>Meet our Founders</h2>
                    <div className="grid-3" style={{ gap: '40px' }}>
                        {founders.map((founder, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -10 }}
                                style={{ background: 'white', borderRadius: '32px', padding: '40px 30px', textAlign: 'center', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}
                            >
                                <img src={founder.img} alt={founder.name} style={{ width: '160px', height: '160px', borderRadius: '50%', marginBottom: '24px', border: '6px solid #eff6ff', objectFit: 'cover' }} />
                                <h3 style={{ fontSize: '22px', marginBottom: '4px' }}>{founder.name}</h3>
                                <p style={{ color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '13px', marginBottom: '16px' }}>{founder.role}</p>
                                <p style={{ color: 'var(--text-soft)', fontSize: '14px' }}>{founder.bio}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
