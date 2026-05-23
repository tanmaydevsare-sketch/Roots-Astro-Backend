import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, CreditCard, Video, Star, Search, ExternalLink, Bell, CheckCircle, XCircle, FileText, Zap, Shield, Plus, Smartphone, Globe, MessageCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { Modal, StatCard, StatusBadge, EmptyState, AstrologerCard, BookingModal, DashboardLayout, SidebarBtn, FormField } from '../components/Shared';
import { ASTROLOGERS, INITIAL_CLIENT_BOOKINGS, WALLET_TRANSACTIONS, INITIAL_NOTIFICATIONS, PLATFORM_CONFIG, PLATFORM_SERVICES, TESTIMONIALS, INITIAL_HOROSCOPES } from '../data/mockData';
import { LayoutGrid, List, Table as TableIcon } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../api/config';
import RealTimeChat from '../components/RealTimeChat';

const CosmicLoader = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
        <style>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
                0%, 100% { opacity: 0.6; transform: scale(0.98); }
                50% { opacity: 1; transform: scale(1.02); }
            }
        `}</style>
        <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '2px solid rgba(212, 175, 55, 0.1)',
            borderTop: '2px solid #D4AF37',
            borderRight: '2px solid #D4AF37',
            animation: 'spin 1.5s linear infinite',
            position: 'relative',
            marginBottom: '1.5rem',
            boxShadow: '0 0 15px rgba(212, 175, 55, 0.2)'
        }}>
            <div style={{
                position: 'absolute',
                top: '6px',
                left: '6px',
                right: '6px',
                bottom: '6px',
                borderRadius: '50%',
                border: '2px solid rgba(138, 43, 226, 0.1)',
                borderBottom: '2px solid #8A2BE2',
                borderLeft: '2px solid #8A2BE2',
                animation: 'spin 1s linear infinite reverse'
            }} />
        </div>
        <p style={{
            fontSize: '1rem',
            color: 'var(--text-muted)',
            fontFamily: "'Outfit', sans-serif",
            animation: 'pulse 2s ease-in-out infinite',
            letterSpacing: '0.05em',
            margin: 0
        }}>Aligning with the cosmos...</p>
    </div>
);

const ClientDashboard = ({ user, onUserUpdate }) => {
    const { currencySymbol } = useSettings();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') || 'overview';
    const setTab = (t) => setSearchParams({ tab: t });

    const [bookings, setBookings] = useState([]);
    const [astrologers, setAstrologers] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);
    const [astrosLoading, setAstrosLoading] = useState(true);
    const [walletBalance, setWalletBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [walletLoading, setWalletLoading] = useState(true);
    const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
    const [bookingTarget, setBookingTarget] = useState(null);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [activeChat, setActiveChat] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [addFunds, setAddFunds] = useState('');
     const [profile, setProfile] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '', phone: user?.phone || '', dob: user?.dob || '', gender: user?.gender || '', city: user?.city || '', country: user?.country || '', image: user?.image || '', isPasswordSet: user?.isPasswordSet || false });
    const [profileSaved, setProfileSaved] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [serviceFilter, setServiceFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedAstro, setSelectedAstro] = useState(null);
    const [zodiacSign, setZodiacSign] = useState('Leo');
    const [platformSettings, setPlatformSettings] = useState({ allowUpi: true, allowCard: true, allowNetBanking: true });
    
    /* ── Client Photo Cropper State ── */
    const [cropModal, setCropModal] = useState(false);
    const [rawImageSrc, setRawImageSrc] = useState('');
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleDragStart = (e) => {
        setIsDragging(true);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX - posX, y: clientY - posY });
    };

    const handleDragMove = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setPosX(Math.max(-200, Math.min(200, clientX - dragStart.x)));
        setPosY(Math.max(-200, Math.min(200, clientY - dragStart.y)));
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const [passwordModal, setPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
    const [newPayment, setNewPayment] = useState({ type: 'CARD', detail: '', expiry: '' });

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch(`${API_URL}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => setProfile({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phone: data.phone || '',
                dob: data.dob || '',
                gender: data.gender || '',
                city: data.city || '',
                country: data.country || '',
                image: data.image || '',
                isPasswordSet: data.isPasswordSet || false
            }))
            .catch(err => console.error("Profile fetch fail", err));

        fetch(`${API_URL}/api/settings/public/global`)
            .then(res => res.json())
            .then(data => setPlatformSettings(data))
            .catch(err => console.error("Settings fetch failed", err));

        fetchWalletStats();
        fetchBookings();
        fetchAstrologers();

        // Load Razorpay Script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
    }, []);

    const fetchWalletStats = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/finance/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWalletBalance(Number(data.balance) || 0);
                // Map backend transactions to frontend view
                setTransactions((data.transactions || []).map(t => ({
                    id: t.id,
                    desc: t.description || 'Transaction',
                    amount: `${t.type === 'CREDIT' ? '+' : '-'}${currencySymbol}${Math.abs(t.amount).toFixed(2)}`,
                    date: new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    type: (t.type || 'DEBIT').toLowerCase()
                })));
            }
        } catch (err) { console.error("Wallet fetch failed", err); }
        finally { setWalletLoading(false); }
    };

    const fetchBookings = async () => {
        const token = localStorage.getItem('token');
        try {
            setBookingsLoading(true);
            const res = await fetch(`${API_URL}/api/bookings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const commissionRate = PLATFORM_CONFIG.commissionRate || 0.20;
                setBookings((data || []).map(b => {
                    const scheduledDate = new Date(b.scheduledAt);
                    const dateFormatted = scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const timeFormatted = scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                    const astroName = b.astrologer ? `${b.astrologer.firstName} ${b.astrologer.lastName}` : "Expert Astrologer";
                    const amount = Number(b.amount) || 0;
                    return {
                        id: b.id,
                        astrologer: astroName,
                        astrologerId: b.astrologerId,
                        status: (b.status || 'upcoming').toLowerCase(),
                        service: b.service?.title || "Natal Chart Analysis",
                        date: dateFormatted,
                        time: timeFormatted,
                        amount: amount,
                        platformFee: +(amount * commissionRate).toFixed(2),
                        astrologerReceives: +(amount * (1 - commissionRate)).toFixed(2),
                        zoomLink: b.zoomMeetingUrl,
                        raw: b
                    };
                }));
            }
        } catch (err) {
            console.error("Failed to fetch bookings", err);
        } finally {
            setBookingsLoading(false);
        }
    };

    const fetchAstrologers = async () => {
        try {
            setAstrosLoading(true);
            const res = await fetch(`${API_URL}/api/astrologers`);
            if (res.ok) {
                const data = await res.json();
                setAstrologers((data || []).map(u => {
                    const prof = u.astrologerProfile || {};
                    const rating = Number(prof.rating) || 5.0;
                    const reviewsCount = prof.reviews?.length || 0;
                    const name = `${u.firstName} ${u.lastName}`;
                    const expertiseArray = prof.expertise ? prof.expertise.split(',').map(e => e.trim()).filter(Boolean) : ["Vedic Astrology"];
                    const languages = prof.languages || "English";
                    const bio = prof.bio || "Verified professional astrologer guidance.";
                    const rate = parseFloat(prof.rate || "50");
                    const sessionsCount = 120 + (prof.bookings?.length || 0);
                    return {
                        id: u.id,
                        name: name,
                        rating: rating,
                        reviews: reviewsCount,
                        languages: languages,
                        expertise: expertiseArray,
                        bio: bio,
                        rate: rate,
                        sessions: sessionsCount,
                        available: prof.isOnline ?? true,
                        astrologerProfile: prof
                    };
                }));
            }
        } catch (err) {
            console.error("Failed to fetch astrologers", err);
        } finally {
            setAstrosLoading(false);
        }
    };

    const handleAddFunds = async () => {
        if (!addFunds || isNaN(addFunds)) return;
        if (!window.Razorpay) {
            alert("Payment system is still loading. Please wait a few seconds and try again.");
            return;
        }
        const token = localStorage.getItem('token');
        
        try {
            // 1. Create Order on Backend
            const orderRes = await fetch(`${API_URL}/api/finance/razorpay/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount: parseFloat(addFunds) })
            });
            
            if (!orderRes.ok) throw new Error("Order creation failed");
            const order = await orderRes.json();

            // 2. Open Razorpay Checkout
            const options = {
                key: platformSettings.razorpayKeyId || "rzp_test_U8N0Y3vP9m1Q2X",
                amount: order.amount,
                currency: order.currency,
                name: "Roots Astro",
                description: "Wallet Top-up",
                order_id: order.id,
                handler: async function (response) {
                    // 3. Verify Payment
                    const verifyRes = await fetch(`${API_URL}/api/finance/razorpay/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            ...response,
                            amount: parseFloat(addFunds)
                        })
                    });

                    if (verifyRes.ok) {
                        const data = await verifyRes.json();
                        setWalletBalance(data.balance);
                        setAddFunds('');
                        fetchWalletStats();
                        alert("Funds added successfully!");
                    } else {
                        alert("Payment verification failed");
                    }
                },
                prefill: {
                    name: `${profile.firstName} ${profile.lastName}`,
                    email: profile.email,
                    contact: profile.phone
                },
                theme: { color: "#2D1E4D" }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err) { 
            console.error("Top-up failed", err); 
            alert("Something went wrong with the payment. Please try again.");
        }
    };


    const pendingNotifications = notifications.filter(n => n.status === 'pending');
    const unreadCount = pendingNotifications.length;

    const handleBook = (astro) => { setBookingTarget(astro); setBookingOpen(true); };

    const handleConfirmBooking = async (booking) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/bookings/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    astrologerId: booking.astrologerId,
                    serviceId: booking.serviceId || 1,
                    scheduledAt: booking.date + ' ' + booking.time, // Simplistic mapping
                    amount: booking.amount,
                    paymentMethod: booking.paymentMethod === 'WALLET' ? 'WALLET' : 'EXTERNAL'
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (booking.paymentMethod === 'WALLET') {
                    setWalletBalance(data.newBalance);
                    fetchWalletStats(); // Refresh history
                }
                fetchBookings(); // Refresh live bookings from backend
            } else {
                const err = await res.json();
                alert(err.error || "Booking failed");
            }
        } catch (err) {
            console.error("Booking error", err);
        }
    };

    const handleAcceptReschedule = (notif) => {
        setBookings(prev => prev.map(b =>
            b.id === notif.bookingId
                ? { ...b, date: notif.newDate, time: notif.newTime, status: 'upcoming', zoomLink: b.zoomLink }
                : b
        ));
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'accepted' } : n));
    };

    const handleDeclineReschedule = (notif) => {
        const booking = bookings.find(b => b.id === notif.bookingId);
        if (booking) {
            setBookings(prev => prev.map(b => b.id === notif.bookingId ? { ...b, status: 'cancelled' } : b));
            setWalletBalance(prev => prev + booking.amount);
            setTransactions(prev => [{
                id: Date.now(),
                desc: `Refund – Reschedule declined (${booking.service})`,
                amount: `+${currencySymbol}${booking.amount.toFixed(2)}`,
                date: 'Mar 3, 2026', type: 'credit'
            }, ...prev]);
        }
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'declined' } : n));
    };

    const handleSaveProfile = async () => {
        setProfileLoading(true);
        setProfileError('');
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(profile)
            });
            const data = await res.json();
            if (res.ok) {
                setProfileSaved(true);
                setTimeout(() => setProfileSaved(false), 2500);
                if (onUserUpdate) {
                    onUserUpdate(data);
                }
            } else {
                setProfileError(data.error || 'Failed to update profile details.');
            }
        } catch (err) { 
            console.error("Profile save fail", err); 
            setProfileError('Failed to save profile. Please check your network connection.');
        }
        setProfileLoading(false);
    };

    const [imageLoading, setImageLoading] = useState(false);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setRawImageSrc(reader.result);
            setZoom(1);
            setRotation(0);
            setPosX(0);
            setPosY(0);
            setIsDragging(false);
            setCropModal(true);
        };
        e.target.value = '';
    };

    const saveCroppedPhoto = async (base64) => {
        setImageLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ image: base64 })
            });
            if (res.ok) {
                setProfile(prev => ({ ...prev, image: base64 }));
                if (onUserUpdate) {
                    onUserUpdate({ image: base64 });
                }
                setCropModal(false);
            } else {
                const err = await res.json();
                alert(err.error || "Failed to save photo");
            }
        } catch (err) {
            console.error("Image upload failed", err);
            alert("Error saving photo");
        }
        setImageLoading(false);
    };

    const handleCropApply = () => {
        const img = new Image();
        img.src = rawImageSrc;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');

            ctx.beginPath();
            ctx.arc(200, 200, 200, 0, Math.PI * 2);
            ctx.clip();

            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 400, 400);

            ctx.translate(200 + posX, 200 + posY);
            ctx.rotate((rotation * Math.PI) / 180);
            
            const scaleFactor = Math.min(400 / img.width, 400 / img.height) * zoom;
            const dw = img.width * scaleFactor;
            const dh = img.height * scaleFactor;
            
            ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

            const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
            saveCroppedPhoto(croppedBase64);
        };
    };

    const filteredAstros = astrologers.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesService = serviceFilter === 'all' || a.expertise.some(e => e.toLowerCase().includes(serviceFilter.toLowerCase()));
        return matchesSearch && matchesService;
    });

    const filteredBookings = bookings.filter(b => statusFilter === 'all' || b.status === statusFilter);
    const upcoming = bookings.filter(b => b.status === 'upcoming');

    const sidebar = (
        <>
            {[
                { id: 'overview', icon: <Video size={19} />, label: 'Overview' },
                { id: 'bookings', icon: <Calendar size={19} />, label: 'My Bookings' },
                { id: 'wallet', icon: <CreditCard size={19} />, label: 'Wallet & Payments' },
            ].map(item => <SidebarBtn key={item.id} {...item} active={tab === item.id} onClick={setTab} />)}

        </>
    );

    return (
        <DashboardLayout sidebar={sidebar}>
            <BookingModal astro={bookingTarget} isOpen={bookingOpen} onClose={() => setBookingOpen(false)} onConfirm={handleConfirmBooking} walletBalance={walletBalance} />

            <Modal isOpen={passwordModal} onClose={() => { setPasswordModal(false); setPasswordError(''); setPasswordSuccess(false); }} title={profile.isPasswordSet ? "Change Password" : "Set Account Password"} width="440px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {profile.isPasswordSet && (
                        <FormField label="Current Password">
                            <input className="form-input" type="password" value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} />
                        </FormField>
                    )}
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
                                    body: JSON.stringify({ oldPassword: profile.isPasswordSet ? passwordForm.oldPassword : '', newPassword: passwordForm.newPassword })
                                });
                                const data = await res.json();
                                if (res.ok) {
                                    setPasswordSuccess(true);
                                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                    setProfile(prev => ({ ...prev, isPasswordSet: true }));
                                    setTimeout(() => { setPasswordModal(false); setPasswordSuccess(false); }, 2000);
                                } else {
                                    setPasswordError(data.error || "Update failed");
                                }
                            } catch { setPasswordError("Could not connect to server"); }
                            setPasswordLoading(false);
                        }} disabled={passwordLoading}>
                            {profile.isPasswordSet ? (passwordLoading ? 'Updating...' : 'Update Password') : (passwordLoading ? 'Setting...' : 'Set Password')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Photo Adjust & Crop Modal ── */}
            <Modal isOpen={cropModal} onClose={() => setCropModal(false)} title="Adjust & Frame Profile Photo" width="480px">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
                    {/* Crop Preview Mask Circle */}
                    <div 
                        onMouseDown={handleDragStart}
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                        onTouchStart={handleDragStart}
                        onTouchMove={handleDragMove}
                        onTouchEnd={handleDragEnd}
                        style={{ 
                            width: '220px', 
                            height: '220px', 
                            borderRadius: '50%', 
                            overflow: 'hidden', 
                            border: '3px solid var(--secondary-color)', 
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', 
                            background: '#111', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            position: 'relative',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            userSelect: 'none',
                            touchAction: 'none'
                        }}
                    >
                        <img 
                            src={rawImageSrc} 
                            alt="Crop preview" 
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'contain',
                                transform: `translate(${posX}px, ${posY}px) scale(${zoom}) rotate(${rotation}deg)`,
                                transition: 'none',
                                userSelect: 'none',
                                pointerEvents: 'none'
                            }} 
                        />
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                        Adjust controls to scale, rotate, and center your face inside the framing circle.
                        <br />
                        <span style={{ display: 'inline-block', marginTop: '0.5rem', color: 'var(--secondary-color)', fontWeight: '500' }}>
                            💡 Tip: You can drag or swipe the photo directly inside the circle above to center it!
                        </span>
                    </p>

                    {/* Precision Sliders */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                                <span>🔍 Zoom Scale</span>
                                <strong>{zoom.toFixed(1)}x</strong>
                            </div>
                            <input type="range" min="1" max="4" step="0.1" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--secondary-color)', cursor: 'pointer' }} />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                                <span>🔄 Rotation</span>
                                <strong>{rotation}°</strong>
                            </div>
                            <input type="range" min="-180" max="180" step="1" value={rotation} onChange={e => setRotation(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--secondary-color)', cursor: 'pointer' }} />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                                <span>↔ Pan Left / Right</span>
                                <strong>{posX}px</strong>
                            </div>
                            <input type="range" min="-150" max="150" step="1" value={posX} onChange={e => setPosX(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--secondary-color)', cursor: 'pointer' }} />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                                <span>↕ Pan Up / Down</span>
                                <strong>{posY}px</strong>
                            </div>
                            <input type="range" min="-150" max="150" step="1" value={posY} onChange={e => setPosY(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--secondary-color)', cursor: 'pointer' }} />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCropApply} disabled={imageLoading}>
                            {imageLoading ? 'Saving...' : 'Apply & Save'}
                        </button>
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setCropModal(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!selectedAstro} onClose={() => setSelectedAstro(null)} title="Astrologer Profile" width="700px">
                {selectedAstro && (
                    <div className="astro-profile-popup">
                        <div className="profile-header">
                            <div className="profile-avatar-xl" style={{ overflow: 'hidden' }}>
                                {selectedAstro.astrologerProfile?.image ? <img src={selectedAstro.astrologerProfile.image} alt={selectedAstro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : selectedAstro.name.charAt(0)}
                            </div>
                            <div className="profile-info">
                                <h2>{selectedAstro.name}</h2>
                                <div className="astro-stars">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} fill={i <= Math.round(selectedAstro.rating) ? '#D4AF37' : 'none'} color="#D4AF37" />)}
                                    <span>{selectedAstro.rating} ({selectedAstro.reviews} reviews)</span>
                                </div>
                                <p className="profile-sub">{selectedAstro.languages} · {selectedAstro.sessions}+ sessions</p>
                            </div>
                        </div>

                        <div className="profile-body">
                            <div className="profile-section">
                                <h4>Expertise</h4>
                                <div className="astro-tags">
                                    {selectedAstro.expertise.map((e, i) => <span key={i} className="expertise-tag">{e}</span>)}
                                </div>
                            </div>

                            <div className="profile-section">
                                <h4>About</h4>
                                <p className="profile-bio">{selectedAstro.bio}</p>
                            </div>

                            <div className="profile-section">
                                <h4>Client Reviews</h4>
                                <div className="reviews-list">
                                    {TESTIMONIALS.slice(0, 3).map((t, i) => (
                                        <div key={i} className="review-item">
                                            <div className="review-meta">
                                                <strong>{t.name}</strong>
                                                <div className="review-stars">
                                                    {[1, 2, 3, 4, 5].map(j => <Star key={j} size={12} fill={j <= t.rating ? '#D4AF37' : 'none'} color="#D4AF37" />)}
                                                </div>
                                            </div>
                                            <p className="review-text">"{t.text}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ marginTop: '2rem' }}>
                            <button className="btn btn-primary btn-block" onClick={() => { setSelectedAstro(null); handleBook(selectedAstro); }}>Book a Session — {currencySymbol}{selectedAstro.rate}</button>
                        </div>
                    </div>
                )}
            </Modal>


            {tab === 'overview' && (
                <div className="fade-in">
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 className="dash-title">Overview</h2>
                        <p className="dash-sub">Welcome back, here is your cosmic summary.</p>
                    </div>

                    {unreadCount > 0 && (
                        <div className="notif-banner" onClick={() => setTab('notifications')} style={{ marginBottom: '1rem' }}>
                            <Bell size={16} color="#D4AF37" />
                            <span>You have <strong>{unreadCount} reschedule request{unreadCount > 1 ? 's' : ''}</strong> awaiting your response.</span>
                            <span className="notif-banner-link">Review now →</span>
                        </div>
                    )}

                    <div className="stat-grid">
                        <StatCard icon={<Calendar size={22} />} label="Upcoming Sessions" value={upcoming.length || 0} sub="Planned sessions" accent="gold" />
                        <StatCard icon={<Video size={22} />} label="Total sessions" value={bookings.length || 0} sub="All time sessions" accent="purple" />
                        <StatCard icon={<CreditCard size={22} />} label="Wallet Balance" value={`${currencySymbol}${(walletBalance || 0).toFixed(2)}`} sub="Available balance" accent="green" />
                        <StatCard icon={<Bell size={22} />} label="Alerts" value={unreadCount || 0} sub="Pending actions" accent="gold" />
                    </div>

                    <div className="dash-overview-grid">
                        <div className="overview-main">
                            <div className="glass-card upcoming-card" style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ color: 'var(--secondary-color)', margin: 0 }}>Upcoming Sessions</h3>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setTab('bookings')}>View All</button>
                                </div>

                                {upcoming.length > 0 ? (
                                    <div className="sessions-list">
                                        {upcoming.slice(0, 3).map(b => (
                                            <div key={b.id} className="booking-item">
                                                <div>
                                                    <strong style={{ display: 'block', fontSize: '1rem' }}>{b.astrologer}</strong>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.service} · {b.date} at {b.time}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <StatusBadge status={b.status} />
                                                    {b.zoomLink && (
                                                        <a href={b.zoomLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                                                            <ExternalLink size={13} /> Join
                                                        </a>
                                                    )}
                                                    <button 
                                                        className="btn btn-outline btn-sm" 
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.6rem' }}
                                                        onClick={() => setActiveChat({ bookingId: b.id, recipientName: b.astrologer })}
                                                    >
                                                        <MessageCircle size={13} /> Chat
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                        <p style={{ color: 'var(--text-muted)' }}>No sessions scheduled for this week.</p>
                                        <button className="btn btn-outline btn-sm mt-md" onClick={() => setTab('browse')}>Browse Astrologers</button>
                                    </div>
                                )}
                            </div>

                            <div className="glass-card horoscope-card">
                                <div className="horoscope-header">
                                    <h3 style={{ margin: 0 }}>Daily Horoscope</h3>
                                    <select className="zodiac-selector" value={zodiacSign} onChange={(e) => setZodiacSign(e.target.value)}>
                                        {Object.keys(INITIAL_HOROSCOPES).map(sign => (
                                            <option key={sign} value={sign}>{sign}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="horoscope-content">
                                    <p>{INITIAL_HOROSCOPES[zodiacSign]}</p>
                                </div>
                                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    <Star size={12} fill="var(--secondary-color)" color="var(--secondary-color)" />
                                    <span>Personalized for your sign today.</span>
                                </div>
                            </div>
                        </div>

                        <div className="overview-sidebar">
                            <div className="glass-card quickbook-card" style={{ marginBottom: '2rem' }}>
                                <h3 style={{ marginBottom: '1.25rem' }}>Quick Book</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Top rated experts available now for immediate guidance.</p>
                                <div className="astro-mini-grid">
                                    {astrologers.filter(a => a.available).slice(0, 3).map(a => (
                                        <div key={a.id} className="astro-mini-card" style={{ padding: '0.75rem', marginBottom: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div className="astro-avatar" style={{ width: 40, height: 40, fontSize: '0.9rem' }}>{a.name.charAt(0)}</div>
                                            <div style={{ flex: 1 }}>
                                                <strong style={{ fontSize: '0.9rem' }}>{a.name}</strong>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currencySymbol}{a.rate}/session</p>
                                            </div>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleBook(a)}>Book</button>
                                        </div>
                                    ))}
                                </div>
                                <button className="btn btn-link btn-block mt-sm" style={{ fontSize: '0.85rem' }} onClick={() => setTab('browse')}>View all experts →</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'notifications' && (
                <div className="fade-in">
                    <h2 className="dash-title">Notifications</h2>
                    <p className="dash-sub">Reschedule requests and platform alerts from your astrologers.</p>

                    {notifications.length === 0 && (
                        <EmptyState icon={<Bell size={36} color="var(--text-muted)" />} title="All clear!" description="No notifications at this time." />
                    )}

                    {notifications.map(n => (
                        <div key={n.id} className={`notif-card glass-card ${n.status === 'pending' ? 'notif-pending' : ''}`}>
                            <div className="notif-card-header">
                                <div className="notif-icon"><Calendar size={20} color="#D4AF37" /></div>
                                <div style={{ flex: 1 }}>
                                    <strong>Reschedule Request – {n.astrologer}</strong>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{n.service}</p>
                                </div>
                                <StatusBadge status={n.status === 'pending' ? 'upcoming' : n.status === 'accepted' ? 'completed' : 'cancelled'} />
                            </div>

                            <div className="notif-schedule-change">
                                <div className="schedule-from">
                                    <span className="schedule-label">Original</span>
                                    <strong>{n.originalDate} at {n.originalTime}</strong>
                                </div>
                                <div className="schedule-arrow">→</div>
                                <div className="schedule-to">
                                    <span className="schedule-label">Proposed</span>
                                    <strong style={{ color: 'var(--secondary-color)' }}>{n.newDate} at {n.newTime}</strong>
                                </div>
                            </div>

                            {n.status === 'pending' && (
                                <div className="notif-actions">
                                    <div className="fee-transparency-note" style={{ flex: 1, margin: 0 }}>
                                        <span>If you decline, you will receive a full refund of <strong>{currencySymbol}{n.amount.toFixed(2)}</strong> to your wallet immediately.</span>
                                    </div>
                                    <button className="btn btn-primary btn-sm" onClick={() => handleAcceptReschedule(n)}>Accept Change</button>
                                    <button className="btn btn-outline btn-sm" style={{ borderColor: '#ff6b6b', color: '#ff6b6b' }} onClick={() => handleDeclineReschedule(n)}>Decline & Refund</button>
                                </div>
                            )}

                            {n.status === 'accepted' && (
                                <p style={{ color: '#1cc88a', fontSize: '0.88rem', marginTop: '0.75rem' }}>✓ You accepted this reschedule. Your booking has been updated.</p>
                            )}
                            {n.status === 'declined' && (
                                <p style={{ color: '#ff6b6b', fontSize: '0.88rem', marginTop: '0.75rem' }}>✗ You declined. A full refund of {currencySymbol}{n.amount.toFixed(2)} has been added to your wallet.</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {tab === 'browse' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <h2 className="dash-title" style={{ marginBottom: '0.5rem' }}>Browse Astrologers</h2>
                            <p className="dash-sub" style={{ margin: 0 }}>Find the perfect guide for your cosmic journey.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div className="search-bar" style={{ width: '320px' }}>
                                <Search size={18} color="var(--text-muted)" />
                                <input className="search-input" placeholder="Search by name or expertise..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>
                            <div className="view-mode-toggle">
                                <button className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View"><LayoutGrid size={18} /></button>
                                <button className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List View"><List size={18} /></button>
                                <button className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} title="Table View"><TableIcon size={18} /></button>
                            </div>
                        </div>
                    </div>

                    <div className="filter-shelf mb-lg">
                        <button className={`filter-tag ${serviceFilter === 'all' ? 'active' : ''}`} onClick={() => setServiceFilter('all')}>All Services</button>
                        {PLATFORM_SERVICES.map(s => (
                            <button key={s.id} className={`filter-tag ${serviceFilter === s.name ? 'active' : ''}`} onClick={() => setServiceFilter(s.name)}>{s.name}</button>
                        ))}
                    </div>

                    {astrosLoading ? (
                        <CosmicLoader />
                    ) : filteredAstros.length === 0 ? (
                        <EmptyState icon={<Search size={36} color="var(--text-muted)" />} title="No guides found" description="No astrologers matched your filters or search query." />
                    ) : (
                        <>
                            {viewMode === 'grid' && (
                                <div className="astro-grid">
                                    {filteredAstros.map(a => <AstrologerCard key={a.id} astro={a} onBook={handleBook} />)}
                                </div>
                            )}

                            {viewMode === 'list' && (
                                <div className="sessions-list">
                                    {filteredAstros.map(a => (
                                        <div key={a.id} className="glass-card" style={{ padding: '1.25rem', marginBottom: '1rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                            <div className="astro-avatar" style={{ width: 64, height: 64 }}>{a.name.charAt(0)}</div>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ margin: 0 }}>{a.name}</h3>
                                                <div className="astro-stars" style={{ margin: '0.25rem 0' }}>
                                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={13} fill={i <= Math.round(a.rating) ? '#D4AF37' : 'none'} color="#D4AF37" />)}
                                                    <span style={{ fontSize: '0.8rem' }}>{a.rating} ({a.reviews})</span>
                                                </div>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>{a.expertise.join(' · ')}</p>
                                                <span className="astro-rate">{currencySymbol}{a.rate}<small>/session</small></span>
                                            </div>
                                            <button className="btn btn-primary" onClick={() => handleBook(a)}>Book Now</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {viewMode === 'table' && (
                                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <table className="dash-table">
                                        <thead>
                                            <tr>
                                                <th>Astrologer</th>
                                                <th>Expertise</th>
                                                <th>Rating</th>
                                                <th>Rate</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAstros.map(a => (
                                                <tr key={a.id}>
                                                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><div className="astro-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>{a.name.charAt(0)}</div><strong>{a.name}</strong></div></td>
                                                    <td>{a.expertise.slice(0, 2).join(', ')}</td>
                                                    <td>{a.rating}★</td>
                                                    <td><strong className="gold-text">{currencySymbol}{a.rate}</strong></td>
                                                    <td><span className={`avail-dot ${a.available ? 'online' : 'offline'}`} />{a.available ? 'Online' : 'Away'}</td>
                                                    <td><button className="btn btn-ghost btn-sm" onClick={() => setSelectedAstro(a)}>View Profile</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {tab === 'bookings' && (
                <div className="fade-in">
                    <h2 className="dash-title">My Bookings</h2>
                    <p className="dash-sub">History and status of all your cosmic consultations.</p>

                    <div className="filter-shelf mb-lg">
                        {['all', 'upcoming', 'completed', 'cancelled'].map(s => (
                            <button key={s} className={`filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="sessions-list">
                        {bookingsLoading ? (
                            <CosmicLoader />
                        ) : filteredBookings.length === 0 ? (
                            <EmptyState icon={<Calendar size={36} color="var(--text-muted)" />} title="No bookings found" description="You haven't made any bookings in this category yet." />
                        ) : (
                            filteredBookings.map(b => (
                                <div key={b.id} className="booking-card-premium glass-card">
                                    <div className="booking-inner">
                                        <div className="booking-profile">
                                            <div className="booking-avatar">{b.astrologer.charAt(0)}</div>
                                            <div className="booking-main-info">
                                                <div className="booking-title-row">
                                                    <h4>{b.astrologer}</h4>
                                                    <StatusBadge status={b.status} />
                                                </div>
                                                <p className="booking-service-type">{b.service}</p>
                                                <div className="booking-meta">
                                                    <div className="meta-item"><Calendar size={14} /> <span>{b.date}</span></div>
                                                    <div className="meta-item"><Clock size={14} /> <span>{b.time}</span></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="booking-details-col">
                                            <div className="booking-price-tag">
                                                <span className="label">Amount Paid</span>
                                                <span className="value">{currencySymbol}{b.amount.toFixed(2)}</span>
                                            </div>
                                            <div className="fee-breakdown">
                                                <span>Platform: {currencySymbol}{b.platformFee.toFixed(2)}</span>
                                                <span>Astro: {currencySymbol}{b.astrologerReceives.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="booking-actions-col">
                                            {b.status === 'upcoming' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                                    {b.zoomLink && (
                                                        <a href={b.zoomLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block" style={{ justifyContent: 'center' }}>
                                                            <Video size={16} style={{ marginRight: '8px' }} /> Join Session
                                                        </a>
                                                    )}
                                                    <button 
                                                        type="button"
                                                        className="btn btn-outline btn-block" 
                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                                        onClick={() => setActiveChat({ bookingId: b.id, recipientName: b.astrologer })}
                                                    >
                                                        <MessageCircle size={16} /> Chat with Expert
                                                    </button>
                                                </div>
                                            )}
                                            {b.status === 'completed' && (
                                                <>
                                                    <button className="btn btn-outline">
                                                        <CheckCircle size={16} style={{ marginRight: '8px' }} /> Download Recording
                                                    </button>
                                                    <button className="btn btn-ghost">
                                                        <Star size={16} style={{ marginRight: '8px' }} /> Rate Experience
                                                    </button>
                                                </>
                                            )}
                                            {b.status === 'cancelled' && (
                                                <button className="btn btn-disabled" disabled>
                                                    Booking Cancelled
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {tab === 'wallet' && (
                <div className="fade-in">
                    <div className="wallet-layout-grid">
                        <div className="wallet-main-col">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 className="dash-title" style={{ margin: 0 }}>My Wallet</h2>
                                <div className="wallet-badge">
                                    <Shield size={14} /> <span>Secure Payments</span>
                                </div>
                            </div>

                            <div className="glass-card balance-card-premium">
                                <div className="balance-info">
                                    <p className="balance-label">Available Balance</p>
                                    <h1 className="balance-value">{currencySymbol}{(walletBalance || 0).toFixed(2)}</h1>
                                    <p className="balance-subtext">Use this balance for instant bookings and consultation renewals.</p>
                                </div>
                                
                                <div className="add-funds-premium">
                                    <div className="premium-input-group">
                                        <span className="premium-currency">{currencySymbol}</span>
                                        <input 
                                            type="number" 
                                            className="premium-input" 
                                            placeholder="Enter amount" 
                                            value={addFunds} 
                                            onChange={e => setAddFunds(e.target.value)} 
                                        />
                                    </div>
                                    <button 
                                        className="btn btn-primary btn-premium" 
                                        onClick={handleAddFunds} 
                                        disabled={!addFunds || parseFloat(addFunds) <= 0}
                                    >
                                        <Zap size={18} fill="currentColor" /> Top-up Now
                                    </button>
                                </div>
                                
                                <div className="payment-support-icons">
                                    <span>Accepting:</span>
                                    <div className="support-chips">
                                        <span className="chip">Cards</span>
                                        <span className="chip">UPI</span>
                                        <span className="chip">Net Banking</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="wallet-side-col">
                            <div style={{ height: '40px', display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 className="dash-title" style={{ margin: 0, fontSize: '1.25rem' }}>Payment Methods</h2>
                            </div>
                            <div className="glass-card methods-card">
                                <div className="methods-list">
                                    {paymentMethods.map(m => (
                                        <div key={m.id} className="method-item">
                                            <div className="method-icon">
                                                {m.type === 'CARD' ? <CreditCard size={20} /> : <Smartphone size={20} />}
                                            </div>
                                            <div className="method-details">
                                                <strong>{m.detail}</strong>
                                                {m.expiry && <p>Expires {m.expiry}</p>}
                                            </div>
                                            {m.isDefault && <span className="default-tag">Default</span>}
                                        </div>
                                    ))}
                                </div>
                                <button className="btn btn-outline btn-block btn-add-method" onClick={() => setIsAddPaymentOpen(true)}>
                                    <Plus size={16} /> Add Payment Method
                                </button>
                            </div>

                            <div className="security-note-container mt-md">
                                <div className="security-box">
                                    <Shield size={20} className="shield-icon" />
                                    <div>
                                        <strong>SSL Encrypted</strong>
                                        <p>Your data is protected by 256-bit AES encryption.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="transaction-history-section" style={{ marginTop: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0 }}>Recent Transactions</h3>
                            <button className="btn btn-link btn-sm">View All</button>
                        </div>
                        <div className="glass-card transaction-card-list" style={{ padding: 0 }}>
                            <table className="dash-table">
                                <tbody>
                                    {transactions.length > 0 ? (transactions.map(t => (
                                        <tr key={t.id}>
                                            <td>
                                                <div className="t-row">
                                                    <div className={`t-icon ${t.type}`}>
                                                        {t.type === 'credit' ? <Plus size={16} /> : <Zap size={16} />}
                                                    </div>
                                                    <div className="t-info">
                                                        <strong>{t.desc}</strong>
                                                        <p>{t.date}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <strong className={`t-amount ${t.type}`}>{t.amount}</strong>
                                            </td>
                                        </tr>
                                    ))) : (
                                        <tr>
                                            <td colSpan="2" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                                No transactions found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>


                    <Modal isOpen={isAddPaymentOpen} onClose={() => setIsAddPaymentOpen(false)} title="Add Payment Method" width="450px">
                        <div className="add-method-form">
                            <div className="method-type-selector">
                                <button className={`type-btn ${newPayment.type === 'CARD' ? 'active' : ''}`} onClick={() => setNewPayment({...newPayment, type: 'CARD'})}>
                                    <CreditCard size={18} /> Card
                                </button>
                                <button className={`type-btn ${newPayment.type === 'UPI' ? 'active' : ''}`} onClick={() => setNewPayment({...newPayment, type: 'UPI'})}>
                                    <Smartphone size={18} /> UPI ID
                                </button>
                            </div>

                            {newPayment.type === 'CARD' ? (
                                <div className="card-form-grid">
                                    <FormField label="Card Number">
                                        <input className="form-input" placeholder="XXXX XXXX XXXX XXXX" maxLength="19" />
                                    </FormField>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <FormField label="Expiry">
                                            <input className="form-input" placeholder="MM/YY" />
                                        </FormField>
                                        <FormField label="CVC">
                                            <input className="form-input" type="password" placeholder="***" />
                                        </FormField>
                                    </div>
                                </div>
                            ) : (
                                <div className="upi-form">
                                    <FormField label="UPI ID">
                                        <input className="form-input" placeholder="username@bankid" value={newPayment.detail} onChange={e => setNewPayment({...newPayment, detail: e.target.value})} />
                                    </FormField>
                                    <p className="helper-text">Example: mobile-number@upi or name@okaxis</p>
                                </div>
                            )}

                            <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                <button className="btn btn-primary btn-block" onClick={() => {
                                    setPaymentMethods([...paymentMethods, { id: Date.now(), ...newPayment }]);
                                    setIsAddPaymentOpen(false);
                                    setNewPayment({ type: 'CARD', detail: '', expiry: '' });
                                }}>Save Payment Method</button>
                            </div>
                        </div>
                    </Modal>
                </div>
            )}

            {tab === 'profile' && (
                <div className="fade-in">
                    <h2 className="dash-title">Profile Settings</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '2rem' }}>
                        <div className="glass-card">
                            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' }}>
                                <div className="profile-avatar-xl" style={{ width: 80, height: 80, fontSize: '2rem', overflow: 'hidden', position: 'relative', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {profile.image ? <img src={profile.image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile.firstName?.charAt(0) || 'U')}
                                    {imageLoading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>...</div>}
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Profile Photo</h4>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Update your photo for a personalized experience.</p>
                                    <label htmlFor="client-photo-upload" className="btn btn-outline btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={14} /> {profile.image ? 'Change Photo' : 'Upload Photo'}
                                    </label>
                                    <input id="client-photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                                </div>
                            </div>

                            <h3 style={{ marginBottom: '1.5rem' }}>Personal Information</h3>
                            <div className="profile-edit-grid">
                                <FormField label="First Name"><input className="form-input" value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} /></FormField>
                                <FormField label="Last Name"><input className="form-input" value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} /></FormField>
                                <FormField label="Email"><input className="form-input" type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></FormField>
                                <FormField label="Phone"><input className="form-input" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></FormField>
                                <FormField label="Birthday"><input className="form-input" type="date" value={profile.dob} onChange={e => setProfile({ ...profile, dob: e.target.value })} /></FormField>
                                <FormField label="Gender">
                                    <select className="form-input" value={profile.gender} onChange={e => setProfile({ ...profile, gender: e.target.value })}>
                                        <option value="">Select</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                                    </select>
                                </FormField>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={profileLoading}>{profileLoading ? 'Saving...' : 'Save Profile'}</button>
                                {profileSaved && <span style={{ color: '#1cc88a', fontSize: '0.9rem', fontWeight: 600 }}>✓ Changes saved successfully.</span>}
                                {profileError && <span style={{ color: '#ff4a4a', fontSize: '0.9rem', fontWeight: 600 }}>✗ {profileError}</span>}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="glass-card">
                                <h3 style={{ marginBottom: '1.25rem' }}>Security</h3>
                                <button className="btn btn-outline btn-block mb-md" onClick={() => setPasswordModal(true)}>
                                    {profile.isPasswordSet ? "Change Account Password" : "Set Account Password"}
                                </button>
                                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Two-factor authentication is currently <strong>disabled</strong>.</p>
                                    <button className="btn btn-ghost btn-sm">Enable 2FA</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {activeChat && (
                <RealTimeChat 
                    bookingId={activeChat.bookingId} 
                    user={user} 
                    recipientName={activeChat.recipientName} 
                    onClose={() => setActiveChat(null)} 
                />
            )}
        </DashboardLayout>
    );
};

export default ClientDashboard;
