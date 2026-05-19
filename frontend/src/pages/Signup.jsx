import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Phone, ArrowRight, Shield, CheckCircle, Calendar, Users, Briefcase } from 'lucide-react';
import API_URL from '../api/config';

const Signup = ({ onLogin }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState('role'); // role, phone, otp, profile
    const [role, setRole] = useState('CLIENT');
    const [countryCode, setCountryCode] = useState('+91');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole);
        if (selectedRole === 'ASTROLOGER') {
            navigate('/apply'); // Immediate redirection to specialized wizard
        } else {
            setStep('phone');
        }
    };

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setError('');
        if (phone.length < 10) return setError('Enter a valid mobile number.');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: `${countryCode}${phone}` })
            });
            if (res.ok) setStep('otp');
            else setError('Failed to send OTP.');
        } catch (err) { setError('Network error. Is the server running?'); }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: `${countryCode}${phone}`, otp, role })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                onLogin(data.user);
                
                if (data.user.role === 'ASTROLOGER') {
                    navigate('/astrologer');
                } else if (!data.user.firstName || data.user.firstName === 'New') {
                    setStep('profile');
                } else {
                    navigate('/client');
                }
            } else {
                setError(data.error || 'Invalid OTP. Use 1234');
            }
        } catch (err) { setError('Network error during verification.'); }
        setLoading(false);
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ firstName: name, lastName: ' ', dob })
            });
            if (res.ok) {
                const updatedUser = await res.json();
                onLogin(updatedUser);
                navigate('/client');
            }
        } catch (err) { navigate('/client'); }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '440px', width: '100%', background: 'rgba(15, 10, 25, 0.95)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '28px', padding: '3rem 2.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}>
                
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ width: '60px', height: '60px', background: 'rgba(212,175,55,0.1)', border: '1px solid var(--secondary-color)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--secondary-color)' }}>
                        <Star size={32} />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Join Roots</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Start your journey with expert guidance.</p>
                </div>

                {error && <div style={{ background: 'rgba(255, 74, 74, 0.1)', color: '#ff4a4a', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid rgba(255, 74, 74, 0.2)' }}>{error}</div>}

                {step === 'role' && (
                    <div className="fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
                            <button onClick={() => handleRoleSelect('CLIENT')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', transition: 'all 0.3s' }}>
                                <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-muted)' }}>
                                    <Users size={24} />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '1.1rem', color: '#fff' }}>I want to Consult</strong>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Find top-rated experts for life guidance.</p>
                                </div>
                            </button>
                            <button onClick={() => handleRoleSelect('ASTROLOGER')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', borderRadius: '16px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.25)', textAlign: 'left', transition: 'all 0.3s' }}>
                                <div style={{ width: '48px', height: '48px', background: 'rgba(212,175,55,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--secondary-color)' }}>
                                    <Briefcase size={24} />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--secondary-color)' }}>I am an Expert</strong>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Join our professional partner network.</p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {step === 'phone' && (
                    <form onSubmit={handleSendOtp} className="fade-in">
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">Enter Mobile Number</label>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <select value={countryCode} onChange={e=>setCountryCode(e.target.value)} className="form-input" style={{ width: '100px' }}>
                                    <option value="+91">🇮🇳 +91</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+44">🇬🇧 +44</option>
                                </select>
                                <input 
                                    type="tel" 
                                    className="form-input"
                                    value={phone} 
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} 
                                    placeholder="Enter mobile number" 
                                    style={{ flex: 1, fontSize: '1.1rem', fontWeight: 600 }}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ padding: '1rem', fontWeight: 700 }}>
                            {loading ? 'Sending...' : 'Get OTP Code'} <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
                        </button>
                        <button type="button" onClick={() => setStep('role')} style={{ display: 'block', width: '100%', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'none', border: 'none', textDecoration: 'underline' }}>Back to Role Selection</button>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={handleVerifyOtp} className="fade-in">
                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <input 
                                type="text" 
                                value={otp} 
                                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))} 
                                placeholder="• • • •" 
                                style={{ width: '100%', textAlign: 'center', fontSize: '2.5rem', letterSpacing: '8px', background: 'transparent', border: 'none', borderBottom: '2px solid var(--secondary-color)', color: 'var(--secondary-color)', fontWeight: 800, padding: '0.5rem' }}
                                autoFocus
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ padding: '1rem', fontWeight: 700 }}>
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>
                )}

                {step === 'profile' && (
                    <form onSubmit={handleProfileSubmit} className="fade-in">
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label className="form-label">Full Name</label>
                            <input type="text" value={name} onChange={e=>setName(e.target.value)} className="form-input" placeholder="What should we call you?" required />
                        </div>
                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <label className="form-label">Date of Birth</label>
                            <input type="date" value={dob} onChange={e=>setDob(e.target.value)} className="form-input" required />
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ padding: '1rem', fontWeight: 700 }}>
                            Complete Onboarding
                        </button>
                    </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Already have an account? <Link to="/login" style={{ color: 'var(--secondary-color)', fontWeight: 700 }}>Log In</Link></p>
                </div>

            </div>
        </div>
    );
};

export default Signup;
