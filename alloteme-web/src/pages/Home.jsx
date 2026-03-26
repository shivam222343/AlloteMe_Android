import React from 'react';
import { motion } from 'framer-motion';
import {
    Target, Sparkles, Zap, BarChart, GraduationCap,
    ChevronRight, AlertCircle, CheckCircle2, Search,
    Layers, Filter, MousePointer2
} from 'lucide-react';

const APP_URL = "https://alloteme.netlify.app/";

const Home = () => {
    return (
        <div style={{ background: 'var(--white)' }}>
            {/* HERO SECTION */}
            <section className="section-padding" style={{
                background: 'radial-gradient(circle at top right, #eff6ff, transparent), radial-gradient(circle at bottom left, #eef2ff, transparent)',
                minHeight: '85vh', display: 'flex', alignItems: 'center'
            }}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37, 99, 235, 0.1)', padding: '8px 20px', borderRadius: '100px', marginBottom: '32px' }}
                    >
                        <Sparkles color="var(--primary)" size={16} />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Trusted predictions • Real cutoff data • Smart strategy
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{ fontSize: 'clamp(42px, 7vw, 84px)', lineHeight: 1.05, marginBottom: '24px', fontWeight: 900 }}
                    >
                        Get the <span style={{ color: 'var(--primary)' }}>Right College</span>,<br />Not Just a Random Seat
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        style={{ fontSize: '20px', color: 'var(--text-soft)', maxWidth: '800px', margin: '0 auto 48px', fontWeight: 500, lineHeight: 1.6 }}
                    >
                        AlloteMe uses AI + real allotment data to predict your best colleges for MHTCET, JEE & NEET — so you can fill your option form with confidence.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}
                    >
                        <a href={APP_URL} className="btn-primary" style={{ padding: '1.2rem 3rem', fontSize: '18px' }}>
                            Predict My Colleges
                            <ChevronRight size={20} />
                        </a>
                        <a href={APP_URL} className="btn-primary" style={{ background: 'white', color: 'var(--dark)', border: '1.5px solid #e2e8f0', boxShadow: 'none' }}>
                            Explore Colleges
                        </a>
                    </motion.div>
                </div>
            </section>

            {/* PROBLEM SECTION */}
            <section className="section-padding" style={{ backgroundColor: '#fff' }}>
                <div className="container">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '60px', alignItems: 'center' }}>
                        <div>
                            <div style={{ color: '#ef4444', marginBottom: '20px' }}><AlertCircle size={40} /></div>
                            <h2 style={{ fontSize: '42px', marginBottom: '24px', lineHeight: 1.2 }}>Counseling Shouldn’t Feel Like Guesswork</h2>
                            <p style={{ fontSize: '18px', color: 'var(--text-soft)', marginBottom: '32px' }}>
                                Every year, thousands of students make wrong choices during counseling — not because they lack marks, but because they lack clarity.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {[
                                    "Confusing cutoff data from multiple sources",
                                    "No clear distinction between safe vs dream colleges",
                                    "Incorrect option form priority setting",
                                    "Fear of losing a better seat due to bad advice"
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                                        <p style={{ fontWeight: 600, color: 'var(--dark-soft)' }}>{item}</p>
                                    </div>
                                ))}
                            </div>
                            <p style={{ marginTop: '40px', fontWeight: 800, color: '#ef4444' }}>
                                One mistake in option filling can cost you your dream college.
                            </p>
                        </div>
                        <div style={{ background: '#fef2f2', borderRadius: '40px', padding: '60px', textAlign: 'center' }}>
                            <motion.div whileHover={{ scale: 1.05 }} className="float-img">
                                <AlertCircle size={120} color="#fecaca" />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SOLUTION SECTION */}
            <section className="section-padding" style={{ background: 'var(--dark)', borderRadius: '60px 60px 0 0', marginTop: '40px', color: 'white' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <h2 style={{ fontSize: '42px', color: 'white', marginBottom: '24px' }}>Meet AlloteMe — Your AI Counseling Assistant</h2>
                        <p style={{ color: '#94a3b8', fontSize: '18px', maxWidth: '700px', margin: '0 auto' }}>
                            AlloteMe simplifies the entire admission process by turning complex data into clear, personalized decisions.
                        </p>
                    </div>
                    <div className="grid-3" style={{ gap: '40px' }}>
                        {[
                            { title: "AI-powered college prediction", text: "Advanced LLM-driven analysis of your specific profile merits." },
                            { title: "Real DTE allotment data analysis", text: "Every prediction is backed by official Maharashtra CET Cell data." },
                            { title: "Personalized cutoff insights", text: "Insights tailored to your category, region, and branch preference." },
                        ].map((item, i) => (
                            <div key={i} style={{ padding: '40px', background: '#1e293b', borderRadius: '32px', border: '1px solid #334155' }}>
                                <CheckCircle2 color="var(--primary-light)" size={32} style={{ marginBottom: '20px' }} />
                                <h3 style={{ color: 'white', marginBottom: '12px' }}>{item.title}</h3>
                                <p style={{ color: '#94a3b8' }}>{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FEATURES SECTION */}
            <section className="section-padding" style={{ background: '#f8fafc' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <h2 style={{ fontSize: '42px', marginBottom: '24px' }}>Powerful Tools for Smart Admissions</h2>
                    </div>

                    <div className="grid-3" style={{ gap: '30px' }}>
                        <div style={{ background: 'white', padding: '40px', borderRadius: '32px', gridColumn: 'span 2', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <Search size={32} color="var(--primary)" style={{ marginBottom: '20px' }} />
                            <h3>🔍 Smart College Predictor</h3>
                            <p style={{ color: 'var(--text-soft)', marginTop: '10px' }}>Get accurate college predictions based on your percentile, rank, category, and preferences.</p>
                            <div style={{ marginTop: '30px', padding: '20px', background: '#f0f9ff', borderRadius: '20px', display: 'flex', gap: '20px' }}>
                                <div style={{ flex: 1, height: '10px', background: '#e0f2fe', borderRadius: '5px' }}></div>
                                <div style={{ flex: 2, height: '10px', background: 'var(--primary)', borderRadius: '5px' }}></div>
                                <div style={{ flex: 1, height: '10px', background: '#e0f2fe', borderRadius: '5px' }}></div>
                            </div>
                        </div>
                        <div style={{ background: 'white', padding: '40px', borderRadius: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <BarChart size={32} color="var(--primary)" style={{ marginBottom: '20px' }} />
                            <h3>📊 Real Cutoff Analysis</h3>
                            <p style={{ color: 'var(--text-soft)', marginTop: '10px' }}>We analyze thousands of real allotment records to give you realistic chances.</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                        <div style={{ background: 'white', padding: '40px', borderRadius: '32px', textAlign: 'center' }}>
                            <Layers size={32} color="var(--primary)" style={{ marginBottom: '20px' }} />
                            <h3>🎯 Safe, Target & Dream</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '24px' }}>
                                <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '12px', color: '#166534', fontWeight: 700 }}>Safe → High chance</div>
                                <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '12px', color: '#92400e', fontWeight: 700 }}>Target → Moderate chance</div>
                                <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '12px', color: '#991b1b', fontWeight: 700 }}>Dream → Low but possible</div>
                            </div>
                        </div>
                        <div style={{ background: 'white', padding: '40px', borderRadius: '32px' }}>
                            <Filter size={32} color="var(--primary)" style={{ marginBottom: '20px' }} />
                            <h3>⚡ Advanced Filters</h3>
                            <ul style={{ color: 'var(--text-soft)', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <li>• Branch Specific Search</li>
                                <li>• Region (Pune, Mumbai, Nagpur, etc.)</li>
                                <li>• College Type (Govt / Private / Autonomous)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="section-padding">
                <div className="container" style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '42px', marginBottom: '80px' }}>📈 How It Works</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px' }}>
                        {[
                            { step: "1", title: "Enter Merits", desc: "Input percentile, rank & category" },
                            { step: "2", title: "Preferences", desc: "Select branches & regions" },
                            { step: "3", title: "AI Prediction", desc: "Get smart matches instantly" },
                            { step: "4", title: "Option Form", desc: "Build your perfect priority list" }
                        ].map((item, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                                <div style={{ width: '60px', height: '60px', background: 'var(--primary)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px', fontWeight: 900 }}>
                                    {item.step}
                                </div>
                                <h3 style={{ marginBottom: '10px' }}>{item.title}</h3>
                                <p style={{ color: 'var(--text-soft)', fontSize: '14px' }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* WHY ALLOTEME */}
            <section className="section-padding" style={{ background: '#f1f5f9', borderRadius: '60px' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <h2 style={{ fontSize: '42px' }}>🧠 Why Students Choose AlloteMe</h2>
                    </div>
                    <div className="grid-3">
                        {[
                            "Based on real allotment data (not assumptions)",
                            "AI-driven predictions using state-of-the-art LLMs",
                            "Saves hours of manual research",
                            "Reduces risk in option filling tremendously",
                            "Built specifically for the Indian counseling system"
                        ].map((item, i) => (
                            <div key={i} style={{ padding: '30px', background: 'white', borderRadius: '24px', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                                <CheckCircle2 color="var(--primary)" size={24} style={{ marginTop: '3px' }} />
                                <p style={{ fontWeight: 600 }}>{item}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SOCIAL PROOF */}
            <section className="section-padding" style={{ textAlign: 'center' }}>
                <div className="container">
                    <h2 style={{ fontSize: '32px', color: 'var(--text-soft)', marginBottom: '50px' }}>Built to Solve a Real Problem</h2>
                    <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ background: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', fontStyle: 'italic', border: '1px solid #f1f5f9' }}>
                            “Finally, a platform that actually helps students decide.”
                        </div>
                        <div style={{ background: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', fontStyle: 'italic', border: '1px solid #f1f5f9' }}>
                            “Much better than scrolling PDFs and cutoff lists.”
                        </div>
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="section-padding" style={{ padding: '0 5% 80px' }}>
                <div className="container" style={{
                    background: 'linear-gradient(135deg, var(--dark) 0%, #1e293b 100%)',
                    borderRadius: '48px', padding: '100px 40px', textAlign: 'center', color: 'white', overflow: 'hidden', position: 'relative'
                }}>
                    <div style={{ position: 'relative', zIndex: 10 }}>
                        <h2 style={{ fontSize: '48px', color: 'white', marginBottom: '24px', fontWeight: 900 }}>Your Rank Deserves the Right College</h2>
                        <p style={{ color: '#94a3b8', fontSize: '20px', marginBottom: '48px', maxWidth: '600px', margin: '0 auto 48px' }}>
                            Don’t leave your future to guesswork. Make smarter decisions with AlloteMe.
                        </p>
                        <a href={APP_URL} className="btn-primary" style={{ padding: '1.2rem 4rem', fontSize: '20px', borderRadius: '100px' }}>
                            👉 Predict My Colleges Now
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
