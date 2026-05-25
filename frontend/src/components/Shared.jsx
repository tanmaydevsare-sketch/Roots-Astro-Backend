import React from 'react';
import { X, CheckCircle, ArrowRight, Star, Globe, Check, Shield, AlertCircle, CreditCard, Zap } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

/* ─── Modal ─── */
export const Modal = ({ isOpen, onClose, title, children, width = '520px' }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
};

/* ─── StatCard ─── */
export const StatCard = ({ icon, label, value, sub, accent = 'gold' }) => (
    <div className="stat-card glass-card">
        <div className={`accent-${accent}`} style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
        <div>
            <p className="stat-label">{label}</p>
            <h3 className="stat-value">{value}</h3>
            {sub && <p className="stat-sub">{sub}</p>}
        </div>
    </div>
);

/* ─── StatusBadge ─── */
export const StatusBadge = ({ status }) => {
    const map = {
        upcoming: ['Upcoming', 'badge-info'], completed: ['Completed', 'badge-success'],
        cancelled: ['Cancelled', 'badge-error'], refunded: ['Refunded', 'badge-warning'],
        rescheduled: ['Rescheduled', 'badge-info'], active: ['Active', 'badge-success'],
        suspended: ['Suspended', 'badge-error'], published: ['Published', 'badge-success'],
        draft: ['Draft', 'badge-warning'], APPROVED: ['Approved', 'badge-success'],
        PENDING: ['Pending Review', 'badge-warning'], REJECTED: ['Rejected', 'badge-error'],
        paid: ['Paid', 'badge-success'], processing: ['Processing', 'badge-warning'],
    };
    const [label, cls] = map[status] || [status, 'badge-warning'];
    return <span className={`badge ${cls}`}>{label}</span>;
};

/* ─── EmptyState ─── */
export const EmptyState = ({ icon, title, description, action }) => (
    <div className="empty-state">
        <div className="empty-state-icon">{icon}</div>
        <h3>{title}</h3><p>{description}</p>{action}
    </div>
);

/* ─── AstrologerCard ─── */
export const AstrologerCard = ({ astro, onBook, hideRate = false }) => {
    const { currencySymbol } = useSettings();
    return (
        <div className="astro-card glass-card">
            <div className="astro-card-top">
                <div className="astro-avatar" style={{ overflow: 'hidden' }}>
                    {astro.astrologerProfile?.image ? <img src={astro.astrologerProfile.image} alt={astro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (astro.name?.charAt(0) || 'A')}
                </div>
                <div className="astro-meta">
                    <h3 className="astro-name">{astro.name}</h3>
                    <div className="astro-stars">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={13} fill={i <= Math.round(astro.rating) ? '#D4AF37' : 'none'} color="#D4AF37" />)}
                        <span>{astro.rating} ({astro.reviews})</span>
                    </div>
                    <p className="astro-lang"><Globe size={12} /> {astro.languages}</p>
                </div>
            </div>
            <div className="astro-tags">
                {astro.expertise.map((e, i) => <span key={i} className="expertise-tag">{e}</span>)}
            </div>
            <p className="astro-bio">{astro.bio}</p>
            <div className="astro-card-footer">
                <div>
                    {!hideRate && <span className="astro-rate">{currencySymbol}{astro.rate}<small>/min</small></span>}
                    <p className="astro-sessions">{astro.sessions.toLocaleString()} sessions</p>
                </div>
                <button className={`btn btn-sm ${astro.available ? 'btn-primary' : 'btn-disabled'}`} onClick={() => astro.available && onBook(astro)} disabled={!astro.available}>
                    {astro.available ? 'Book Now' : 'Unavailable'}
                </button>
            </div>
        </div>
    );
};

/* ─── Booking Wizard (5 steps: Service → Date/Time → Problem → Pay → Receipt) ─── */
export const BookingModal = ({ astro, isOpen, onClose, onConfirm, walletBalance = 0 }) => {
    const { currencySymbol, commissionRate = 0.25 } = useSettings();
    const [step, setStep] = React.useState(1);
    const [selectedService, setSelectedService] = React.useState('');
    const [selectedDate, setSelectedDate] = React.useState('');
    const [selectedSlot, setSelectedSlot] = React.useState('');
    const [problemText, setProblemText] = React.useState('');
    const [paymentMethod, setPaymentMethod] = React.useState(''); // 'razorpay' | 'paypal'
    const [paymentProcessing, setPaymentProcessing] = React.useState(false);
    const [paymentDone, setPaymentDone] = React.useState(false);
    const [paymentRef, setPaymentRef] = React.useState('');

    const services = astro?.astrologerProfile?.services?.length > 0
        ? astro.astrologerProfile.services.map(s => ({
            id: s.id,
            name: s.title,
            duration: `${s.duration} min`,
            price: s.price
          }))
        : astro ? [
            { id: 1, name: 'Natal Chart Analysis', duration: '45 min', price: astro.rate },
            { id: 2, name: 'Relationship Compatibility', duration: '60 min', price: astro.rate + 25 },
            { id: 3, name: 'Career & Finance Forecast', duration: '30 min', price: Math.max(30, astro.rate - 10) },
          ] : [];
    const dates = ['Mar 5, 2026', 'Mar 6, 2026', 'Mar 7, 2026', 'Mar 8, 2026', 'Mar 10, 2026'];
    const currentService = services.find(s => s.name === selectedService);
    const price = currentService?.price || 0;
    const platformFee = +(price * commissionRate).toFixed(2);
    const astrologerReceives = +(price * (1 - commissionRate)).toFixed(2);

    const reset = () => {
        setStep(1); setSelectedService(''); setSelectedDate(''); setSelectedSlot('');
        setProblemText(''); setPaymentMethod(''); setPaymentProcessing(false);
        setPaymentDone(false); setPaymentRef(''); setManualInstructions(null);
    };
    const handleClose = () => { reset(); onClose(); };

    const [manualInstructions, setManualInstructions] = React.useState(null);

    // Simulate payment gateway
    const initiatePayment = () => {
        if (paymentMethod === 'WALLET') {
            if (walletBalance < price) {
                alert("Insufficient wallet balance. Please top up your wallet.");
                return;
            }
            // confirmed via wallet
            setPaymentProcessing(true);
            setTimeout(() => {
                const ref = `WAL-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
                setPaymentRef(ref);
                setPaymentProcessing(false);
                setPaymentDone(true);
                onConfirm({
                    astrologer: astro.name, astrologerId: astro.id,
                    serviceId: currentService?.id || 1, // Fallback
                    service: selectedService, date: selectedDate, time: selectedSlot,
                    amount: price, platformFee, astrologerReceives,
                    status: 'upcoming',
                    zoomLink: 'https://zoom.us/j/mock' + Date.now(),
                    problemDescription: problemText.trim(),
                    paymentMethod, paymentRef: ref,
                });
            }, 1500);
            return;
        }

        if (paymentMethod === 'bank' || paymentMethod === 'upi_direct') {
            setManualInstructions(paymentMethod === 'bank' 
                ? { title: 'Bank Transfer Instructions', body: `Please transfer ${currencySymbol}${price.toFixed(2)} to: \nBank: Roots Astro Bank\nA/C: 9928374650\nIFSC: ROOTS000123\nRef: #PAY-${Date.now().toString().slice(-6)}` }
                : { title: 'UPI Direct Instructions', body: `Please pay ${currencySymbol}${price.toFixed(2)} to: rootsastro@upi\nRef: #PAY-${Date.now().toString().slice(-6)}` }
            );
            return;
        }

        setPaymentProcessing(true);
        setTimeout(() => {
            const ref = paymentMethod === 'razorpay'
                ? `rzp_live_${Math.random().toString(36).slice(2, 12).toUpperCase()}`
                : `PAYID-${Math.random().toString(36).slice(2, 14).toUpperCase()}`;
            setPaymentRef(ref);
            setPaymentProcessing(false);
            setPaymentDone(true);
            // Trigger booking creation
            onConfirm({
                astrologer: astro.name, astrologerId: astro.id,
                service: selectedService, date: selectedDate, time: selectedSlot,
                amount: price, platformFee, astrologerReceives,
                status: 'upcoming',
                zoomLink: 'https://zoom.us/j/mock' + Date.now(),
                problemDescription: problemText.trim(),
                paymentMethod, paymentRef: ref,
            });
        }, 2200);
    };

    const confirmManualPayment = () => {
        const ref = `MAN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        setPaymentRef(ref);
        setPaymentDone(true);
        onConfirm({
            astrologer: astro.name, astrologerId: astro.id,
            service: selectedService, date: selectedDate, time: selectedSlot,
            amount: price, platformFee, astrologerReceives,
            status: 'upcoming',
            zoomLink: 'https://zoom.us/j/mock' + Date.now(),
            problemDescription: problemText.trim(),
            paymentMethod, paymentRef: ref,
        });
    };

    const steps = ['Select Service', 'Date & Time', 'Your Problem', 'Payment', 'Receipt'];

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={astro ? `Book – ${astro.name}` : 'Book Session'} width="600px">
            {/* Step indicator */}
            <div className="wizard-steps">
                {steps.map((s, i) => (
                    <div key={i} className={`wizard-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
                        <div className="wizard-step-dot">{step > i + 1 ? <Check size={12} /> : i + 1}</div>
                        <span>{s}</span>
                    </div>
                ))}
            </div>

            {/* Step 1 – Service */}
            {step === 1 && (
                <div className="fade-in">
                    <p className="wizard-label">Choose a service</p>
                    <div className="service-list">
                        {services.map(s => (
                            <div key={s.name} className={`service-option ${selectedService === s.name ? 'selected' : ''}`} onClick={() => setSelectedService(s.name)}>
                                <div><strong>{s.name}</strong><p>{s.duration}</p></div>
                                <span className="service-price">{currencySymbol}{s.price}</span>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-primary btn-block mt-lg" onClick={() => setStep(2)} disabled={!selectedService}>
                        Continue <ArrowRight size={15} />
                    </button>
                </div>
            )}

            {/* Step 2 – Date & Time */}
            {step === 2 && (
                <div className="fade-in">
                    <p className="wizard-label">Choose a date</p>
                    <div className="date-grid">
                        {dates.map(d => <button key={d} className={`date-btn ${selectedDate === d ? 'selected' : ''}`} onClick={() => { setSelectedDate(d); setSelectedSlot(''); }}>{d}</button>)}
                    </div>
                    {selectedDate && <>
                        <p className="wizard-label mt-lg">Available time slots</p>
                        <div className="slot-grid">
                            {(astro?.slots || []).map(slot => <button key={slot} className={`slot-btn ${selectedSlot === slot ? 'selected' : ''}`} onClick={() => setSelectedSlot(slot)}>{slot}</button>)}
                        </div>
                    </>}
                    <div className="wizard-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => setStep(1)}>Back</button>
                        <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!selectedDate || !selectedSlot}>Continue</button>
                    </div>
                </div>
            )}

            {/* Step 3 – Problem Description */}
            {step === 3 && (
                <div className="fade-in">
                    <p className="wizard-label">Describe your concern (optional)</p>
                    <div className="problem-note-box">
                        <div className="problem-note-info">
                            <AlertCircle size={16} color="#D4AF37" />
                            <span>Shared <strong>only with your astrologer</strong> to help them prepare. Your personal details remain private.</span>
                        </div>
                        <textarea className="form-input form-textarea" rows={5} placeholder="Briefly describe what's on your mind — career, relationships, health, finances..." value={problemText} onChange={e => setProblemText(e.target.value)} maxLength={800} />
                        <p className="char-count">{problemText.length}/800 characters</p>
                    </div>
                    <div className="wizard-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => setStep(2)}>Back</button>
                        <button className="btn btn-primary" onClick={() => { setPaymentMethod(''); setStep(4); }}>Continue to Payment</button>
                    </div>
                </div>
            )}

            {/* Step 4 – Payment */}
            {step === 4 && (
                <div className="fade-in">
                    {/* Order summary */}
                    <div className="booking-summary" style={{ marginBottom: '1.25rem' }}>
                        <h4>Order Summary</h4>
                        {[['Astrologer', astro?.name], ['Service', selectedService], ['Date & Time', `${selectedDate} at ${selectedSlot}`]].map(([k, v]) => (
                            <div key={k} className="summary-row"><span>{k}</span><strong>{v}</strong></div>
                        ))}
                        <div className="summary-divider" />
                        <div className="summary-row"><span>Session fee</span><strong>{currencySymbol}{price.toFixed(2)}</strong></div>
                        <div className="summary-row" style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                            <span>Platform commission ({Math.round(commissionRate * 100)}%)</span><strong style={{ color: 'var(--text-muted)' }}>{currencySymbol}{platformFee.toFixed(2)}</strong>
                        </div>
                        <div className="summary-row" style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                            <span>Astrologer receives (75%)</span><strong style={{ color: '#1cc88a' }}>{currencySymbol}{astrologerReceives.toFixed(2)}</strong>
                        </div>
                        <div className="summary-row summary-total">
                            <span>Total Payable</span>
                            <strong className="gold-text">{currencySymbol}{price.toFixed(2)}</strong>
                        </div>
                    </div>

                    {/* Payment method selector */}
                    <p className="wizard-label">Select Payment Method</p>
                    <div className="payment-method-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <button className={`payment-method-btn ${paymentMethod === 'WALLET' ? 'selected' : ''}`} onClick={() => setPaymentMethod('WALLET')} style={{ gridColumn: '1 / span 2', border: '1px solid var(--secondary-color)', background: 'rgba(212,175,55,0.05)' }}>
                            <div className="payment-icon" style={{ background: 'var(--secondary-color)', color: 'var(--primary-color)' }}><CreditCard size={18} /></div>
                            <div style={{ textAlign: 'left' }}>
                                <strong>Pay with Roots Wallet</strong>
                                <p style={{ color: walletBalance < price ? 'var(--badge-error-text)' : 'var(--badge-success-text)' }}>
                                    Current Balance: {currencySymbol}{(walletBalance || 0).toFixed(2)}
                                    {walletBalance < price && ' (Insufficient funds)'}
                                </p>
                            </div>
                            {paymentMethod === 'WALLET' && <Check size={14} color="#1cc88a" />}
                        </button>
                        <button className={`payment-method-btn ${paymentMethod === 'razorpay' ? 'selected' : ''}`} onClick={() => setPaymentMethod('razorpay')}>
                            <div className="payment-icon rzp-icon" style={{ background: '#2373ee' }}>₹</div>
                            <div><strong>Razorpay</strong><p>Cards, UPI, Netbanking</p></div>
                            {paymentMethod === 'razorpay' && <Check size={14} color="#1cc88a" />}
                        </button>
                        <button className={`payment-method-btn ${paymentMethod === 'paypal' ? 'selected' : ''}`} onClick={() => setPaymentMethod('paypal')}>
                            <div className="payment-icon pp-icon" style={{ background: '#003087' }}>P</div>
                            <div><strong>PayPal</strong><p>Global wallet & Cards</p></div>
                            {paymentMethod === 'paypal' && <Check size={14} color="#1cc88a" />}
                        </button>
                        <button className={`payment-method-btn ${paymentMethod === 'bank' ? 'selected' : ''}`} onClick={() => setPaymentMethod('bank')}>
                            <div className="payment-icon" style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--secondary-color)' }}>B</div>
                            <div><strong>Bank Transfer</strong><p>Direct manual deposit</p></div>
                            {paymentMethod === 'bank' && <Check size={14} color="#1cc88a" />}
                        </button>
                        <button className={`payment-method-btn ${paymentMethod === 'upi_direct' ? 'selected' : ''}`} onClick={() => setPaymentMethod('upi_direct')}>
                            <div className="payment-icon" style={{ background: 'rgba(28,200,138,0.1)', color: '#1cc88a' }}>U</div>
                            <div><strong>Direct UPI</strong><p>Scan to pay (GPay/PhPe)</p></div>
                            {paymentMethod === 'upi_direct' && <Check size={14} color="#1cc88a" />}
                        </button>
                    </div>

                    {/* Manual Instructions Display */}
                    {manualInstructions && (
                        <div className="glass-card fade-in" style={{ marginTop: '1.25rem', padding: '1rem', border: '1px solid var(--secondary-color)', background: 'rgba(212,175,55,0.03)' }}>
                            <h4 style={{ color: 'var(--secondary-color)', marginBottom: '0.5rem' }}>{manualInstructions.title}</h4>
                            <p style={{ whiteSpace: 'pre-line', fontSize: '0.85rem' }}>{manualInstructions.body}</p>
                            <p style={{ fontSize: '0.75rem', marginTop: '0.75rem', opacity: 0.7 }}>Tip: Our finance team will verify the transfer within 10-20 mins.</p>
                            <button className="btn btn-primary btn-block mt-md" onClick={confirmManualPayment}>I have made the transfer</button>
                        </div>
                    )}

                    {/* Processing state */}
                    {paymentProcessing && (
                        <div className="payment-processing">
                            <div className="zoom-spinner" />
                            <p>Connecting to {paymentMethod === 'razorpay' ? 'Razorpay' : 'PayPal'}...</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Please do not close this window.</p>
                        </div>
                    )}

                    {!paymentProcessing && (
                        <>
                            <div className="fee-transparency-note" style={{ marginBottom: '1rem' }}>
                                <Shield size={13} /> Payments are secured & encrypted. Full refund if astrologer cancels. 25% platform fee included.
                            </div>
                            <div className="wizard-actions">
                                <button className="btn btn-outline btn-sm" onClick={() => setStep(3)}>Back</button>
                                <button className="btn btn-primary" onClick={initiatePayment} disabled={!paymentMethod} style={{ gap: '0.5rem' }}>
                                    <CreditCard size={15} /> Pay {currencySymbol}{price.toFixed(2)} {paymentMethod === 'razorpay' ? 'via Razorpay' : paymentMethod === 'paypal' ? 'via PayPal' : ''}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Step 5 – Receipt */}
            {step === 4 && paymentDone && (
                <div className="fade-in payment-receipt">
                    <div className="receipt-success-icon"><CheckCircle size={36} color="#1cc88a" /></div>
                    <h3 style={{ color: '#1cc88a', marginBottom: '0.35rem' }}>Payment Successful!</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
                        Your session has been confirmed. A Zoom link will be sent before your appointment.
                    </p>
                    <div className="receipt-box">
                        {[
                            ['Booking ID', `#BK-${Date.now().toString().slice(-6)}`],
                            ['Payment Ref', paymentRef],
                            ['Method', paymentMethod === 'razorpay' ? 'Razorpay' : 'PayPal'],
                            ['Amount Paid', `${currencySymbol}${price.toFixed(2)}`],
                            ['Astrologer', astro?.name],
                            ['Date & Time', `${selectedDate} at ${selectedSlot}`],
                        ].map(([k, v]) => (
                            <div key={k} className="receipt-row">
                                <span>{k}</span><strong>{v}</strong>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} onClick={handleClose}>
                        <CheckCircle size={15} /> Done – View My Bookings
                    </button>
                </div>
            )}
        </Modal>
    );
};

/* ─── DashboardLayout ─── */
export const DashboardLayout = ({ sidebar, children, mobileTopAction }) => (
    <div className="dashboard-container">
        <aside className="sidebar"><div className="sidebar-nav">{sidebar}</div></aside>
        <main className="main-content">
            {mobileTopAction && (
                <div className="mobile-top-action">{mobileTopAction}</div>
            )}
            {children}
        </main>
    </div>
);

export const SidebarBtn = ({ id, active, onClick, icon, label }) => (
    <button className={`sidebar-item ${active ? 'active' : ''}`} onClick={() => onClick(id)}>
        {icon}<span>{label}</span>
    </button>
);

export const FormField = ({ label, children }) => (
    <div className="form-group"><label className="form-label">{label}</label>{children}</div>
);

export const SearchBar = ({ value, onChange, placeholder = 'Search...' }) => (
    <div className="search-bar">
        <input className="search-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
);
