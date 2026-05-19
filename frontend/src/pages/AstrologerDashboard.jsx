import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useSearchParams } from 'react-router-dom';
import {
    Calendar, User, CreditCard, Video, Star, Plus, Edit, Trash2, ExternalLink,
    MessageSquare, AlertTriangle, Check, CheckCircle, Clock, X, XCircle, Settings, Zap, ArrowDownCircle, Smartphone, Lock, Shield, Wallet, DollarSign
} from 'lucide-react';
import API_URL from '../api/config';
import { StatCard, StatusBadge, EmptyState, Modal, DashboardLayout, SidebarBtn, FormField } from '../components/Shared';
import { ASTROLOGER_SERVICES_DEFAULT, DAYS_OF_WEEK, ASTROLOGER_BOOKINGS, ASTROLOGER_EARNINGS, ASTROLOGER_FINANCE, PLATFORM_CONFIG } from '../data/mockData';

const ALL_TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const PROBLEM_NOTES = {
    1: 'Client is facing career challenges for the past year and seeks guidance on the right path forward.',
    3: 'Client is experiencing health-related concerns and wants astrological perspective on recovery timing.',
};

// Compute available time slots from schedule config
const computeSlots = (dayConfig, buffer, service) => {
    if (!dayConfig.available) return [];
    const { start, end, breakStart, breakEnd } = dayConfig;
    const dur = parseInt(service?.duration || 45);
    const buf = parseInt(buffer) || 30;
    const slots = [];
    let cur = timeToMin(start);
    const endM = timeToMin(end);
    const bsM = breakStart ? timeToMin(breakStart) : null;
    const beM = breakEnd ? timeToMin(breakEnd) : null;
    while (cur + dur <= endM) {
        // Skip break
        if (bsM !== null && cur < beM && cur + dur > bsM) { cur = beM; continue; }
        slots.push(minToTime(cur));
        cur += dur + buf;
    }
    return slots;
};
const timeToMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const minToTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const to12 = (t24) => { const [h, m] = t24.split(':').map(Number); const pm = h >= 12; return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${pm ? 'PM' : 'AM'}`; };

const DEFAULT_DAY = { available: true, start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' };
const INIT_WEEKLY = Object.fromEntries(DAYS_OF_WEEK.map((d, i) => [d, i >= 5 ? { ...DEFAULT_DAY, available: false } : { ...DEFAULT_DAY }]));

/* ── Modular Panels for reuse (Desktop Sidebar / Mobile Modal) ── */
const GlobalSettingsPanel = ({ schedConfig, setSchedConfig }) => (
    <div className="glass-card sm-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.2rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} color="var(--secondary-color)" /> Preferences
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormField label="Buffer (Between Sessions)">
                <select className="form-input" style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem' }} value={schedConfig.buffer} onChange={e => setSchedConfig({ ...schedConfig, buffer: e.target.value })}>
                    {['0', '10', '15', '20', '30', '45', '60'].map(v => <option key={v} value={v}>{v === '0' ? 'No buffer' : `${v} min`}</option>)}
                </select>
            </FormField>
            <FormField label="Daily Session Cap">
                <input className="form-input" style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem' }} type="number" min="1" max="20" value={schedConfig.maxPerDay} onChange={e => setSchedConfig({ ...schedConfig, maxPerDay: e.target.value })} />
            </FormField>
            <FormField label="Timezone">
                <select className="form-input" style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem' }} value={schedConfig.timezone} onChange={e => setSchedConfig({ ...schedConfig, timezone: e.target.value })}>
                    {['Asia/Kolkata (IST)', 'America/New_York (EST)', 'America/Los_Angeles (PST)', 'Europe/London (GMT)', 'Asia/Dubai (GST)', 'Asia/Singapore (SGT)'].map(t => <option key={t}>{t}</option>)}
                </select>
            </FormField>
        </div>
    </div>
);

const PreviewPanel = ({ previewDay, setPreviewDay, previewSlots, weeklySchedule, activeService, buffer, to12 }) => (
    <div className="glass-card sm-panel" style={{ padding: '1.5rem', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Preview</h3>
            <select className="form-input" style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.8rem', minHeight: 'auto' }} value={previewDay} onChange={e => setPreviewDay(e.target.value)}>
                {DAYS_OF_WEEK.filter(d => weeklySchedule[d].available).map(d => <option key={d}>{d}</option>)}
            </select>
        </div>
        <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem', scrollbarWidth: 'thin' }}>
            {previewSlots.length > 0 ? (
                <div className="slot-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '0.4rem', display: 'grid' }}>
                    {previewSlots.map(s => <div key={s} className="slot-btn selected" style={{ cursor: 'default', padding: '0.4rem', fontSize: '0.75rem', textAlign: 'center', borderRadius: '6px' }}>{to12(s)}</div>)}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                    <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                    <p style={{ fontSize: '0.85rem' }}>No slots available.</p>
                </div>
            )}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem' }}>
            Slots autocalculated using base duration ({activeService?.duration || 'N/A'}) and {buffer}m buffer.
        </p>
    </div>
);

const AstrologerDashboard = ({ user }) => {
    const { currencySymbol } = useSettings();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') || 'overview';
    const setTab = (t) => setSearchParams({ tab: t });
    const [bookings, setBookings] = useState(ASTROLOGER_BOOKINGS);
    const [services, setServices] = useState(ASTROLOGER_SERVICES_DEFAULT);
    const [earnings] = useState(ASTROLOGER_EARNINGS);

    /* ── Schedule state ── */
    const [weeklySchedule, setWeeklySchedule] = useState(INIT_WEEKLY);
    const [schedConfig, setSchedConfig] = useState({ buffer: '30', maxPerDay: '5', timezone: 'Asia/Kolkata (IST)' });
    const [serviceSchedule, setServiceSchedule] = useState(
        ASTROLOGER_SERVICES_DEFAULT.reduce((a, s) => ({ ...a, [s.id]: { duration: s.duration, maxPerWeek: '10' } }), {})
    );
    const [scheduleSaved, setScheduleSaved] = useState(false);

    /* ── Payment Gateway State (Simulated) ── */
    const [paymentGateways, setPaymentGateways] = useState({
        razorpay: { connected: false, keyId: 'rzp_test_7a2s9K...' },
        paypal: { connected: true, email: 'payouts@acharya-rajesh.com' }
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [masterServices, setMasterServices] = useState([]);
    const [serviceModal, setServiceModal] = useState(false);
    const [newServiceForm, setNewServiceForm] = useState({ masterServiceId: '', price: '', duration: '30', type: 'CHAT' });
    const [serviceLoading, setServiceLoading] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [svcForm, setSvcForm] = useState({ name: '', duration: '45 min', price: '' });

    const [rescheduleModal, setRescheduleModal] = useState(false);
    const [rescheduleTarget, setRescheduleTarget] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleSlot, setRescheduleSlot] = useState('');
    const [rescheduleNote, setRescheduleNote] = useState('');
    const [rescheduleSent, setRescheduleSent] = useState(false);

    const [cancelConfirm, setCancelConfirm] = useState(null);
    const [cancelledIds, setCancelledIds] = useState(new Set());
    const [problemNoteTarget, setProblemNoteTarget] = useState(null);

    /* ── Start Session (Zoom link) ── */
    const [sessionModal, setSessionModal] = useState(false);
    const [sessionBooking, setSessionBooking] = useState(null);
    const [zoomGenerating, setZoomGenerating] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');

    /* ── UPI Withdrawal state ── */
    const [finance, setFinance] = useState(ASTROLOGER_FINANCE);
    const [upiId, setUpiId] = useState(ASTROLOGER_FINANCE.upiId || '');
    const [upiSaved, setUpiSaved] = useState(false);
    const [withdrawModal, setWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawProcessing, setWithdrawProcessing] = useState(false);
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);
    const [withdrawRef, setWithdrawRef] = useState('');

    const [profile, setProfile] = useState({ name: user?.name || 'Acharya Rajesh Kumar', bio: '', expertise: '', languages: '', certifications: '', rate: '50', image: '' });
    const [imageLoading, setImageLoading] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [passwordModal, setPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [bookingFilter, setBookingFilter] = useState('all');
    const [previewDay, setPreviewDay] = useState('Monday');

    // API Integration useEffect
    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                // Fetch Finance Stats
                const fRes = await fetch(`${API_URL}/api/finance/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (fRes.ok) {
                    const fData = await fRes.json();
                    setFinance({
                        withdrawableBalance: fData.balance ?? 0,
                        pendingBalance: fData.pendingBalance ?? 0,
                        withdrawnTotal: (fData.withdrawals || []).filter(w => w.status === 'COMPLETED').reduce((s, w) => s + (w.amount || 0), 0),
                        upiId: fData.upiId || '',
                        transactions: fData.transactions || []
                    });
                }

                // Fetch Gateway Settings
                const sRes = await fetch(`${API_URL}/api/settings/astrologer/gateways`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (sRes.ok) {
                    const sData = await sRes.json();
                    setPaymentGateways(sData);
                }

                // Fetch Services
                const svcRes = await fetch(`${API_URL}/api/astrologers/services`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (svcRes.ok) {
                    const svcData = await svcRes.json();
                    setServices(svcData.map(s => ({ ...s, duration: `${s.duration} min` })));
                }

                // Fetch Bookings
                const bRes = await fetch(`${API_URL}/api/bookings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (bRes.ok) {
                    const bData = await bRes.json();
                    setBookings(bData.map(b => ({
                        id: b.id,
                        clientRef: `${b.client.firstName} (#${b.id})`,
                        service: `Service #${b.serviceId}`,
                        date: new Date(b.scheduledAt).toLocaleDateString(),
                        time: new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        status: b.status.toLowerCase(),
                        amount: b.amount,
                        astrologerReceives: (b.amount * (1 - (PLATFORM_CONFIG.commissionRate))).toFixed(2)
                    })));
                }
            } catch (err) {
                console.error("Dashboard Auto-fetch failed:", err);
            }
        };

        const fetchMasterServices = async () => {
            try {
                const res = await fetch(`${API_URL}/api/admin/master-services`);
                if (res.ok) {
                    const data = await res.json();
                    setMasterServices(data.filter(s => s.active));
                }
            } catch (err) { console.error("Fetch master services failed", err); }
        };

        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${API_URL}/api/astrologers/profile/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProfile({
                        name: data.user.firstName + ' ' + (data.user.lastName || ''),
                        bio: data.bio || '',
                        expertise: data.expertise || '',
                        languages: data.languages || '',
                        certifications: data.certification || '',
                        rate: data.rate || '50',
                        image: data.image || ''
                    });
                }
            } catch (err) { console.error("Fetch profile failed", err); }
        };

        fetchDashboardData();
        fetchMasterServices();
        fetchProfile();
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Simple base64 conversion for small images
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result;
            setImageLoading(true);
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${API_URL}/api/astrologers/profile/update`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ image: base64 })
                });
                if (res.ok) {
                    setProfile(prev => ({ ...prev, image: base64 }));
                }
            } catch (err) { console.error("Image upload failed", err); }
            setImageLoading(false);
        };
    };
    
    // Mobile Schedule Overlays
    const [isMobilePrefsOpen, setIsMobilePrefsOpen] = useState(false);
    const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

    /* ── Service CRUD ── */
    const openAddService = () => { setEditingService(null); setSvcForm({ name: '', duration: '45 min', price: '' }); setServiceModal(true); };
    const openEditService = (s) => { setEditingService(s); setSvcForm({ name: s.name, duration: s.duration, price: String(s.price) }); setServiceModal(true); };
    const saveService = async () => {
        if (!svcForm.name || !svcForm.price) return;
        const token = localStorage.getItem('token');
        const body = { 
            name: svcForm.name, 
            price: parseFloat(svcForm.price), 
            duration: parseInt(svcForm.duration) 
        };
        try {
            const res = await fetch(`${API_URL}/api/astrologers/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const ns = await res.json();
                setServices(prev => [...prev, { ...ns, duration: `${ns.duration} min` }]);
                setServiceModal(false);
            }
        } catch (err) { console.error("Save service failed", err); }
    };
    const deleteService = async (id) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/astrologers/services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setServices(prev => prev.filter(s => s.id !== id));
        } catch (err) { console.error("Delete service failed", err); }
    };
    const toggleService = (id) => setServices(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));

    /* ── Schedule helpers ── */
    const updateDay = (day, field, val) => setWeeklySchedule(prev => ({ ...prev, [day]: { ...prev[day], [field]: val } }));
    const saveSchedule = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/astrologers/schedule/update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ schedule: weeklySchedule })
            });
            if (res.ok) {
                setScheduleSaved(true);
                setTimeout(() => setScheduleSaved(false), 2500);
            }
        } catch (err) { console.error("Save schedule failed", err); }
    };

    /* ── Reschedule ── */
    const openReschedule = (b) => { setRescheduleTarget(b); setRescheduleDate(''); setRescheduleSlot(''); setRescheduleNote(''); setRescheduleSent(false); setRescheduleModal(true); };
    const sendReschedule = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/bookings/astrologer/reschedule/${rescheduleTarget.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ newDate: rescheduleDate, note: rescheduleNote })
            });
            if (res.ok) {
                setBookings(prev => prev.map(b => b.id === rescheduleTarget.id ? { ...b, status: 'rescheduled' } : b));
                setRescheduleSent(true);
                setTimeout(() => setRescheduleModal(false), 1800);
            }
        } catch (err) { console.error("Reschedule failed", err); }
    };

    /* ── Cancel ── */
    const confirmCancel = async (id) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/bookings/astrologer/cancel/${id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
                setCancelledIds(prev => new Set([...prev, id]));
                setCancelConfirm(null);
            }
        } catch (err) { console.error("Cancel failed", err); }
    };

    /* ── Start Session → generate Zoom link ── */
    const startSession = async (b) => {
        setSessionBooking(b); setGeneratedLink(''); setZoomGenerating(true); setSessionModal(true);
        const link = `https://zoom.us/j/${Math.floor(Math.random() * 9000000000 + 1000000000)}?pwd=${Math.random().toString(36).slice(2, 10)}`;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/bookings/astrologer/start/${b.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ zoomMeetingUrl: link })
            });
            if (res.ok) {
                setGeneratedLink(link);
                setZoomGenerating(false);
                setBookings(prev => prev.map(bk => bk.id === b.id ? { ...bk, zoomLink: link, status: 'IN_PROGRESS' } : bk));
            }
        } catch (err) { 
            console.error("Start session failed", err);
            setZoomGenerating(false);
        }
    };

    const upcoming = bookings.filter(b => b.status === 'upcoming');
    const filteredBookings = bookings.filter(b => bookingFilter === 'all' || b.status === bookingFilter);
    const totalEarned = earnings.filter(e => e.type === 'credit').reduce((s, e) => s + parseFloat(e.amount.replace(/[^0-9.-]+/g, '')), 0);
    const astrologerPct = (PLATFORM_CONFIG.astrologerShare * 100).toFixed(0);
    const platformPct = (PLATFORM_CONFIG.commissionRate * 100).toFixed(0);

    // Preview slots for selected day
    const previewSlots = computeSlots(weeklySchedule[previewDay], schedConfig.buffer, services.find(s => s.active));

    // Financial Actions
    const [withdrawMethod, setWithdrawMethod] = useState('UPI'); // UPI only
    const [withdrawDetails, setWithdrawDetails] = useState({
        bankName: '', accountNumber: '', ifsc: '',
        upiId: '',
        paypalEmail: ''
    });

    const initiateWithdraw = async () => {
        const amt = parseFloat(withdrawAmount);
        if (!amt || amt <= 0 || amt > finance.withdrawableBalance) return;
        setWithdrawProcessing(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/finance/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    amount: amt, 
                    method: withdrawMethod, 
                    details: withdrawMethod === 'BANK' ? { bankName: withdrawDetails.bankName, accountNo: withdrawDetails.accountNumber, ifsc: withdrawDetails.ifsc } : 
                             withdrawMethod === 'UPI' ? { upiId: withdrawDetails.upiId } : 
                             { email: withdrawDetails.paypalEmail }
                })
            });

            if (res.ok) {
                const data = await res.json();
                setWithdrawRef(data.withdrawal.reference);
                setWithdrawProcessing(false);
                setWithdrawSuccess(true);
                setFinance(prev => ({ ...prev, withdrawableBalance: prev.withdrawableBalance - amt }));
            } else {
                const err = await res.json();
                alert(err.error || "Withdrawal failed");
                setWithdrawProcessing(false);
            }
        } catch (err) {
            setWithdrawProcessing(false);
        }
    };

    const sidebar = (
        <>
            {[
                { id: 'overview', icon: <Video size={19} />, label: 'Overview' },
                { id: 'bookings', icon: <Calendar size={19} />, label: 'Appointments' },
                { id: 'services', icon: <Star size={19} />, label: 'Services' },
                { id: 'schedule', icon: <Clock size={19} />, label: 'Schedule' },
            ].map(item => <SidebarBtn key={item.id} {...item} active={tab === item.id} onClick={(id) => setTab(id)} />)}
        </>
    );

    const [devReviewGate, setDevReviewGate] = useState(false);
    const isUnderReview = user?.status === 'PENDING' || devReviewGate;

    return (
        <DashboardLayout sidebar={sidebar}>
            {/* DEV TOGGLE FOR TESTING */}
            <div style={{ position: 'fixed', bottom: 10, left: 10, zIndex: 999999 }}>
                <button onClick={() => setDevReviewGate(!devReviewGate)} style={{ background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid rgba(212,175,55,0.4)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>Toggle Review Gate</button>
            </div>

            {isUnderReview && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 7, 22, 0.4)', backdropFilter: 'blur(8px)', borderRadius: '24px', overflow: 'hidden' }}>
                    <div className="fade-in" style={{ background: 'linear-gradient(145deg, #1A1102 0%, #0A0A0A 100%)', padding: '3rem 2.5rem', borderRadius: '24px', textAlign: 'center', maxWidth: '440px', border: '1px solid rgba(212,175,55,0.3)', boxShadow: '0 25px 60px rgba(0,0,0,0.9)', position: 'relative' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', background: 'rgba(212,175,55,0.05)', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid rgba(212,175,55,0.15)', position: 'relative', zIndex: 1 }}>
                            <Shield size={38} color="var(--secondary-color)" />
                        </div>
                        <h2 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1.6rem', fontWeight: 800, position: 'relative', zIndex: 1, letterSpacing: '-0.5px' }}>Profile Under Review</h2>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', fontSize: '0.95rem', position: 'relative', zIndex: 1 }}>Your application and KYC documents are currently being securely vetted by the Roots Astro Governance Team. We will notify you via email as soon as you are cleared to accept live consultations.</p>
                        
                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)', position: 'relative', zIndex: 1 }}>
                            <p style={{ color: 'var(--secondary-color)', fontSize: '0.75rem', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Estimated Time: 24 - 48 Hours</p>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ filter: isUnderReview ? 'blur(4px) grayscale(80%) opacity(0.3)' : 'none', pointerEvents: isUnderReview ? 'none' : 'auto', userSelect: isUnderReview ? 'none' : 'auto', transition: 'all 0.4s ease', height: '100%', width: '100%' }}>
            {/* ── Service Modal ── */}
            <Modal isOpen={serviceModal} onClose={() => setServiceModal(false)} title="Add New Service" width="460px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="fee-transparency-note" style={{ marginBottom: '0.25rem' }}>
                        <Shield size={13} /> You can only provide services approved by the platform.
                    </div>
                    <FormField label="Choose Service">
                        <select className="form-input" value={newServiceForm.masterServiceId} onChange={e => setNewServiceForm({ ...newServiceForm, masterServiceId: e.target.value })}>
                            <option value="">Select service...</option>
                            {masterServices.map(ms => (
                                <option key={ms.id} value={ms.id}>{ms.name} ({ms.category?.name})</option>
                            ))}
                        </select>
                    </FormField>
                    {newServiceForm.masterServiceId && (
                        <div className="fade-in" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {masterServices.find(ms => ms.id === parseInt(newServiceForm.masterServiceId))?.description}
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <FormField label="Price (USD)">
                            <input className="form-input" type="number" value={newServiceForm.price} onChange={e => setNewServiceForm({ ...newServiceForm, price: e.target.value })} placeholder="0.00" />
                        </FormField>
                        <FormField label="Duration (Min)">
                            <select className="form-input" value={newServiceForm.duration} onChange={e => setNewServiceForm({ ...newServiceForm, duration: e.target.value })}>
                                <option value="15">15 Min</option>
                                <option value="30">30 Min</option>
                                <option value="45">45 Min</option>
                                <option value="60">60 Min</option>
                            </select>
                        </FormField>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} disabled={serviceLoading || !newServiceForm.masterServiceId || !newServiceForm.price} onClick={async () => {
                            setServiceLoading(true);
                            const token = localStorage.getItem('token');
                            try {
                                const res = await fetch(`${API_URL}/api/astrologers/services`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify(newServiceForm)
                                });
                                if (res.ok) {
                                    const data = await res.json();
                                    setServices(prev => [...prev, data]);
                                    setServiceModal(false);
                                    setNewServiceForm({ masterServiceId: '', price: '', duration: '30', type: 'CHAT' });
                                }
                            } catch (err) { console.error("Add service failed", err); }
                            setServiceLoading(false);
                        }}>
                            {serviceLoading ? 'Adding...' : 'Add Service'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Change Password Modal ── */}
            <Modal isOpen={passwordModal} onClose={() => { setPasswordModal(false); setPasswordError(''); setPasswordSuccess(false); }} title="Change Password" width="440px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <FormField label="Current Password">
                        <input className="form-input" type="password" value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} />
                    </FormField>
                    <FormField label="New Password">
                        <input className="form-input" type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
                    </FormField>
                    <FormField label="Confirm New Password">
                        <input className="form-input" type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
                    </FormField>
                    
                    {passwordError && <span style={{ color: '#ff4a4a', fontSize: '0.85rem' }}>{passwordError}</span>}
                    {passwordSuccess && <span style={{ color: '#1cc88a', fontSize: '0.85rem' }}>✓ Password updated!</span>}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                            if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                                setPasswordError("Passwords do not match");
                                return;
                            }
                            setPasswordLoading(true);
                            setPasswordError('');
                            const token = localStorage.getItem('token');
                            try {
                                const res = await fetch(`${API_URL}/api/auth/change-password`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({ oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword })
                                });
                                const data = await res.json();
                                if (res.ok) {
                                    setPasswordSuccess(true);
                                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                    setTimeout(() => { setPasswordModal(false); setPasswordSuccess(false); }, 2000);
                                } else {
                                    setPasswordError(data.error || "Update failed");
                                }
                            } catch (err) { setPasswordError("Could not connect to server"); }
                            setPasswordLoading(false);
                        }} disabled={passwordLoading}>
                            {passwordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Reschedule Modal ── */}
            <Modal isOpen={rescheduleModal} onClose={() => setRescheduleModal(false)} title="Propose Reschedule" width="540px">
                {rescheduleSent
                    ? <div style={{ textAlign: 'center', padding: '2rem' }}><Check size={48} color="#1cc88a" style={{ marginBottom: '1rem' }} /><h3 style={{ color: '#1cc88a' }}>Request sent to client!</h3><p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Client will be notified. If declined, a full refund is issued automatically.</p></div>
                    : <>
                        <div className="notif-schedule-change" style={{ marginBottom: '1.5rem' }}>
                            <div className="schedule-from"><span className="schedule-label">Current</span><strong>{rescheduleTarget?.date} at {rescheduleTarget?.time}</strong></div>
                            <div className="schedule-arrow">→</div>
                            <div className="schedule-to"><span className="schedule-label">Proposing</span><strong style={{ color: 'var(--secondary-color)' }}>{rescheduleDate || '— pick date'} {rescheduleSlot ? `at ${to12(rescheduleSlot)}` : ''}</strong></div>
                        </div>
                        <FormField label="New Date">
                            <div className="date-grid">{DAYS_OF_WEEK.filter(d => weeklySchedule[d]?.available).slice(0, 5).map(d => (
                                <button key={d} className={`date-btn ${rescheduleDate === d ? 'selected' : ''}`} onClick={() => { setRescheduleDate(d); setRescheduleSlot(''); }}>{d}</button>
                            ))}</div>
                        </FormField>
                        {rescheduleDate && (
                            <FormField label="New Time Slot">
                                <div className="slot-grid">
                                    {computeSlots(weeklySchedule[rescheduleDate], schedConfig.buffer, services[0]).map(s => (
                                        <button key={s} className={`slot-btn ${rescheduleSlot === s ? 'selected' : ''}`} onClick={() => setRescheduleSlot(s)}>{to12(s)}</button>
                                    ))}
                                </div>
                            </FormField>
                        )}
                        <FormField label="Reason for Reschedule">
                            <textarea className="form-input form-textarea" rows={3} value={rescheduleNote} onChange={e => setRescheduleNote(e.target.value)} placeholder="Briefly explain why you need to reschedule..." />
                        </FormField>
                        <div className="fee-transparency-note" style={{ background: 'rgba(255,74,74,0.06)', borderColor: 'rgba(255,74,74,0.2)' }}>
                            <AlertTriangle size={13} color="#ff6b6b" /> If client declines, booking is cancelled and they receive a <strong>full refund automatically</strong>.
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" onClick={sendReschedule} disabled={!rescheduleDate || !rescheduleSlot}>Send Request</button>
                            <button className="btn btn-outline" onClick={() => setRescheduleModal(false)}>Cancel</button>
                        </div>
                    </>
                }
            </Modal>

            {/* ── Cancel Confirm ── */}
            <Modal isOpen={!!cancelConfirm} onClose={() => setCancelConfirm(null)} title="Cancel Appointment" width="440px">
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <AlertTriangle size={48} color="#ff6b6b" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ marginBottom: '0.75rem' }}>Cancel this appointment?</h3>
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>This will <strong style={{ color: '#ff6b6b' }}>automatically issue a full refund</strong> to the client. This cannot be undone.</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                        <button className="btn" style={{ background: 'rgba(255,74,74,0.15)', color: '#ff4a4a', border: '1px solid rgba(255,74,74,0.3)' }} onClick={() => confirmCancel(cancelConfirm)}>Yes, Cancel & Refund Client</button>
                        <button className="btn btn-outline" onClick={() => setCancelConfirm(null)}>Keep Appointment</button>
                    </div>
                </div>
            </Modal>

            {/* ── Problem Note Modal ── */}
            <Modal isOpen={!!problemNoteTarget} onClose={() => setProblemNoteTarget(null)} title="Client's Concern Note" width="480px">
                <div className="problem-note-box">
                    <div className="problem-note-info"><MessageSquare size={16} color="#D4AF37" /><span>Shared before booking. <strong>No personal identifying information is revealed.</strong></span></div>
                    <p style={{ fontStyle: 'italic', color: 'var(--text-main)', lineHeight: 1.7, padding: '1rem 0' }}>"{PROBLEM_NOTES[problemNoteTarget] || 'No message provided.'}"</p>
                </div>
            </Modal>

            {/* ── Withdrawal Modal ── */}
            <Modal isOpen={withdrawModal} onClose={() => { setWithdrawModal(false); setWithdrawSuccess(false); }} title="Request Payout" width="500px">
                {withdrawSuccess ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <CheckCircle size={52} color="#1cc88a" style={{ marginBottom: '1.5rem' }} />
                        <h3 style={{ color: '#1cc88a' }}>Awaiting Approval</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Your request <strong>{withdrawRef}</strong> has been submitted for platform audit.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => setWithdrawModal(false)}>Done</button>
                    </div>
                ) : (
                    <>
                        <div className="withdrawal-balance-box" style={{ marginBottom: '1.5rem', background: 'rgba(212,175,55,0.05)', padding: '1.5rem', borderRadius: '15px' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Withdrawable Balance</p>
                            <h2 style={{ color: 'var(--secondary-color)', fontSize: '2.5rem' }}>{currencySymbol}{finance.withdrawableBalance.toLocaleString()}</h2>
                        </div>

                        <FormField label={`Amount (${currencySymbol})`}>
                            <input className="form-input" type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="0.00" />
                        </FormField>

                        <div className="fade-in" style={{ marginTop: '1rem' }}>
                            <FormField label="UPI ID"><input className="form-input" placeholder="someone@bank" value={withdrawDetails.upiId} onChange={e => setWithdrawDetails({...withdrawDetails, upiId: e.target.value})} /></FormField>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" onClick={initiateWithdraw} disabled={withdrawProcessing || !withdrawAmount}>
                                {withdrawProcessing ? 'Processing...' : 'Request Withdrawal'}
                            </button>
                            <button className="btn btn-outline" onClick={() => setWithdrawModal(false)}>Cancel</button>
                        </div>
                    </>
                )}
            </Modal>

            {/* ══════ OVERVIEW ══════ */}
            {tab === 'overview' && (
                <div className="fade-in">

                    {/* ── Astrologer Hero Card ── */}
                    <div className="astro-hero-card glass-card" style={{ marginBottom: '2rem' }}>
                        <div className="astro-hero-left">
                            <div className="profile-avatar-xl" style={{ width: 64, height: 64, fontSize: '1.5rem', flexShrink: 0, overflow: 'hidden' }}>
                                {profile.image ? <img src={profile.image} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.name.charAt(0)}
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{profile.name} 🌟</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0.5rem' }}>
                                    {profile.expertise}
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <StatusBadge status="APPROVED" />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Earning <strong style={{ color: 'var(--secondary-color)' }}>{astrologerPct}%</strong> per session
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Sub-panels removed as they are now top-level tabs ── */}

                    {/* ── Stats Row ── */}
                    <div className="stat-grid">
                        <StatCard icon={<Calendar size={22} />} label="Appointments" value={bookings.length} sub={`${upcoming.length} upcoming`} accent="gold" />
                        <StatCard icon={<CreditCard size={22} />} label="Your Earnings" value={`${currencySymbol}${totalEarned}`} sub={`${astrologerPct}% share`} accent="green" />
                        <StatCard icon={<Star size={22} />} label="Avg Rating" value="4.9 / 5" sub="312 reviews" accent="purple" />
                        <StatCard icon={<Clock size={22} />} label="Active Days/Week" value={Object.values(weeklySchedule).filter(d => d.available).length} sub="Set in Schedule" accent="gold" />
                    </div>
                    <div className="upcoming-appointments-section" style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Video size={18} color="var(--secondary-color)" /> Upcoming Appointments
                            </h3>
                            <button className="btn-link" style={{ fontSize: '0.82rem' }} onClick={() => setTab('bookings')}>View All</button>
                        </div>
                        
                        {upcoming.length === 0 ? (
                            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Calendar size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p>No sessions scheduled for today.</p>
                            </div>
                        ) : (
                            <div className="appointment-shelf-container">
                                <div className="appointment-shelf-scroll">
                                    {upcoming.map(b => (
                                        <div key={b.id} className="appointment-shelf-card glass-card">
                                            <div className="shelf-card-header">
                                                <div className="client-id-pill">{b.clientRef}</div>
                                                <div className="time-remaining-tag">
                                                    <Clock size={12} /> Live in {Math.floor(Math.random() * 60) + 10}m
                                                </div>
                                            </div>
                                            
                                            <div className="shelf-card-body">
                                                <h4 className="shelf-service-name">{b.service}</h4>
                                                <div className="shelf-info-row">
                                                    <Calendar size={13} />
                                                    <span>{b.date} · {b.time}</span>
                                                </div>
                                                <div className="shelf-info-row earnings">
                                                    <CreditCard size={13} />
                                                    <span>You Receive: <strong>{currencySymbol}{b.astrologerReceives}</strong></span>
                                                </div>
                                            </div>

                                            <div className="shelf-card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                <button className="btn btn-primary btn-sm btn-block" onClick={() => startSession(b)} style={{ gap: '0.6rem', padding: '0.8rem' }}>
                                                    <Video size={16} /> Enter Room
                                                </button>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-outline btn-sm" style={{ flex: 1, fontSize: '0.75rem', padding: '0.6rem' }} onClick={() => openReschedule(b)}>
                                                        <Calendar size={14} /> Reschedule
                                                    </button>
                                                    <button className="btn btn-sm" style={{ flex: 1, fontSize: '0.75rem', background: 'rgba(255,74,74,0.1)', color: '#ff4a4a', border: '1px solid rgba(255,74,74,0.2)', padding: '0.6rem' }} onClick={() => setCancelConfirm(b.id)}>
                                                        <XCircle size={14} /> Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <style>{`
                            .appointment-shelf-container {
                                margin: 0 -1.5rem;
                                padding: 0 1.5rem 1rem;
                                overflow-x: auto;
                                scroll-snap-type: x mandatory;
                                scrollbar-width: none;
                            }
                            .appointment-shelf-container::-webkit-scrollbar { display: none; }
                            
                            .appointment-shelf-scroll {
                                display: flex;
                                gap: 1.25rem;
                                width: max-content;
                            }

                            .appointment-shelf-card {
                                width: 280px;
                                scroll-snap-align: start;
                                padding: 1.25rem !important;
                                display: flex;
                                flex-direction: column;
                                gap: 1rem;
                                border-color: rgba(212, 175, 55, 0.15) !important;
                                background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%) !important;
                            }

                            .shelf-card-header {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                            }

                            .client-id-pill {
                                background: rgba(255,255,255,0.08);
                                padding: 0.25rem 0.6rem;
                                border-radius: 6px;
                                font-size: 0.75rem;
                                font-weight: 700;
                                color: var(--text-main);
                                letter-spacing: 0.5px;
                            }

                            .time-remaining-tag {
                                display: flex;
                                align-items: center;
                                gap: 0.35rem;
                                font-size: 0.72rem;
                                font-weight: 600;
                                color: #ff6b6b;
                                background: rgba(255,107,107,0.1);
                                padding: 0.2rem 0.6rem;
                                border-radius: 20px;
                            }

                            .shelf-service-name {
                                margin: 0 0 0.5rem 0;
                                font-size: 1.05rem;
                                font-weight: 600;
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            }

                            .shelf-info-row {
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                                font-size: 0.82rem;
                                color: var(--text-muted);
                                margin-bottom: 0.35rem;
                            }

                            .shelf-info-row.earnings {
                                color: #1cc88a;
                                margin-top: 0.75rem;
                                padding-top: 0.75rem;
                                border-top: 1px solid rgba(255,255,255,0.05);
                            }

                            @media (max-width: 599px) {
                                .appointment-shelf-card {
                                    width: 85vw;
                                }
                                .appointment-shelf-container {
                                    margin: 0 -1rem;
                                    padding: 0 1rem 1rem;
                                }
                            }
                        `}</style>
                    </div>
                </div>
            )}


            {/* ══════ APPOINTMENTS ══════ */}
            {tab === 'bookings' && (
                <div className="fade-in">
                    <h2 className="dash-title">Appointments</h2>
                    <p className="dash-sub">Client personal details are hidden for privacy. You see anonymized references only.</p>
                    <div className="filter-row" style={{ marginBottom: '1.5rem' }}>
                        {['all', 'upcoming', 'completed', 'rescheduled', 'cancelled'].map(s => (
                            <button key={s} className={`filter-btn ${bookingFilter === s ? 'active' : ''}`} onClick={() => setBookingFilter(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                        ))}
                    </div>
                    {filteredBookings.map(b => (
                        <div key={b.id} className="glass-card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                                <div>
                                    <strong style={{ display: 'block' }}>{b.clientRef}</strong>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{b.service} · {b.date} at {b.time}</span>
                                    <div style={{ marginTop: '0.25rem' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#1cc88a' }}>You receive: {currencySymbol}{b.astrologerReceives}</span>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>Total: {currencySymbol}{b.amount}</span>
                                    </div>
                                </div>
                                <StatusBadge status={b.status} />
                            </div>
                            {/* Inline note snippet (mobile only) */}
                            {b.hasProblemNote && (
                                <div
                                    onClick={() => setProblemNoteTarget(b.id)}
                                    className="appt-note-snippet"
                                    style={{
                                        display: 'flex', alignItems: 'flex-start', gap: '0.45rem',
                                        background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)',
                                        borderRadius: '8px', padding: '0.5rem 0.7rem', cursor: 'pointer',
                                        marginBottom: '0.5rem'
                                    }}>
                                    <MessageSquare size={12} style={{ color: 'var(--secondary-color)', flexShrink: 0, marginTop: '0.15rem' }} />
                                    <span style={{ fontSize: '0.77rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                        {PROBLEM_NOTES[b.id] || 'Client has left a note.'}
                                    </span>
                                </div>
                            )}

                            {/* Action buttons — stacked on mobile, side-by-side on desktop */}
                            <style>{`
                                .appt-actions-mobile { display: flex; flex-direction: column; gap: 0.6rem; }
                                .appt-actions-desktop { display: none; }
                                .appt-note-snippet { display: flex !important; }
                                @media (min-width: 768px) {
                                    .appt-actions-mobile { display: none; }
                                    .appt-actions-desktop { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
                                    .appt-note-snippet { display: none !important; }
                                }
                            `}</style>

                            {/* MOBILE layout */}
                            <div className="appt-actions-mobile">
                                {b.status === 'upcoming' && (
                                    <>
                                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem' }} onClick={() => startSession(b)}>
                                            <Video size={14} /> Start Session
                                        </button>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openReschedule(b)}>Reschedule</button>
                                            <button className="btn btn-sm" style={{ flex: 1, background: 'rgba(255,74,74,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,74,74,0.2)' }} onClick={() => setCancelConfirm(b.id)}>Cancel</button>
                                        </div>
                                    </>
                                )}
                                {b.status === 'cancelled' && cancelledIds.has(b.id) && <span style={{ fontSize: '0.82rem', color: '#ff6b6b' }}>✗ Cancelled — full refund issued to client.</span>}
                                {b.status === 'rescheduled' && <span style={{ fontSize: '0.82rem', color: '#D4AF37' }}>⟳ Awaiting client's response.</span>}
                            </div>

                            {/* DESKTOP layout — all buttons side by side */}
                            <div className="appt-actions-desktop">
                                {b.status === 'upcoming' && (
                                    <>
                                        <button className="btn btn-primary btn-sm" style={{ gap: '0.4rem' }} onClick={() => startSession(b)}>
                                            <Video size={13} /> Start Session
                                        </button>
                                        <button className="btn btn-outline btn-sm" onClick={() => openReschedule(b)}>Reschedule</button>
                                        <button className="btn btn-sm" style={{ background: 'rgba(255,74,74,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,74,74,0.2)' }} onClick={() => setCancelConfirm(b.id)}>Cancel</button>
                                    </>
                                )}
                                {b.hasProblemNote && (
                                    <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto', gap: '0.35rem', opacity: 0.85 }} onClick={() => setProblemNoteTarget(b.id)}>
                                        <MessageSquare size={12} /> Client Note
                                    </button>
                                )}
                                {b.status === 'cancelled' && cancelledIds.has(b.id) && <span style={{ fontSize: '0.82rem', color: '#ff6b6b' }}>✗ Cancelled — full refund issued.</span>}
                                {b.status === 'rescheduled' && <span style={{ fontSize: '0.82rem', color: '#D4AF37' }}>⟳ Awaiting client's response.</span>}
                            </div>


                        </div>
                    ))}
                </div>
            )}

            {/* ══════ SERVICES ══════ */}
            {tab === 'services' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div><h2 className="dash-title" style={{ margin: 0 }}>Services & Pricing</h2><p className="dash-sub" style={{ margin: '0.25rem 0 0' }}>You keep {astrologerPct}% of each booking.</p></div>
                        <button className="btn btn-primary btn-sm" onClick={openAddService}><Plus size={15} /> Add Service</button>
                    </div>

                    {/* Per-service schedule settings */}
                    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.25rem' }}>Service Schedule Allocation</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>Set the duration and weekly cap for each service. These feed directly into your Schedule Manager.</p>
                        <table className="data-table">
                            <thead><tr><th>Service</th><th>Session Duration</th><th>Max Sessions/Week</th><th>You Receive ({astrologerPct}%)</th><th>Status</th></tr></thead>
                            <tbody>
                                {services.map(s => (
                                    <tr key={s.id}>
                                        <td data-label="Service"><strong>{s.name}</strong></td>
                                        <td data-label="Session Duration">
                                            <select className="form-input" style={{ padding: '0.4rem 0.6rem', width: 'auto' }}
                                                value={serviceSchedule[s.id]?.duration || s.duration}
                                                onChange={e => setServiceSchedule(prev => ({ ...prev, [s.id]: { ...prev[s.id], duration: e.target.value } }))}>
                                                {['20 min', '30 min', '45 min', '60 min', '75 min', '90 min', '120 min'].map(d => <option key={d}>{d}</option>)}
                                            </select>
                                        </td>
                                        <td data-label="Max Sessions/Week">
                                            <input type="number" className="form-input" style={{ padding: '0.4rem 0.6rem', width: '70px' }} min="1" max="50"
                                                value={serviceSchedule[s.id]?.maxPerWeek || '10'}
                                                onChange={e => setServiceSchedule(prev => ({ ...prev, [s.id]: { ...prev[s.id], maxPerWeek: e.target.value } }))} />
                                        </td>
                                        <td data-label={`You Receive (${astrologerPct}%)`} style={{ color: '#1cc88a', fontWeight: 600 }}>{currencySymbol}{(s.price * PLATFORM_CONFIG.astrologerShare).toFixed(2)}</td>
                                        <td data-label="Status">
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <button className={`toggle-btn ${s.active ? 'on' : 'off'}`} onClick={() => toggleService(s.id)}>{s.active ? 'Active' : 'Off'}</button>
                                                <button className="icon-btn" onClick={() => openEditService(s)}><Edit size={14} /></button>
                                                <button className="icon-btn danger" onClick={() => deleteService(s.id)}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════ SCHEDULE MANAGER ══════ */}
            {tab === 'schedule' && (
                <>
                    <div className="fade-in schedule-manager-dense">
                        <style>{`
                            .schedule-layout-grid {
                                display: grid;
                                grid-template-columns: 1fr;
                                gap: 1.5rem;
                                align-items: start;
                                min-width: 0;
                            }
                            @media (min-width: 992px) {
                                .schedule-layout-grid {
                                    grid-template-columns: minmax(0, 1fr) 340px;
                                }
                            }
                        `}</style>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 className="dash-title" style={{ margin: 0 }}>Schedule Manager</h2>
                            </div>
                            <div className="desktop-save-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {scheduleSaved && <span style={{ color: '#1cc88a', fontSize: '0.85rem', fontWeight: 600 }}>✓ Saved!</span>}
                                <button className="btn btn-primary btn-sm" onClick={saveSchedule}>Save Changes</button>
                            </div>
                        </div>

                        <div className="schedule-layout-grid">
                            {/* Weekly Availability Setup */}
                            <div className="glass-card sm-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1.2rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Clock size={18} color="var(--secondary-color)" /> Weekly Availability
                                </h3>
                                <style>{`
                                    /* ── Base (mobile) card layout ── */
                                    .avail-card {
                                        background: rgba(255,255,255,0.025);
                                        border: 1px solid rgba(255,255,255,0.07);
                                        border-radius: 16px;
                                        padding: 1.25rem;
                                        transition: border-color 0.2s, background 0.2s;
                                        display: flex;
                                        flex-direction: column;
                                        gap: 1.25rem;
                                        width: 100%; box-sizing: border-box;
                                    }
                                    .avail-card.active {
                                        border-color: rgba(212,175,55,0.18);
                                        background: rgba(212,175,55,0.03);
                                    }
                                    .avail-card-header {
                                        display: flex;
                                        align-items: center;
                                        justify-content: space-between;
                                    }
                                    .avail-day-name {
                                        font-size: 1.05rem; font-weight: 700;
                                        text-transform: uppercase; letter-spacing: 1px;
                                        color: var(--text-main);
                                    }
                                    .avail-day-name.off { color: var(--text-muted); font-weight: 400; opacity: 0.6; }
                                    .avail-card-body { display: flex; flex-direction: column; gap: 0.85rem; }
                                    
                                    .avail-time-row { 
                                        display: grid; 
                                        grid-template-columns: 1fr auto 1fr; 
                                        gap: 0.5rem; 
                                        align-items: center;
                                    }
                                    .avail-time-row.break-row {
                                        display: flex;
                                    }
                                    
                                    .time-pill {
                                        display: flex; flex-direction: column; align-items: flex-start; gap: 0.4rem;
                                        width: 100%; box-sizing: border-box;
                                        /* Stripped the global thick background, giving styling strictly to inputs now */
                                    }
                                    
                                    .break-box-container {
                                        background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.06);
                                        border-radius: 12px; padding: 1rem; width: 100%; box-sizing: border-box; margin-top: 0.25rem;
                                    }
                                    
                                    .break-box-header {
                                        display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;
                                    }
                                    
                                    .break-box-header label {
                                        font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--secondary-color); letter-spacing: 0.5px; margin: 0;
                                    }
                                    
                                    .remove-break-btn {
                                        background: rgba(255,74,74,0.1); color: #ff6b6b; border: 1px solid rgba(255,74,74,0.2);
                                        border-radius: 6px; padding: 0.25rem 0.5rem; font-size: 0.6rem; font-weight: 700;
                                        text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center;
                                    }
                                    .remove-break-txt { margin-top: 0; }
                                    
                                    .time-pill label {
                                        font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
                                        color: var(--text-muted); letter-spacing: 0.5px;
                                        margin: 0; display: block; width: 100%;
                                    }
                                    
                                    .select-wrapper {
                                        position: relative;
                                        width: 100%;
                                    }
                                    
                                    .select-wrapper::after {
                                        content: '▼';
                                        position: absolute;
                                        right: 0.85rem;
                                        top: 50%;
                                        transform: translateY(-50%);
                                        font-size: 0.6rem;
                                        color: var(--secondary-color);
                                        pointer-events: none;
                                    }
                                    
                                    .time-pill select { 
                                        width: 100%;
                                        font-size: 1.05rem !important; 
                                        font-weight: 600;
                                        padding: 0.8rem 2rem 0.8rem 1rem !important;
                                        color: #ffffff !important;
                                        background: rgba(212,175,55,0.08) !important;
                                        border: 1px solid rgba(212,175,55,0.3) !important;
                                        border-radius: 10px !important;
                                        -webkit-appearance: none;
                                        appearance: none;
                                        margin: 0 !important;
                                        cursor: pointer;
                                    }
                                    
                                    .time-pill select option {
                                        background: #151020;
                                        color: #ffffff;
                                    }
                                    
                                    .time-pill select:focus { outline: none; border-color: rgba(212,175,55,0.8) !important; background: rgba(212,175,55,0.12) !important; }
                                    
                                    .avail-slot-badge {
                                        display: inline-flex; align-items: center; justify-content: center;
                                        background: rgba(212,175,55,0.1); color: var(--secondary-color);
                                        font-size: 0.8rem; font-weight: 700;
                                        padding: 0.65rem 1rem; border-radius: 8px;
                                        border: 1px solid rgba(212,175,55,0.2); 
                                        width: 100%; box-sizing: border-box; margin-top: 0.5rem;
                                    }

                                    /* ── Desktop: compact table-row layout ── */
                                    @media (min-width: 992px) {
                                        .avail-list-wrap { padding-bottom: 0 !important; gap: 0.5rem !important; }
                                        .avail-card {
                                            display: flex;
                                            flex-direction: row;
                                            align-items: center;
                                            padding: 0.8rem 1.25rem;
                                            gap: 1rem;
                                            border-radius: 10px;
                                            width: auto;
                                            flex-wrap: nowrap;
                                        }
                                        .avail-card-header {
                                            flex: 0 0 130px;
                                            margin-bottom: 0 !important;
                                            justify-content: space-between;
                                        }
                                        .avail-day-name { font-size: 0.88rem; }
                                        .avail-card-body {
                                            flex: 1;
                                            display: flex;
                                            flex-direction: row;
                                            align-items: center;
                                            gap: 0.75rem;
                                            min-width: 0;
                                            flex-wrap: wrap; /* allow wrapping to save from blowout */
                                        }
                                        .avail-time-row { 
                                            display: flex; 
                                            flex-wrap: wrap; 
                                            gap: 0.5rem; 
                                            align-items: center;
                                        }
                                        .avail-time-row.break-row { display: flex; align-items: center; width: auto; flex-wrap: wrap; }
                                        .time-pill {
                                            width: auto;
                                            flex-direction: row;
                                            align-items: center;
                                            gap: 0.5rem;
                                            padding: 0;
                                            background: transparent;
                                            border: none;
                                        }
                                        .break-box-container {
                                            display: flex; flex-direction: row; align-items: center; gap: 0.5rem;
                                            background: transparent; border: none; padding: 0; margin-top: 0; width: auto; border-radius: 0;
                                        }
                                        .break-box-header { margin-bottom: 0; display: contents; }
                                        .break-box-header label { font-size: 0.68rem; color: var(--text-muted); padding-right: 0.25rem; font-weight: 700; order: -2; }
                                        .remove-break-btn { 
                                            width: 24px; height: 24px; border-radius: 50%; padding: 0; font-size: 0.75rem; order: 5; margin-left: auto;
                                        }
                                        .remove-break-txt { display: none; }
                                        .time-pill label {
                                            width: auto; margin: 0; display: inline-block; font-size: 0.68rem;
                                        }
                                        .select-wrapper { width: auto; }
                                        .time-pill select {
                                            width: auto;
                                            padding: 0.35rem 1.6rem 0.35rem 0.6rem !important;
                                            font-size: 0.85rem !important;
                                        }
                                        .select-wrapper::after { right: 0.5rem; }
                                        .avail-slot-badge { margin-top: 0; white-space: nowrap; margin-left: auto; width: auto; padding: 0.3rem 0.65rem; font-size: 0.7rem; display: inline-flex; }
                                    }
                                `}</style>
                                <div className="avail-list-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '6rem' }}>
                                    {DAYS_OF_WEEK.map(day => {
                                        const dc = weeklySchedule[day];
                                        const slotCount = dc.available ? computeSlots(dc, schedConfig.buffer, services.find(s => s.active)).length : 0;
                                        return (
                                            <div key={day} className={`avail-card ${dc.available ? 'active' : ''}`}>
                                                {/* ── Header: Day name left, Toggle right ── */}
                                                <div className={`avail-card-header ${dc.available ? 'has-body' : ''}`}>
                                                    <span className={`avail-day-name ${!dc.available ? 'off' : ''}`}>{day}</span>
                                                    <div className={`ios-toggle ${dc.available ? 'active' : ''}`}
                                                        onClick={() => updateDay(day, 'available', !dc.available)}
                                                        style={{ transform: 'scale(0.82)', flexShrink: 0 }}>
                                                        <div className="ios-toggle-knob"></div>
                                                    </div>
                                                </div>

                                                {/* ── Body: Time controls (only when active) ── */}
                                                {dc.available && (
                                                    <div className="avail-card-body">
                                                        {/* Time range row */}
                                                        <div className="avail-time-row">
                                                            <div className="time-pill">
                                                                <label>From</label>
                                                                <div className="select-wrapper">
                                                                    <select value={dc.start} onChange={e => updateDay(day, 'start', e.target.value)}>
                                                                        {ALL_TIMES.filter(t => t < dc.end).map(t => <option key={t} value={t}>{to12(t)}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'flex', justifyContent: 'center' }}>—</span>
                                                            <div className="time-pill">
                                                                <label>To</label>
                                                                <div className="select-wrapper">
                                                                    <select value={dc.end} onChange={e => updateDay(day, 'end', e.target.value)}>
                                                                        {ALL_TIMES.filter(t => t > dc.start).map(t => <option key={t} value={t}>{to12(t)}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Break row */}
                                                        {dc.breakStart ? (
                                                            <div className="break-box-container">
                                                                <div className="break-box-header">
                                                                    <label>Break Period</label>
                                                                    <button className="remove-break-btn" onClick={() => updateDay(day, 'breakStart', '')} title="Remove Break">
                                                                        ✕ <span className="remove-break-txt" style={{ marginLeft: '0.2rem' }}>Remove</span>
                                                                    </button>
                                                                </div>
                                                                <div className="avail-time-row">
                                                                    <div className="time-pill">
                                                                        <div className="select-wrapper">
                                                                            <select value={dc.breakStart} onChange={e => updateDay(day, 'breakStart', e.target.value)}>
                                                                                <option value="">Off</option>
                                                                                {ALL_TIMES.filter(t => t >= dc.start && t < dc.end).map(t => <option key={t} value={t}>{to12(t)}</option>)}
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'flex', justifyContent: 'center' }}>—</span>
                                                                    <div className="time-pill">
                                                                        <div className="select-wrapper">
                                                                            <select value={dc.breakEnd || ''} onChange={e => updateDay(day, 'breakEnd', e.target.value)}>
                                                                                {ALL_TIMES.filter(t => t > dc.breakStart && t <= dc.end).map(t => <option key={t} value={t}>{to12(t)}</option>)}
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="avail-time-row">
                                                                <button
                                                                    className="time-pill break-pill-add"
                                                                    style={{ width: '100%', cursor: 'pointer', background: 'none', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', padding: '0.85rem', borderRadius: '12px', marginTop: '0.5rem' }}
                                                                    onClick={() => updateDay(day, 'breakStart', '13:00')}>
                                                                    + Add Break Period
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Slot badge */}
                                                        <span className="avail-slot-badge">⏱ {slotCount} slots available</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sidebar: Global Config + Preview (Desktop Only) */}
                            <div className="schedule-sidebar-desktop" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <GlobalSettingsPanel schedConfig={schedConfig} setSchedConfig={setSchedConfig} />
                                <PreviewPanel previewDay={previewDay} setPreviewDay={setPreviewDay} previewSlots={previewSlots} weeklySchedule={weeklySchedule} activeService={services.find(s => s.active)} buffer={schedConfig.buffer} to12={to12} />
                            </div>
                        </div>
                    </div>

                    {/* Fixed Mobile Save Bar (Moved Outside of Transform Container) */}
                    <div className="mobile-save-bar">
                        <button className="btn btn-primary" onClick={saveSchedule}>
                            {scheduleSaved ? '✓ Saved Successfully' : 'Save Changes'}
                        </button>
                    </div>

                    {/* Floating Buttons (Fixed to Viewport - Mobile Only) */}
                    <div className="mobile-fab-group">
                        <button className="fab-btn" onClick={() => setIsMobilePrefsOpen(true)}><Settings size={22} /></button>
                        <button className="fab-btn preview-fab" onClick={() => setIsMobilePreviewOpen(true)}><Smartphone size={22} /></button>
                    </div>

                    {/* Mobile Modals */}
                    <Modal isOpen={isMobilePrefsOpen} onClose={() => setIsMobilePrefsOpen(false)} title="Global Preferences" width="450px">
                        <div style={{ padding: '0.5rem' }}><GlobalSettingsPanel schedConfig={schedConfig} setSchedConfig={setSchedConfig} /><button className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} onClick={() => setIsMobilePrefsOpen(false)}>Apply & Close</button></div>
                    </Modal>
                    <Modal isOpen={isMobilePreviewOpen} onClose={() => setIsMobilePreviewOpen(false)} title="Availability Preview" width="450px">
                        <div style={{ padding: '0.5rem' }}><PreviewPanel previewDay={previewDay} setPreviewDay={setPreviewDay} previewSlots={previewSlots} weeklySchedule={weeklySchedule} activeService={services.find(s => s.active)} buffer={schedConfig.buffer} to12={to12} /><button className="btn btn-outline btn-block" style={{ marginTop: '1.5rem' }} onClick={() => setIsMobilePreviewOpen(false)}>Close</button></div>
                    </Modal>

                    <style>{`
                        @media (max-width: 991px) {
                            .desktop-save-group { display: none !important; }
                            .mobile-save-bar {
                                display: flex; align-items: center; justify-content: center;
                                padding: 0.85rem 1rem; background: #000000;
                                border-top: 1px solid rgba(255,255,255,0.12);
                                border-radius: 0;
                                position: fixed; bottom: 60px; left: 0; width: 100%; box-sizing: border-box;
                                z-index: 9998; animation: slideUp 0.3s ease-out; box-shadow: 0 -10px 40px rgba(0,0,0,0.9);
                            }
                            .mobile-save-bar button { width: 100%; font-size: 1.05rem; padding: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 10px !important; }
                            @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

                            .schedule-sidebar-desktop { display: none !important; }
                            .mobile-fab-group { position: fixed; bottom: 155px; right: 1.25rem; display: flex; flex-direction: column; gap: 1rem; z-index: 9999; pointer-events: auto; transition: all 0.2s; }
                            .fab-btn { width: 52px; height: 52px; border-radius: 50%; background: rgba(10, 7, 22, 0.97); backdrop-filter: blur(12px); border: 1.5px solid var(--secondary-color); color: var(--secondary-color); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px rgba(0,0,0,0.9); cursor: pointer; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                            .preview-fab { background: var(--secondary-color); color: #1A1102; }
                            .fab-btn:active { transform: scale(0.88) translateY(3px); }
                        }
                        @media (min-width: 992px) { .mobile-fab-group, .mobile-save-bar { display: none !important; } }
                    `}</style>
                </>
            )}
            {/* ══════ MY EARNINGS ══════ */}
            {tab === 'earnings' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h2 className="dash-title" style={{ margin: 0 }}>My Earnings</h2>
                            <p className="dash-sub">Track your income and request withdrawals.</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => {
                            // Transaction simulation
                            alert("Opening detailed transaction history...");
                        }}><ExternalLink size={16} /> View Transactions</button>
                    </div>

                    <div className="earnings-balance-grid" style={{ marginBottom: '2rem' }}>
                        <div className="balance-card withdrawable">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <CheckCircle size={16} color="#1cc88a" />
                                <span style={{ fontSize: '0.82rem', color: '#1cc88a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Withdrawable</span>
                            </div>
                            <div className="balance-amount">{currencySymbol}{finance.withdrawableBalance.toFixed(2)}</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Cleared funds for completed sessions</p>
                            <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => setWithdrawModal(true)}><ArrowDownCircle size={14} /> Withdraw Funds</button>
                        </div>
                        <div className="balance-card pending">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Lock size={16} color="#D4AF37" />
                                <span style={{ fontSize: '0.82rem', color: '#D4AF37', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending / Locked</span>
                            </div>
                            <div className="balance-amount" style={{ color: 'var(--text-muted)' }}>{currencySymbol}{finance.pendingBalance.toFixed(2)}</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Locked until session completion</p>
                        </div>
                        <div className="balance-card total">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <DollarSign size={16} color="#9b59b6" />
                                <span style={{ fontSize: '0.82rem', color: '#9b59b6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>All-Time Earnings</span>
                            </div>
                            <div className="balance-amount" style={{ color: '#9b59b6' }}>{currencySymbol}{(finance.withdrawnTotal + finance.withdrawableBalance + finance.pendingBalance).toFixed(2)}</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total lifetime earnings</p>
                        </div>
                    </div>

                    <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                        <div style={{ textAlign: 'center' }}><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>This Month</p><h2 style={{ margin: '0.3rem 0' }}>{currencySymbol}1,240</h2><span style={{ color: '#1cc88a', fontSize: '0.75rem' }}>↑ 12% vs last mo</span></div>
                        <div style={{ textAlign: 'center' }}><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Sessions</p><h2 style={{ margin: '0.3rem 0' }}>42</h2><span style={{ color: '#1cc88a', fontSize: '0.75rem' }}>38 completed</span></div>
                        <div style={{ textAlign: 'center' }}><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Avg Ticket</p><h2 style={{ margin: '0.3rem 0' }}>{currencySymbol}32.50</h2><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>per session</span></div>
                    </div>

                    {/* Session Breakdown in Table */}
                    <div className="glass-card">
                        <h3 style={{ marginBottom: '1.25rem' }}>Detailed Session Revenue</h3>
                        <table className="data-table">
                            <thead><tr><th>Client Ref</th><th>Session Type</th><th>Gross</th><th>Net ({astrologerPct}%)</th><th>Status</th></tr></thead>
                            <tbody>
                                {bookings.slice(0, 10).map(b => (
                                    <tr key={b.id}>
                                        <td><strong>{b.clientRef}</strong></td>
                                        <td>{b.service}</td>
                                        <td>{currencySymbol}{b.amount}</td>
                                        <td style={{ color: '#1cc88a', fontWeight: 600 }}>{currencySymbol}{(b.amount * PLATFORM_CONFIG.astrologerShare).toFixed(2)}</td>
                                        <td><StatusBadge status={b.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════ SETTINGS (Combined) ══════ */}
            {tab === 'settings' && (
                <div className="fade-in">
                    <h2 className="dash-title">Account Settings</h2>
                    <p className="dash-sub">Manage your profile, preferences, and payment gateways.</p>

                    <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                        <style>{`
                            @media (min-width: 992px) {
                                .settings-grid { gridTemplateColumns: 2fr 1fr; }
                            }
                        `}</style>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Profile Section */}
                            <div className="glass-card">
                                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <User size={20} color="var(--secondary-color)" /> Profile Information
                                </h3>
                                
                                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div className="profile-avatar-xl" style={{ width: 80, height: 80, fontSize: '2rem', overflow: 'hidden', position: 'relative' }}>
                                        {profile.image ? <img src={profile.image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile.name.charAt(0)}
                                        {imageLoading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>...</div>}
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0' }}>Profile Photo</h4>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Update your photo to build trust with clients.</p>
                                        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Edit size={14} /> {profile.image ? 'Change Photo' : 'Upload Photo'}
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </div>

                                <div className="form-grid">
                                    <FormField label="Professional Name"><input className="form-input" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></FormField>
                                    <FormField label="Core Expertise"><input className="form-input" value={profile.expertise} onChange={e => setProfile({ ...profile, expertise: e.target.value })} /></FormField>
                                    <FormField label={`Consultation Rate (${currencySymbol})`}><input className="form-input" type="number" value={profile.rate} onChange={e => setProfile({ ...profile, rate: e.target.value })} /></FormField>
                                    <FormField label="Spoken Languages"><input className="form-input" value={profile.languages} onChange={e => setProfile({ ...profile, languages: e.target.value })} /></FormField>
                                </div>
                                <FormField label="Public Bio (Visible to Clients)"><textarea className="form-input form-textarea" rows={5} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell your story..." /></FormField>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                                    <button className="btn btn-primary" onClick={async () => {
                                        const token = localStorage.getItem('token');
                                        try {
                                            const res = await fetch(`${API_URL}/api/astrologers/profile/update`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                                body: JSON.stringify(profile)
                                            });
                                            if (res.ok) {
                                                setProfileSaved(true);
                                                setTimeout(() => setProfileSaved(false), 2500);
                                            }
                                        } catch (err) { console.error("Update profile failed", err); }
                                    }}>Apply Changes</button>
                                    {profileSaved && <span style={{ color: '#1cc88a', fontWeight: 600 }}>✓ Profile Updated!</span>}
                                </div>
                            </div>

                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <GlobalSettingsPanel schedConfig={schedConfig} setSchedConfig={setSchedConfig} />
                            
                            <div className="glass-card">
                                <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Payout Method</h3>
                                <FormField label="Primary UPI ID">
                                    <input className="form-input" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@ybl" />
                                </FormField>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Withdrawals are processed via UPI for instant settlement.</p>
                                <button className="btn btn-primary btn-sm btn-block" style={{ marginTop: '1rem' }} onClick={() => { alert('Payout method saved!'); }}>Update Payout ID</button>
                            </div>

                            <div className="glass-card" style={{ background: 'rgba(255,74,74,0.02)', borderColor: 'rgba(255,74,74,0.1)' }}>
                                <h4 style={{ color: '#ff6b6b', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={14} /> Security</h4>
                                <button className="btn btn-outline btn-sm btn-block" style={{ borderColor: 'rgba(255,74,74,0.2)', color: '#ff6b6b' }} onClick={() => setPasswordModal(true)}>Change Password</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </DashboardLayout>
    );
};

export default AstrologerDashboard;

