import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    ChevronRight, ChevronLeft, Search, BarChart2, Zap,
    ShieldCheck, Headphones, Globe, ArrowRight,
    CheckCircle, MessageSquare, Briefcase, GraduationCap
} from 'lucide-react';

const APP_URL = "https://web.alloteme.online/";

const FloatingElement = ({ children, delay = 0, style }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.6, ease: "easeOut" }}
        className="glass-card"
        style={{
            position: 'absolute',
            padding: '12px 20px',
            borderRadius: '100px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 5,
            ...style
        }}
    >
        <CheckCircle size={18} color="#245df1" fill="#245df122" />
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1d23' }}>{children}</span>
    </motion.div>
);

const professions = ["Engineers", "Doctors", "Visionaries", "Innovators", "Architects"];

const founders = [
    { name: "Shivam Dombe", role: "Founder", img: "/Shivam.webp", bg: "/Bg.webp", github: "https://github.com/shivam222343", accent: "#b38728" },
    { name: "Rohan Mane", role: "Co-Founder", img: "/Rohan_M.webp", bg: "/Blue.webp", github: "#", accent: "#245df1" },
    { name: "Tejas Choudhari", role: "Co-Founder", img: "/Tejas_C.webp", bg: "/Pink.webp", github: "#", accent: "#ec4899" }
];

const Home = () => {
    const [index, setIndex] = useState(0);
    const [founderIndex, setFounderIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % professions.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setFounderIndex((prev) => (prev + 1) % founders.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const nextFounder = () => setFounderIndex((prev) => (prev + 1) % founders.length);
    const prevFounder = () => setFounderIndex((prev) => (prev - 1 + founders.length) % founders.length);

    return (
        <div style={{ background: '#fff', overflow: 'hidden' }}>
            {/* HERO SECTION */}
            <section className="hero-section" style={{
                position: 'relative',
                paddingTop: '40px',
                paddingBottom: '60px',
                background: '#fff'
            }}>
                <div className="hero-bg-glow" style={{ backgroundImage: `url('${founders[founderIndex].bg}')` }} />
                <div className="container" style={{ position: 'relative', zIndex: 2 }}>
                    <div className="hero-grid">
                        <div className="hero-text-content">
                            <motion.h1
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                                className="hero-title"
                                style={{ fontSize: '64px', lineHeight: 1.1, marginBottom: '24px', color: '#245df1' }}
                            >
                                AI Native Counseling <br />
                                <span style={{ color: '#1a1d23' }}>for India's Future </span>
                                <div style={{ display: 'inline-block', position: 'relative', height: '1.2em', verticalAlign: 'bottom', overflow: 'hidden' }}>
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={professions[index]}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -20, opacity: 0 }}
                                            transition={{ duration: 0.4 }}
                                            className="text-golden"
                                            style={{ display: 'block' }}
                                        >
                                            {professions[index]}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>
                            </motion.h1>


                            <motion.p
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                style={{ fontSize: '20px', color: '#5e6b7e', marginBottom: '40px', maxWidth: '540px' }}
                            >
                                The infrastructure behind your college admissions. Predict, strategy and secure your seat with real data.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                            >
                                <a href={APP_URL} className="btn-golden" style={{ padding: '16px 32px', fontSize: '18px' }}>
                                    <span>Sign Up Now</span>
                                    <ArrowRight size={20} />
                                </a>
                            </motion.div>

                            {/* Soundwave Animation */}
                            <motion.div
                                animate={{
                                    background: `linear-gradient(90deg, ${founders[founderIndex].accent}15 0%, ${founders[founderIndex].accent}05 100%)`,
                                    borderColor: `${founders[founderIndex].accent}44`,
                                }}
                                transition={{ duration: 0.8 }}
                                className="ai-analysis-box"
                                style={{
                                    marginTop: '40px',
                                    borderStyle: 'solid',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)'
                                }}
                            >
                                <div className="soundwave-container">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
                                        <div
                                            key={i}
                                            className="soundwave-bar"
                                            style={{
                                                animationDelay: `${i * 0.1}s`,
                                                height: `${Math.random() * 30 + 10}px`,
                                                background: founders[founderIndex].accent,
                                                opacity: 0.3
                                            }}
                                        />
                                    ))}
                                </div>
                                <span style={{ color: founders[founderIndex].accent, fontSize: '14px', fontWeight: 700 }}>AI Analysis Engine Active</span>
                            </motion.div>
                        </div>

                        <div className="hero-image-container" style={{
                            position: 'relative',
                            minHeight: '520px',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '20px'
                        }}>
                            {/* Founders Carousel */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={founderIndex}
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.5 }}
                                    style={{ position: 'relative', width: '100%', maxWidth: '550px', minHeight: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                                >
                                    <img
                                        src={founders[founderIndex].img}
                                        alt={founders[founderIndex].name}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', zIndex: 2 }}
                                    />

                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="name-badge-container"
                                        style={{ position: 'absolute', bottom: '35%', left: '16px', zIndex: 10 }}
                                    >
                                        <div className="name-badge">
                                            {founders[founderIndex].name} <span>{founders[founderIndex].role}</span>
                                            <a href={founders[founderIndex].github} target="_blank" rel="noopener noreferrer">
                                                <ArrowRight size={16} />
                                            </a>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </AnimatePresence>

                            <div className="hero-pills-wrapper">
                                <div className="hero-pills-container">
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="glass-pill pill-1">
                                        <strong>98.5%</strong> Accuracy Rate
                                    </motion.div>
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.0 }} className="glass-pill pill-2">
                                        <strong>50k+</strong> Students Guided
                                    </motion.div>

                                    <div className="mobile-pill-row-2">
                                        <button onClick={prevFounder} className="btn-icon mobile-only">
                                            <ChevronLeft size={20} color="#245df1" />
                                        </button>

                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }} className="glass-pill pill-3">
                                            <strong>200+</strong> Colleges Indexed
                                        </motion.div>

                                        <button onClick={nextFounder} className="btn-icon mobile-only">
                                            <ChevronRight size={20} color="#245df1" />
                                        </button>
                                    </div>
                                </div>

                                {/* Carousel Controls (Desktop Only) */}
                                <div className="carousel-controls desktop-only">
                                    <button onClick={prevFounder} className="btn-icon">
                                        <ChevronLeft size={20} color="#245df1" />
                                    </button>
                                    <button onClick={nextFounder} className="btn-icon">
                                        <ChevronRight size={20} color="#245df1" />
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div style={{ position: 'relative', zIndex: 10, marginTop: '80px', borderTop: '1px solid #f1f5f9', background: '#fff', padding: '16px 0' }}>
                    <div className="container product-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#1a1d23',
                            fontWeight: 800,
                            fontSize: '15px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}>
                            <Search size={20} color="#245df1" strokeWidth={3} />
                            Looking for a feature?
                        </div>

                        <div className="infinite-slider-wrapper" style={{ flexGrow: 1 }}>
                            <div className="slider-gradient-left" />
                            <div className="slider-gradient-right" />

                            <div className="product-chips-track">
                                {[...Array(3)].map((_, groupIdx) => (
                                    <React.Fragment key={groupIdx}>
                                        {[
                                            { icon: <Zap size={16} />, label: "College Predictor", color: "#eef2ff" },
                                            { icon: <BarChart2 size={16} />, label: "Cutoff Trends", color: "#f0f9ff" },
                                            { icon: <MessageSquare size={16} />, label: "Expert Help", color: "#f5f3ff" },
                                            { icon: <GraduationCap size={16} />, label: "Scholarships", color: "#f0fdf4" },
                                            { icon: <Briefcase size={16} />, label: "Career Path", color: "#fff7ed" },
                                            { icon: <ChevronRight size={16} />, label: "Something else?", color: "#f8fafc" }
                                        ].map((item, i) => (
                                            <a
                                                key={`${groupIdx}-${i}`}
                                                href={APP_URL}
                                                className="product-chip"
                                                style={{ background: item.color, textDecoration: 'none' }}
                                            >
                                                {item.icon}
                                                {item.label}
                                            </a>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* TRUST SECTION */}
            <section className="section-padding" style={{ background: '#f8faff' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <h2 style={{ fontSize: '42px', marginBottom: '16px' }}>The Modern Standard for Counseling</h2>
                        <p style={{ color: '#5e6b7e', fontSize: '18px' }}>Join 50,000+ students making smarter admission choices every year.</p>
                    </div>

                    <div className="hero-grid">
                        {[
                            { title: "Real-time Data", desc: "Every prediction is based on the latest DTE and NTA allotment records.", icon: <ShieldCheck size={32} color="#245df1" /> },
                            { title: "Smart Priority", desc: "Our AI helps you build the perfect option form to maximize your chances.", icon: <Zap size={32} color="#245df1" /> },
                            { title: "Expert Support", desc: "Direct access to counselors who understand your specific needs.", icon: <Headphones size={32} color="#245df1" /> }
                        ].map((feature, i) => (
                            <div key={i} className="glass-card" style={{ padding: '40px', borderRadius: '24px', background: '#fff' }}>
                                <div style={{ marginBottom: '24px' }}>{feature.icon}</div>
                                <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>{feature.title}</h3>
                                <p style={{ color: '#5e6b7e' }}>{feature.desc}</p>
                                <a href="#" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#245df1', fontWeight: 600 }}>
                                    Learn More <ChevronRight size={16} />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="section-padding">
                <div className="container">
                    <div className="premium-cta-container">

                        {/* Background Waves */}
                        <div className="cta-wave" />
                        <div className="cta-wave-2" />
                        <div className="cta-wave-3" />

                        {/* Content */}
                        <div className="cta-content">
                            <h2 className="cta-title">
                                Ready to <span className="cta-highlight" style={{ color: founders[founderIndex].accent }}>secure</span> your future?
                            </h2>

                            <p className="cta-desc">
                                Get started for free and see where your rank can take you.
                            </p>

                            <div className="cta-buttons">
                                <a href={APP_URL} className="btn-white-pill">
                                    Get Started Free →
                                </a>

                                <Link to="/premium" className="btn-glass-pill">
                                    Check Premium Plans
                                </Link>
                            </div>
                        </div>

                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;

