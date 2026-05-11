import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Users, Building2, ShieldCheck, BarChart3, 
    Settings, Bell, TrendingUp, PlusCircle, 
    FileText, Star, MessageSquare 
} from 'lucide-react';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        institutions: 0,
        users: 0,
        activeSessions: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Reusing the same stats endpoint
            const { data } = await axios.get('/api/auth/stats');
            setStats({
                institutions: data.institutions || 0,
                users: data.users || 0,
                activeSessions: data.analytics?.activeSessions || 0
            });
        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
        }
    };

    const adminTools = [
        {
            title: 'College Admin Portal',
            desc: 'Register and manage college administrators for institutional profiles.',
            icon: ShieldCheck,
            link: '/admin/register-college-admin',
            color: '#3B82F6'
        },
        {
            title: 'Manage Institutions',
            desc: 'Add, edit or remove colleges and educational institutes.',
            icon: Building2,
            link: '#', // Placeholder
            color: '#10B981'
        },
        {
            title: 'User Management',
            desc: 'Monitor student registrations and manage user accounts.',
            icon: Users,
            link: '#',
            color: '#8B5CF6'
        },
        {
            title: 'Cutoff Management',
            desc: 'Upload and process previous year cutoff data files.',
            icon: FileText,
            link: '#',
            color: '#F59E0B'
        },
        {
            title: 'System Analytics',
            desc: 'Deep dive into platform usage and prediction accuracy.',
            icon: TrendingUp,
            link: '#',
            color: '#EC4899'
        },
        {
            title: 'Review Moderation',
            desc: 'Approve or remove student testimonials and reviews.',
            icon: MessageSquare,
            link: '#',
            color: '#06B6D4'
        }
    ];

    return (
        <div className="admin-container">
            <header className="admin-header">
                <div className="header-content">
                    <div className="admin-badge">
                        <ShieldCheck size={14} />
                        <span>SYSTEM ADMINISTRATOR</span>
                    </div>
                    <h1>Control Center</h1>
                    <p>Overview of the AlloteMe ecosystem and management tools.</p>
                </div>
            </header>

            <main className="admin-main">
                <section className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                            <Building2 size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{loading ? '...' : stats.institutions}</h3>
                            <p>Institutes</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                            <Users size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{loading ? '...' : stats.users}</h3>
                            <p>Total Users</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{loading ? '...' : stats.activeSessions}</h3>
                            <p>Active Now</p>
                        </div>
                    </div>
                </section>

                <section className="tools-section">
                    <h2>Management Tools</h2>
                    <div className="tools-grid">
                        {adminTools.map((tool, idx) => (
                            <Link to={tool.link} key={idx} className="tool-card">
                                <div className="tool-icon" style={{ color: tool.color, background: `${tool.color}10` }}>
                                    <tool.icon size={24} />
                                </div>
                                <div className="tool-details">
                                    <h3>{tool.title}</h3>
                                    <p>{tool.desc}</p>
                                </div>
                                <div className="tool-arrow">→</div>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AdminDashboard;
