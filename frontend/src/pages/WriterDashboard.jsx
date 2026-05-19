import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Calendar, BookOpen, User, Plus, Edit, Trash2, Eye, BarChart2 } from 'lucide-react';
import { StatCard, StatusBadge, EmptyState, Modal, DashboardLayout, SidebarBtn, FormField } from '../components/Shared';
import { INITIAL_ARTICLES, ZODIAC_SIGNS, INITIAL_HOROSCOPES } from '../data/mockData';

const WriterDashboard = ({ user }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') || 'articles';
    const setTab = (t) => setSearchParams({ tab: t });
    const [articles, setArticles] = useState(INITIAL_ARTICLES);
    const [horoscopes, setHoroscopes] = useState(INITIAL_HOROSCOPES);
    const [articleModal, setArticleModal] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);
    const [artForm, setArtForm] = useState({ title: '', category: 'Planetary', status: 'draft', content: '' });
    const [selectedSign, setSelectedSign] = useState('Aries');
    const [horoSaving, setHoroSaving] = useState(false);
    const [profile, setProfile] = useState({ name: user?.name || 'Sophia Writer', bio: 'Passionate cosmic storyteller with 5 years in astrology content creation.', email: user?.email || '' });
    const [profileSaved, setProfileSaved] = useState(false);

    useEffect(() => {
        const t = searchParams.get('tab');
        if (t) setTab(t);
    }, [searchParams]);

    const openAdd = () => { setEditingArticle(null); setArtForm({ title: '', category: 'Planetary', status: 'draft', content: '' }); setArticleModal(true); };
    const openEdit = (a) => { setEditingArticle(a); setArtForm({ title: a.title, category: a.category, status: a.status, content: a.content || '' }); setArticleModal(true); };
    const saveArticle = () => {
        if (!artForm.title) return;
        if (editingArticle) {
            setArticles(prev => prev.map(a => a.id === editingArticle.id ? { ...a, ...artForm } : a));
        } else {
            setArticles(prev => [...prev, { id: Date.now(), ...artForm, date: 'Mar 3, 2026', views: 0 }]);
        }
        setArticleModal(false);
    };
    const deleteArticle = (id) => setArticles(prev => prev.filter(a => a.id !== id));
    const togglePublish = (id) => setArticles(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'published' ? 'draft' : 'published' } : a));

    const saveHoroscope = () => {
        setHoroSaving(true);
        setTimeout(() => setHoroSaving(false), 1500);
    };
    const saveProfile = () => { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2500); };

    const published = articles.filter(a => a.status === 'published');
    const drafts = articles.filter(a => a.status === 'draft');
    const totalViews = articles.reduce((s, a) => s + (a.views || 0), 0);

    const sidebar = (
        <>
            {[
                { id: 'articles', icon: <FileText size={19} />, label: 'My Articles' },
                { id: 'horoscopes', icon: <Calendar size={19} />, label: 'Daily Horoscopes' },
                { id: 'drafts', icon: <BookOpen size={19} />, label: 'Drafts' },
                { id: 'analytics', icon: <BarChart2 size={19} />, label: 'Analytics' },
            ].map(item => <SidebarBtn key={item.id} {...item} active={tab === item.id} onClick={setTab} />)}
        </>
    );

    return (
        <DashboardLayout sidebar={sidebar}>

            <Modal isOpen={articleModal} onClose={() => setArticleModal(false)} title={editingArticle ? 'Edit Article' : 'New Article'} width="640px">
                <FormField label="Article Title"><input className="form-input" value={artForm.title} onChange={e => setArtForm({ ...artForm, title: e.target.value })} placeholder="Enter a compelling title..." /></FormField>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <FormField label="Category">
                        <select className="form-input" value={artForm.category} onChange={e => setArtForm({ ...artForm, category: e.target.value })}>
                            {['Planetary', 'Lunar', 'Annual', 'Relationships', 'Career', 'Spirituality'].map(c => <option key={c}>{c}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Status">
                        <select className="form-input" value={artForm.status} onChange={e => setArtForm({ ...artForm, status: e.target.value })}>
                            <option value="draft">Draft</option><option value="published">Published</option>
                        </select>
                    </FormField>
                </div>
                <FormField label="Article Content">
                    <textarea className="form-input form-textarea" rows={6} value={artForm.content} onChange={e => setArtForm({ ...artForm, content: e.target.value })} placeholder="Write your article here..." />
                </FormField>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button className="btn btn-primary" onClick={saveArticle}>Save Article</button>
                    <button className="btn btn-outline" onClick={() => setArticleModal(false)}>Cancel</button>
                </div>
            </Modal>

            {tab === 'articles' && (
                <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div><h2 className="dash-title" style={{ margin: 0 }}>My Articles</h2><p className="dash-sub" style={{ margin: 0 }}>Create and manage your published content.</p></div>
                        <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={15} /> New Article</button>
                    </div>
                    <div className="glass-card">
                        <table className="data-table">
                            <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Views</th><th>Date</th><th>Actions</th></tr></thead>
                            <tbody>
                                {articles.map(a => (
                                    <tr key={a.id}>
                                        <td data-label="Title"><strong>{a.title}</strong></td>
                                        <td data-label="Category"><span className="expertise-tag">{a.category}</span></td>
                                        <td data-label="Status"><StatusBadge status={a.status} /></td>
                                        <td data-label="Views">{a.views.toLocaleString()}</td>
                                        <td data-label="Date" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{a.date}</td>
                                        <td data-label="Actions">
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="icon-btn" title="Edit" onClick={() => openEdit(a)}><Edit size={15} /></button>
                                                <button className="icon-btn" title={a.status === 'published' ? 'Unpublish' : 'Publish'} onClick={() => togglePublish(a.id)}><Eye size={15} /></button>
                                                <button className="icon-btn danger" title="Delete" onClick={() => deleteArticle(a.id)}><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {articles.length === 0 && <EmptyState icon={<FileText size={36} color="var(--text-muted)" />} title="No articles yet" description="Create your first article to share cosmic wisdom." action={<button className="btn btn-primary btn-sm" onClick={openAdd}>Create Article</button>} />}
                    </div>
                </div>
            )}

            {tab === 'horoscopes' && (
                <div className="fade-in">
                    <h2 className="dash-title">Daily Horoscopes</h2>
                    <p className="dash-sub">Edit today's horoscope content for each zodiac sign.</p>
                    <div className="horoscope-layout">
                        <div className="zodiac-sign-list glass-card">
                            {ZODIAC_SIGNS.map(sign => (
                                <button key={sign} className={`zodiac-sign-btn ${selectedSign === sign ? 'active' : ''}`} onClick={() => setSelectedSign(sign)}>
                                    {sign}
                                </button>
                            ))}
                        </div>
                        <div className="glass-card" style={{ flex: 1 }}>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--secondary-color)' }}>{selectedSign}</h3>
                            <FormField label={`Daily Horoscope for ${selectedSign}`}>
                                <textarea
                                    className="form-input form-textarea"
                                    rows={8}
                                    value={horoscopes[selectedSign]}
                                    onChange={e => setHoroscopes(prev => ({ ...prev, [selectedSign]: e.target.value }))}
                                />
                            </FormField>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                                <button className="btn btn-primary" onClick={saveHoroscope}>{horoSaving ? 'Saving...' : 'Save & Publish'}</button>
                                {horoSaving === false && horoSaving !== false && <span style={{ color: '#1cc88a' }}>✓ Published!</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'drafts' && (
                <div className="fade-in">
                    <h2 className="dash-title">Drafts</h2>
                    <p className="dash-sub">Articles saved as drafts, not yet published.</p>
                    {drafts.length === 0
                        ? <EmptyState icon={<BookOpen size={36} color="var(--text-muted)" />} title="No drafts" description="All your articles are published!" action={<button className="btn btn-primary btn-sm" onClick={openAdd}>Create New</button>} />
                        : drafts.map(a => (
                            <div key={a.id} className="glass-card booking-item" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
                                <div>
                                    <strong style={{ display: 'block' }}>{a.title}</strong>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{a.category} · {a.date}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => togglePublish(a.id)}>Publish</button>
                                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(a)}>Edit</button>
                                    <button className="icon-btn danger" onClick={() => deleteArticle(a.id)}><Trash2 size={15} /></button>
                                </div>
                            </div>
                        ))
                    }
                </div>
            )}

            {tab === 'analytics' && (
                <div className="fade-in">
                    <h2 className="dash-title">Analytics</h2>
                    <p className="dash-sub">Your content performance overview.</p>
                    <div className="stat-grid">
                        <StatCard icon={<FileText size={22} />} label="Total Articles" value={articles.length} accent="gold" />
                        <StatCard icon={<Eye size={22} />} label="Total Views" value={totalViews.toLocaleString()} accent="green" />
                        <StatCard icon={<BookOpen size={22} />} label="Published" value={published.length} accent="purple" />
                        <StatCard icon={<FileText size={22} />} label="Drafts" value={drafts.length} accent="gold" />
                    </div>
                    <div className="glass-card">
                        <h3 style={{ marginBottom: '1.5rem' }}>Top Performing Articles</h3>
                        {[...articles].sort((a, b) => b.views - a.views).map(a => (
                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                                <div>
                                    <span style={{ display: 'block', fontWeight: 600 }}>{a.title}</span>
                                    <StatusBadge status={a.status} />
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong style={{ color: 'var(--secondary-color)', display: 'block' }}>{a.views.toLocaleString()} views</strong>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.date}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'profile' && (
                <div className="fade-in">
                    <h2 className="dash-title">Writer Profile</h2>
                    <div className="glass-card">
                        <div className="profile-avatar-section">
                            <div className="profile-avatar-xl">{profile.name.charAt(0)}</div>
                            <div><h3>{profile.name}</h3><span className="badge badge-info">Content Writer</span></div>
                        </div>
                        <div className="form-grid">
                            <FormField label="Display Name"><input className="form-input" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></FormField>
                            <FormField label="Email Address"><input className="form-input" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></FormField>
                        </div>
                        <FormField label="Bio / About"><textarea className="form-input form-textarea" rows={4} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} /></FormField>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
                            <button className="btn btn-primary" onClick={saveProfile}>Save Profile</button>
                            {profileSaved && <span style={{ color: '#1cc88a', fontWeight: 600 }}>✓ Profile saved!</span>}
                        </div>
                    </div>
                </div>
            )}

        </DashboardLayout>
    );
};

export default WriterDashboard;
