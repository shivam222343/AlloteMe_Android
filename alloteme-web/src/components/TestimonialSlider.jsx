import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const API_URL = "https://alloteme-android-cqdu.onrender.com/api/reviews";

const TestimonialSlider = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const res = await fetch(API_URL);
                const data = await res.json();
                if (data.success) {
                    setReviews(data.data);
                }
            } catch (err) {
                console.error("Failed to fetch reviews:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, []);

    if (loading || reviews.length === 0) return null;

    return (
        <section className="section-padding" style={{ backgroundColor: 'var(--white)', overflow: 'hidden' }}>
            <div className="container">
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '16px' }}>
                        <Quote size={20} fill="var(--primary)" />
                        <span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '14px' }}>Real Student Experiences</span>
                    </div>
                    <h2 style={{ fontSize: '42px', fontWeight: 900 }}>What Our Community Says</h2>
                </div>

                <div className="slider-wrapper" style={{ display: 'flex', gap: '30px', paddingBottom: '20px' }}>
                    <motion.div
                        className="slider-track"
                        animate={{ x: [0, -2000] }}
                        transition={{
                            repeat: Infinity,
                            duration: 30,
                            ease: "linear"
                        }}
                        style={{ display: 'flex', gap: '30px' }}
                    >
                        {/* Double the reviews for seamless loop */}
                        {[...reviews, ...reviews, ...reviews, ...reviews].map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    minWidth: '400px',
                                    background: 'white',
                                    padding: '40px',
                                    borderRadius: '32px',
                                    border: '1.5px solid #e2e8f0',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={18} color={s <= item.rating ? '#f59e0b' : '#e2e8f0'} fill={s <= item.rating ? '#f59e0b' : 'transparent'} />
                                    ))}
                                </div>
                                <p style={{ fontSize: '18px', color: 'var(--text-soft)', fontStyle: 'italic', marginBottom: '32px', lineHeight: 1.6 }}>
                                    "{item.comment}"
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '20px' }}>
                                        {item.userName?.[0]}
                                    </div>
                                    <div>
                                        <h4 style={{ fontWeight: 800, color: 'var(--dark)' }}>{item.userName}</h4>
                                        <p style={{ fontSize: '13px', color: 'var(--text-soft)', fontWeight: 600 }}>Verified Student</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default TestimonialSlider;
