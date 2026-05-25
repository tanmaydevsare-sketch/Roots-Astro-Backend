// ── Platform Config ──────────────────────────────────────────────
export const PLATFORM_CONFIG = {
    commissionRate: 0.25,   // 25% goes to Super Admin (editable by admin)
    astrologerShare: 0.75,  // 75% goes to astrologer
};

// ── Master Service Catalogue (Super Admin controls this) ────────────
// Astrologers CANNOT add/remove services. They only set price + duration.
export const PLATFORM_SERVICES = [
    { id: 1, name: 'Natal Chart Analysis', description: 'Deep analysis of birth chart — planets, houses and aspects.', category: 'Vedic', active: true },
    { id: 2, name: 'Relationship Compatibility', description: 'Synastry & composite chart between two individuals.', category: 'Relationships', active: true },
    { id: 3, name: 'Career & Finance Forecast', description: 'Career path, job change timing and financial outlook.', category: 'Life Path', active: true },
    { id: 4, name: 'Tarot Reading', description: 'Intuitive tarot card guidance for any life area.', category: 'Tarot', active: true },
    { id: 5, name: 'Palmistry Reading', description: 'Palm line and mount analysis for personality & destiny.', category: 'Palmistry', active: true },
    { id: 6, name: 'Vastu Consultation', description: 'Home and office energy optimisation for well-being.', category: 'Vastu', active: true },
    { id: 7, name: 'Numerology Report', description: 'Life path, expression and destiny number deep-dive.', category: 'Numerology', active: false },
    { id: 8, name: 'Prashna / Horary Reading', description: 'Answer a specific question using birth time of the query.', category: 'Vedic', active: true },
    { id: 9, name: 'Annual Solar Return', description: 'Year-ahead forecast based on solar return chart.', category: 'Western', active: false },
    { id: 10, name: 'Muhurta (Auspicious Timing)', description: 'Find the ideal time for events — wedding, business etc.', category: 'Vedic', active: true },
];

// ── Payment Gateway Config ────────────────────────────────────────
export const PAYMENT_CONFIG = {
    activeGateway: 'razorpay', // 'razorpay' | 'paypal' | 'both'
    razorpay: { keyId: '', keySecret: '', mode: 'test', connected: false },
    paypal: { clientId: '', clientSecret: '', mode: 'sandbox', connected: false },
};

// ── Admin Finance / Wallet ────────────────────────────────────────
export const ADMIN_FINANCE = {
    totalCommissionEarned: 12062.50,
    availableBalance: 9500.00,
    pendingSettlement: 2562.50,
    bankDetails: { accountName: '', accountNumber: '', ifsc: '', bankName: '', swift: '' },
    withdrawalHistory: [
        { id: 1, amount: 2562.50, date: 'Feb 15, 2026', method: 'Bank Transfer', status: 'completed', ref: 'WDRL-001' },
        { id: 2, amount: 1500.00, date: 'Jan 15, 2026', method: 'Bank Transfer', status: 'completed', ref: 'WDRL-002' },
    ],
};

// ── Astrologer Finance ────────────────────────────────────────────
// Only completed-session earnings are withdrawable
export const ASTROLOGER_FINANCE = {
    withdrawableBalance: 67.50,   // from completed sessions only
    pendingBalance: 93.75,         // from upcoming sessions – locked until complete
    withdrawnTotal: 250.00,
    upiId: '',
    withdrawalHistory: [
        { id: 1, amount: 150.00, date: 'Feb 15, 2026', upi: 'astro@ybl', status: 'completed', ref: 'UPI001' },
        { id: 2, amount: 100.00, date: 'Jan 15, 2026', upi: 'astro@ybl', status: 'completed', ref: 'UPI002' },
    ],
};

// ── Astrologers ──────────────────────────────────────────────────
export const ASTROLOGERS = [
    { id: 1, name: 'Acharya Rajesh Kumar', expertise: ['Vedic Astrology', 'Vastu', 'Kundli'], rate: 50, rating: 4.9, reviews: 312, sessions: 1240, languages: 'English, Hindi', bio: 'Gold medalist in Jyotish Acharya with 15+ years guiding thousands through life challenges.', available: true, slots: ['9:00 AM', '10:00 AM', '2:00 PM', '4:00 PM', '5:00 PM'] },
    { id: 2, name: 'Anubha Jain', expertise: ['Tarot', 'Numerology', 'Psychic Reading'], rate: 75, rating: 4.8, reviews: 198, sessions: 850, languages: 'English', bio: 'Certified tarot reader and numerologist with a unique intuitive approach to life guidance.', available: true, slots: ['10:00 AM', '11:00 AM', '3:00 PM', '6:00 PM'] },
    { id: 3, name: 'Pandit Suresh Sharma', expertise: ['Vedic Astrology', 'Palmistry', 'Gemology'], rate: 40, rating: 4.7, reviews: 425, sessions: 1890, languages: 'English, Hindi, Telugu', bio: 'University professor of Vedic studies with deep expertise in palmistry and gemstone therapy.', available: true, slots: ['8:00 AM', '9:00 AM', '1:00 PM', '3:00 PM'] },
    { id: 4, name: 'Maya Chen', expertise: ['Chinese Astrology', 'Feng Shui', 'Ba Zi'], rate: 65, rating: 4.9, reviews: 156, sessions: 680, languages: 'English, Mandarin', bio: 'Master of Chinese metaphysics blending ancient wisdom with modern life consulting.', available: false, slots: ['11:00 AM', '2:00 PM', '4:00 PM'] },
    { id: 5, name: 'Ravi Shankar Joshi', expertise: ['Jyotish', 'Muhurta', 'Prashna'], rate: 45, rating: 4.6, reviews: 289, sessions: 1100, languages: 'English, Hindi, Gujarati', bio: 'Specialist in electional astrology and horary questions with deep classical training.', available: true, slots: ['9:00 AM', '11:00 AM', '2:00 PM', '5:00 PM'] },
    { id: 6, name: 'Sophia Laurent', expertise: ['Western Astrology', 'Synastry', 'Solar Returns'], rate: 80, rating: 5.0, reviews: 97, sessions: 410, languages: 'English, French', bio: 'Psychological astrologer blending Jungian archetypes with natal chart interpretation.', available: true, slots: ['10:00 AM', '1:00 PM', '3:00 PM', '5:00 PM'] },
];

// ── Client Bookings ───────────────────────────────────────────────
export const INITIAL_CLIENT_BOOKINGS = [
    { id: 1, astrologer: 'Acharya Rajesh Kumar', astrologerId: 1, service: 'Natal Chart Analysis', date: 'Mar 5, 2026', time: '10:00 AM', status: 'upcoming', amount: 50, platformFee: 12.50, astrologerReceives: 37.50, zoomLink: 'https://zoom.us/j/mock123', problemDescription: 'I have been facing challenges in my career for the past year. Looking for guidance on the right path forward.', paymentMethod: 'Razorpay', paymentRef: 'rzp_mock_001' },
    { id: 2, astrologer: 'Anubha Jain', astrologerId: 2, service: 'Tarot Reading', date: 'Feb 28, 2026', time: '3:00 PM', status: 'completed', amount: 75, platformFee: 18.75, astrologerReceives: 56.25, zoomLink: null, problemDescription: 'Relationship issues and need clarity.', paymentMethod: 'PayPal', paymentRef: 'pp_mock_002' },
    { id: 3, astrologer: 'Pandit Suresh Sharma', astrologerId: 3, service: 'Palmistry Reading', date: 'Feb 20, 2026', time: '9:00 AM', status: 'completed', amount: 40, platformFee: 10.00, astrologerReceives: 30.00, zoomLink: null, problemDescription: '', paymentMethod: 'Razorpay', paymentRef: 'rzp_mock_003' },
    { id: 4, astrologer: 'Maya Chen', astrologerId: 4, service: 'Feng Shui Consultation', date: 'Mar 10, 2026', time: '2:00 PM', status: 'upcoming', amount: 65, platformFee: 16.25, astrologerReceives: 48.75, zoomLink: 'https://zoom.us/j/mock456', problemDescription: 'Want to improve energy flow in my new home.', paymentMethod: 'Razorpay', paymentRef: 'rzp_mock_004' },
];

// ── Client Notifications ─────────────────────────────────────────
export const INITIAL_NOTIFICATIONS = [
    { id: 'n1', type: 'reschedule_request', bookingId: 1, astrologer: 'Acharya Rajesh Kumar', service: 'Natal Chart Analysis', originalDate: 'Mar 5, 2026', originalTime: '10:00 AM', newDate: 'Mar 7, 2026', newTime: '2:00 PM', amount: 50, message: 'I have an emergency and need to reschedule our session. I hope the new time works for you.', status: 'pending', timestamp: '2026-03-03T06:30:00Z' },
];

// ── Wallet ───────────────────────────────────────────────────────
export const WALLET_TRANSACTIONS = [
    { id: 1, desc: 'Added via Card', amount: '+$200.00', date: 'Mar 1, 2026', type: 'credit' },
    { id: 2, desc: 'Booking – Natal Chart (Acharya Rajesh) · Razorpay', amount: '-$50.00', date: 'Feb 28, 2026', type: 'debit' },
    { id: 3, desc: 'Booking – Tarot Reading (Anubha Jain) · PayPal', amount: '-$75.00', date: 'Feb 20, 2026', type: 'debit' },
    { id: 4, desc: 'Refund – Cancelled Session', amount: '+$40.00', date: 'Feb 15, 2026', type: 'credit' },
];

// ── Zodiac ───────────────────────────────────────────────────────
export const ZODIAC_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

// ── Articles ─────────────────────────────────────────────────────
export const INITIAL_ARTICLES = [
    { id: 1, title: 'Mercury Retrograde: What It Means for Your Sign', status: 'published', category: 'Planetary', date: 'Mar 1, 2026', views: 2340 },
    { id: 2, title: 'The Power of the New Moon in Pisces', status: 'published', category: 'Lunar', date: 'Feb 25, 2026', views: 1890 },
    { id: 3, title: '2026 Annual Forecast for All 12 Signs', status: 'draft', category: 'Annual', date: 'Feb 20, 2026', views: 0 },
];

export const INITIAL_HOROSCOPES = ZODIAC_SIGNS.reduce((acc, sign) => ({
    ...acc,
    [sign]: `Today is a powerful day for ${sign}. The celestial alignment invites you to reflect on your goals and take bold action. Trust your intuition — the universe supports your path forward.`,
}), {});

// ── Admin / Users ─────────────────────────────────────────────────
export const ALL_USERS = [
    { id: 1, name: 'John Doe', email: 'client@rootsastro.com', role: 'CLIENT', status: 'active', joined: 'Jan 2026', sessions: 5 },
    { id: 2, name: 'Acharya Rajesh Kumar', email: 'astro@rootsastro.com', role: 'ASTROLOGER', status: 'active', joined: 'Dec 2025', sessions: 124 },
    { id: 3, name: 'Sophia Writer', email: 'writer@rootsastro.com', role: 'WRITER', status: 'active', joined: 'Feb 2026', sessions: 0 },
    { id: 4, name: 'Alice Johnson', email: 'alice@example.com', role: 'CLIENT', status: 'active', joined: 'Feb 2026', sessions: 2 },
    { id: 5, name: 'Bob Smith', email: 'bob@example.com', role: 'CLIENT', status: 'suspended', joined: 'Jan 2026', sessions: 0 },
];

export const PENDING_ASTROLOGERS = [
    { id: 10, name: 'Dr. Priya Patel', email: 'priya@example.com', expertise: 'Vedic, Jyotish', experience: '8 years', bio: 'Trained at Bharatiya Vidya Bhavan with specialization in predictive astrology.', applied: 'Mar 1, 2026' },
    { id: 11, name: 'Marco Rossi', email: 'marco@example.com', expertise: 'Western, Synastry', experience: '5 years', bio: 'Italian astrologer specializing in relationship analysis and compatibility reports.', applied: 'Mar 2, 2026' },
];

export const PLATFORM_STATS = {
    totalRevenue: 48250, totalSessions: 3840, activeUsers: 1240, pendingApprovals: 2,
    platformCommission: 12062.50,
    astrologerPayouts: 36187.50,
    monthlyRevenue: [9200, 15800, 23250],
};

export const ASTROLOGER_SERVICES_DEFAULT = [
    { id: 1, name: 'Natal Chart Analysis', duration: '45 min', price: 50, active: true },
    { id: 2, name: 'Relationship Compatibility', duration: '60 min', price: 75, active: true },
    { id: 3, name: 'Career & Finance Forecast', duration: '30 min', price: 40, active: false },
];

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Astrologer sees anonymized client IDs only
export const ASTROLOGER_BOOKINGS = [
    { id: 1, clientRef: 'Client #4821', service: 'Natal Chart Analysis', date: 'Mar 5, 2026', time: '10:00 AM', status: 'upcoming', amount: 50, astrologerReceives: 37.50, hasProblemNote: true },
    { id: 2, clientRef: 'Client #3307', service: 'Relationship Compatibility', date: 'Mar 6, 2026', time: '3:00 PM', status: 'upcoming', amount: 75, astrologerReceives: 56.25, hasProblemNote: false },
    { id: 3, clientRef: 'Client #1192', service: 'Natal Chart Analysis', date: 'Feb 28, 2026', time: '9:00 AM', status: 'completed', amount: 50, astrologerReceives: 37.50, hasProblemNote: true },
    { id: 4, clientRef: 'Client #6674', service: 'Career Forecast', date: 'Feb 20, 2026', time: '2:00 PM', status: 'completed', amount: 40, astrologerReceives: 30.00, hasProblemNote: false },
];

export const ASTROLOGER_EARNINGS = [
    { id: 1, desc: 'Session – Client #1192 (75% share)', amount: '+$37.50', date: 'Feb 28, 2026', type: 'credit' },
    { id: 2, desc: 'Session – Client #6674 (75% share)', amount: '+$30.00', date: 'Feb 20, 2026', type: 'credit' },
    { id: 3, desc: 'UPI Payout · astro@ybl', amount: '-$150.00', date: 'Feb 15, 2026', type: 'debit' },
];

export const TESTIMONIALS = [
    { name: 'Prashant M.', role: 'Client', rating: 5, text: "Roots Astro helped me find clarity during one of the most difficult periods of my life. Acharya Rajesh was spot on with his analysis. Truly transformative!" },
    { name: 'Sarah K.', role: 'Client', rating: 5, text: "I was skeptical at first, but Anubha Jain's tarot reading was incredibly accurate. The platform is beautiful and the booking process was seamless." },
    { name: 'Maneesha Devsare', role: 'Client', rating: 5, text: "Booked 4 sessions already. Every astrologer here is professional, punctual, and deeply knowledgeable. Worth every penny!" },
];
