import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Shield, Image, Video, CheckCircle, ArrowRight, ArrowLeft, Briefcase, DollarSign, Award, CreditCard, FileText, Upload, Building, Lock } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';
import API_URL from '../api/config';

const AstrologerApplication = ({ onLogin }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Auth State
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [showFirebaseDomainNotice, setShowFirebaseDomainNotice] = useState(false);
    
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

    // KYC + Bank State
    const [agreementUrl, setAgreementUrl] = useState('');
    const [agreementLoading, setAgreementLoading] = useState(false);
    const [kycData, setKycData] = useState({
        panCardUrl: '',
        aadhaarUrl: '',
        signedAgreementUrl: '',
        bankAccountNo: '',
        bankName: '',
        bankBranchId: '',
        ifscCode: ''
    });
    const [payoutTermsAccepted, setPayoutTermsAccepted] = useState(false);
    const [uploadingFile, setUploadingFile] = useState('');

    const panRef = useRef();
    const aadhaarRef = useRef();
    const agreementRef = useRef();

    React.useEffect(() => {
        return () => {
            if (window.recaptchaVerifier) {
                try { window.recaptchaVerifier.clear(); } catch (e) { console.error(e); }
                window.recaptchaVerifier = null;
            }
        };
    }, []);

    // Fetch master agreement URL
    const fetchAgreementUrl = async () => {
        setAgreementLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/settings/public/agreement`);
            if (res.ok) {
                const data = await res.json();
                setAgreementUrl(data.url);
            } else {
                setError('Agreement template not yet uploaded by admin. Please contact support.');
            }
        } catch {
            setError('Failed to fetch agreement URL.');
        }
        setAgreementLoading(false);
    };

    React.useEffect(() => {
        if (step === 5) fetchAgreementUrl();
    }, [step]);

    // Upload file to Firebase Storage
    const uploadFile = async (file, folder) => {
        const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
        const snap = await uploadBytes(storageRef, file);
        return await getDownloadURL(snap.ref);
    };

    const handleFileUpload = async (file, field) => {
        if (!file) return;
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setError('File size must be under 5MB.');
            return;
        }
        setUploadingFile(field);
        setError('');
        try {
            const url = await uploadFile(file, `kyc/${field}`);
            setKycData(prev => ({ ...prev, [field]: url }));
        } catch {
            setError(`Failed to upload ${field}. Please try again.`);
        }
        setUploadingFile('');
    };

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        setShowFirebaseDomainNotice(false);
        try {
            if (window.recaptchaVerifier) {
                try { window.recaptchaVerifier.clear(); } catch { /* ignore clear error */ }
                window.recaptchaVerifier = null;
            }
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
            let formattedPhone = phone.trim();
            if (!formattedPhone.startsWith('+')) formattedPhone = `+91${formattedPhone}`;
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
            window.confirmationResult = confirmationResult;
            setStep(2);
        } catch (err) { 
            const isCaptchaError = err.code === 'auth/captcha-check-failed' || err.message?.includes('captcha') || err.message?.includes('Hostname') || err.message?.includes('hostname');
            if (isCaptchaError) setShowFirebaseDomainNotice(true);
            else setError(`Firebase Auth Error (${err.code || 'UNKNOWN'}): ${err.message || 'Check console logs'}`);
        }
        setLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const result = await window.confirmationResult.confirm(otp);
            const idToken = await result.user.getIdToken();
            const res = await fetch(`${API_URL}/api/auth/firebase-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, role: 'ASTROLOGER' })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                onLogin && onLogin(data.user);
                setStep(3);
            } else {
                setError(data.error || 'Verification failed on backend.');
            }
        } catch (err) { 
            setError(err.message || 'Invalid Code or network error.');
        }
        setLoading(false);
    };

    const handleFinalSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!payoutTermsAccepted) {
            setError('You must accept the payout terms to proceed.');
            return;
        }
        if (!kycData.panCardUrl || !kycData.aadhaarUrl || !kycData.signedAgreementUrl) {
            setError('Please upload all required documents (PAN, Aadhaar, Signed Agreement).');
            return;
        }
        if (!kycData.bankAccountNo || !kycData.bankName || !kycData.ifscCode) {
            setError('Bank account number, bank name, and IFSC code are required.');
            return;
        }
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        try {
            // Step 1: Update professional profile
            const profileRes = await fetch(`${API_URL}/api/astrologers/profile/update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: formData.name,
                    bio: formData.bio,
                    expertise: formData.expertise,
                    languages: formData.languages,
                    experienceInt: parseInt(formData.experience),
                    rate: formData.rate,
                    idNumber: formData.idNumber,
                    upiId: formData.upiId,
                    certification: formData.certification,
                    submitApplication: true
                })
            });
            if (!profileRes.ok) throw new Error('Failed to save profile details.');

            // Step 2: Submit KYC documents + bank details
            const kycRes = await fetch(`${API_URL}/api/astrologers/kyc/documents`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(kycData)
            });
            if (!kycRes.ok) {
                const kycErr = await kycRes.json();
                throw new Error(kycErr.error || 'Failed to submit KYC documents.');
            }

            setStep('complete');
        } catch (err) {
            setError(err.message || 'Submission failed. Please try again.');
        }
        setLoading(false);
    };

    // --- SHARED STYLES ---
    const inputStyle = { width: '100%', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' };
    const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' };
    const uploadBoxStyle = (uploaded) => ({
        border: `2px dashed ${uploaded ? '#1cc88a' : 'rgba(212,175,55,0.4)'}`,
        borderRadius: '12px',
        padding: '1.25rem',
        textAlign: 'center',
        cursor: 'pointer',
        background: uploaded ? 'rgba(28,201,138,0.05)' : 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s'
    });

    const TOTAL_STEPS = 6;

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
                    
                    {/* Progress Bar */}
                    {step !== 'complete' && (
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                {[1,2,3,4,5,6].map(s => (
                                    <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= s ? 'var(--secondary-color)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                                ))}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'right' }}>Step {step} of {TOTAL_STEPS}</p>
                        </div>
                    )}

                    {/* Notices */}
                    {showFirebaseDomainNotice && (
                        <div style={{ background: 'rgba(255, 74, 74, 0.08)', border: '1px solid rgba(255, 74, 74, 0.25)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#ff4a4a', fontSize: '0.9rem', fontWeight: 700 }}>⚠️ Firebase Domain Integration Required</h4>
                            <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                Add <strong>{window.location.hostname}</strong> to Authorized Domains in Firebase Console (Authentication › Settings › Authorized Domains).
                            </p>
                        </div>
                    )}
                    {error && !showFirebaseDomainNotice && (
                        <div style={{ background: 'rgba(255, 74, 74, 0.1)', color: '#ff4a4a', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid rgba(255, 74, 74, 0.2)' }}>
                            {error}
                        </div>
                    )}

                    {/* ── STEP 1: Phone ─────────────────────────────────── */}
                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="fade-in">
                            <h2 style={{ fontSize: '2.25rem', marginBottom: '1rem', fontFamily: 'Outfit' }}>Join as Expert</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '1.05rem', lineHeight: 1.6 }}>Apply to join our elite global partner program. Verified experts can start consulting and earning instantly.</p>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={labelStyle}>WhatsApp Number</label>
                                <input type="tel" style={inputStyle} placeholder="+91 999 999 9999" value={phone} onChange={e => setPhone(e.target.value)} autoFocus required />
                            </div>
                            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ fontWeight: 800 }}>
                                {loading ? 'Processing...' : 'Send Verification OTP'}
                            </button>
                        </form>
                    )}

                    {/* ── STEP 2: OTP ──────────────────────────────────── */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} className="fade-in" style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Verification</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>We sent a secure code to <strong>{phone}</strong></p>
                            <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))} placeholder="• • • • • •" required
                                style={{ width: '100%', fontSize: '2.5rem', letterSpacing: '10px', textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '2px solid var(--secondary-color)', color: 'var(--secondary-color)', fontWeight: 800, marginBottom: '2.5rem' }} />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setStep(1)} style={{ padding: '0 1.5rem' }}><ArrowLeft /></button>
                                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Verifying...' : 'Verify & Continue'}</button>
                            </div>
                        </form>
                    )}

                    {/* ── STEP 3: Expert Identity ───────────────────────── */}
                    {step === 3 && (
                        <form onSubmit={() => setStep(4)} className="fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--secondary-color)' }}>
                                <Briefcase size={24} /> <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1rem' }}>Expert Identity</h3>
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>Full Legal Name</label>
                                <input type="text" style={inputStyle} placeholder="As per official documents" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                                <div>
                                    <label style={labelStyle}>Primary Expertise</label>
                                    <select style={inputStyle} value={formData.expertise} onChange={e => setFormData({...formData, expertise: e.target.value})}>
                                        <option>Vedic Astrology</option>
                                        <option>Nadi Astrology</option>
                                        <option>Western Astrology</option>
                                        <option>Palmistry</option>
                                        <option>Numerology</option>
                                        <option>Face Reading</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Years of Experience</label>
                                    <input type="number" style={inputStyle} value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} required />
                                </div>
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={labelStyle}>Primary ID Number (Aadhaar/Passport)</label>
                                <div style={{ position: 'relative' }}>
                                    <Shield size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                    <input type="text" style={{ ...inputStyle, paddingLeft: '3rem' }} placeholder="Enter ID Number for verification" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} required />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ fontWeight: 800 }}>Next: Professional Details <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} /></button>
                        </form>
                    )}

                    {/* ── STEP 4: Payout & Professional ─────────────────── */}
                    {step === 4 && (
                        <form onSubmit={() => setStep(5)} className="fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--secondary-color)' }}>
                                <CreditCard size={24} /> <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1rem' }}>Professional Profile</h3>
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>UPI ID (for initial reference)</label>
                                <input type="text" style={inputStyle} placeholder="e.g. name@upi" value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} />
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>Certifications / Professional Credentials</label>
                                <input type="text" style={inputStyle} placeholder="Institution, Course, or Award Name" value={formData.certification} onChange={e => setFormData({...formData, certification: e.target.value})} />
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>Languages (comma separated)</label>
                                <input type="text" style={inputStyle} placeholder="English, Hindi, Tamil" value={formData.languages} onChange={e => setFormData({...formData, languages: e.target.value})} required />
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>Session Rate (₹ per session)</label>
                                <input type="number" style={inputStyle} placeholder="500" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} required min="1" />
                            </div>
                            <div style={{ marginBottom: '2.5rem' }}>
                                <label style={labelStyle}>Professional Bio (min 50 words)</label>
                                <textarea style={{ ...inputStyle, minHeight: '100px', lineHeight: 1.6, resize: 'vertical' }} rows="3" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Describe your specialty and how you guide clients..." required />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setStep(3)} style={{ padding: '0 1.5rem' }}><ArrowLeft /></button>
                                <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ fontWeight: 800 }}>Next: Agreement & KYC <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} /></button>
                            </div>
                        </form>
                    )}

                    {/* ── STEP 5: Agreement Download & Document Upload ───── */}
                    {step === 5 && (
                        <div className="fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--secondary-color)' }}>
                                <FileText size={24} /> <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1rem' }}>KYC Documents</h3>
                            </div>

                            {/* Agreement Download */}
                            <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#D4AF37' }}>📄 Step 1: Download & Sign the Platform Agreement</p>
                                <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>Download the agreement, print & sign it physically, then scan and upload below.</p>
                                {agreementLoading ? (
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading agreement...</p>
                                ) : agreementUrl ? (
                                    <a href={agreementUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                                        <FileText size={16} /> Download Agreement PDF
                                    </a>
                                ) : (
                                    <p style={{ color: '#ff6b6b', fontSize: '0.85rem' }}>⚠️ Agreement not uploaded by admin yet. Please contact support@rootsastro.com</p>
                                )}
                            </div>

                            {/* PAN Card Upload */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>PAN Card (PDF or Image, max 5MB) *</label>
                                <div style={uploadBoxStyle(!!kycData.panCardUrl)} onClick={() => panRef.current.click()}>
                                    <input ref={panRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => handleFileUpload(e.target.files[0], 'panCardUrl')} />
                                    {uploadingFile === 'panCardUrl' ? (
                                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.85rem' }}>⏳ Uploading...</p>
                                    ) : kycData.panCardUrl ? (
                                        <p style={{ color: '#1cc88a', margin: 0, fontSize: '0.85rem' }}>✅ PAN Card Uploaded Successfully</p>
                                    ) : (
                                        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.85rem' }}><Upload size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Click to upload PAN Card</p>
                                    )}
                                </div>
                            </div>

                            {/* Aadhaar Upload */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>Aadhaar Card (PDF or Image, max 5MB) *</label>
                                <div style={uploadBoxStyle(!!kycData.aadhaarUrl)} onClick={() => aadhaarRef.current.click()}>
                                    <input ref={aadhaarRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => handleFileUpload(e.target.files[0], 'aadhaarUrl')} />
                                    {uploadingFile === 'aadhaarUrl' ? (
                                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.85rem' }}>⏳ Uploading...</p>
                                    ) : kycData.aadhaarUrl ? (
                                        <p style={{ color: '#1cc88a', margin: 0, fontSize: '0.85rem' }}>✅ Aadhaar Card Uploaded Successfully</p>
                                    ) : (
                                        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.85rem' }}><Upload size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Click to upload Aadhaar Card</p>
                                    )}
                                </div>
                            </div>

                            {/* Signed Agreement Upload */}
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={labelStyle}>Signed Agreement (PDF or Image, max 5MB) *</label>
                                <div style={uploadBoxStyle(!!kycData.signedAgreementUrl)} onClick={() => agreementRef.current.click()}>
                                    <input ref={agreementRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => handleFileUpload(e.target.files[0], 'signedAgreementUrl')} />
                                    {uploadingFile === 'signedAgreementUrl' ? (
                                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.85rem' }}>⏳ Uploading...</p>
                                    ) : kycData.signedAgreementUrl ? (
                                        <p style={{ color: '#1cc88a', margin: 0, fontSize: '0.85rem' }}>✅ Signed Agreement Uploaded</p>
                                    ) : (
                                        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.85rem' }}><Upload size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Upload signed agreement scan</p>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setStep(4)} style={{ padding: '0 1.5rem' }}><ArrowLeft /></button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-block btn-lg"
                                    style={{ fontWeight: 800 }}
                                    disabled={!kycData.panCardUrl || !kycData.aadhaarUrl || !kycData.signedAgreementUrl || !!uploadingFile}
                                    onClick={() => setStep(6)}
                                >
                                    Next: Bank Details <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 6: Bank Details + Terms ──────────────────── */}
                    {step === 6 && (
                        <form onSubmit={handleFinalSubmit} className="fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--secondary-color)' }}>
                                <Building size={24} /> <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1rem' }}>Bank & Payout Details</h3>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>Bank Name *</label>
                                <input type="text" style={inputStyle} placeholder="e.g. State Bank of India" value={kycData.bankName} onChange={e => setKycData({...kycData, bankName: e.target.value})} required />
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyle}>Account Number *</label>
                                <input type="text" style={inputStyle} placeholder="Enter your bank account number" value={kycData.bankAccountNo} onChange={e => setKycData({...kycData, bankAccountNo: e.target.value})} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                                <div>
                                    <label style={labelStyle}>IFSC Code *</label>
                                    <input type="text" style={inputStyle} placeholder="e.g. SBIN0001234" value={kycData.ifscCode} onChange={e => setKycData({...kycData, ifscCode: e.target.value.toUpperCase()})} required />
                                </div>
                                <div>
                                    <label style={labelStyle}>Branch ID / Name</label>
                                    <input type="text" style={inputStyle} placeholder="Branch name or ID" value={kycData.bankBranchId} onChange={e => setKycData({...kycData, bankBranchId: e.target.value})} />
                                </div>
                            </div>

                            {/* Payout Terms */}
                            <div style={{ background: 'rgba(45,30,77,0.5)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#D4AF37' }}>📋 Payout Schedule & Terms</p>
                                <ul style={{ margin: '0 0 1rem 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                                    <li>Earnings are transferred between the <strong>25th–31st of each month</strong> from the platform bank account.</li>
                                    <li>Only earnings booked <strong>on or before the 25th</strong> are included in the current cycle. Earnings from the 26th onwards go to the <strong>next month's cycle</strong>.</li>
                                    <li>Payout = Gross Earnings − Platform Commission − <strong>TDS (as per platform policy)</strong>.</li>
                                    <li>TDS certificates will be issued at the end of the financial year.</li>
                                    <li>Any disputes or refunds during the cycle may reduce the final payout amount.</li>
                                </ul>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={payoutTermsAccepted} onChange={e => setPayoutTermsAccepted(e.target.checked)} style={{ marginTop: '3px', flexShrink: 0, accentColor: '#D4AF37' }} />
                                    <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                                        I accept the payout schedule and terms, and confirm that the bank details provided are accurate and in my name.
                                    </span>
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setStep(5)} style={{ padding: '0 1.5rem' }}><ArrowLeft /></button>
                                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || !payoutTermsAccepted} style={{ fontWeight: 800 }}>
                                    {loading ? 'Submitting Application...' : '🚀 Complete Enrollment'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── COMPLETE ──────────────────────────────────────── */}
                    {step === 'complete' && (
                        <div className="fade-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ width: '80px', height: '80px', background: 'rgba(28,201,138,0.1)', border: '2px solid #1cc88a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: '#1cc88a' }}>
                                <CheckCircle size={48} />
                            </div>
                            <h2 style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>Application Submitted!</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '0.5rem' }}>
                                Your KYC documents, bank details, and signed agreement have been submitted for review.
                            </p>
                            <p style={{ color: 'rgba(212,175,55,0.8)', fontSize: '0.9rem', marginBottom: '2.5rem', lineHeight: 1.5 }}>
                                The Roots Governance Team will verify your identity and bank details. You will be notified via WhatsApp once approved. This typically takes 2–3 business days.
                            </p>
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
