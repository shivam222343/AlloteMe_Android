import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MobileNavTags = ({ onPortalClick }) => {
    const { user, logout } = useAuth();

    return (
        <div className="mobile-tags-container mobile-only">
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
        </div>
    );
};

export default MobileNavTags;
