import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Shield, Video, CreditCard, Calendar, ChevronRight, CheckCircle, Globe, Zap } from 'lucide-react';
import { ASTROLOGERS, TESTIMONIALS } from '../data/mockData';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../api/config';

const StarRating = ({ rating }) => (
    <div className="astro-stars">
        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={13} fill={i <= Math.round(rating) ? '#D4AF37' : 'none'} color="#D4AF37" />)}
        <span>{rating}</span>
    </div>
);

const Home = ({ view }) => {
    const { 
        currencySymbol, 
        platformName, 
        heroTitle, 
        heroSubtitle, 
        feature1Title, 
        feature1Desc, 
        feature2Title, 
        feature2Desc,
        feature3Title,
        feature3Desc
    } = useSettings();

    const [liveAstrologers, setLiveAstrologers] = useState([]);

    useEffect(() => {
        const fetchAstrologers = async () => {
            try {
                const res = await fetch(`${API_URL}/api/astrologers`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const formatted = data.map(u => ({
                            id: u.id,
                            name: `${u.firstName} ${u.lastName}`.trim(),
                            expertise: (u.astrologerProfile?.services?.length > 0)
                                ? Array.from(new Set(u.astrologerProfile.services.map(s => s.masterService?.category?.name).filter(Boolean)))
                                : (u.astrologerProfile?.expertise 
                                    ? u.astrologerProfile.expertise.split(',').map(s => s.trim()) 
                                    : ['Astrology']),
                            rate: u.astrologerProfile?.rate || '50',
                            rating: u.astrologerProfile?.rating || 5.0,
                            sessions: u._count?.astrologerBookings || 0,
                            available: u.astrologerProfile?.isOnline ?? false
                        }));
                        setLiveAstrologers(formatted);
                    }
                }
            } catch (err) {
                console.error("Error fetching approved astrologers:", err);
            }
        };
        fetchAstrologers();
    }, []);

    return (
        <div className="home-page">
            {!view && (
                <section className="hero-section">
                    <div className="hero-image-overlay" style={{ backgroundImage: `url('/cosmic_hero_bg.png')` }} />
                    <div className="hero-bg-glow" />
                    <div className="container hero-content fade-in-up">
                        <div className="hero-badge"><Star size={14} color="var(--secondary-color)" /><span>Trusted by 50,000+ seekers worldwide</span></div>
                        <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: heroTitle?.replace(',', ',<br/>') || '' }}></h1>
                        <p className="hero-subtitle">{heroSubtitle}</p>
                        <div className="hero-actions">
                            <Link to="/signup" className="btn btn-primary btn-lg">Browse Astrologers <ArrowRight size={18} /></Link>
                            <Link to="/signup" className="btn btn-outline btn-lg">Join as Client</Link>
                        </div>
                        <div className="hero-trust">
                            {[['500+', 'Verified Astrologers'], ['50K+', 'Sessions Completed'], ['4.9★', 'Average Rating'], ['100%', 'Advance Payment Secured']].map(([v, l]) => (
                                <div key={l} className="trust-item">
                                    <strong className="gold-text">{v}</strong><span>{l}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '2.5rem', display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '0.75rem 1.25rem', borderRadius: '50px', border: '1px solid var(--secondary-color)' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                Roots Astro is owned by <span style={{ color: 'var(--secondary-color)', fontWeight: 700 }}>NEBZA Technologies Private Limited</span>. All rights reserved.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {(view === 'how-it-works' || !view) && (
                <section id="how-it-works" className="how-section">
                    <div className="container">
                        <div className="section-header">
                            <span className="section-eyebrow">Simple Process</span>
                            <h2 className="section-title">From Sign-up to Stars in 4 Steps</h2>
                            <p className="section-sub">Our streamlined flow gets you to your cosmic guide in minutes.</p>
                        </div>
                        <div className="steps-grid">
                            {[
                                { num: '01', icon: <Shield size={28} color="var(--secondary-color)" />, title: 'Create Account', desc: 'Quick registration. Choose your role — Client, Astrologer, or Writer.' },
                                { num: '02', icon: <Globe size={28} color="var(--secondary-color)" />, title: 'Browse Experts', desc: 'Explore verified astrologer profiles, read reviews, and find your perfect match.' },
                                { num: '03', icon: <CreditCard size={28} color="var(--secondary-color)" />, title: 'Book & Pay', desc: '100% advance secure payment. Instant booking confirmation to your email.' },
                                { num: '04', icon: <Video size={28} color="var(--secondary-color)" />, title: 'Consult via Zoom', desc: 'Auto-generated Zoom link. Your session, your recordings, your privacy.' },
                            ].map(s => (
                                <div key={s.num} className="step-card glass-card">
                                    <div className="step-num">{s.num}</div>
                                    <div className="step-icon">{s.icon}</div>
                                    <h3>{s.title}</h3>
                                    <p>{s.desc}</p>
                                    <ChevronRight className="step-arrow" size={20} color="var(--secondary-color)" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {(view === 'astrologers' || !view) && (
                <section id="astrologers" className="astrologers-section">
                    <div className="container">
                        <div className="section-header">
                            <span className="section-eyebrow">Expert Network</span>
                            <h2 className="section-title">Meet Our Verified Astrologers</h2>
                            <p className="section-sub">Every astrologer on our platform is background-checked, certified, and reviewed.</p>
                        </div>
                        <div className="astro-preview-grid">
                            {(liveAstrologers.length > 0 ? liveAstrologers : ASTROLOGERS).slice(0, 6).map(astro => (
                                <div key={astro.id} className="astro-preview-card glass-card">
                                    <div className="astro-preview-top">
                                        <div className="astro-avatar-home">{astro.name.charAt(0)}</div>
                                        <div className="preview-avail"><span className={`avail-dot ${astro.available ? 'online' : 'offline'}`} />{astro.available ? 'Available' : 'Unavailable'}</div>
                                    </div>
                                    <h3 className="astro-preview-name">{astro.name}</h3>
                                    <StarRating rating={astro.rating} />
                                    <div className="astro-tags" style={{ margin: '0.75rem 0' }}>
                                        {astro.expertise.slice(0, 2).map((e, i) => <span key={i} className="expertise-tag" style={{ border: '1px solid var(--secondary-color)', color: 'var(--secondary-color)', background: 'transparent' }}>{e}</span>)}
                                    </div>
                                    <div className="preview-footer">
                                        <div></div>
                                        <Link to="/login" className="btn btn-outline btn-sm">Book Now</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                            <Link to="/login" className="btn btn-primary">View All Astrologers <ArrowRight size={16} /></Link>
                        </div>
                    </div>
                </section>
            )}

            {(view === 'about' || !view) && (
                <section id="about" className="features-section" style={{ position: 'relative', overflow: 'hidden' }}>
                    <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="section-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <span className="section-eyebrow">Why {platformName}</span>
                            <h2 className="section-title">Built for Trust, Privacy & Excellence</h2>
                            <p className="section-sub">We combine ancient wisdom with modern security standards to provide a seamless experience.</p>
                        </div>
                        
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                            gap: '2rem' 
                        }}>
                            {[
                                { icon: <Shield size={32} color="var(--secondary-color)" />, title: feature1Title, desc: feature1Desc },
                                { icon: <CreditCard size={32} color="var(--secondary-color)" />, title: feature2Title, desc: feature2Desc },
                                { icon: <Zap size={32} color="var(--secondary-color)" />, title: feature3Title, desc: feature3Desc },
                            ].map((f, i) => (
                                <div key={f.title || i} className="glass-card" style={{ 
                                    padding: '2.5rem 2rem', 
                                    textAlign: 'center', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    animation: `fadeInUp 0.6s ease forwards ${i * 0.1}s`,
                                    opacity: 0,
                                    transform: 'translateY(20px)'
                                }}>
                                    <div style={{ 
                                        width: '64px', 
                                        height: '64px', 
                                        borderRadius: '50%', 
                                        background: 'rgba(212, 175, 55, 0.1)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        marginBottom: '1.5rem',
                                        boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)',
                                        border: '1px solid rgba(212, 175, 55, 0.2)'
                                    }}>
                                        {f.icon}
                                    </div>
                                    <h4 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{f.title}</h4>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section className="testimonials-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-eyebrow">Client Stories</span>
                        <h2 className="section-title">Transformative Experiences</h2>
                    </div>
                    <div className="testimonials-grid">
                        {TESTIMONIALS.map((t, i) => (
                            <div key={i} className="testimonial-card glass-card">
                                <div className="testimonial-stars">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={15} fill="var(--secondary-color)" color="var(--secondary-color)" />)}
                                </div>
                                <p className="testimonial-text">"{t.text}"</p>
                                <div className="testimonial-author">
                                    <div className="testimonial-avatar" style={{ background: 'var(--primary-color)', color: 'var(--secondary-color)', border: '1px solid var(--secondary-color)' }}>{t.name.charAt(0)}</div>
                                    <div><strong>{t.name}</strong><p>{t.role}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="cta-banner" style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #0A0710 100%)', borderTop: '1px solid var(--secondary-color)' }}>
                <div className="container cta-banner-inner">
                    <div>
                        <h2>Begin Your Cosmic Journey Today</h2>
                        <p>Join thousands who have found clarity, purpose, and direction through the stars.</p>
                    </div>
                    <div className="cta-banner-actions">
                        <Link to="/signup" className="btn btn-primary btn-lg">Get Started Free <ArrowRight size={18} /></Link>
                        <Link to="/login" className="btn btn-outline btn-lg" style={{ borderColor: '#fff', color: '#fff' }}>Login</Link>
                    </div>
                </div>
            </section>

            <footer className="site-footer">
                <div className="container footer-inner">
                    <div className="footer-brand">
                        <div className="brand" style={{ marginBottom: '1rem' }}>
                            <img src="/logo.png" alt="Logo" className="brand-logo-img" style={{ height: '38px', objectFit: 'contain' }} />
                            <span className="brand-text">{platformName?.split(' ')[0] || 'Roots'} <span className="brand-accent" style={{ color: 'var(--secondary-color)' }}>{platformName?.split(' ')[1] || 'Astro'}</span></span>
                        </div>
                        <p className="footer-tagline">Celestial guidance, professionally delivered. Available worldwide.</p>
                    </div>
                    <div className="footer-links">
                        <div className="footer-col"><h4>Platform</h4><Link to="/signup">Browse Astrologers</Link><Link to="/signup">How It Works</Link><Link to="/apply">Join as Partner</Link></div>
                        <div className="footer-col"><h4>Company</h4><Link to="/pages/about-us">About Us</Link><Link to="/pages/contact">Contact Us</Link><Link to="/pages/blog">Blog & Articles</Link></div>
                        <div className="footer-col"><h4>Legal</h4><Link to="/pages/privacy-policy">Privacy Policy</Link><Link to="/pages/terms-of-service">Terms of Service</Link><Link to="/pages/refund-policy">Refund Policy</Link><Link to="/pages/shipping-policy">Shipping Policy</Link><Link to="/pages/legal">Legal Notice</Link></div>
                    </div>
                </div>
                <div className="footer-bottom" style={{ background: 'var(--background-dark)', padding: '2rem', textAlign: 'center', borderTop: '1px solid var(--glass-border)', marginTop: '2rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        Roots Astro is owned by NEBZA Technologies Private Limited. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Home;
