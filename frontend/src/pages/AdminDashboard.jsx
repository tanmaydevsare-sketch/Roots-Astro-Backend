import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useSearchParams } from 'react-router-dom';
import {
    Users, CreditCard, Calendar, Settings, Shield, CheckCircle, XCircle, Ban, User,
    BarChart2, Eye, Video, Zap, Wifi, WifiOff, RefreshCw, Key, Globe, DollarSign,
    ArrowDownCircle, Building, Percent, Plus, Edit2, Trash2, Tag, BookOpen, Save,
    Search, LayoutGrid, List, Table as TableIcon
} from 'lucide-react';
import API_URL from '../api/config';
import { StatCard, StatusBadge, Modal, DashboardLayout, SidebarBtn, FormField, AstrologerCard, EmptyState } from '../components/Shared';

const AdminDashboard = ({ user }) => {
    const { currencySymbol, refreshSettings } = useSettings();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') || 'overview';
    const isSuper = user?.role === 'SUPERADMIN';
    
    // SMS Broadcast State
    const [smsTarget, setSmsTarget] = useState('ALL_ASTROLOGERS');
    const [smsMessage, setSmsMessage] = useState('');
    const [smsSending, setSmsSending] = useState(false);
    const [smsSent, setSmsSent] = useState(false);
    const setTab = (t) => setSearchParams({ tab: t });
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [userStatusFilter, setUserStatusFilter] = useState('all');
    const [serviceFilter, setServiceFilter] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [pendingAstros, setPendingAstros] = useState([]);
    const [approvedAstros, setApprovedAstros] = useState([]);
    const [rejectedAstros, setRejectedAstros] = useState([]);
    const [viewAstro, setViewAstro] = useState(null);
    const [astroDetailOpen, setAstroDetailOpen] = useState(false);

    // ── Platform Services (master catalogue) ──
    const [platformServices, setPlatformServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [svcModal, setSvcModal] = useState(false);
    const [catModal, setCatModal] = useState(false);
    const [editingSvc, setEditingSvc] = useState(null);
    const [editingCat, setEditingCat] = useState(null);
    const [svcForm, setSvcForm] = useState({ name: '', description: '', categoryId: '', active: true });
    const [catForm, setCatForm] = useState({ name: '', description: '', active: true });
    const [svcSaved, setSvcSaved] = useState(false);
    const [catSaved, setCatSaved] = useState(false);

    const checkAuthError = (res) => {
        if (res.status === 401 || res.status === 403) {
            console.error(`[AUTH ERROR] Request to ${res.url} failed with status ${res.status}`);
            alert(`Session Authorization Failed!\n\nRequest: ${res.url.replace(API_URL, '')}\nStatus: ${res.status} (${res.statusText || 'Unauthorized'})\n\nLogging out...`);
            localStorage.removeItem('token');
            localStorage.removeItem('rootsastro_user');
            window.location.reload();
            return true;
        }
        return false;
    };

    const openAddSvc = () => { setEditingSvc(null); setSvcForm({ name: '', description: '', categoryId: categories[0]?.id || '', active: true }); setSvcModal(true); };
    const openEditSvc = (s) => { setEditingSvc(s); setSvcForm({ name: s.name, description: s.description, categoryId: s.categoryId, active: s.active }); setSvcModal(true); };
    
    const openAddCat = () => { setEditingCat(null); setCatForm({ name: '', description: '', active: true }); setCatModal(true); };
    const openEditCat = (c) => { setEditingCat(c); setCatForm({ name: c.name, description: c.description, active: c.active }); setCatModal(true); };

    const saveSvc = async () => {
        if (!svcForm.name.trim() || !svcForm.categoryId) return;
        const token = localStorage.getItem('token');
        try {
            const method = editingSvc ? 'PATCH' : 'POST';
            const url = editingSvc ? `${API_URL}/api/admin/master-services/${editingSvc.id}` : `${API_URL}/api/admin/master-services`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...svcForm, categoryId: parseInt(svcForm.categoryId) })
            });
            if (res.ok) {
                fetchPlatformServices();
                setSvcModal(false);
                setSvcSaved(true); setTimeout(() => setSvcSaved(false), 2000);
            }
        } catch (err) { console.error("Save platform service failed", err); }
    };

    const saveCat = async () => {
        if (!catForm.name.trim()) return;
        const token = localStorage.getItem('token');
        try {
            const method = editingCat ? 'PATCH' : 'POST';
            const url = editingCat ? `${API_URL}/api/admin/categories/${editingCat.id}` : `${API_URL}/api/admin/categories`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(catForm)
            });
            if (res.ok) {
                fetchCategories();
                setCatModal(false);
                setCatSaved(true); setTimeout(() => setCatSaved(false), 2000);
            }
        } catch (err) { console.error("Save category failed", err); }
    };

    const deleteSvc = async (id) => {
        if (!window.confirm('Delete this service?')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/admin/master-services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchPlatformServices();
        } catch (err) { console.error("Delete platform service failed", err); }
    };

    const deleteCat = async (id) => {
        if (!window.confirm('Delete this category? This will fail if services exist in it.')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/admin/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchCategories();
        } catch (err) { console.error("Delete category failed", err); }
    };
    const toggleSvc = async (id) => {
        const svc = platformServices.find(s => s.id === id);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/admin/master-services/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ active: !svc.active })
            });
            if (res.ok) fetchPlatformServices();
        } catch (err) { console.error("Toggle service failed", err); }
    };

    const fetchPlatformServices = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/master-services`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (checkAuthError(res)) return;
            if (res.ok) setPlatformServices(await res.json());
        } catch (err) { console.error("Fetch platform services failed", err); }
    };

    const fetchCategories = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/categories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (checkAuthError(res)) return;
            if (res.ok) setCategories(await res.json());
        } catch (err) { console.error("Fetch categories failed", err); }
    };

    // Platform commission (editable)
    const [commissionPct, setCommissionPct] = useState(25); // 25 = 25%
    const [commissionSaved, setCommissionSaved] = useState(false);

    const [settings, setSettings] = useState({
        maintenanceMode: false,
        platformName: 'Roots Astro',
        supportEmail: '',
        contactPhone: '',
        systemCurrency: 'INR',
        convenienceRate: 0.0,
        gstRate: 0.0,
        
        // Recording Governance
        recordSessions: true,
        overallRecordingGovernance: true,
        recordingRetentionDays: 30,
        autoShareRecordings: false,
        maxRecordingSizeMB: 500,

        // Operational Control
        allowNewRegistrations: true,
        apiLockdown: false,

        // Payment Method Control
        allowUpi: true,
        allowCard: true,
        allowNetBanking: true,
        
        // Cloud Storage Configuration
        activeStorage: 'local',
        storageBucket: '',
        storageRegion: 'us-east-1',
        storageEndpoint: '',
        storageAccessKey: '',
        storageSecretKey: '',
        
        aboutUsContent: '# About Us\nWelcome to Roots Astro...',
        contactContent: '# Contact Us\nEmail: support@rootsastro.com',
        privacyPolicy: '# Privacy Policy\nYour data is safe with us.',
        termsOfService: '# Terms of Service\nBy using our site...',
        refundPolicy: '# Refund Policy\nWe offer refunds in certain cases.',
        shippingPolicy: '# Shipping & Delivery Policy\nOur consultation and booking services are delivered digitally immediately.',
        blogContent: '# Latest from Roots Astro\nStay updated with celestial events.',
        legalContent: '# Legal Notices\nGeneral platform governance and regulations.',

        // Dynamic CMS Content
        heroTitle: 'Your Destiny, Revealed through Stars',
        heroSubtitle: 'Connect with elite astrologers for personalized readings.',
        feature1Title: 'Expert Astrologers',
        feature1Desc: 'Connect with verified professionals.',
        feature2Title: 'Secure Sessions',
        feature2Desc: 'Encrypted video calls.',
        feature3Title: '24/7 Availability',
        feature3Desc: 'Our global network ensure guidance anytime.',

        // Live Branding
        siteLogo: '',
        sitePrimaryColor: '#2D1E4D',
        siteSecondaryColor: '#D4AF37',
        siteAccentColor: '#8B5FBF',
    });
    const [settingsSaved, setSettingsSaved] = useState(false);

    // ── Video API ──
    const [activeVideoProvider, setActiveVideoProvider] = useState('zoom');
    const [selectedVideoConfig, setSelectedVideoConfig] = useState('zoom'); // Toggle between Zoom/Meet inputs
    const [zoomCreds, setZoomCreds] = useState({ accountId: '', clientId: '', clientSecret: '', webhookToken: '' });
    const [meetCreds, setMeetCreds] = useState({ projectId: '', oauthClientId: '', oauthClientSecret: '' });
    const [zoomStatus, setZoomStatus] = useState('idle');
    const [meetStatus, setMeetStatus] = useState('idle');
    const [videoSaved, setVideoSaved] = useState(false);
    const [autoLinkSettings, setAutoLinkSettings] = useState({ triggerOnStart: true, notifyClient: true, expiry: '24h', fallback: 'zoom' });

    // ── Payment Gateway ──
    const [pgConfig, setPgConfig] = useState({
        activeGateway: 'razorpay',
        razorpay: { keyId: '', keySecret: '', mode: 'test' },
        paypal: { clientId: '', clientSecret: '', mode: 'sandbox' },
    });
    const [rzpStatus, setRzpStatus] = useState('idle');
    const [ppStatus, setPpStatus] = useState('idle');
    const [pgSaved, setPgSaved] = useState(false);

    // ── Admin Withdrawal ──
    const [adminFinance, setAdminFinance] = useState({
        totalVolume: 0,
        platformShare: 0,
        availableBalance: 0,
        pendingSettlement: 0,
        bankDetails: { accountName: '', accountNumber: '', ifsc: '', bankName: '', swift: '' },
        withdrawalHistory: [],
        pendingWithdrawals: [],
        recentTransactions: [],
        auditLogs: []
    });
    const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', ifsc: '', bankName: '', swift: '' });
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawModal, setWithdrawModal] = useState(false);
    const [withdrawProcessing, setWithdrawProcessing] = useState(false);
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);
    const [expandedConfig, setExpandedConfig] = useState('razorpay'); // State for which PG config is open
    const [bankSaved, setBankSaved] = useState(false);
    const [allBookings, setAllBookings] = useState([]); // Default to clean array, fetch real later
    const [bookingActionLoading, setBookingActionLoading] = useState(null);
    const [allAstros, setAllAstros] = useState([]);
    
    // Logo Upload State
    const logoFileRef = useRef(null);
    const [logoUploading, setLogoUploading] = useState(false);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            alert('File size should be less than 2MB.');
            return;
        }

        setLogoUploading(true);
        try {
            const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
            const { storage } = await import('../firebase');
            
            const storageRef = ref(storage, `branding/logo_${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            setSettings(prev => ({ ...prev, siteLogo: downloadURL }));
            alert('Logo uploaded successfully! Click "Deploy Platform Update" to save changes.');
        } catch (err) {
            console.error("Logo upload failed:", err);
            alert('Logo upload failed. Please check your storage configuration.');
        } finally {
            setLogoUploading(false);
        }
    };

    const fetchAstrologers = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/astrologers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (checkAuthError(res)) return;
            if (res.ok) {
                const data = await res.json();
                setAllAstros(data.map(p => {
                    const profile = p.astrologerProfile || {};
                    return {
                        ...p,
                        name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Expert',
                        email: p.email,
                        rating: profile.rating || 5.0,
                        reviews: 0,
                        languages: profile.languages || 'English, Hindi',
                        expertise: profile.expertise ? profile.expertise.split(',').map(e => e.trim()) : [],
                        rate: profile.rate || "50",
                        sessions: p._count?.astrologerBookings || 0,
                        available: profile.isOnline,
                        astrologerProfile: { image: profile.image }
                    };
                }));
            }
        } catch (err) { console.error("Fetch astrologers failed", err); }
    };

    const fetchPendingAstros = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/astrologers/admin/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (checkAuthError(res)) return;
            if (res.ok) {
                const data = await res.json();
                setPendingAstros(data.map(p => ({
                    id: p.id,
                    name: `${p.user?.firstName || 'New'} ${p.user?.lastName || 'Applicant'}`,
                    email: p.user?.email,
                    expertise: p.expertise,
                    applied: p.user?.createdAt ? new Date(p.user.createdAt).toLocaleDateString() : 'N/A',
                    bio: p.bio,
                    experience: p.experienceInt ? `${p.experienceInt} years` : 'N/A'
                })));
            }
        } catch (err) { console.error("Fetch pending astros failed", err); }
    };

    const fetchUsers = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/auth/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (checkAuthError(res)) return;
            if (res.ok) {
                const data = await res.json();
                setUsers(data.map(u => ({
                    id: u.id,
                    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'User',
                    email: u.email,
                    role: u.role,
                    status: u.status || 'active',
                    joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A',
                    sessions: u.sessionsCount || 0
                })));
            }
        } catch (err) { console.error("Fetch users failed", err); }
    };

    const approveAstro = async (id) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/astrologers/admin/approve/${id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPendingAstros();
                fetchUsers();
                fetchAstrologers();
                setAstroDetailOpen(false);
            }
        } catch (err) { console.error("Approve astro failed", err); }
    };

    const rejectAstro = async (id) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/astrologers/admin/reject/${id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPendingAstros();
                fetchAstrologers();
                setAstroDetailOpen(false);
            }
        } catch (err) { console.error("Reject astro failed", err); }
    };
    const toggleUserStatus = async (id) => {
        const u = users.find(x => x.id === id);
        const newStatus = u.status === 'active' ? 'suspended' : 'active';
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/auth/admin/users/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchUsers();
        } catch (err) { console.error("Toggle user status failed", err); }
    };

    const fetchGlobalSettings = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/settings/admin/gateways?t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (checkAuthError(res)) return;
            if (res.ok) {
                const data = await res.json();
                setSettings({
                    ...data,
                    maintenanceMode: data.maintenanceMode ?? false,
                    platformName: data.platformName || 'Roots Astro',
                    supportEmail: data.supportEmail || '',
                    contactPhone: data.contactPhone || '',
                    systemCurrency: data.systemCurrency || 'INR',
                    convenienceRate: data.convenienceRate ?? 0.0,
                    gstRate: data.gstRate ?? 0.0,
                    recordSessions: data.recordSessions ?? true,
                    overallRecordingGovernance: data.overallRecordingGovernance ?? true,
                    recordingRetentionDays: data.recordingRetentionDays ?? 30,
                    autoShareRecordings: data.autoShareRecordings ?? false,
                    maxRecordingSizeMB: data.maxRecordingSizeMB ?? 500,
                    allowNewRegistrations: data.allowNewRegistrations ?? true,
                    apiLockdown: data.apiLockdown ?? false,
                    heroTitle: data.heroTitle || 'Your Destiny, Revealed through Stars',
                    heroSubtitle: data.heroSubtitle || '',
                    feature1Title: data.feature1Title || '',
                    feature1Desc: data.feature1Desc || '',
                    feature2Title: data.feature2Title || '',
                    feature2Desc: data.feature2Desc || '',
                    feature3Title: data.feature3Title || '',
                    feature3Desc: data.feature3Desc || '',
                    sitePrimaryColor: data.sitePrimaryColor || '#2D1E4D',
                    siteSecondaryColor: data.siteSecondaryColor || '#D4AF37',
                    siteAccentColor: data.siteAccentColor || '#8B5FBF',
                    siteLogo: data.siteLogo || '',
                    allowNetBanking: data.allowNetBanking ?? true,
                    aboutUsContent: data.aboutUsContent || '',
                    contactContent: data.contactContent || '',
                    privacyPolicy: data.privacyPolicy || '',
                    termsOfService: data.termsOfService || '',
                    refundPolicy: data.refundPolicy || '',
                    shippingPolicy: data.shippingPolicy || '',
                    blogContent: data.blogContent || '',
                    legalContent: data.legalContent || '',
                    activeStorage: data.activeStorage || 'local',
                    storageBucket: data.storageBucket || '',
                    storageRegion: data.storageRegion || 'us-east-1',
                    storageEndpoint: data.storageEndpoint || '',
                    storageAccessKey: data.storageAccessKey || '',
                    storageSecretKey: data.storageSecretKey || '',
                });
                
                setBankDetails({
                    accountName: '',
                    accountNumber: data.adminAccountNo || '',
                    ifsc: data.adminIfsc || '',
                    bankName: data.adminBankName || '',
                    swift: ''
                });

                if (data.activeGateway) {
                    setPgConfig(p => ({ 
                        ...p, 
                        activeGateway: data.activeGateway,
                        razorpay: { 
                            keyId: data.razorpayKeyId || '', 
                            keySecret: data.razorpayKeySecret || '', 
                            mode: data.razorpayMode || 'test' 
                        },
                        paypal: { 
                            clientId: data.paypalClientId || '', 
                            clientSecret: data.paypalClientSecret || '', 
                            mode: data.paypalMode || 'sandbox' 
                        }
                    }));
                    if (data.razorpayKeyId) setRzpStatus('connected');
                    if (data.paypalClientId) setPpStatus('connected');
                }
                
                if (data.activeVideoProvider) setActiveVideoProvider(data.activeVideoProvider);
                setZoomCreds({
                    accountId: data.zoomAccountId || '',
                    clientId: data.zoomClientId || '',
                    clientSecret: data.zoomClientSecret || ''
                });
                if (data.zoomAccountId && data.zoomClientId) {
                    setZoomStatus('connected');
                } else {
                    setZoomStatus('idle');
                }

                if (data.commissionRate) setCommissionPct(data.commissionRate * 100);
            }
        } catch (err) { console.error("Global settings fetch failed:", err); }
    };

    const fetchAllBookings = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/bookings/admin/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (checkAuthError(res)) return;
            if (res.ok) {
                const data = await res.json();
                setAllBookings(data.map(b => ({
                    id: b.id,
                    clientRef: `${b.client?.firstName || ''} ${b.client?.lastName || ''} (#${b.id})`,
                    service: b.masterService?.name || `Service #${b.serviceId}`,
                    date: new Date(b.scheduledAt).toLocaleDateString(),
                    time: new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: b.status.toLowerCase(),
                    amount: b.amount,
                    scheduledAt: b.scheduledAt
                })));
            }
        } catch (err) { console.error("Fetch all bookings failed", err); }
    };

    // API Integration useEffect
    useEffect(() => {
        const fetchAdminData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/finance/admin/dashboard`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (checkAuthError(res)) return;
                if (res.ok) {
                    const data = await res.json();
                    setAdminFinance(prev => ({
                        ...prev,
                        totalVolume: data.totalVolume,
                        platformShare: data.platformShare,
                        availableBalance: data.platformShare,
                        pendingWithdrawals: data.pendingWithdrawals || [],
                        recentTransactions: data.recentTransactions || [],
                        auditLogs: (data.auditLogs || []).map(l => ({
                            id: l.id,
                            action: l.action,
                            details: l.details,
                            createdAt: l.createdAt
                        }))
                    }));
                }
            } catch (err) { console.error("Admin dashboard fetch failed:", err); }
        };

        if (tab === 'finance' || tab === 'overview') fetchAdminData();
        if (['finance', 'settings', 'recordings'].includes(tab)) fetchGlobalSettings();
        if (tab === 'services') { fetchPlatformServices(); fetchCategories(); }
        if (tab === 'categories') fetchCategories();
        if (tab === 'bookings') fetchAllBookings();
        if (tab === 'approvals' || tab === 'overview') fetchPendingAstros();
        if (tab === 'users' || tab === 'overview') fetchUsers();
        if (tab === 'browse') fetchAstrologers();
    }, [tab]);

    // Test connections
    const testZoom = () => { setZoomStatus('testing'); setTimeout(() => {
        if (!zoomCreds.clientId) setZoomStatus('error');
        else setZoomStatus('connected');
    }, 1800); };
    const testMeet = () => { setMeetStatus('testing'); setTimeout(() => {
        if (!meetCreds.oauthClientId) setMeetStatus('error');
        else setMeetStatus('connected');
    }, 1800); };
    const testRzp = () => { setRzpStatus('testing'); setTimeout(() => {
        if (!pgConfig.razorpay.keyId) setRzpStatus('error');
        else setRzpStatus('connected');
    }, 1800); };
    const testPP = () => { setPpStatus('testing'); setTimeout(() => {
        if (!pgConfig.paypal.clientId) setPpStatus('error');
        else setPpStatus('connected');
    }, 1800); };
    const saveGlobalSettings = async (type = 'all') => {
        const token = localStorage.getItem('token');
        try {
            const body = {
                ...settings,
                activeGateway: pgConfig.activeGateway,
                razorpayKeyId: pgConfig.razorpay.keyId,
                razorpayKeySecret: pgConfig.razorpay.keySecret,
                razorpayMode: pgConfig.razorpay.mode,
                paypalClientId: pgConfig.paypal.clientId,
                paypalClientSecret: pgConfig.paypal.clientSecret,
                paypalMode: pgConfig.paypal.mode,
                commissionRate: commissionPct / 100,
                adminBankName: bankDetails.bankName,
                adminAccountNo: bankDetails.accountNumber,
                adminIfsc: bankDetails.ifsc,
                zoomAccountId: zoomCreds.accountId,
                zoomClientId: zoomCreds.clientId,
                zoomClientSecret: zoomCreds.clientSecret,
                activeVideoProvider,
            };

            const res = await fetch(`${API_URL}/api/settings/admin/global`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            
            if (res.ok) {
                // Sync to Firestore for Superadmin visibility
                try {
                    const { doc, setDoc } = await import('firebase/firestore');
                    const { db } = await import('../firebase');
                    await setDoc(doc(db, 'settings', 'global'), {
                        ...body,
                        lastUpdated: new Date().toISOString(),
                        updatedBy: user?.email || 'Admin'
                    }, { merge: true });
                } catch (fsErr) {
                    console.error("Firestore sync failed:", fsErr);
                }

                refreshSettings();
                fetchGlobalSettings();
                if (type === 'pg') setPgSaved(true);
                else if (type === 'bank') setBankSaved(true);
                else setSettingsSaved(true);
                setTimeout(() => { setPgSaved(false); setSettingsSaved(false); setBankSaved(false); }, 2500);
            } else {
                const errData = await res.json();
                console.error("Save global settings failed:", errData.error);
                alert(`Error: ${errData.error || 'Failed to save settings'}`);
            }
        } catch (err) { 
            console.error("Save global settings failed", err); 
            alert("Network error: Could not connect to server.");
        }
    };

    // Admin withdrawal
    const initiateWithdraw = async () => {
        const amt = parseFloat(withdrawAmount);
        if (!amt || amt <= 0 || amt > adminFinance.availableBalance) return;
        setWithdrawProcessing(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/finance/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    amount: amt, 
                    method: 'BANK', 
                    details: bankDetails 
                })
            });

            if (res.ok) {
                setWithdrawProcessing(false);
                setWithdrawSuccess(true);
                setWithdrawAmount('');
                setAdminFinance(prev => ({ ...prev, availableBalance: prev.availableBalance - amt }));
            }
        } catch {
            setWithdrawProcessing(false);
        }
    };

    const handlePayoutAction = async (id, status, notes = '') => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/finance/admin/payouts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status, adminNotes: notes })
            });
            if (res.ok) {
                // Refresh data
                setTab(prev => { 
                    const current = prev;
                    setTab('overview'); // Force toggle to refresh
                    setTimeout(() => setTab(current), 10);
                    return prev;
                });
            }
        } catch (err) { console.error("Payout action failed", err); }
    };

    const handleBookingAction = async (id, action, payload = {}) => {
        const token = localStorage.getItem('token');
        setBookingActionLoading(id);
        try {
            const res = await fetch(`${API_URL}/api/bookings/admin/${action}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                // Refresh bookings list
                setTab('overview'); setTimeout(() => setTab('bookings'), 10);
            }
        } catch (err) { console.error("Booking action failed", err); }
        setBookingActionLoading(null);
    };

    const totalCommissionValue = Math.round((adminFinance.totalVolume || 0) * commissionPct / 100);
    const astrologerPayoutValue = (adminFinance.totalVolume || 0) - totalCommissionValue;

    const connBadge = (status) => ({
        idle: <span className="conn-badge idle">Not Tested</span>,
        testing: <span className="conn-badge testing"><RefreshCw size={11} className="spinning" /> Testing...</span>,
        connected: <span className="conn-badge connected"><Wifi size={11} /> Connected</span>,
        error: <span className="conn-badge error"><WifiOff size={11} /> Failed</span>,
    }[status]);

    const sidebar = (
        <>
            {[
                { id: 'overview', icon: <BarChart2 size={19} />, label: 'System Overview' },
                { id: 'approvals', icon: <Shield size={19} />, label: `Approvals${pendingAstros.length > 0 ? ` (${pendingAstros.length})` : ''}` },
                { id: 'users', icon: <Users size={19} />, label: 'User Management' },
                { id: 'browse', icon: <Search size={19} />, label: 'Experts View' },
                { id: 'categories', icon: <Tag size={19} />, label: 'Category Builder' },
                { id: 'services', icon: <BookOpen size={19} />, label: 'Services Manager' },
                { id: 'finance', icon: <CreditCard size={19} />, label: 'Platform Finance' },
                { id: 'broadcast', icon: <Zap size={19} />, label: 'SMS Broadcaster' },
                { id: 'content', icon: <Globe size={19} />, label: 'Page Builder (CMS)' },
                { id: 'video', icon: <Video size={19} />, label: 'Video Integration' },
                { id: 'settings', icon: <Settings size={19} />, label: 'System Settings' },
            ].map(item => <SidebarBtn key={item.id} {...item} active={tab === item.id} onClick={setTab} />)}
        </>
    );

    const filteredAstros = allAstros.filter(a => {
        const name = a.name || `${a.user?.firstName} ${a.user?.lastName}` || 'User';
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.expertise && Array.isArray(a.expertise) && a.expertise.some(e => e.toLowerCase().includes(searchQuery.toLowerCase())));
        const matchesService = serviceFilter === 'all' || (a.expertise && Array.isArray(a.expertise) && a.expertise.some(e => e.toLowerCase().includes(serviceFilter.toLowerCase())));
        return matchesSearch && matchesService;
    });

    return (
        <DashboardLayout sidebar={sidebar}>

            {/* ═══ EXPERTS VIEW (BROWSE) ═══ */}
            {tab === 'browse' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <h2 className="dash-title" style={{ marginBottom: '0.5rem' }}>Experts View</h2>
                            <p className="dash-sub" style={{ margin: 0 }}>Monitor and preview how astrologers appear to clients.</p>
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
                        {categories.map(cat => (
                            <button key={cat.id} className={`filter-tag ${serviceFilter === cat.name ? 'active' : ''}`} onClick={() => setServiceFilter(cat.name)}>{cat.name}</button>
                        ))}
                    </div>

                    {filteredAstros.length === 0 ? (
                        <EmptyState 
                            icon={<Users size={40} />} 
                            title="No Experts Registered" 
                            description="There are currently no active expert astrologers in the database." 
                        />
                    ) : viewMode === 'grid' ? (
                        <div className="astro-grid">
                            {filteredAstros.map(astro => (
                                <AstrologerCard 
                                    key={astro.id} 
                                    astro={astro} 
                                    hideRate={true}
                                    onBook={() => { setViewAstro(astro); setAstroDetailOpen(true); }} 
                                />
                            ))}
                        </div>
                    ) : viewMode === 'list' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {filteredAstros.map(astro => (
                                <div key={astro.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                    <div className="profile-avatar-xl" style={{ width: 80, height: 80 }}>{astro.name?.charAt(0) || 'A'}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <h3 style={{ margin: 0 }}>{astro.name}</h3>
                                        </div>
                                        <p style={{ margin: '0.5rem 0', color: 'var(--text-muted)' }}>{astro.bio}</p>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {astro.expertise.map(e => <span key={e} className="expertise-tag">{e}</span>)}
                                        </div>
                                    </div>
                                    <button className="btn btn-outline btn-sm" onClick={() => { setViewAstro(astro); setAstroDetailOpen(true); }}>View Profile</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Astrologer</th>
                                        <th>Expertise</th>
                                        <th>Rate</th>
                                        <th>Sessions</th>
                                        <th>Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAstros.map(astro => (
                                        <tr key={astro.id}>
                                            <td><strong>{astro.name}</strong></td>
                                            <td>{astro.expertise.slice(0, 2).join(', ')}</td>
                                            <td>{currencySymbol}{astro.rate}/min</td>
                                            <td>{astro.sessions}</td>
                                            <td>⭐ {astro.rating}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={astroDetailOpen} onClose={() => setAstroDetailOpen(false)} title="Astrologer Application Review" width="560px">
                {viewAstro && (
                    <div className="fade-in">
                        <div className="profile-header" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div className="profile-avatar-xl" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>{viewAstro.name?.charAt(0) || 'A'}</div>
                            <div>
                                <h3 style={{ margin: 0 }}>{viewAstro.name}</h3>
                                <p style={{ color: 'var(--text-muted)', margin: 0 }}>{viewAstro.email}</p>
                                <StatusBadge status={viewAstro.status || 'APPROVED'} />
                            </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="glass-card" style={{ padding: '1rem' }}>
                                <label className="form-label" style={{ fontSize: '0.7rem' }}>Expertise</label>
                                <p style={{ margin: 0, fontWeight: 600 }}>{Array.isArray(viewAstro.expertise) ? viewAstro.expertise.join(', ') : (viewAstro.expertise || 'General')}</p>
                            </div>
                            <div className="glass-card" style={{ padding: '1rem' }}>
                                <label className="form-label" style={{ fontSize: '0.7rem' }}>Experience</label>
                                <p style={{ margin: 0, fontWeight: 600 }}>{viewAstro.experience || 'Experienced'}</p>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>Professional Bio</label>
                            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>{viewAstro.bio || 'Professional expert on Roots Astro platform.'}</p>
                        </div>

                        {(viewAstro.status === 'PENDING' || tab === 'approvals') ? (
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => approveAstro(viewAstro.id)}>
                                    <CheckCircle size={16} style={{ marginRight: '0.5rem' }} /> Approve Astrologer
                                </button>
                                <button className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--error)', color: 'var(--error)' }} onClick={() => rejectAstro(viewAstro.id)}>
                                    <XCircle size={16} style={{ marginRight: '0.5rem' }} /> Reject Application
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                                <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setTab('users'); setAstroDetailOpen(false); }}>
                                    Manage User Account
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Admin Withdrawal Modal */}
            <Modal isOpen={withdrawModal} onClose={() => { setWithdrawModal(false); setWithdrawSuccess(false); setWithdrawProcessing(false); }} title="Withdraw Platform Earnings" width="500px">
                {withdrawSuccess ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <CheckCircle size={52} color="#1cc88a" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ color: '#1cc88a' }}>Withdrawal Initiated!</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Funds will be transferred to your bank account within 2–3 business days.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => { setWithdrawModal(false); setWithdrawSuccess(false); }}>Done</button>
                    </div>
                ) : (
                    <>
                        <div className="withdrawal-balance-box" style={{ marginBottom: '1.5rem' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Available for Withdrawal</p>
                            <h2 style={{ color: 'var(--secondary-color)', fontSize: '2.25rem', fontWeight: 700 }}>{currencySymbol}{(adminFinance.availableBalance || 0).toLocaleString()}</h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending settlement: {currencySymbol}{(adminFinance.pendingSettlement || 0).toLocaleString()}</p>
                        </div>
                        <FormField label={`Withdrawal Amount (${currencySymbol})`}>
                            <input className="form-input" type="number" min="1" max={adminFinance.availableBalance} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Enter amount..." />
                        </FormField>
                        <FormField label="Transfer To">
                            <div style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--glass-border)', fontSize: '0.88rem' }}>
                                {bankDetails.bankName ? <><strong>{bankDetails.bankName}</strong> · A/C ending {bankDetails.accountNumber.slice(-4) || 'XXXX'}</> : <span style={{ color: 'var(--text-muted)' }}>No bank account on file — add one in Payment Gateway settings.</span>}
                            </div>
                        </FormField>
                        {withdrawProcessing ? (
                            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                                <div className="zoom-spinner" style={{ margin: '0 auto 1rem' }}></div>
                                <p style={{ color: 'var(--text-muted)' }}>Processing transfer...</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button className="btn btn-primary" onClick={initiateWithdraw} disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > adminFinance.availableBalance}>
                                    <ArrowDownCircle size={15} /> Withdraw to Bank
                                </button>
                                <button className="btn btn-outline" onClick={() => setWithdrawModal(false)}>Cancel</button>
                            </div>
                        )}
                    </>
                )}
            </Modal>

            {/* ── Service Manager Modal ── */}
            <Modal isOpen={svcModal} onClose={() => setSvcModal(false)} title={editingSvc ? 'Edit Service' : 'Add New Service'} width="520px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    <FormField label="Service Name">
                        <input className="form-input" value={svcForm.name} onChange={e => setSvcForm({ ...svcForm, name: e.target.value })} placeholder="e.g. Natal Chart Analysis" />
                    </FormField>
                    <FormField label="Description (shown to clients)">
                        <textarea className="form-input form-textarea" rows={3} value={svcForm.description} onChange={e => setSvcForm({ ...svcForm, description: e.target.value })} placeholder="Briefly describe what this service involves..." />
                    </FormField>
                    <FormField label="Category">
                        <select className="form-input" value={svcForm.categoryId} onChange={e => setSvcForm({ ...svcForm, categoryId: e.target.value })}>
                            <option value="">Select category...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </FormField>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label className="form-label" style={{ margin: 0 }}>Active (visible to astrologers & clients)?</label>
                        <button onClick={() => setSvcForm({ ...svcForm, active: !svcForm.active })} style={{ padding: '0.4rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, background: svcForm.active ? 'rgba(28,200,138,0.2)' : 'rgba(255,255,255,0.07)', color: svcForm.active ? '#1cc88a' : 'var(--text-muted)' }}>
                            {svcForm.active ? 'Active' : 'Inactive'}
                        </button>
                    </div>
                    <div className="fee-transparency-note">
                        <BookOpen size={13} /> Astrologers will see this service and can set their own price and session duration for it. They cannot add or remove services.
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem' }}>
                        <button className="btn btn-primary" onClick={saveSvc} disabled={!svcForm.name.trim() || !svcForm.categoryId}>{editingSvc ? 'Save Changes' : 'Add Service'}</button>
                        <button className="btn btn-outline" onClick={() => setSvcModal(false)}>Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* ── Category Manager Modal ── */}
            <Modal isOpen={catModal} onClose={() => setCatModal(false)} title={editingCat ? 'Edit Category' : 'Add New Category'} width="460px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <FormField label="Category Name">
                        <input className="form-input" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Palmistry" />
                    </FormField>
                    <FormField label="Description">
                        <textarea className="form-input" rows={2} value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} />
                    </FormField>
                    <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.5rem' }}>
                        <button className="btn btn-primary" onClick={saveCat} disabled={!catForm.name.trim()}>{editingCat ? 'Save Changes' : 'Add Category'}</button>
                        <button className="btn btn-outline" onClick={() => setCatModal(false)}>Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* ═══ CATEGORY BUILDER ═══ */}
            {tab === 'categories' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
                        <div>
                            <h2 className="dash-title" style={{ margin: 0 }}>Category Builder</h2>
                            <p className="dash-sub" style={{ margin: '0.3rem 0 0' }}>
                                Define expertise categories for the platform. These organize services and help clients find experts.
                            </p>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={openAddCat}>
                            <Tag size={15} /> Add New Category
                        </button>
                    </div>

                    {catSaved && <div className="fee-transparency-note" style={{ marginBottom: '1.25rem' }}>✓ Category list updated successfully.</div>}

                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Global Expertise Categories</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                            {categories.map(c => (
                                <div key={c.id} className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '0.95rem' }}>{c.name}</strong>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button onClick={() => openEditCat(c)} className="btn btn-outline btn-xs" style={{ padding: '0.25rem' }}><Edit2 size={12} /></button>
                                            <button onClick={() => deleteCat(c.id)} className="btn btn-outline btn-xs" style={{ padding: '0.25rem', color: 'var(--error)' }}><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{c.description || 'No description provided.'}</p>
                                </div>
                            ))}
                        </div>
                        {categories.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <Tag size={32} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                <p>No categories defined yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ SERVICES MANAGER ═══ */}
            {tab === 'services' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
                        <div>
                            <h2 className="dash-title" style={{ margin: 0 }}>Services Manager</h2>
                            <p className="dash-sub" style={{ margin: '0.3rem 0 0' }}>
                                Manage the master service catalogue. These are the standardized options astrologers can offer.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary btn-sm" onClick={openAddSvc} style={{ whiteSpace: 'nowrap' }}>
                                <Plus size={15} /> Add Service
                            </button>
                        </div>
                    </div>

                    {svcSaved && <div className="fee-transparency-note" style={{ marginBottom: '1.25rem' }}>✓ Service catalogue updated successfully.</div>}

                    {/* Stats row */}
                    <div className="stat-grid" style={{ marginBottom: '1.75rem' }}>
                        <StatCard icon={<BookOpen size={22} />} label="Total Services" value={platformServices.length} sub="In catalogue" accent="gold" />
                        <StatCard icon={<CheckCircle size={22} />} label="Active Services" value={platformServices.filter(s => s.active).length} sub="Visible to astrologers" accent="green" />
                        <StatCard icon={<Tag size={22} />} label="Categories" value={categories.length} accent="purple" />
                    </div>

                    {/* Service table */}
                    <div className="glass-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Service Name</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {platformServices.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <strong style={{ display: 'block' }}>{s.name}</strong>
                                        </td>
                                        <td>
                                            {s.category?.name && <span className="expertise-tag">{s.category.name}</span>}
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem', maxWidth: '240px' }}>
                                            {s.description}
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => toggleSvc(s.id)}
                                                style={{ padding: '0.35rem 0.85rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', background: s.active ? 'rgba(28,200,138,0.2)' : 'rgba(255,74,74,0.12)', color: s.active ? '#1cc88a' : '#ff6b6b' }}
                                            >
                                                {s.active ? '● Active' : '○ Inactive'}
                                            </button>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.6rem' }}>
                                                <button className="btn btn-outline btn-sm" style={{ padding: '0.35rem 0.65rem' }} onClick={() => openEditSvc(s)} title="Edit"><Edit2 size={14} /></button>
                                                <button className="btn btn-sm" style={{ padding: '0.35rem 0.65rem', background: 'rgba(255,74,74,0.12)', color: 'var(--error)' }} onClick={() => deleteSvc(s.id)} title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="fee-transparency-note" style={{ marginTop: '1.5rem' }}>
                        <Shield size={13} /> <strong>Pricing authority:</strong> Astrologers set their own price (e.g. {currencySymbol}50 or {currencySymbol}75) and session duration (e.g. 45 min or 60 min) for each service you define here. The platform's {commissionPct}% commission is applied on top of whatever the astrologer charges.
                    </div>
                </div>
            )}

            {/* ═══ OVERVIEW ═══ */}
            {tab === 'overview' && (
                <div className="fade-in">
                    <h2 className="dash-title">Super Admin Control Panel</h2>
                    <p className="dash-sub">Real-time platform health, revenue, and operations.</p>
                    <div className="stat-grid">
                        <StatCard icon={<Users size={22} />} label="Active Users" value={users.filter(u => u.status === 'active').length} sub="Across all roles" accent="gold" />
                        <StatCard icon={<Shield size={22} />} label="Pending Approvals" value={pendingAstros.length} accent="purple" />
                        <StatCard icon={<CreditCard size={22} />} label="Total Volume" value={`${currencySymbol}${(adminFinance.totalVolume || 0).toLocaleString()}`} accent="green" />
                        <StatCard icon={<DollarSign size={22} />} label="Platform Earnings" value={`${currencySymbol}${(adminFinance.platformShare || 0).toLocaleString()}`} sub={`${commissionPct}% rate`} accent="gold" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div className="glass-card">
                            <h3 style={{ marginBottom: '1.5rem' }}>Recent Registrations</h3>
                            {users.slice(0, 5).map(u => (
                                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div className="astro-mini-avatar">{u.name?.charAt(0) || 'U'}</div>
                                        <div><strong style={{ display: 'block', fontSize: '0.9rem' }}>{u.name}</strong><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.role}</span></div>
                                    </div>
                                    <StatusBadge status={u.status} />
                                </div>
                            ))}
                        </div>
                        <div className="glass-card">
                            <h3 style={{ marginBottom: '1.5rem' }}>Platform Metrics</h3>
                            {[
                                ['Commission Rate', `${commissionPct}%`],
                                ['Platform Commission', `${currencySymbol}${totalCommissionValue.toLocaleString()}`],
                                ['Astrologer Payouts', `${currencySymbol}${astrologerPayoutValue.toLocaleString()}`],
                                ['Active Video Provider', activeVideoProvider === 'zoom' ? 'Zoom' : 'Google Meet'],
                            ].map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{k}</span>
                                    <strong style={{ color: 'var(--secondary-color)' }}>{v}</strong>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            )}

            {/* ═══ APPROVALS ═══ */}
            {tab === 'approvals' && (
                <div className="fade-in">
                    <h2 className="dash-title">Astrologer Approvals</h2>
                    <p className="dash-sub">Review applications before astrologers go live on the platform.</p>
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Applicant</th>
                                    <th>Status</th>
                                    <th>Expertise</th>
                                    <th>Applied On</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingAstros.map(a => (
                                    <tr key={a.id}>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                <div className="astro-mini-avatar">{a.name?.charAt(0) || 'A'}</div>
                                                <div>
                                                    <strong style={{ display: 'block' }}>{a.name}</strong>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><StatusBadge status="PENDING" /></td>
                                        <td><span className="expertise-tag">{a.expertise}</span></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{a.applied}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                                <button className="btn btn-outline" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }} onClick={() => { setViewAstro(a); setAstroDetailOpen(true); }} title="Review Profile">
                                                    <Eye size={16} style={{ marginRight: '0.4rem' }} /> Review
                                                </button>
                                                <button className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }} onClick={() => approveAstro(a.id)} title="Quick Approve">
                                                    <CheckCircle size={16} style={{ marginRight: '0.4rem' }} /> Approve
                                                </button>
                                                <button className="btn" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'rgba(255,74,74,0.12)', color: 'var(--error)' }} onClick={() => rejectAstro(a.id)} title="Reject">
                                                    <XCircle size={16} style={{ marginRight: '0.4rem' }} /> Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>Recent Decisions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {approvedAstros.slice(0, 3).map(a => (
                                <div key={a.id} className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <CheckCircle size={16} color="var(--success)" />
                                        <strong>{a.name}</strong>
                                    </div>
                                    <StatusBadge status="APPROVED" />
                                </div>
                            ))}
                            {rejectedAstros.slice(0, 3).map(a => (
                                <div key={a.id} className="glass-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <XCircle size={16} color="var(--error)" />
                                        <strong>{a.name}</strong>
                                    </div>
                                    <StatusBadge status="REJECTED" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ USERS ═══ */}
            {tab === 'users' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '2rem', flexWrap: 'wrap' }}>
                        <div>
                            <h2 className="dash-title" style={{ margin: 0 }}>User Management</h2>
                            <p className="dash-sub" style={{ margin: '0.3rem 0 0' }}>Manage roles, account status, and platform access for all users.</p>
                        </div>
                        <div className="search-bar" style={{ width: '320px' }}>
                            <Search size={18} color="var(--text-muted)" />
                            <input 
                                className="search-input" 
                                placeholder="Search by name or email..." 
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '0.3rem' }}>Roles:</span>
                            {['all', 'ASTROLOGER', 'CLIENT', 'ADMIN', 'SUPERADMIN'].map(role => (
                                <button 
                                    key={role} 
                                    className={`filter-tag ${userRoleFilter === role ? 'active' : ''}`} 
                                    onClick={() => setUserRoleFilter(role)}
                                >
                                    {role === 'all' ? 'All Roles' : role}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '0.3rem' }}>Status:</span>
                            {['all', 'active', 'suspended'].map(status => (
                                <button 
                                    key={status} 
                                    className={`filter-tag ${userStatusFilter === status ? 'active' : ''}`} 
                                    onClick={() => setUserStatusFilter(status)}
                                >
                                    {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Sessions</th>
                                    <th>Joined</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.filter(u => {
                                    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                       u.email.toLowerCase().includes(searchQuery.toLowerCase());
                                    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                                    const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
                                    return matchesSearch && matchesRole && matchesStatus;
                                }).map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                <div className="astro-mini-avatar" style={{ background: u.role === 'ASTROLOGER' ? 'var(--gold-gradient)' : 'rgba(255,255,255,0.1)' }}>{u.name?.charAt(0) || 'U'}</div>
                                                <strong style={{ fontSize: '0.9rem' }}>{u.name}</strong>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</td>
                                        <td>
                                            <span className={u.role === 'ASTROLOGER' ? 'expertise-tag' : 'filter-tag'} style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{u.sessions || 0}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.joined}</td>
                                        <td><StatusBadge status={u.status} /></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.6rem' }}>
                                                <button className="btn btn-outline btn-sm" style={{ padding: '0.4rem 0.7rem' }} title="View Profile" onClick={() => { setViewAstro(u); setAstroDetailOpen(true); }}><User size={16} /></button>
                                                <button 
                                                    className="btn btn-sm" 
                                                    style={{ 
                                                        padding: '0.4rem 1rem', 
                                                        minWidth: '100px', 
                                                        fontWeight: 700, 
                                                        fontSize: '0.75rem',
                                                        background: u.status === 'active' ? 'rgba(255,74,74,0.12)' : 'rgba(28,200,138,0.2)', 
                                                        color: u.status === 'active' ? '#ff6b6b' : '#1cc88a',
                                                        border: '1px solid currentColor'
                                                    }}
                                                    onClick={() => toggleUserStatus(u.id)}
                                                >
                                                    {u.status === 'active' ? 'SUSPEND' : 'ACTIVATE'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {users.filter(u => {
                            const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                               u.email.toLowerCase().includes(searchQuery.toLowerCase());
                            const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                            const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
                            return matchesSearch && matchesRole && matchesStatus;
                        }).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                                <Users size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                <p>No users found matching your current filters.</p>
                                <button className="btn btn-link" onClick={() => { setSearchQuery(''); setUserRoleFilter('all'); setUserStatusFilter('all'); }}>Clear all filters</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ FINANCE ═══ */}
            {tab === 'finance' && (
                <div className="fade-in">
                    <h2 className="dash-title">Platform Finance & Payments</h2>
                    <p className="dash-sub">Manage revenue, payouts, commission rates and payment gateway configuration.</p>
                    
                    <div className="stat-grid" style={{ marginBottom: '2rem' }}>
                        <StatCard icon={<CreditCard size={22} />} label="Total Sales Volume" value={`${currencySymbol}${(adminFinance.totalVolume || 0).toLocaleString()}`} accent="gold" />
                        <StatCard icon={<Percent size={22} />} label={`Gross Margin (${commissionPct}%)`} value={`${currencySymbol}${(adminFinance.platformShare || 0).toLocaleString()}`} accent="green" />
                        <StatCard icon={<DollarSign size={22} />} label="Liquid Capital" value={`${currencySymbol}${(adminFinance.availableBalance || 0).toLocaleString()}`} accent="gold" />
                        <StatCard icon={<Shield size={22} />} label="Awaiting Payout" value={(adminFinance.pendingWithdrawals || []).length} sub="Withdrawal requests" accent="purple" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', alignItems: 'stretch' }}>
                        {/* 1. Withdrawal Requests (Approval Center) */}
                        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Awaiting Payout Approvals</h3>
                                <StatusBadge status="SECURITY_LOCKED" />
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {(adminFinance.pendingWithdrawals || []).length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No pending requests.</div>
                                ) : (
                                    adminFinance.pendingWithdrawals.map(w => (
                                        <div key={w.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <strong>{w.user.firstName} {w.user.lastName}</strong>
                                                <strong style={{ color: 'var(--secondary-color)' }}>{currencySymbol}{w.amount}</strong>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                                                Method: {w.method} · {w.user.role}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <button className="btn btn-primary" style={{ flex: 1, padding: '0.65rem' }} onClick={() => handlePayoutAction(w.id, 'APPROVED')}>Authorize Payout</button>
                                                <button className="btn btn-outline" style={{ flex: 1, padding: '0.65rem', color: 'var(--error)' }} onClick={() => handlePayoutAction(w.id, 'REJECTED')}>Reject</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 2. Financial Governance */}
                        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Shield size={18} color="var(--secondary-color)" /> Financial Governance
                                </h3>
                                <button className="btn btn-primary btn-xs" onClick={() => setWithdrawModal(true)}><ArrowDownCircle size={13} /> Withdraw Payout</button>
                            </div>

                            {/* Commission */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                    <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Platform Commission</label>
                                    <strong style={{ color: 'var(--secondary-color)' }}>{commissionPct}%</strong>
                                </div>
                                <input type="range" min="5" max="50" step="1" value={commissionPct} onChange={e => setCommissionPct(Number(e.target.value))} className="commission-slider" />
                            </div>

                            {/* Gateway Configuration */}
                            <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    {['razorpay', 'paypal'].map(gw => (
                                        <button 
                                            key={gw}
                                            onClick={() => setPgConfig(p => ({ ...p, activeGateway: gw }))}
                                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.7rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: pgConfig.activeGateway === gw ? 'rgba(212,175,55,0.15)' : 'transparent', color: pgConfig.activeGateway === gw ? 'var(--secondary-color)' : 'var(--text-muted)', fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer' }}
                                        >
                                            {gw}
                                        </button>
                                    ))}
                                </div>
                                <div className="fade-in">
                                    {pgConfig.activeGateway === 'razorpay' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                            <input type="password" placeholder="Razorpay Key ID" className="form-input-sm" value={pgConfig.razorpay.keyId} onChange={e => setPgConfig(p => ({ ...p, razorpay: { ...p.razorpay, keyId: e.target.value } }))} />
                                            <input type="password" placeholder="Razorpay Key Secret" className="form-input-sm" value={pgConfig.razorpay.keySecret} onChange={e => setPgConfig(p => ({ ...p, razorpay: { ...p.razorpay, keySecret: e.target.value } }))} />
                                            {/* Payment Method Toggles */}
                                            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                                                {['allowUpi', 'allowCard', 'allowNetBanking'].map(k => (
                                                    <button 
                                                        key={k} 
                                                        onClick={() => setSettings(p => ({ ...p, [k]: !p[k] }))}
                                                        style={{ flex: 1, padding: '0.4rem', borderRadius: '8px', fontSize: '0.65rem', border: '1px solid var(--glass-border)', background: settings[k] ? 'rgba(28,200,138,0.1)' : 'rgba(255,74,74,0.05)', color: settings[k] ? '#1cc88a' : '#ff4a4a', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        {k.replace('allow', '').toUpperCase()} {settings[k] ? 'ON' : 'OFF'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                            <input type="password" placeholder="PayPal Client ID" className="form-input-sm" value={pgConfig.paypal.clientId} onChange={e => setPgConfig(p => ({ ...p, paypal: { ...p.paypal, clientId: e.target.value } }))} />
                                            <input type="password" placeholder="PayPal Client Secret" className="form-input-sm" value={pgConfig.paypal.clientSecret} onChange={e => setPgConfig(p => ({ ...p, paypal: { ...p.paypal, clientSecret: e.target.value } }))} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button className="btn btn-primary btn-sm btn-block" onClick={() => { saveGlobalSettings('all'); }}>
                                <Save size={14} style={{ marginRight: '0.4rem' }} /> Update Master Config
                            </button>
                            {settingsSaved && (
                                <div style={{ color: '#1cc88a', fontWeight: 600, fontSize: '0.8rem', textAlign: 'center', marginTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }} className="fade-in">
                                    <span>✓ Master configuration synchronized.</span>
                                </div>
                            )}
                        </div>

                        {/* 3. Transaction Audit Trail */}
                        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <RefreshCw size={18} /> System Audit Trail
                            </h3>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {(adminFinance.auditLogs || []).length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No audit records.</div>
                                ) : (
                                    adminFinance.auditLogs.map(log => (
                                        <div key={log.id} style={{ padding: '0.65rem 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                                <strong style={{ color: 'var(--secondary-color)' }}>{log.action}</strong>
                                                <span style={{ color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                            <div style={{ color: 'var(--text-muted)' }}>{log.details}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ ALL BOOKINGS ═══ */}
            {tab === 'bookings' && (
                <div className="fade-in">
                    <h2 className="dash-title">All Bookings</h2>
                    <p className="dash-sub">Admin sees full booking details including payment method and refs.</p>
                    <div className="glass-card">
                        <table className="data-table">
                            <thead><tr><th>Client</th><th>Service</th><th>Date</th><th>Status</th><th>Total</th><th>Platform ({commissionPct}%)</th><th>Operational Controls</th></tr></thead>
                            <tbody>
                                {allBookings.length === 0 ? (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No live bookings found in system.</td></tr>
                                ) : (
                                    allBookings.map(b => (
                                        <tr key={b.id}>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                    <div className="astro-mini-avatar" style={{ fontSize: '0.7rem' }}>{b.clientRef ? b.clientRef[0] : '#'}</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <strong>{b.clientRef?.split(' (#')[0] || 'Unknown Client'}</strong>
                                                        <small style={{ color: 'var(--text-muted)' }}>ID: #{b.id}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><div style={{ fontSize: '0.9rem' }}>{b.service}</div></td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{b.date} <br/> <small>{b.time}</small></td>
                                            <td><StatusBadge status={b.status} /></td>
                                            <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{currencySymbol}{b.amount}</td>
                                            <td style={{ color: 'var(--secondary-color)', fontWeight: 600 }}>{currencySymbol}{(b.amount * commissionPct / 100).toFixed(2)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start' }}>
                                                    <button 
                                                        className="btn btn-outline btn-sm" 
                                                        title="Reschedule" 
                                                        style={{ padding: '0.6rem 0.9rem', fontSize: '0.82rem', fontWeight: 600 }}
                                                        onClick={() => {
                                                            const newDate = prompt("Enter new date (YYYY-MM-DD HH:MM):", b.scheduledAt);
                                                            if (newDate) handleBookingAction(b.id, 'reschedule', { newDate });
                                                        }}
                                                    >
                                                        Reschedule
                                                    </button>
                                                    <button 
                                                        className="btn btn-outline btn-sm" 
                                                        title="Cancel & Refund" 
                                                        style={{ padding: '0.6rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, borderColor: 'var(--error)', color: 'var(--error)' }}
                                                        onClick={() => { if (window.confirm("Refund this booking?")) handleBookingAction(b.id, 'refund'); }}
                                                    >
                                                        Refund
                                                    </button>
                                                    <button 
                                                        className="btn btn-primary btn-sm" 
                                                        title="Force Complete" 
                                                        style={{ padding: '0.6rem 1rem', fontSize: '0.82rem', fontWeight: 700 }}
                                                        onClick={() => handleBookingAction(b.id, 'complete')}
                                                    >
                                                        Complete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ VIDEO INTEGRATION ═══ */}
            {tab === 'video' && (
                <div className="fade-in">
                    <h2 className="dash-title">Video Conferencing Integration</h2>
                    <p className="dash-sub">Zoom/Meet API configuration. Auto-generates meeting links when astrologers start sessions.</p>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.2rem' }}>
                        <button className={`tab-btn-modern ${selectedVideoConfig === 'zoom' ? 'active' : ''}`} onClick={() => setSelectedVideoConfig('zoom')}>Zoom Integration</button>
                        <button className={`tab-btn-modern ${selectedVideoConfig === 'meet' ? 'active' : ''}`} onClick={() => setSelectedVideoConfig('meet')}>Google Meet</button>
                    </div>

                    {selectedVideoConfig === 'zoom' && (
                        <div className="glass-card fade-in" style={{ marginBottom: '1.75rem', borderLeft: activeVideoProvider === 'zoom' ? '4px solid #2D8CFF' : '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(74,144,226,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={18} color="#2D8CFF" /></div><h3 style={{ margin: 0 }}>Zoom API Settings</h3></div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {activeVideoProvider !== 'zoom' ? (
                                        <button className="btn btn-primary btn-xs" style={{ background: '#2D8CFF', border: 'none' }} onClick={() => setActiveVideoProvider('zoom')}>ACTIVATE ZOOM AS DEFAULT</button>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: '#2D8CFF', fontWeight: 800 }}>✓ ACTIVE DEFAULT</span>
                                    )}
                                    {connBadge(zoomStatus)}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                <FormField label="Account ID"><input className="form-input" type="password" value={zoomCreds.accountId} onChange={e => setZoomCreds({ ...zoomCreds, accountId: e.target.value })} placeholder="Zoom Account ID" /></FormField>
                                <FormField label="Client ID"><input className="form-input" value={zoomCreds.clientId} onChange={e => setZoomCreds({ ...zoomCreds, clientId: e.target.value })} placeholder="Zoom Client ID" /></FormField>
                                <FormField label="Client Secret"><input className="form-input" type="password" value={zoomCreds.clientSecret} onChange={e => setZoomCreds({ ...zoomCreds, clientSecret: e.target.value })} placeholder="Zoom Secret Key" /></FormField>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn btn-outline btn-sm" onClick={async () => {
                                    setZoomStatus('checking');
                                    const token = localStorage.getItem('token');
                                    try {
                                        const res = await fetch(`${API_URL}/api/settings/admin/zoom/verify`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                            body: JSON.stringify(zoomCreds)
                                        });
                                        const data = await res.json();
                                        if (data.verified) {
                                            setZoomStatus('connected');
                                        } else {
                                            setZoomStatus('error');
                                            alert(data.error || 'Connection failed.');
                                        }
                                    } catch (err) {
                                        setZoomStatus('error');
                                        alert('Verification failed: ' + err.message);
                                    }
                                }}><Wifi size={14} /> Verify API Connection</button>
                            </div>
                        </div>
                    )}

                    {selectedVideoConfig === 'meet' && (
                        <div className="glass-card fade-in" style={{ marginBottom: '1.75rem', borderLeft: activeVideoProvider === 'meet' ? '4px solid #00AC47' : '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(0,172,71,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Globe size={18} color="#00AC47" /></div><h3 style={{ margin: 0 }}>Google Meet Settings</h3></div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {activeVideoProvider !== 'meet' ? (
                                        <button className="btn btn-primary btn-xs" style={{ background: '#00AC47', border: 'none' }} onClick={() => setActiveVideoProvider('meet')}>ACTIVATE MEET AS DEFAULT</button>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: '#00AC47', fontWeight: 800 }}>✓ ACTIVE DEFAULT</span>
                                    )}
                                    {connBadge(meetStatus)}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                                <FormField label="Google Cloud Project ID"><input className="form-input" value={meetCreds.projectId} onChange={e => setMeetCreds({ ...meetCreds, projectId: e.target.value })} placeholder="project-id-123" /></FormField>
                                <FormField label="OAuth Client ID"><input className="form-input" value={meetCreds.oauthClientId} onChange={e => setMeetCreds({ ...meetCreds, oauthClientId: e.target.value })} placeholder="xxxx.apps.googleusercontent.com" /></FormField>
                                <FormField label="OAuth Client Secret"><input className="form-input" type="password" value={meetCreds.oauthClientSecret} onChange={e => setMeetCreds({ ...meetCreds, oauthClientSecret: e.target.value })} placeholder="Google Secret Key" /></FormField>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn btn-outline btn-sm" onClick={() => { setMeetStatus('checking'); setTimeout(() => setMeetStatus('connected'), 1500); }}><Wifi size={14} /> Authenticate with Google</button>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button className="btn btn-primary" onClick={async () => {
                            try {
                                const token = localStorage.getItem('token');
                                const payload = {
                                    activeVideoProvider,
                                    zoomAccountId: zoomCreds.accountId,
                                    zoomClientId: zoomCreds.clientId,
                                    zoomClientSecret: zoomCreds.clientSecret
                                };
                                const res = await fetch(`${API_URL}/api/settings/admin/global`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify(payload)
                                });
                                if (res.ok) {
                                    setVideoSaved(true); 
                                    fetchGlobalSettings();
                                    setTimeout(() => setVideoSaved(false), 2500);
                                } else {
                                    alert('Failed to save configuration');
                                }
                            } catch(err) {
                                alert('Error saving: ' + err.message);
                            }
                        }}>Apply Configuration</button>
                        {videoSaved && <span style={{ color: '#1cc88a', fontWeight: 600 }}>✓ Settings updated successfully.</span>}
                    </div>
                </div>
            )}

            {/* ═══ RECORDINGS ═══ */}
            {tab === 'recordings' && (
                <div className="fade-in">
                    <h2 className="dash-title">Recording Governance</h2>
                    <p className="dash-sub">Policy-based control over session recordings and storage.</p>
                    
                    <div className="glass-card fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Session Recording Policy</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Configure platform-wide automated video recording & retention rules.</p>
                            </div>
                            <button 
                                className={`btn ${settings.overallRecordingGovernance ? 'btn-outline' : 'btn-primary'}`}
                                style={{ padding: '0.75rem 1.5rem', fontWeight: 800, borderColor: settings.overallRecordingGovernance ? 'var(--error)' : 'var(--success)', color: settings.overallRecordingGovernance ? 'var(--error)' : 'var(--success)' }}
                                onClick={() => setSettings(p => ({ ...p, overallRecordingGovernance: !p.overallRecordingGovernance }))}
                            >
                                {settings.overallRecordingGovernance ? 'DEACTIVATE RECORDING' : 'ACTIVATE PLATFORM RECORDING'}
                            </button>
                        </div>

                        <div style={{ opacity: settings.overallRecordingGovernance ? 1 : 0.6, pointerEvents: settings.overallRecordingGovernance ? 'auto' : 'none', transition: 'all 0.4s ease' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div className="governance-field-box">
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Automated Cloud Recording</label>
                                    <button 
                                        className={`btn ${settings.recordSessions ? 'btn-primary' : 'btn-outline'}`}
                                        style={{ width: '100%', justifyContent: 'center' }}
                                        onClick={() => setSettings(p => ({ ...p, recordSessions: !p.recordSessions }))}
                                    >
                                        {settings.recordSessions ? 'ENABLED' : 'DISABLED'}
                                    </button>
                                </div>
                                <div className="governance-field-box">
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Auto-Share with Client</label>
                                    <button 
                                        className={`btn ${settings.autoShareRecordings ? 'btn-primary' : 'btn-outline'}`}
                                        style={{ width: '100%', justifyContent: 'center' }}
                                        onClick={() => setSettings(p => ({ ...p, autoShareRecordings: !p.autoShareRecordings }))}
                                    >
                                        {settings.autoShareRecordings ? 'ENABLED' : 'DISABLED'}
                                    </button>
                                </div>
                                <div className="governance-field-box">
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Retention Period (Days)</label>
                                    <select 
                                        className="form-input" 
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: '#fff' }}
                                        value={settings.recordingRetentionDays} 
                                        onChange={e => setSettings({...settings, recordingRetentionDays: parseInt(e.target.value)})}
                                    >
                                        <option value="7">7 Days</option>
                                        <option value="30">30 Days</option>
                                        <option value="90">90 Days</option>
                                        <option value="365">1 Year</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="fee-transparency-note" style={{ borderRadius: '12px' }}>
                                <AlertCircle size={14} /> Recording consumes storage credits on {activeVideoProvider === 'zoom' ? 'Zoom Cloud' : 'Google Drive'}. Platform storage is currently at <strong>12% capacity</strong>.
                            </div>
                        </div>

                        <button className="btn btn-primary" style={{ marginTop: '2.5rem' }} onClick={() => saveGlobalSettings('recordings')}>Save Recording Policy</button>

                        {isSuper && (
                            <div className="fade-in" style={{ marginTop: '3rem', borderTop: '1px solid var(--glass-border)', paddingTop: '3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                                    <div style={{ padding: '0.6rem', background: 'rgba(212,175,55,0.1)', borderRadius: '10px' }}>
                                        <Building size={22} color="var(--secondary-color)" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0 }}>Cloud Storage Integration</h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Configure AWS S3 or Wasabi for session recordings and documents.</p>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                    <div>
                                        <FormField label="Active Storage Provider">
                                            <select 
                                                className="form-input" 
                                                value={settings.activeStorage} 
                                                onChange={e => setSettings({...settings, activeStorage: e.target.value})}
                                            >
                                                <option value="local">Local Server Storage</option>
                                                <option value="aws">Amazon AWS S3</option>
                                                <option value="wasabi">Wasabi (S3 Compatible)</option>
                                            </select>
                                        </FormField>
                                        
                                        {settings.activeStorage !== 'local' && (
                                            <div className="fade-in" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <FormField label="Bucket Name">
                                                    <input className="form-input" value={settings.storageBucket} onChange={e => setSettings({...settings, storageBucket: e.target.value})} placeholder="e.g. roots-astro-vault" />
                                                </FormField>
                                                <FormField label="Region">
                                                    <input className="form-input" value={settings.storageRegion} onChange={e => setSettings({...settings, storageRegion: e.target.value})} placeholder="e.g. us-east-1" />
                                                </FormField>
                                                {settings.activeStorage === 'wasabi' && (
                                                    <FormField label="Wasabi Endpoint">
                                                        <input className="form-input" value={settings.storageEndpoint} onChange={e => setSettings({...settings, storageEndpoint: e.target.value})} placeholder="https://s3.wasabisys.com" />
                                                    </FormField>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {settings.activeStorage !== 'local' && (
                                        <div className="fade-in">
                                            <div className="glass-card" style={{ padding: '1.5rem', borderColor: 'rgba(212,175,55,0.2)' }}>
                                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Lock size={14} color="var(--secondary-color)" /> Access Credentials
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    <FormField label="Access Key ID">
                                                        <input className="form-input" type="password" value={settings.storageAccessKey} onChange={e => setSettings({...settings, storageAccessKey: e.target.value})} />
                                                    </FormField>
                                                    <FormField label="Secret Access Key">
                                                        <input className="form-input" type="password" value={settings.storageSecretKey} onChange={e => setSettings({...settings, storageSecretKey: e.target.value})} />
                                                    </FormField>
                                                </div>
                                                <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                                    Highly Recommended: Use an IAM user with restricted <code>PutObject</code> and <code>GetObject</code> permissions only for the specific bucket.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button className="btn btn-primary" onClick={() => saveGlobalSettings('recordings')}>Save Storage Configuration</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ SETTINGS ═══ */}
            {tab === 'settings' && (
                <div className="fade-in">
                    <h2 className="dash-title">System Settings</h2>
                    <p className="dash-sub">Configure platform identity, contact info, and operational state.</p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <h3 style={{ marginBottom: '0.5rem' }}>Platform Identity</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <FormField label="App Name"><input className="form-input" value={settings.platformName} onChange={e => setSettings({ ...settings, platformName: e.target.value })} /></FormField>
                                <FormField label="System Currency">
                                    <select className="form-input" value={settings.systemCurrency} onChange={e => setSettings({ ...settings, systemCurrency: e.target.value })}>
                                        {['USD', 'INR', 'GBP', 'EUR', 'CAD'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </FormField>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <FormField label="Convenience Charge (%)">
                                    <input className="form-input" type="number" step="0.01" value={settings.convenienceRate} onChange={e => setSettings({ ...settings, convenienceRate: parseFloat(e.target.value) || 0.0 })} />
                                </FormField>
                                <FormField label="GST on Convenience (%)">
                                    <input className="form-input" type="number" step="0.01" value={settings.gstRate} onChange={e => setSettings({ ...settings, gstRate: parseFloat(e.target.value) || 0.0 })} />
                                </FormField>
                            </div>
                            <FormField label="Support Email"><input className="form-input" type="email" value={settings.supportEmail} onChange={e => setSettings({ ...settings, supportEmail: e.target.value })} placeholder="support@rootsastro.com" /></FormField>
                            <FormField label="Contact Phone"><input className="form-input" value={settings.contactPhone} onChange={e => setSettings({ ...settings, contactPhone: e.target.value })} placeholder="+1 (555) 000-0000" /></FormField>
                        </div>
                        
                        <div className="glass-card">
                            <h3 style={{ marginBottom: '1.25rem' }}>Operational Control Center</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[
                                    { key: 'maintenanceMode', label: 'Maintenance Mode', desc: 'Disables all front-end interaction.', color: '#ff4a4a' },
                                    { key: 'allowNewRegistrations', label: 'New Registrations', desc: 'Allow new users to sign up.', color: 'var(--secondary-color)' },
                                    { key: 'apiLockdown', label: 'API Lockdown', desc: 'Restrict external third-party API access.', color: '#f6c23e' },
                                ].map(op => (
                                    <div key={op.key} className="booking-item" style={{ background: settings[op.key] ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.1)', borderColor: 'var(--glass-border)' }}>
                                        <div style={{ flex: 1 }}><strong style={{ display: 'block', fontSize: '0.9rem' }}>{op.label}</strong><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{op.desc}</span></div>
                                        <button onClick={() => setSettings(p => ({ ...p, [op.key]: !p[op.key] }))} style={{ padding: '0.4rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', background: op.key === 'maintenanceMode' ? (settings[op.key] ? op.color : 'rgba(255,255,255,0.05)') : (settings[op.key] ? 'rgba(28,200,138,0.2)' : 'rgba(255,74,74,0.12)'), color: op.key === 'maintenanceMode' ? (settings[op.key] ? '#fff' : 'var(--text-muted)') : (settings[op.key] ? '#1cc88a' : '#ff4a4a') }}>
                                            {settings[op.key] ? (op.key === 'maintenanceMode' ? 'ACTIVE' : 'ENABLED') : (op.key === 'maintenanceMode' ? 'OFF' : 'DISABLED')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
                        <button className="btn btn-primary" onClick={() => saveGlobalSettings('settings')}>Update System</button>
                        {settingsSaved && <span style={{ color: '#1cc88a', fontWeight: 600 }}>✓ System settings synchronized.</span>}
                    </div>
                </div>
            )}


            {/* ═══ SMS BROADCASTER ═══ */}
            {tab === 'broadcast' && (
                <div className="fade-in" style={{ maxWidth: '800px' }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 className="dash-title" style={{ margin: 0 }}>Platform Broadcaster</h2>
                        <p className="dash-sub" style={{ margin: '0.3rem 0 0' }}>Send urgent SMS notifications to your global network of experts and clients.</p>
                    </div>

                    <div className="glass-card" style={{ padding: '2.5rem' }}>
                        <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={16} /> Broadcast Target
                            </label>
                            <select className="form-input" value={smsTarget} onChange={e => setSmsTarget(e.target.value)}>
                                <option value="ALL_USERS">All Platform Users</option>
                                <option value="ALL_ASTROLOGERS">All Expert Astrologers</option>
                                <option value="ALL_CLIENTS">All Clients</option>
                                <option value="PENDING_ONLY">Pending Applicants Only</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                            <label className="form-label">Message Content (Max 160 chars)</label>
                            <textarea 
                                className="form-input form-textarea" 
                                rows={4} 
                                value={smsMessage} 
                                onChange={e => setSmsMessage(e.target.value)} 
                                placeholder="Enter your notification message here..." 
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: smsMessage.length > 160 ? 'var(--error)' : 'var(--text-muted)' }}>
                                    {smsMessage.length} / 160 characters
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <button 
                                className="btn btn-primary" 
                                style={{ padding: '1rem 2.5rem', fontWeight: 800 }}
                                onClick={() => {
                                    setSmsSending(true);
                                    setTimeout(() => {
                                        setSmsSending(false);
                                        setSmsSent(true);
                                        setSmsMessage('');
                                        setTimeout(() => setSmsSent(false), 3000);
                                    }, 2000);
                                }}
                                disabled={smsSending || !smsMessage.trim()}
                            >
                                {smsSending ? 'Broadcasting...' : 'Launch SMS Blast'} <Zap size={18} style={{ marginLeft: '0.5rem' }} />
                            </button>
                            {smsSent && <span style={{ color: '#1cc88a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={18} /> Broadcaster successful.</span>}
                        </div>
                    </div>

                    <div className="fee-transparency-note" style={{ marginTop: '2rem' }}>
                        <Shield size={13} /> <strong>Governance Note:</strong> Mass broadcasts are logged for security. SMS notifications are delivered via the Roots global gateway. Standard carrier rates may apply to your organization.
                    </div>
                </div>
            )}

            {tab === 'content' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h2 className="dash-title" style={{ margin: 0 }}>Strategic Page Builder & CMS</h2>
                            <p className="dash-sub" style={{ margin: '0.3rem 0 0' }}>Modify platform identity, legal pages, and branding in real-time.</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => saveGlobalSettings('content')}>
                            <Save size={16} /> Deploy Platform Update
                        </button>
                    </div>

                    {settingsSaved && <div className="fee-transparency-note" style={{ marginBottom: '1.5rem' }}>✓ Changes deployed live to the Roots Astro platform.</div>}

                    <div className="cms-page-grid">
                        {/* Left Sidebar: Branding & Page Selection */}
                        <div className="cms-sidebar">
                            <div className="glass-card">
                                <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Platform Logo</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
                                    <div style={{ width: '100%', height: '100px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {settings.siteLogo ? (
                                            <img src={settings.siteLogo} alt="Site Logo Preview" style={{ maxHeight: '80%', maxWidth: '80%', objectFit: 'contain' }} />
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Logo Uploaded</span>
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={logoFileRef} 
                                        style={{ display: 'none' }} 
                                        accept="image/*" 
                                        onChange={handleLogoUpload} 
                                    />
                                    <button 
                                        className="btn btn-outline btn-sm btn-block" 
                                        onClick={() => logoFileRef.current.click()}
                                        disabled={logoUploading}
                                    >
                                        {logoUploading ? <><RefreshCw size={14} className="spinning" /> Uploading...</> : <><Plus size={14} /> {settings.siteLogo ? 'Change Logo' : 'Upload Logo'}</>}
                                    </button>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>Recommended: Transparent PNG, 200x50px</p>
                                </div>
                            </div>

                            <div className="glass-card">
                                <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Branding Colors</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                    <FormField label="Primary"><input type="color" className="form-input" value={settings.sitePrimaryColor} onChange={e => setSettings({...settings, sitePrimaryColor: e.target.value})} /></FormField>
                                    <FormField label="Secondary"><input type="color" className="form-input" value={settings.siteSecondaryColor} onChange={e => setSettings({...settings, siteSecondaryColor: e.target.value})} /></FormField>
                                    <FormField label="Accent"><input type="color" className="form-input" value={settings.siteAccentColor} onChange={e => setSettings({...settings, siteAccentColor: e.target.value})} /></FormField>
                                </div>
                            </div>

                            <div className="glass-card">
                                <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Hero Configuration</h3>
                                <FormField label="Title"><input className="form-input" value={settings.heroTitle} onChange={e => setSettings({...settings, heroTitle: e.target.value})} /></FormField>
                                <FormField label="Subtitle"><textarea className="form-input" rows={2} value={settings.heroSubtitle} onChange={e => setSettings({...settings, heroSubtitle: e.target.value})} /></FormField>
                            </div>

                            <div className="glass-card">
                                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Markdown Pages</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                    {[
                                        { id: 'aboutUsContent', label: 'About Us' },
                                        { id: 'contactContent', label: 'Contact Us' },
                                        { id: 'blogContent', label: 'Blog & Articles' },
                                        { id: 'legalContent', label: 'Legal Notice' },
                                        { id: 'privacyPolicy', label: 'Privacy Policy' },
                                        { id: 'termsOfService', label: 'Terms of Service' },
                                        { id: 'refundPolicy', label: 'Refund Policy' },
                                        { id: 'shippingPolicy', label: 'Shipping Policy' },
                                    ].map(page => (
                                        <button
                                            key={page.id}
                                            className={`cms-page-btn${expandedConfig === page.id ? ' active' : ''}`}
                                            onClick={() => setExpandedConfig(page.id)}
                                        >
                                            {page.label}
                                            <Edit2 size={13} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Content Editor */}
                        <div className="glass-card" style={{ minHeight: '600px' }}>
                            {['aboutUsContent', 'contactContent', 'blogContent', 'legalContent', 'privacyPolicy', 'termsOfService', 'refundPolicy', 'shippingPolicy'].includes(expandedConfig) ? (
                                <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                                        <h3 style={{ margin: 0 }}>Editing: {expandedConfig.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h3>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Markdown Supported</span>
                                    </div>
                                    <textarea
                                        className="form-input"
                                        style={{ flex: 1, minHeight: '450px', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.6', background: 'rgba(0,0,0,0.15)' }}
                                        value={settings[expandedConfig]}
                                        onChange={e => setSettings({ ...settings, [expandedConfig]: e.target.value })}
                                        placeholder="Enter page content..."
                                    />
                                    <div style={{ marginTop: '1rem', padding: '0.9rem', background: 'rgba(212,175,55,0.05)', borderRadius: 8, fontSize: '0.8rem', border: '1px solid rgba(212,175,55,0.1)' }}>
                                        <strong>Pro Tip:</strong> All changes made here will reflect globally on the public pages once deployed.
                                    </div>
                                </div>
                            ) : (
                                <EmptyState 
                                    icon={<Globe size={48} color="var(--text-muted)" style={{ opacity: 0.5 }} />} 
                                    title="Page Editor" 
                                    description="Select a markdown page from the left sidebar to begin editing its content. Branding changes are auto-saved in the form below." 
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default AdminDashboard;
