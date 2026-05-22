import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, User, Shield, Edit3, Smartphone, Key, ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import API_URL from '../api/config';

const PORTALS = {
    CLIENT: { id: 'CLIENT', title: 'Consult Your Destiny', icon: <User size={22} />, color: '#D4AF37', redirect: '/client' },
    ASTROLOGER: { id: 'ASTROLOGER', title: 'Astrologer Portal', icon: <Star size={22} />, color: '#B08D57', redirect: '/astrologer' },
    WRITER: { id: 'WRITER', title: 'Writer Dashboard', icon: <Edit3 size={22} />, color: '#9B6B6B', redirect: '/writer' },
    ADMIN: { id: 'ADMIN', title: 'Platform Control', icon: <Shield size={22} />, color: '#6B90B0', redirect: '/admin' }
};

const Login = ({ onLogin, portal = 'CLIENT' }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState('input'); // input or otp
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginMethod, setLoginMethod] = useState('mobile'); // mobile or email (for clients)
    const [showFirebaseDomainNotice, setShowFirebaseDomainNotice] = useState(false);

    useEffect(() => {
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

    const handleClientLogin = async (e) => {
        e.preventDefault();
        setError('');
        setShowFirebaseDomainNotice(false);
        if (step === 'input') {
            if (phone.length < 10) return setError('Enter a valid mobile number.');
            setLoading(true);
            try {
                if (window.recaptchaVerifier) {
                    try {
                        window.recaptchaVerifier.clear();
                    } catch (err) {}
                    window.recaptchaVerifier = null;
                }
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    size: 'invisible'
                });
                const formattedPhone = `+91${phone}`; // Assuming India for now
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
        } else {
            setLoading(true);
            try {
                const result = await window.confirmationResult.confirm(otp);
                const idToken = await result.user.getIdToken();

                const res = await fetch(`${API_URL}/api/auth/firebase-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken, role: 'CLIENT' })
                });
                const data = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    onLogin(data.user);
                    navigate('/client');
                } else setError(data.error || 'Verification failed on backend.');
            } catch (err) { 
                console.error(err);
                setError(err.message || 'Invalid OTP or network error.'); 
            }
            setLoading(false);
        }
    };

    const handleStaffLogin = async (e) => {
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
                if (data.user.role !== portal) {
                    return setError(`This portal is restricted to ${portal} authorized personnel only.`);
                }
                localStorage.setItem('token', data.token);
                onLogin(data.user);
                navigate(PORTALS[portal].redirect);
            } else setError(data.error || 'Invalid credentials.');
        } catch (err) { setError('Network error.'); }
        setLoading(false);
    };

    const currentPortal = PORTALS[portal];

    return (
        <div className="login-page">
            <div className="login-left">
                <div className="login-brand">
                    <div className="brand-icon"><Star size={20} color="#1A1102" strokeWidth={2.5} /></div>
                    <span className="brand-text">Roots <span className="brand-accent">Astro</span></span>
                </div>
                <div className="fade-in">
                    <h1 className="login-headline">
                        {portal === 'CLIENT' ? 'Your Cosmic Destiny Starts Here.' : 
                         portal === 'ASTROLOGER' ? 'Empowering Your Practice.' : 
                         portal === 'WRITER' ? 'Share Your Cosmic Insights.' : 'Master Platform Oversight.'}
                    </h1>
                    <p className="login-sub">
                        Connect with top-tier astrologers through the world's most secure and advanced tele-consultation platform.
                    </p>
                    <div className="login-features">
                        {[
                            '500+ Verified Astrologers', 
                            'End-to-End Encryption', 
                            'Instant Video Linkage', 
                            'Session Transparencies'
                        ].map(f => (
                            <div key={f} className="login-feature">
                                <CheckCircle size={15} color={currentPortal.color} />
                                <span>{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {portal === 'CLIENT' && (
                    <div className="astro-cta-card glass-card fade-in" style={{ marginTop: '3rem', borderLeft: '4px solid #D4AF37' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div className="role-icon" style={{ background: 'rgba(212,175,55,0.1)' }}><Star size={18} color="#D4AF37" /></div>
                            <div>
                                <strong style={{ display: 'block' }}>Are you an Astrologer?</strong>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Grow your practice with our premium tools.</p>
                            </div>
                            <Link to="/login/astrologer" className="btn btn-outline btn-xs" style={{ marginLeft: 'auto' }}>
                                Access Portal <ArrowRight size={13} style={{ marginLeft: 4 }} />
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <div className="login-right">
                <div className="login-card glass-card fade-in">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <div className="portal-icon-main" style={{ background: currentPortal.color + '15', border: `1px solid ${currentPortal.color}25` }}>
                            {currentPortal.icon}
                        </div>
                    </div>
                    
                    <h2 className="login-title" style={{ textAlign: 'center' }}>{currentPortal.title}</h2>
                    <p className="login-hint" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        {portal === 'CLIENT' ? 'Experience professional astrology at your fingertips.' : 'Secure, role-based platform access.'}
                    </p>

                    {portal === 'CLIENT' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', marginTop: '1rem', padding: '0.3rem', background: 'rgba(0,0,0,0.1)', borderRadius: '10px' }}>
                            <button 
                                onClick={() => setLoginMethod('mobile')}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: loginMethod === 'mobile' ? 'var(--gold-gradient)' : 'transparent', color: loginMethod === 'mobile' ? '#1A1102' : 'var(--text-muted)', transition: '0.3s' }}
                            >
                                <Smartphone size={12} style={{ marginRight: '0.4rem' }} /> Mobile OTP
                            </button>
                            <button 
                                onClick={() => setLoginMethod('email')}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: loginMethod === 'email' ? 'var(--gold-gradient)' : 'transparent', color: loginMethod === 'email' ? '#1A1102' : 'var(--text-muted)', transition: '0.3s' }}
                            >
                                <Lock size={12} style={{ marginRight: '0.4rem' }} /> Email Login
                            </button>
                        </div>
                    )}

                    {portal === 'CLIENT' && loginMethod === 'mobile' ? (
                        <form onSubmit={handleClientLogin} style={{ marginTop: '0.5rem' }}>
                            {step === 'input' ? (
                                <>
                                    <div className="form-group">
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Smartphone size={14} /> Mobile Number</label>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: 10, border: '1px solid var(--glass-border)', fontSize: '0.9rem', fontWeight: 600 }}>+91</div>
                                            <input className="form-input" style={{ flex: 1 }} type="tel" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ marginTop: '1.5rem', background: 'var(--gold-gradient)' }}>
                                        {loading ? 'Requesting OTP...' : 'Get OTP Code'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="form-group fade-in">
                                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Key size={14} /> Secure OTP Code</label>
                                        <input className="form-input" style={{ letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.5rem' }} type="text" placeholder="●●●●●●" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required autoFocus />
                                        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Enter the 6-digit code sent to your phone.</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                        <button type="submit" className="btn btn-primary" style={{ flex: 2, background: 'var(--gold-gradient)' }}>Verify & Sign In</button>
                                        <button type="button" onClick={() => setStep('input')} className="btn btn-outline" style={{ flex: 1 }}>Edit</button>
                                    </div>
                                </>
                            )}
                        </form>
                    ) : (
                        <form onSubmit={handleStaffLogin} style={{ marginTop: portal === 'CLIENT' ? '0.5rem' : '2rem' }}>
                            <div className="form-group">
                                <label className="form-label">Work Email</label>
                                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off" />
                            </div>
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <label className="form-label">Password</label>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Forgot?</span>
                                </div>
                                <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="off" />
                            </div>
                            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1.5rem', background: portal === 'ADMIN' ? 'linear-gradient(135deg, #6B90B0 0%, #4A6E8C 100%)' : 'var(--gold-gradient)' }}>
                                {portal === 'ADMIN' && <Lock size={14} style={{ marginRight: 8 }} />} Authorized Sign In
                            </button>
                        </form>
                    )}

                    {showFirebaseDomainNotice && (
                        <div style={{ background: 'rgba(255, 74, 74, 0.08)', border: '1px solid rgba(255, 74, 74, 0.25)', borderRadius: '12px', padding: '1.25rem', marginTop: '1rem', textAlign: 'left' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#ff4a4a', fontSize: '0.9rem', fontWeight: 700 }}>⚠️ Firebase Domain Integration Required</h4>
                            <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                To enable live SMS verification on <strong>{window.location.hostname}</strong>, add this domain to the <strong>Authorized Domains</strong> list in your Firebase Console (<em>Authentication &gt; Settings &gt; Authorized Domains</em>).
                            </p>
                        </div>
                    )}

                    {!showFirebaseDomainNotice && error && <p className="form-error" style={{ textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
                    <div id="recaptcha-container"></div>
                    
                    <div className="login-footer-links" style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                        {portal !== 'CLIENT' && <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>← Return to Primary Login</Link>}
                        {portal === 'CLIENT' && <p className="login-footer-text">By signing in, you agree to our <span style={{ color: 'var(--secondary-color)' }}>Terms of Service</span></p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
