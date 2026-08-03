import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AppBanner = ({ onClose }) => {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="app-banner-bg"
                style={{
                    color: 'white',
                    padding: '14px 20px',
                    position: 'fixed',
                    top: '80px',
                    left: 0,
                    right: 0,
                    zIndex: 998,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden'
                }}
            >
                <style>{`
                    .app-banner-bg {
                        background-color: #030716;
                        background-image: 
                            radial-gradient(150% 100% at 100% 100%, rgba(36, 93, 241, 0.25) 0%, transparent 60%),
                            radial-gradient(100% 100% at 60% -20%, rgba(30, 64, 175, 0.2) 0%, transparent 50%);
                    }
                    .app-banner-content {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 16px;
                        width: 100%;
                        max-width: 1100px;
                        margin: 0 auto;
                        padding-right: 32px;
                    }
                    .app-banner-icon {
                        flex-shrink: 0;
                        background: rgba(255, 255, 255, 0.04);
                        padding: 10px;
                        border-radius: 14px;
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    }
                    .app-banner-icon svg {
                        width: 26px;
                        height: 26px;
                    }
                    .app-banner-text-group {
                        display: flex;
                        align-items: center;
                        flex-wrap: wrap;
                        gap: 12px 20px;
                        justify-content: center;
                    }
                    .app-banner-text {
                        font-size: 14.5px;
                        font-weight: 500;
                        letter-spacing: 0.3px;
                        color: #e2e8f0;
                        line-height: 1.4;
                        text-align: center;
                    }
                    @media (max-width: 640px) {
                        .app-banner-content {
                            align-items: center;
                            gap: 16px;
                        }
                        .app-banner-icon svg {
                            width: 34px;
                            height: 34px;
                        }
                        .app-banner-text-group {
                            justify-content: center;
                            align-items: center;
                            flex-direction: column;
                            gap: 10px;
                        }
                        .app-banner-text {
                            text-align: center;
                            font-size: 14px;
                        }
                    }
                `}</style>

                <div className="app-banner-content">
                    <div className="app-banner-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 279">
                            <path fill="#41A4FF" d="M9.9 2.1C4.4 7.6 1.4 15.6 1.4 25.8v227.4c0 10.2 3 18.2 8.5 23.7l.6.6 128.5-128.6v-1.7L10.5 1.5l-.6.6z" />
                            <path fill="#FFE15A" d="M182.2 186.2l-43.2-43.2v-1.7l43.2-43.2 1.4.8 51 29c14.5 8.2 14.5 21.6 0 29.8l-51 29-1.4-.5z" />
                            <path fill="#F8395B" d="M139 143l-128.5 128.6c8.5 8.5 22.8 9.5 38.6 .5L182.2 186.2 139 143z" />
                            <path fill="#00E676" d="M139 136L10.5 7.4C25.3-1.6 39.6-.6 48.1 7.9L182.2 92.8 139 136z" />
                        </svg>
                    </div>

                    <div className="app-banner-text-group">
                        <span className="app-banner-text">
                            <strong style={{ fontWeight: 700, color: 'white' }}>AlloteMe</strong> is now available on Google Play Store!
                        </span>

                        <a
                            href="https://play.google.com/store/apps/details?id=com.alloteme0077.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                background: 'linear-gradient(90deg, #245df1, #1A4BD3)',
                                color: 'white',
                                padding: '8px 18px',
                                borderRadius: '100px',
                                fontSize: '13px',
                                fontWeight: 600,
                                textDecoration: 'none',

                                gap: '6px',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 8px rgba(36, 93, 241, 0.4)',
                                flexShrink: 0
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(36, 93, 241, 0.5)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(36, 93, 241, 0.4)';
                            }}
                        >
                            Download App
                        </a>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        right: '15px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        borderRadius: '50%',
                        opacity: 0.8,
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.opacity = 1;
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.opacity = 0.8;
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }}
                    aria-label="Close banner"
                >
                    <X size={16} />
                </button>
            </motion.div>
        </AnimatePresence>
    );
};

export default AppBanner;
