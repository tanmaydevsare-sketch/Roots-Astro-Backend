import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Star, Settings, LogOut, ChevronDown, Menu, X, User, Shield, Check, Bell, Search, CreditCard, Wallet } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import API_URL from '../api/config';

const Navbar = ({ user, onLogout }) => {
    const { siteLogo } = useSettings();
    const navigate = useNavigate();
    const location = useLocation();
    const [profileOpen, setProfileOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleLogout = () => { onLogout(); setProfileOpen(false); setMobileOpen(false); navigate('/'); };

    const dashLink = () => {
        if (!user) return '/';
        return { CLIENT: '/client', ASTROLOGER: '/astrologer', WRITER: '/writer', ADMIN: '/admin' }[user.role] || '/';
    };

    useEffect(() => {
        const h = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setProfileOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => { setMobileOpen(false); }, [location.pathname]);
    useEffect(() => { document.body.style.overflow = mobileOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [mobileOpen]);

    /* ── Authenticated ── */
    if (user) {
        const fullName = user.name || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) || user.email || user.phone || 'User';
        const initials = fullName.charAt(0).toUpperCase();
        const displayName = user.firstName || user.name || (user.email ? user.email.split('@')[0] : 'User');
        const roleLabel = user.role.charAt(0) + user.role.slice(1).toLowerCase();


        return (
            <nav className="navbar" role="navigation">
                <div className="nav-inner">
                    <div className="nav-left">
                        <Link to={dashLink()} className="brand">
                            {siteLogo ? (
                                <img src={siteLogo.startsWith('http') ? siteLogo : `${API_URL}${siteLogo}`} alt="Logo" className="brand-logo-img" />
                            ) : (
                                <div className="brand-icon"><Star size={17} color="#1A1102" strokeWidth={2.5} /></div>
                            )}
                            <span className="brand-text">Roots <span className="brand-accent">Astro</span></span>
                        </Link>
                    </div>
                    <div className="nav-center">
                        {user.role === 'CLIENT' && (
                            <Link to="/client?tab=browse" className={`header-search-bar ${location.search === '?tab=browse' ? 'active' : ''}`}>
                                <Search size={16} />
                                <span>Search Astrologers...</span>
                            </Link>
                        )}
                    </div>
                    <div className="nav-right" ref={dropdownRef}>

                        {/* ── CLIENT: Notifications bell ── */}
                        {user.role === 'CLIENT' && (
                            <Link to="/client?tab=notifications" className={`nav-notif-btn ${location.search === '?tab=notifications' ? 'active' : ''}`} title="Notifications">
                                <Bell size={20} />
                            </Link>
                        )}


                        <button className="profile-trigger" onClick={() => setProfileOpen(o => !o)} aria-haspopup="true" aria-expanded={profileOpen}>
                            <div className="profile-avatar">{initials}</div>
                            <div className="profile-trigger-info">
                                <span className="profile-name">{displayName}</span>
                                <span className="profile-role">{roleLabel}</span>
                            </div>
                            <ChevronDown size={14} className={`profile-chevron ${profileOpen ? 'open' : ''}`} />
                        </button>
                        {profileOpen && (
                            <div className="profile-dropdown" role="menu">
                                <div className="profile-dropdown-mobile-header">
                                    <button className="profile-close-btn" onClick={() => setProfileOpen(false)}>
                                        <X size={20} />
                                        <span>Close Profile</span>
                                    </button>
                                </div>
                                <div className="profile-dropdown-header">
                                    <div className="profile-avatar profile-avatar-lg">{initials}</div>
                                    <div style={{ minWidth: 0 }}>
                                        <p className="profile-dropdown-name">{fullName}</p>
                                        <p className="profile-dropdown-email">{user.email || user.phone}</p>
                                        <span className="badge badge-success" style={{ marginTop: '0.3rem', display: 'inline-block' }}>{roleLabel}</span>
                                    </div>
                                </div>
                                 <div className="profile-dropdown-divider" />
                                {user.role === 'ASTROLOGER' ? (
                                    <>
                                        <Link to="/astrologer?tab=earnings" className="profile-dropdown-item" onClick={() => setProfileOpen(false)}>
                                            <Wallet size={15} />
                                            <span>My Earnings</span>
                                        </Link>
                                        <Link to="/astrologer?tab=settings" className="profile-dropdown-item" onClick={() => setProfileOpen(false)}>
                                            <Settings size={15} />
                                            <span>Settings</span>
                                        </Link>
                                    </>
                                ) : user.role === 'WRITER' ? (
                                    <Link to="/writer?tab=profile" className="profile-dropdown-item" onClick={() => setProfileOpen(false)}>
                                        <User size={15} />
                                        <span>My Profile</span>
                                    </Link>
                                ) : (
                                    <Link to="/client?tab=profile" className="profile-dropdown-item" onClick={() => setProfileOpen(false)}><User size={15} /><span>My Profile</span></Link>
                                )}
                                {user.role !== 'ASTROLOGER' && (
                                    <Link to={dashLink()} className="profile-dropdown-item" onClick={() => setProfileOpen(false)}><Settings size={15} /><span>Settings</span></Link>
                                )}
                                <div className="profile-dropdown-divider" />
                                <button className="profile-dropdown-item profile-dropdown-logout" onClick={handleLogout}><LogOut size={15} /><span>Logout</span></button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        );
    }


    /* ── Public ── */
    return (
        <>
            <nav className="navbar" role="navigation">
                <div className="nav-inner">
                    <div className="nav-left">
                        <Link to="/" className="brand">
                            {siteLogo ? (
                                <img src={siteLogo.startsWith('http') ? siteLogo : `${API_URL}${siteLogo}`} alt="Logo" className="brand-logo-img" />
                            ) : (
                                <div className="brand-icon"><Star size={17} color="#1A1102" strokeWidth={2.5} /></div>
                            )}
                            <span className="brand-text">Roots <span className="brand-accent">Astro</span></span>
                        </Link>
                    </div>
                    <nav className="nav-center">
                        <a href={location.pathname === '/' ? '#astrologers' : '/#astrologers'} className="nav-link">Our Astrologers</a>
                        <a href={location.pathname === '/' ? '#how-it-works' : '/#how-it-works'} className="nav-link">How It Works</a>
                        <a href={location.pathname === '/' ? '#about' : '/#about'} className="nav-link">About</a>
                    </nav>
                    <div className="nav-right">
                        <div className="nav-ctas">
                            <Link to="/login" className="nav-link">Login</Link>
                            <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
                        </div>
                        <button className={`hamburger ${mobileOpen ? 'is-open' : ''}`} onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
                            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>
            </nav>
            {mobileOpen && <div className="mobile-menu-overlay" onClick={() => setMobileOpen(false)} />}
            <div className={`mobile-menu ${mobileOpen ? 'is-open' : ''}`}>
                <div className="mobile-menu-inner">
                    <div className="mobile-menu-section">
                        <p className="mobile-menu-label">Explore</p>
                        <a href={location.pathname === '/' ? '#astrologers' : '/#astrologers'} className="mobile-menu-item" onClick={() => setMobileOpen(false)}><User size={17} /><span>Our Astrologers</span></a>
                        <a href={location.pathname === '/' ? '#how-it-works' : '/#how-it-works'} className="mobile-menu-item" onClick={() => setMobileOpen(false)}><Star size={17} /><span>How It Works</span></a>
                        <a href={location.pathname === '/' ? '#about' : '/#about'} className="mobile-menu-item" onClick={() => setMobileOpen(false)}><Shield size={17} /><span>About Us</span></a>
                    </div>
                    <div className="mobile-menu-divider" />
                    <div className="mobile-menu-cta">
                        <Link to="/signup" className="btn btn-primary btn-block" onClick={() => setMobileOpen(false)}>Get Started – It's Free</Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Navbar;
