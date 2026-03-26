import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Target } from 'lucide-react';

const Footer = () => {
    return (
        <footer style={{ backgroundColor: 'var(--dark)', color: 'white', padding: '80px 5% 40px' }}>
            <div className="container grid-3">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <img src="/logo.png" alt="AlloteMe" style={{ height: '35px', width: 'auto' }} />
                        <span style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>AlloteMe</span>
                    </div>
                    <p style={{ color: 'var(--text-soft)', fontSize: '15px' }}>
                        Empowering students in Maharashtra with real-time intelligence for MHTCET, JEE, and NEET admissions.
                    </p>
                </div>

                <div>
                    <h3 style={{ color: 'white', marginBottom: '20px', fontSize: '18px' }}>Support</h3>
                    <ul style={{ color: 'var(--text-soft)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Mail size={16} color="var(--primary)" />
                            alloteme1@gmail.com
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Phone size={16} color="var(--primary)" />
                            +91 8010961216
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <MapPin size={16} color="var(--primary)" />
                            Pune, Maharashtra, India
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 style={{ color: 'white', marginBottom: '20px', fontSize: '18px' }}>Legal</h3>
                    <ul style={{ color: 'var(--text-soft)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li><Link to="/privacy" style={{ color: 'var(--text-soft)' }}>Privacy Policy</Link></li>
                        <li><Link to="/terms" style={{ color: 'var(--text-soft)' }}>Terms & Conditions</Link></li>
                    </ul>
                </div>
            </div>

            <div className="container" style={{ borderTop: '1px solid #1e293b', marginTop: '60px', paddingTop: '30px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-soft)', fontSize: '14px' }}>
                    &copy; 2026 AlloteMe. Developed with ❤️ for technical students.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
