import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Shield, Image, Video, CheckCircle, ArrowRight, ArrowLeft, Briefcase, DollarSign, Award, CreditCard } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import API_URL from '../api/config';

const AstrologerApplication = ({ onLogin }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Auth State
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    
    // Detailed Application State
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        expertise: 'Vedic Astrology',
        languages: 'English',
        experience: '5',
        rate: '50',
        idNumber: '',
        upiId: '',
        certification: ''
    });

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    size: 'invisible'
                });
            }
            const formattedPhone = `+91${phone}`; // Assuming India for now
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
            window.confirmationResult = confirmationResult;
            setStep(2);
        } catch (err) { 
            console.error(err);
            alert('Failed to send OTP via Firebase.'); 
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const result = await window.confirmationResult.confirm(otp);
            const idToken = await result.user.getIdToken();

            const res = await fetch(`${API_URL}/api/auth/firebase-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, role: 'ASTROLOGER' }) // Using standard role architecture
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                onLogin && onLogin(data.user);
                setStep(3); // MANDATORY: Move to mandatory professional details
            } else alert(data.error || 'Verification failed on backend.');
        } catch (err) { 
            console.error(err);
            alert('Invalid Code or network error.'); 
        }
        setLoading(false);
    };

    const handleFinalSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            // Update profile with ALL mandatory details
            const res = await fetch(`${API_URL}/api/astrologers/profile/update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    bio: formData.bio,
                    expertise: formData.expertise,
                    languages: formData.languages,
                    experienceInt: parseInt(formData.experience),
                    idNumber: formData.idNumber,
                    upiId: formData.upiId,
                    certification: formData.certification
                })
            });

            if (res.ok) setStep('complete');
            else alert('Error saving onboarding data.');
        } catch (err) { alert('Form submission failed.'); }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', background: 'rgba(10, 7, 20, 0.98)', display: 'flex', flexDirection: 'column' }}>
            
            <nav style={{ padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, color: 'var(--text-main)', fontSize: '1.25rem' }}>
                    <div style={{ width: '38px', height: '38px', background: 'var(--gold-gradient)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1102' }}>
                        <Star size={20} />
                    </div>
                    Roots Expert Partner Program
                </div>
                <Link to="/login/astrologer" style={{ color: 'var(--secondary-color)', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'underline' }}>Already a partner? Login</Link>
            </nav>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
                <div className="glass-card" style={{ maxWidth: '650px', width: '100%', padding: '3.5rem 3rem', borderRadius: '32px', border: '1px solid rgba(212,175,55,0.15)', boxShadow: '0 40px 100px rgba(0,0,0,0.7)', position: 'relative' }}>
                    
                    {step !== 'complete' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem' }}>
                            {[1, 2, 3, 4].map(s => (
                                <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= s ? 'var(--secondary-color)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                            ))}
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="fade-in">
                            <h2 style={{ fontSize: '2.25rem', marginBottom: '1rem', fontFamily: 'Outfit' }}>Join as Expert</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '1.05rem', lineHeight: 1.6 }}>Apply to join our elite global partner program. Verified experts can start consulting and earning instantly.</p>
                            
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">WhatsApp Number</label>
                                <input type="tel" className="form-input" placeholder="+91 999 999 9999" value={phone} onChange={e => setPhone(e.target.value)} autoFocus required style={{ fontSize: '1.25rem', padding: '1.25rem' }} />
                            </div>
                            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ fontWeight: 800 }}>
                                {loading ? 'Processing...' : 'Send Verification OTP'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} className="fade-in" style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Verification</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>We sent a secure code to <strong>{phone}</strong></p>
                            
                            <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))} placeholder="• • • • • •" required style={{ width: '100%', fontSize: '2.5rem', letterSpacing: '10px', textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '2px solid var(--secondary-color)', color: 'var(--secondary-color)', fontWeight: 800, marginBottom: '2.5rem' }} />
                            
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setStep(1)} style={{ padding: '0 1.5rem' }}><ArrowLeft /></button>
                                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Verifying...' : 'Verify & Continue Registration'}</button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={() => setStep(4)} className="fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--secondary-color)' }}>
                                <Briefcase size={24} /> <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1rem' }}>Expert Identity</h3>
                            </div>
                            
                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label">Full Legal Name</label>
                                <input type="text" className="form-input" placeholder="As per official documents" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Primary Expertise</label>
                                    <select className="form-input" value={formData.expertise} onChange={e => setFormData({...formData, expertise: e.target.value})}>
                                        <option>Vedic Astrology</option>
                                        <option>Nadi Astrology</option>
                                        <option>Western Astrology</option>
                                        <option>Palmistry</option>
                                        <option>Numerology</option>
                                        <option>Face Reading</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Years of Experience</label>
                                    <input type="number" className="form-input" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} required />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '2rem' }}>
                                <label className="form-label">Primary ID Number (Aadhar/Passport)</label>
                                <div style={{ position: 'relative' }}>
                                    <Shield size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                                    <input type="text" className="form-input" style={{ paddingLeft: '3rem' }} placeholder="Enter ID Number for verification" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} required />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ fontWeight: 800 }}>Next: Financial Setup <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} /></button>
                        </form>
                    )}

                    {step === 4 && (
                        <form onSubmit={handleFinalSubmit} className="fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--secondary-color)' }}>
                                <CreditCard size={24} /> <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1rem' }}>Payout & Verification</h3>
                            </div>
                            
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">UPI ID or Bank Account (for Earnings)</label>
                                <input type="text" className="form-input" placeholder="e.g. name@upi or Account No" value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} required />
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Certifications / Professional Credentials</label>
                                <input type="text" className="form-input" placeholder="Institution, Course, or Award Name" value={formData.certification} onChange={e => setFormData({...formData, certification: e.target.value})} required />
                            </div>

                            <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                                <label className="form-label">Professional Bio (Minimum 50 Words)</label>
                                <textarea className="form-input" rows="3" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Describe your specialty and how you guide clients..." required style={{ minHeight: '100px', lineHeight: 1.6 }} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setStep(3)} style={{ padding: '0 1.5rem' }}><ArrowLeft /></button>
                                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ fontWeight: 800 }}>{loading ? 'Submitting Application...' : 'Complete Enrollment'}</button>
                            </div>
                        </form>
                    )}

                    {step === 'complete' && (
                        <div className="fade-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ width: '80px', height: '80px', background: 'rgba(28,201,138,0.1)', border: '2px solid #1cc88a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: '#1cc88a' }}>
                                <CheckCircle size={48} />
                            </div>
                            <h2 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>Vetting in Progress</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>Your professional profile has been submitted to the Roots Governance Team. You will be notified via WhatsApp once your identity and payout methods are verified.</p>
                            <button onClick={() => navigate('/astrologer')} className="btn btn-primary btn-block btn-lg" style={{ fontWeight: 700 }}>Enter Partner View</button>
                        </div>
                    )}
                    
                    <div id="recaptcha-container"></div>
                </div>
            </div>
        </div>
    );
};

export default AstrologerApplication;
