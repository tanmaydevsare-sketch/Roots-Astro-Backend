import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Phone, ArrowRight, Shield, CheckCircle, Calendar, Users, Briefcase, Mail, Lock } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import API_URL from '../api/config';

const Signup = ({ onLogin }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState('role'); // role, method, phone, otp, emailSignup, profile
    const [role, setRole] = useState('CLIENT');
    const [signupMethod, setSignupMethod] = useState('email'); // email or mobile
    const [countryCode, setCountryCode] = useState('+91');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');

    // Email signup fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showFirebaseDomainNotice, setShowFirebaseDomainNotice] = useState(false);

    React.useEffect(() => {
        return () => {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {
                    console.error(e);
                }
                window.recaptchaVerifier = null;
            }
        };
    }, []);

    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole);
        setStep('method');
    };

    const handleMethodSelect = (method) => {
        setSignupMethod(method);
        if (method === 'mobile') {
            if (role === 'ASTROLOGER') {
                navigate('/apply'); // Redirect astrologers to the wizard for detailed application
            } else {
                setStep('phone');
            }
        } else {
            setStep('emailSignup');
        }
    };

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setShowFirebaseDomainNotice(false);
        if (phone.length < 10) return setError('Enter a valid mobile number.');
        setLoading(true);
        try {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch {
                    // Suppressed Clear Verifier Error
                }
                window.recaptchaVerifier = null;
            }
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible'
            });
            const formattedPhone = `${countryCode}${phone}`;
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
            window.confirmationResult = confirmationResult;
            setStep('otp');
        } catch (err) { 
            console.error(err);
            const isCaptchaError = err.code === 'auth/captcha-check-failed' || err.message?.includes('captcha') || err.message?.includes('Hostname') || err.message?.includes('hostname');
            if (isCaptchaError) {
                setShowFirebaseDomainNotice(true);
            } else {
                setError(`Firebase Auth Error (${err.code || 'UNKNOWN'}): ${err.message || 'Check console logs'}`); 
            }
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await window.confirmationResult.confirm(otp);
            const idToken = await result.user.getIdToken();

            const res = await fetch(`${API_URL}/api/auth/firebase-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, role })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                onLogin(data.user);
                
                if (data.user.role === 'ASTROLOGER') {
                    navigate('/astrologer');
                } else if (data.user.role === 'ADMIN') {
                    navigate('/admin');
                } else if (!data.user.firstName || data.user.firstName === 'New') {
                    setStep('profile');
                } else {
                    navigate('/client');
                }
            } else {
                setError(data.error || 'Verification failed on backend.');
            }
        } catch (err) { 
            console.error(err);
            setError(err.message || 'Invalid OTP or network error.'); 
        }
        setLoading(false);
    };

    const handleEmailSignupSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // 1. Call Register Endpoint
            const regRes = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    firstName,
                    lastName: lastName || ' ',
                    role
                })
            });
            const regData = await regRes.json();
            if (!regRes.ok) {
                setLoading(false);
                return setError(regData.error || 'Failed to register account.');
            }

            // 2. Auto-login immediately
            const loginRes = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const loginData = await loginRes.json();
            if (loginRes.ok) {
                localStorage.setItem('token', loginData.token);
                onLogin(loginData.user);
                
                // Redirect depending on role
                if (role === 'ADMIN') {
                    navigate('/admin');
                } else if (role === 'ASTROLOGER') {
                    navigate('/astrologer');
                } else {
                    // Update DOB for Clients if specified
                    if (dob) {
                        try {
                            await fetch(`${API_URL}/api/auth/me`, {
                                method: 'PATCH',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${loginData.token}`
                                },
                                body: JSON.stringify({ dob })
                            });
                        } catch (err) {
                            console.error("Error setting date of birth:", err);
                        }
                    }
                    navigate('/client');
                }
            } else {
                setError('Registration succeeded, but auto-login failed. Please log in manually.');
            }
        } catch (err) {
            console.error(err);
            setError('Connection failed. Please check backend server.');
        }
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
                body: JSON.stringify({ firstName, lastName: lastName || ' ', dob })
            });
            if (res.ok) {
                const updatedUser = await res.json();
                onLogin(updatedUser);
                navigate('/client');
            }
        } catch { navigate('/client'); }
        setLoading(false);
    };

    const getRoleColor = () => {
        if (role === 'ADMIN') return '#6B90B0';
        if (role === 'ASTROLOGER') return '#D4AF37';
        return '#8B5FBF';
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '480px', width: '100%', background: 'rgba(15, 10, 25, 0.95)', border: `1px solid ${getRoleColor()}40`, borderRadius: '28px', padding: '3rem 2.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', transition: 'all 0.4s' }}>
                
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ width: '60px', height: '60px', background: 'rgba(212,175,55,0.1)', border: `1px solid ${getRoleColor()}`, borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: getRoleColor(), transition: '0.4s' }}>
                        {role === 'ADMIN' ? <Shield size={32} /> : role === 'ASTROLOGER' ? <Briefcase size={32} /> : <Users size={32} />}
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                        {step === 'role' ? 'Join Roots' : `Sign Up as ${role === 'ADMIN' ? 'Super Admin' : role === 'ASTROLOGER' ? 'Expert' : 'Client'}`}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        {step === 'role' ? 'Start your journey with expert guidance.' : 'Create your secure, customized login credentials.'}
                    </p>
                </div>

                {showFirebaseDomainNotice && (
                    <div style={{ background: 'rgba(255, 74, 74, 0.08)', border: '1px solid rgba(255, 74, 74, 0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#ff4a4a', fontSize: '0.9rem', fontWeight: 700 }}>⚠️ Firebase Domain Integration Required</h4>
                        <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                            To enable live SMS verification on <strong>{window.location.hostname}</strong>, add this domain to the <strong>Authorized Domains</strong> list in your Firebase Console (<em>Authentication &gt; Settings &gt; Authorized Domains</em>).
                        </p>
                    </div>
                )}

                {error && !showFirebaseDomainNotice && <div style={{ background: 'rgba(255, 74, 74, 0.1)', color: '#ff4a4a', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid rgba(255, 74, 74, 0.2)' }}>{error}</div>}

                {step === 'role' && (
                    <div className="fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
                            
                            {/* Client Option */}
                            <button onClick={() => handleRoleSelect('CLIENT')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', transition: 'all 0.3s', cursor: 'pointer' }}>
                                <div style={{ width: '48px', height: '48px', background: 'rgba(139, 95, 191, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8B5FBF' }}>
                                    <Users size={24} />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '1.1rem', color: '#fff' }}>I want to Consult (Client)</strong>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Find top-rated experts for life guidance.</p>
                                </div>
                            </button>

                            {/* Astrologer Option */}
                            <button onClick={() => handleRoleSelect('ASTROLOGER')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', borderRadius: '16px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.25)', textAlign: 'left', transition: 'all 0.3s', cursor: 'pointer' }}>
                                <div style={{ width: '48px', height: '48px', background: 'rgba(212,175,55,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#D4AF37' }}>
                                    <Briefcase size={24} />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '1.1rem', color: '#D4AF37' }}>I am an Expert (Astrologer)</strong>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Join our professional partner network.</p>
                                </div>
                            </button>



                        </div>
                    </div>
                )}

                {step === 'method' && (
                    <div className="fade-in">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            
                            {/* Email Signup Option */}
                            <button onClick={() => handleMethodSelect('email')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', transition: 'all 0.3s', cursor: 'pointer' }}>
                                <div style={{ width: '48px', height: '48px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' }}>
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '1.1rem', color: '#fff' }}>Email & Password</strong>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Perfect for custom IDs and instant access.</p>
                                </div>
                            </button>

                            {/* Mobile OTP Option */}
                            <button onClick={() => handleMethodSelect('mobile')} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', transition: 'all 0.3s', cursor: 'pointer' }}>
                                <div style={{ width: '48px', height: '48px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' }}>
                                    <Phone size={24} />
                                </div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '1.1rem', color: '#fff' }}>Mobile OTP</strong>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Secure registration with mobile SMS.</p>
                                </div>
                            </button>

                            <button type="button" onClick={() => setStep('role')} style={{ display: 'block', width: '100%', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Back to Role Selection</button>
                        </div>
                    </div>
                )}

                {step === 'emailSignup' && (
                    <form onSubmit={handleEmailSignupSubmit} className="fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div className="form-group">
                                <label className="form-label">First Name</label>
                                <input type="text" value={firstName} onChange={e=>setFirstName(e.target.value)} className="form-input" placeholder="e.g. Tanmay" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name</label>
                                <input type="text" value={lastName} onChange={e=>setLastName(e.target.value)} className="form-input" placeholder="e.g. Dev" required />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label className="form-label">Email Address / Login ID</label>
                            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="form-input" placeholder="you@example.com" required />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label className="form-label">Password</label>
                            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="form-input" placeholder="Minimum 6 characters" minLength={6} required />
                        </div>

                        {role === 'CLIENT' && (
                            <div className="form-group" style={{ marginBottom: '2rem' }}>
                                <label className="form-label">Date of Birth</label>
                                <input type="date" value={dob} onChange={e=>setDob(e.target.value)} className="form-input" required />
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ padding: '1rem', fontWeight: 700, background: `linear-gradient(135deg, ${getRoleColor()} 0%, rgba(0,0,0,0.4) 150%)` }}>
                            {loading ? 'Creating Account...' : 'Complete Registration'} <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
                        </button>

                        <button type="button" onClick={() => setStep('method')} style={{ display: 'block', width: '100%', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Back to Methods</button>
                    </form>
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
                        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ padding: '1rem', fontWeight: 700, background: `linear-gradient(135deg, ${getRoleColor()} 0%, rgba(0,0,0,0.4) 150%)` }}>
                            {loading ? 'Sending...' : 'Get OTP Code'} <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
                        </button>
                        <button type="button" onClick={() => setStep('method')} style={{ display: 'block', width: '100%', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Back to Methods</button>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={handleVerifyOtp} className="fade-in">
                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <input 
                                type="text" 
                                value={otp} 
                                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))} 
                                placeholder="• • • • • •" 
                                style={{ width: '100%', textAlign: 'center', fontSize: '2.5rem', letterSpacing: '8px', background: 'transparent', border: 'none', borderBottom: `2px solid ${getRoleColor()}`, color: getRoleColor(), fontWeight: 800, padding: '0.5rem' }}
                                autoFocus
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ padding: '1rem', fontWeight: 700, background: `linear-gradient(135deg, ${getRoleColor()} 0%, rgba(0,0,0,0.4) 150%)` }}>
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>
                )}

                {step === 'profile' && (
                    <form onSubmit={handleProfileSubmit} className="fade-in">
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label className="form-label">Full Name</label>
                            <input type="text" value={firstName} onChange={e=>setFirstName(e.target.value)} className="form-input" placeholder="What should we call you?" required />
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
                <div id="recaptcha-container"></div>

            </div>
        </div>
    );
};

export default Signup;
