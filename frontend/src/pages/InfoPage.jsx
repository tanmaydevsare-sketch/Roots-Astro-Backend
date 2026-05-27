import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft, Shield, Globe, Handshake, AlertTriangle, Mail } from 'lucide-react';
import API_URL from '../api/config';
import { DashboardLayout } from '../components/Shared';

const InfoPage = () => {
    const { slug } = useParams();
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(true);

    const pageMap = {
        'about-us': { field: 'aboutUsContent', label: 'About Us', icon: <Globe size={24} color="var(--secondary-color)" /> },
        'contact': { field: 'contactContent', label: 'Contact Us', icon: <Mail size={24} color="var(--secondary-color)" /> },
        'blog': { field: 'blogContent', label: 'Blog & Articles', icon: <Globe size={24} color="var(--secondary-color)" /> },
        'legal': { field: 'legalContent', label: 'Legal Notice', icon: <Shield size={24} color="var(--secondary-color)" /> },
        'privacy-policy': { field: 'privacyPolicy', label: 'Privacy Policy', icon: <Shield size={24} color="var(--secondary-color)" /> },
        'terms-of-service': { field: 'termsOfService', label: 'Terms of Service', icon: <Handshake size={24} color="var(--secondary-color)" /> },
        'refund-policy': { field: 'refundPolicy', label: 'Refund Policy', icon: <AlertTriangle size={24} color="var(--secondary-color)" /> },
    };

    useEffect(() => {
        const fetchContent = async () => {
            const pageInfo = pageMap[slug];
            if (!pageInfo) {
                setLoading(false);
                return;
            }
            setTitle(pageInfo.label);

            try {
                const res = await fetch(`${API_URL}/api/settings/public/global`);
                if (res.ok) {
                    const data = await res.json();
                    setContent(data[pageInfo.field] || 'Content is being updated...');
                }
            } catch (err) {
                console.error("Fetch page content failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
        window.scrollTo(0, 0);
    }, [slug]);

    if (!pageMap[slug]) return <div className="container mt-xl"><h1>Page Not Found</h1><Link to="/">Back to Home</Link></div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
            <nav style={{ padding: '1.25rem 2rem', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)', sticky: 'top', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)', textDecoration: 'none' }}>
                    <ChevronLeft size={20} />
                    <strong>Back to Home</strong>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {pageMap[slug].icon}
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{title}</span>
                </div>
            </nav>

            <main className="container" style={{ padding: '4rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <div className="zoom-spinner" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : (
                    <div className="glass-card fade-in" style={{ padding: '3rem', minHeight: '60vh' }}>
                        <article className="markdown-content">
                            <ReactMarkdown>{content}</ReactMarkdown>
                        </article>
                    </div>
                )}
            </main>

            <footer style={{ textAlign: 'center', padding: '3rem 1rem', borderTop: '1px solid var(--glass-border)', marginTop: '4rem', background: 'rgba(0,0,0,0.1)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Roots Astro is owned by NEBZA Technologies Private Limited. All rights reserved.</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
                    {Object.entries(pageMap).map(([key, value]) => (
                        <Link key={key} to={`/pages/${key}`} style={{ color: key === slug ? 'var(--secondary-color)' : 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>
                            {value.label}
                        </Link>
                    ))}
                </div>
            </footer>

            <style>{`
                .markdown-content h1 { font-size: 2.25rem; margin-bottom: 2rem; color: var(--secondary-color); }
                .markdown-content h2 { font-size: 1.5rem; margin: 2rem 0 1rem; }
                .markdown-content p { line-height: 1.7; margin-bottom: 1.25rem; color: rgba(255,255,255,0.85); }
                .markdown-content ul, .markdown-content ol { margin-bottom: 1.5rem; padding-left: 1.5rem; }
                .markdown-content li { margin-bottom: 0.5rem; color: rgba(255,255,255,0.85); }
                .markdown-content strong { color: #fff; }
                .markdown-content code { background: rgba(255,255,255,0.1); padding: 0.2rem 0.4rem; borderRadius: 4px; }
            `}</style>
        </div>
    );
};

export default InfoPage;
