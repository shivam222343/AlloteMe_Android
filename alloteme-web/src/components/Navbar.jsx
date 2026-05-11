import React from 'react';
import { Link } from 'react-router-dom';
import { Target, Sparkles, User, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onPortalClick }) => {
    const { user, logout } = useAuth();

    return (
        <header className="glass-header">
            <div className="container navbar-container">
                <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
                    <img src="/splash.png" alt="AlloteMe" style={{ height: '50px', width: 'auto' }} />
                </Link>

                <nav className="nav-menu">
                    <Link to="/" className="nav-tag nav-tag-home">Home</Link>
                    <Link to="/about" className="nav-tag nav-tag-about">About</Link>

                    {user ? (
                        <>
                            {user.role === 'admin' ? (
                                <Link to="/admin" className="nav-tag nav-tag-portal">Admin Panel</Link>
                            ) : user.role === 'college_admin' ? (
                                <Link to="/college/dashboard" className="nav-tag nav-tag-portal">Dashboard</Link>
                            ) : null}
                            <button onClick={logout} className="logout-btn">Logout</button>
                        </>
                    ) : (
                        <button
                            onClick={onPortalClick}
                            className="nav-tag nav-tag-portal"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            Portal
                        </button>
                    )}
                </nav>

                <a href="https://web.alloteme.online/" className="btn-primary get-started-btn">
                    Get Started
                </a>
            </div>
        </header>
    );
};

export default Navbar;
