import React from 'react';
import { Link } from 'react-router-dom';
import { Target, Sparkles, User, HelpCircle } from 'lucide-react';

const Navbar = () => {
    return (
        <header className="glass-header">
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '80px' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
                    <img src="/splash.png" alt="AlloteMe" style={{ height: '50px', width: 'auto' }} />
                </Link>

                <nav style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <Link to="/" className="nav-links" style={{ fontWeight: 600, color: 'var(--text)' }}>Home</Link>
                    <Link to="/about" style={{ fontWeight: 600, color: 'var(--text)', fontSize: '15px' }}>About</Link>
                    <a href="https://web.alloteme.online/" className="btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '14px', marginRight: '10px' }}>
                        Get Start
                    </a>
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
