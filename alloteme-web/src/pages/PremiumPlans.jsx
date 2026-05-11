import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ChevronLeft, ChevronRight, Zap, Crown, Gift, Star, ShieldCheck, CreditCard, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const plans = [
    {
        name: "Free",
        tagline: "Start exploring now",
        price: "₹0",
        period: "forever",
        icon: <Gift size={24} color="#245df1" />,
        features: [
            { text: "3 AI Counseling Prompts", included: true },
            { text: "1 PDF or CSV Export", included: true },
            { text: "Admission Notifications", included: true },
            { text: "5 College Predictions", included: true },
            { text: "Browse All Colleges", included: true },
            { text: "Standard Chat Support", included: true },
            { text: "Personal API Key", included: false }
        ],
        buttonText: "Included in Plan",
        isCurrent: true,
        borderColor: "#f1f5f9",
        btnClass: "btn-gray-pill"
    },
    {
        name: "Standard",
        tagline: "Most Popular Choice",
        badge: "BEST VALUE",
        price: "₹109",
        oldPrice: "₹209",
        period: "one time",
        icon: <Star size={24} color="#245df1" />,
        features: [
            { text: "Unlimited AI Prompts", included: true },
            { text: "15 College Predictions", included: true },
            { text: "1 Live Zoom Consultation", included: true },
            { text: "Personal API Key Support", included: true },
            { text: "5 PDF & CSV Exports", included: true },
            { text: "Standard Chat Support", included: true },
            { text: "End-to-End Support", included: false }
        ],
        buttonText: "Get Started",
        isCurrent: false,
        borderColor: "#245df1",
        btnClass: "btn-blue-solid",
        accent: "#245df1"
    },
    {
        name: "Advance",
        tagline: "For the Serious Ones",
        badge: "ELITE PLAN",
        price: "₹169",
        oldPrice: "₹269",
        period: "one time",
        icon: <Crown size={24} color="#ff9800" />,
        features: [
            { text: "Unlimited AI Prompts", included: true },
            { text: "25 College Predictions", included: true },
            { text: "Weekly Live Zoom Meet", included: true },
            { text: "24/7 Call & WhatsApp Support", included: true },
            { text: "Personal API Key Support", included: true },
            { text: "12 PDF & CSV Exports", included: true },
            { text: "Personal Counselor Chat", included: true }
        ],
        buttonText: "Upgrade Now",
        isCurrent: false,
        borderColor: "#ff9800",
        btnClass: "btn-orange-solid",
        accent: "#ff9800"
    }
];

const PremiumPlans = () => {
    const { user } = useAuth();
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    const handleAction = (plan) => {
        // Redirecting to the main app as per current routing structure
        window.location.href = "https://web.alloteme.online/";
    };

    return (
        <div style={{ background: '#fcfdff', minHeight: '100vh', paddingBottom: '60px' }}>
            {/* Wavy Hero */}
            <section style={{
                background: 'linear-gradient(180deg, #eef2ff 0%, #fff 100%)',
                padding: '120px 20px 140px',
                textAlign: 'center',
                position: 'relative'
            }}>
                <div className="container" style={{ position: 'relative', zIndex: 10 }}>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ fontSize: '64px', fontWeight: 800, color: '#1a1d23', marginBottom: '16px' }}
                    >
                        Premium <br /><span style={{ color: '#245df1' }}>Plans</span>
                    </motion.h1>
                    <p style={{ fontSize: '20px', color: '#5e6b7e', maxWidth: '600px', margin: '0 auto' }}>
                        Choose the plan that fits your ambition. <br /> No hidden costs, just real data.
                    </p>
                </div>
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '100px',
                    background: '#fcfdff',
                    clipPath: 'ellipse(70% 100% at 50% 100%)'
                }} />
            </section>

            {/* Pricing Section */}
            <section style={{ marginTop: '-80px', position: 'relative', zIndex: 20 }}>
                <div className="container" style={{ position: 'relative' }}>
                    {/* Centered Arrows */}
                    <button 
                        onClick={() => scroll('left')} 
                        className="carousel-arrow-btn left"
                        aria-label="Previous plan"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button 
                        onClick={() => scroll('right')} 
                        className="carousel-arrow-btn right"
                        aria-label="Next plan"
                    >
                        <ChevronRight size={24} />
                    </button>

                    <div className="horizontal-carousel pricing-carousel" ref={scrollRef} style={{ gap: '30px' }}>
                        {plans.map((plan, i) => (
                            <div key={i} className="carousel-item pricing-item">
                                <motion.div
                                    whileHover={{ y: -8 }}
                                    className="exact-pricing-card"
                                    style={{
                                        borderColor: plan.borderColor,
                                        borderWidth: plan.name !== 'Free' ? '2px' : '1px'
                                    }}
                                >
                                    {plan.badge && (
                                        <div className="plan-badge-exact" style={{ background: plan.accent }}>
                                            {plan.badge}
                                        </div>
                                    )}

                                    <div className="card-top-icon">
                                        {plan.icon}
                                    </div>

                                    <div className="card-header-exact">
                                        <h3>{plan.name}</h3>
                                        <p>{plan.tagline}</p>
                                    </div>

                                    <div className="price-display-exact">
                                        {plan.oldPrice && <span className="old-price">{plan.oldPrice}</span>}
                                        <span className="current-price">{plan.price}</span>
                                        <span className="price-period">/ {plan.period}</span>
                                    </div>

                                    <div className="feature-list-exact">
                                        {plan.features.map((feature, idx) => (
                                            <div key={idx} className={`feature-item-exact ${feature.included ? 'included' : 'excluded'}`}>
                                                <div className="icon-wrap">
                                                    {feature.included ? <Check size={12} /> : <X size={12} />}
                                                </div>
                                                <span>{feature.text}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => handleAction(plan)}
                                        className={`pricing-btn-exact ${plan.btnClass}`}
                                    >
                                        {plan.buttonText}
                                        {plan.name !== 'Free' && <ChevronRight size={18} style={{ marginLeft: '8px' }} />}
                                    </button>
                                </motion.div>
                            </div>
                        ))}
                    </div>

                    {/* Trust Bar */}
                    <div className="trust-bar-exact">
                        <div className="trust-item">
                            <ShieldCheck size={18} color="#245df1" />
                            <span>Secure Payments</span>
                        </div>
                        <div className="dot-divider" />
                        <div className="trust-item">
                            <Lock size={18} color="#245df1" />
                            <span>No Hidden Fees</span>
                        </div>
                        <div className="dot-divider" />
                        <div className="trust-item">
                            <CreditCard size={18} color="#245df1" />
                            <span>Cancel Anytime</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default PremiumPlans;