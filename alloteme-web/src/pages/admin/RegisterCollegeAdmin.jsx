import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ShieldCheck, User, Mail, Lock, 
    Building2, Search, ArrowLeft, CheckCircle2,
    Loader2
} from 'lucide-react';
import axios from 'axios';
import './RegisterCollegeAdmin.css';

const RegisterCollegeAdmin = () => {
    const navigate = useNavigate();
    const [institutions, setInstitutions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [showSelector, setShowSelector] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [collegeAdmins, setCollegeAdmins] = useState([]);

    const categories = ['ALL', 'MHTCET PCM', 'MHTCET PCB', 'JEE', 'NEET', 'BBA', 'MBA'];

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        managedInstitution: null
    });

    useEffect(() => {
        fetchInstitutions();
        fetchCollegeAdmins();
    }, []);

    const fetchCollegeAdmins = async () => {
        try {
            const { data } = await axios.get('/api/auth/college-admins');
            if (data.success) {
                setCollegeAdmins(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch college admins', error);
        }
    };

    const fetchInstitutions = async () => {
        setFetching(true);
        try {
            const { data } = await axios.get('/api/institutions');
            setInstitutions(data);
        } catch (error) {
            console.error('Failed to fetch institutions', error);
        } finally {
            setFetching(false);
        }
    };

    const filteredInstitutions = institutions.filter(inst => {
        const matchesSearch = searchQuery.trim() === '' || 
            inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inst.dteCode?.toString().includes(searchQuery);
        
        const matchesCategory = selectedCategory === 'ALL' || inst.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.managedInstitution) {
            setMessage({ type: 'error', text: 'Please select an institution' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const payload = {
                displayName: formData.displayName,
                email: formData.email,
                password: formData.password,
                managedInstitution: formData.managedInstitution._id
            };

            await axios.post('/api/auth/register-college-admin', payload);
            setMessage({ 
                type: 'success', 
                text: `Success! ${formData.displayName} is now registered as admin for ${formData.managedInstitution.name}.` 
            });
            
            // Reset form
            setFormData({
                displayName: '',
                email: '',
                password: '',
                managedInstitution: null
            });
            fetchCollegeAdmins(); // Refresh the list
        } catch (error) {
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.message || 'Registration failed' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-admin-container">
            <div className="register-admin-card">
                <button onClick={() => navigate('/admin')} className="back-btn">
                    <ArrowLeft size={18} />
                    Back to Dashboard
                </button>

                <div className="register-header">
                    <div className="icon-badge">
                        <ShieldCheck size={24} />
                    </div>
                    <h1>Register College Admin</h1>
                    <p>Create a dedicated administrative account for an institution.</p>
                </div>

                {message.text && (
                    <div className={`message-banner ${message.type}`}>
                        {message.type === 'success' ? <CheckCircle2 size={18} /> : null}
                        <span>{message.text}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="admin-form">
                    <div className="form-group">
                        <label>Administrator Name</label>
                        <div className="input-wrapper">
                            <User size={18} className="input-icon" />
                            <input 
                                type="text"
                                placeholder="Full Name"
                                required
                                value={formData.displayName}
                                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Official Email</label>
                        <div className="input-wrapper">
                            <Mail size={18} className="input-icon" />
                            <input 
                                type="email"
                                placeholder="college.admin@institution.edu"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Temporary Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input 
                                type="password"
                                placeholder="Minimum 8 characters"
                                required
                                minLength="8"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Assign Institution</label>
                        <div 
                            className={`institution-selector ${formData.managedInstitution ? 'selected' : ''}`}
                            onClick={() => setShowSelector(true)}
                        >
                            <Building2 size={18} />
                            <div className="selector-text">
                                {formData.managedInstitution 
                                    ? formData.managedInstitution.name 
                                    : 'Select the institution to manage'}
                                {formData.managedInstitution && (
                                    <span className="dte-code">DTE Code: {formData.managedInstitution.dteCode}</span>
                                )}
                            </div>
                            <Search size={18} className="search-hint" />
                        </div>
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? <Loader2 size={18} className="spinner" /> : 'Register Administrator'}
                    </button>
                </form>

                {/* Assigned Admins List */}
                <div className="assigned-admins-section">
                    <h3>Registered College Admins</h3>
                    <div className="admins-list">
                        {collegeAdmins.length === 0 ? (
                            <p className="no-admins">No college administrators registered yet.</p>
                        ) : (
                            collegeAdmins.map(admin => (
                                <div key={admin._id} className="admin-item">
                                    <div className="admin-avatar">
                                        <CheckCircle2 size={16} color="#10b981" />
                                    </div>
                                    <div className="admin-info">
                                        <strong>{admin.displayName}</strong>
                                        <span>{admin.managedInstitution?.name || 'No institution assigned'}</span>
                                    </div>
                                    <div className="admin-email">{admin.email}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Institution Selection Modal */}
            {showSelector && (
                <div className="modal-overlay" onClick={() => setShowSelector(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Select Institution</h3>
                            <button onClick={() => setShowSelector(false)} className="close-btn">×</button>
                        </div>
                        
                        <div className="modal-search">
                            <Search size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by name or DTE code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="category-filter-bar">
                            {categories.map(cat => (
                                <button 
                                    key={cat}
                                    className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="institution-list">
                            {fetching ? (
                                <div className="modal-loading">Loading institutions...</div>
                            ) : (
                                filteredInstitutions.map(inst => (
                                    <div 
                                        key={inst._id} 
                                        className={`institution-item ${collegeAdmins.some(a => a.managedInstitution?._id === inst._id) ? 'already-assigned' : ''}`}
                                        onClick={() => {
                                            setFormData({...formData, managedInstitution: inst});
                                            setShowSelector(false);
                                        }}
                                    >
                                        <div className="inst-icon">
                                            {collegeAdmins.some(a => a.managedInstitution?._id === inst._id) ? (
                                                <CheckCircle2 size={20} color="#10b981" />
                                            ) : (
                                                <Building2 size={20} />
                                            )}
                                        </div>
                                        <div className="inst-info">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <strong>{inst.name}</strong>
                                                {collegeAdmins.some(a => a.managedInstitution?._id === inst._id) && (
                                                    <span className="assigned-badge">Assigned</span>
                                                )}
                                            </div>
                                            <span>DTE Code: {inst.dteCode} • {inst.location?.city}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                            {!fetching && filteredInstitutions.length === 0 && (
                                <div className="no-results">No institutions found.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegisterCollegeAdmin;
