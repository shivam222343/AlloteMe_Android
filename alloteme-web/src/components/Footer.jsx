import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import './footer.css'; // import this CSS

const Footer = () => {
    return (
        <footer className="premium-footer">
            <div className="container">

                <div className="footer-grid">

                    {/* Brand */}
                    <div className="footer-brand">
                        <div className="footer-logo">
                            <img src="/splash.png" alt="AlloteMe" />
                            <span>AlloteMe</span>
                        </div>

                        <p className="footer-desc">
                            Empowering students in Maharashtra with AI-driven insights for MHTCET, JEE, and NEET admissions.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="footer-heading">Product</h4>
                        <ul className="footer-list">
                            <li><a href="https://web.alloteme.online/">College Predictor</a></li>
                            <li><a href="https://web.alloteme.online/">Cutoff Analysis</a></li>
                            <li><a href="https://web.alloteme.online/">Option Builder</a></li>
                            <li><a href="https://web.alloteme.online/">Counseling</a></li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="footer-heading">Company</h4>
                        <ul className="footer-list">
                            <li><Link to="/about">About</Link></li>
                            <li><Link to="/contact">Contact</Link></li>
                            <li><Link to="/privacy">Privacy</Link></li>
                            <li><Link to="/terms">Terms</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="footer-contact-wrapper">
                        <h4 className="footer-heading">Contact</h4>
                        <ul className="footer-contact">
                            <li><Mail size={16} /> alloteme1@gmail.com</li>
                            <li><Phone size={16} /> +91 8010961216</li>
                            <li><MapPin size={16} /> Kolhapur, Maharashtra</li>
                        </ul>
                    </div>

                </div>

                {/* Bottom */}
                <div className="footer-bottom">
                    <p>© 2026 AlloteMe. Built for future engineers.</p>
                    <span><Globe size={14} /> Made by AlloteMe Team</span>
                </div>

            </div>
        </footer>
    );
};

export default Footer;