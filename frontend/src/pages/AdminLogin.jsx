import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Key, Lock, Mail, ArrowRight, Star, AlertCircle, Eye, EyeOff, User, RefreshCw } from 'lucide-react';
import API_URL from '../api/config';

const AdminLogin = ({ onLogin }) => {
    const navigate = useNavigate();
    
    // Existence and connection states
    const [adminExists, setAdminExists] = useState(null);
    const [checking, setChecking] = useState(true);
    const [connError, setConnError] = useState(false);

    // Common fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Bootstrap specific fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const checkAdminExistence = async () => {
        setChecking(true);
        setConnError(false);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/auth/admin/exists`);
            if (res.ok) {
                const data = await res.json();
                setAdminExists(data.exists);
            } else {
                setConnError(true);
            }
        } catch (err) {
            console.error("Failed to check admin existence:", err);
            setConnError(true);
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        checkAdminExistence();
    }, []);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                if (data.user.role !== 'ADMIN' && data.user.role !== 'SUPERADMIN') {
                    return setError('Access Denied: This portal is strictly restricted to platform administrators.');
                }
                localStorage.setItem('token', data.token);
                onLogin(data.user);
                navigate('/admin');
            } else {
                setError(data.error || 'Invalid admin credentials.');
            }
        } catch (err) {
            console.error(err);
            setError('Unable to connect to the authentication server. Please check your network connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleBootstrapSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            return setError('Security keys do not match. Please verify your entries.');
        }

        if (password.length < 8) {
            return setError('Security key must be at least 8 characters long to comply with platform standards.');
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/auth/admin/bootstrap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    firstName: firstName.trim() || 'System',
                    lastName: lastName.trim() || 'Administrator'
                })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                onLogin(data.user);
                setAdminExists(true);
                navigate('/admin');
            } else {
                setError(data.error || 'Bootstrap setup failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError('Core engine initialization failed. Ensure backend database is online.');
        } finally {
            setLoading(false);
        }
    };

    // Render 1: Handshake Checking Loading Screen
    if (checking) {
        return (
            <div className="login-page admin-login-page" style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 10 }}>
                <div className="login-card glass-card fade-in" style={{ width: '450px', padding: '3rem', position: 'relative', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid rgba(107, 144, 176, 0.1)', borderTop: '2px solid #6B90B0', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>Establishing secure handshake...</p>
                </div>
            </div>
        );
    }

    // Render 2: Connection failure/handshake error screen
    if (connError) {
        return (
            <div className="login-page admin-login-page" style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 10 }}>
                <div className="login-card glass-card fade-in" style={{ width: '450px', padding: '3rem', position: 'relative', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'rgba(255, 74, 74, 0.1)', border: '1px solid rgba(255, 74, 74, 0.3)', padding: '1rem', borderRadius: '50%' }}>
                            <AlertCircle size={32} color="#ff6b6b" />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--text-light)', marginBottom: '0.75rem' }}>Registry Handshake Failed</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '2rem', lineHeight: '1.5' }}>
                        The admin authorization server could not be reached. Verify that the platform core engine service is live and responsive.
                    </p>
                    <button
                        onClick={checkAdminExistence}
                        style={{ width: '100%', padding: '0.9rem', background: '#6B90B0', color: '#1A1102', fontWeight: 700, borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer' }}
                    >
                        <RefreshCw size={16} /> Retry Registry Connection
                    </button>
                </div>
            </div>
        );
    }

    // Render 3: Standard Login or One-time Bootstrap wizard
    return (
        <div className="login-page admin-login-page" style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 10 }}>
            <div className="login-card glass-card fade-in" style={{ width: '500px', padding: '3rem', position: 'relative', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                {/* Dynamic Cosmic Glow */}
                <div style={{ 
                    position: 'absolute', 
                    top: '-10%', 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    width: '250px', 
                    height: '250px', 
                    background: adminExists 
                        ? 'radial-gradient(circle, rgba(107, 144, 176, 0.15) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, transparent 70%)', 
                    filter: 'blur(30px)', 
                    pointerEvents: 'none', 
                    zIndex: -1 
                }}></div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div className="portal-icon-main" style={{ 
                        background: adminExists ? 'rgba(107, 144, 176, 0.12)' : 'rgba(212, 175, 55, 0.08)', 
                        border: adminExists ? '1px solid rgba(107, 144, 176, 0.3)' : '1px solid rgba(212, 175, 55, 0.25)', 
                        padding: '1rem', 
                        borderRadius: '50%' 
                    }}>
                        <Shield size={32} color={adminExists ? "#6B90B0" : "#D4AF37"} />
                    </div>
                </div>

                <div className="login-brand" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="brand-icon" style={{ background: adminExists ? '#6B90B0' : '#D4AF37', padding: '0.25rem', borderRadius: '4px' }}>
                        <Star size={14} color="#1A1102" strokeWidth={2.5} />
                    </div>
                    <span className="brand-text" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                        Roots <span className="brand-accent" style={{ color: adminExists ? '#6B90B0' : '#D4AF37' }}>Admin</span>
                    </span>
                </div>

                <h2 className="login-title" style={{ textAlign: 'center', fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: 'var(--text-light)' }}>
                    {adminExists ? 'Platform Control' : 'System Initialization'}
                </h2>
                
                <p className="login-hint" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '2rem', lineHeight: '1.4' }}>
                    {adminExists 
                        ? 'Administrative entry point. Access requires valid credentials.' 
                        : 'Deploy and register the primary platform controller. Only a single system administrator is allowed.'}
                </p>

                {/* Once-Only Warning Banner */}
                {!adminExists && (
                    <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', background: 'rgba(212, 175, 55, 0.06)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '10px', color: '#e5c158', fontSize: '0.82rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>
                            <strong>Initialization Wizard:</strong> This setup page is automatically disabled the moment your first administrative account is saved.
                        </span>
                    </div>
                )}

                {error && (
                    <div className="error-banner" style={{ display: 'flex', gap: '0.75rem', padding: '1rem', background: 'rgba(255, 74, 74, 0.1)', border: '1px solid rgba(255, 74, 74, 0.25)', borderRadius: '10px', color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{error}</span>
                    </div>
                )}

                {adminExists ? (
                    /* Render Standard Login Form */
                    <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                <Mail size={14} color="#6B90B0" /> Administrator Email
                            </label>
                            <input
                                className="form-input"
                                type="email"
                                placeholder="admin@rootsastro.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--text-light)', outline: 'none' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                <Lock size={14} color="#6B90B0" /> Security Key
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.8rem 2.8rem 0.8rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--text-light)', outline: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary btn-block"
                            style={{ marginTop: '1rem', padding: '0.9rem', background: '#6B90B0', color: '#1A1102', fontWeight: 700, borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', transition: '0.3s' }}
                        >
                            {loading ? 'Validating Key...' : (
                                <>
                                    Authenticate Control Deck <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    /* Render Initial Bootstrap Registration Form */
                    <form onSubmit={handleBootstrapSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Name Fields (Side by Side) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                    <User size={14} color="#D4AF37" /> First Name
                                </label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="System"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--text-light)', outline: 'none' }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                    <User size={14} color="#D4AF37" /> Last Name
                                </label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="Admin"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--text-light)', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                <Mail size={14} color="#D4AF37" /> Master Email
                            </label>
                            <input
                                className="form-input"
                                type="email"
                                placeholder="admin@rootsastro.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--text-light)', outline: 'none' }}
                            />
                        </div>

                        {/* Security Key */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                <Lock size={14} color="#D4AF37" /> Create Security Key
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="•••••••• (Min. 8 characters)"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.8rem 2.8rem 0.8rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--text-light)', outline: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Security Key */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                <Key size={14} color="#D4AF37" /> Confirm Security Key
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.8rem 2.8rem 0.8rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--text-light)', outline: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                                >
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-block"
                            style={{ 
                                marginTop: '1rem', 
                                padding: '0.9rem', 
                                background: '#D4AF37', 
                                color: '#1A1102', 
                                fontWeight: 700, 
                                borderRadius: '10px', 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                border: 'none', 
                                cursor: 'pointer', 
                                transition: '0.3s' 
                            }}
                        >
                            {loading ? 'Initializing Administrator...' : (
                                <>
                                    Confirm & Deploy Admin <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', fontSize: '0.82rem' }}>
                    <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', transition: '0.3s' }} onMouseEnter={(e) => e.target.style.color = adminExists ? '#6B90B0' : '#D4AF37'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>
                        Return to Client Portal
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
