import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, X } from 'lucide-react';

const PortalModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleStudentClick = () => {
        window.location.href = "https://web.alloteme.online/";
    };

    const handleFacultyClick = () => {
        navigate("/college/login");
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="modal-overlay" onClick={onClose} style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                backdropFilter: 'blur(5px)'
            }}>
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="premium-cta-container portal-modal-content" 
                >
                    {/* Wavy background elements */}
                    <div className="cta-wave" />
                    <div className="cta-wave-2" />
                    
                    <button onClick={onClose} style={{
                        position: 'absolute',
                        top: '24px',
                        right: '24px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: 'white',
                        padding: '8px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        zIndex: 10
                    }}>
                        <X size={20} />
                    </button>

                    <div style={{ position: 'relative', zIndex: 5, textAlign: 'center' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px', color: '#fff' }}>
                            Choose Your Portal
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', marginBottom: '40px' }}>
                            Are you a student looking for a seat or a faculty member managing allotments?
                        </p>

                        <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleStudentClick}
                                style={{
                                    background: '#fff',
                                    padding: '24px',
                                    borderRadius: '24px',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '20px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                }}
                            >
                                <div style={{ background: '#eef2ff', padding: '12px', borderRadius: '14px' }}>
                                    <User size={30} color="#245df1" />
                                </div>
                                <div>
                                    <h4 className="portal-btn-title" style={{ fontSize: '20px', fontWeight: 700, color: '#1a1d23', marginBottom: '4px' }}>I am a Student</h4>
                                    <p className="portal-btn-desc" style={{ color: '#5e6b7e', fontSize: '14px' }}>Explore colleges and predict your future.</p>
                                </div>
                            </motion.button>

                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleFacultyClick}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    padding: '24px',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '20px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    color: '#fff'
                                }}
                            >
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '14px' }}>
                                    <Users size={30} color="#fff" />
                                </div>
                                <div>
                                    <h4 className="portal-btn-title" style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>I am a Faculty</h4>
                                    <p className="portal-btn-desc" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Manage institution data and admissions.</p>
                                </div>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PortalModal;
