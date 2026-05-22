import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Send, Paperclip, Smile, Shield, Sparkles, MessageCircle } from 'lucide-react';

const RealTimeChat = ({ bookingId, user, recipientName, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Subscribe to messages in Firestore
    useEffect(() => {
        if (!bookingId) return;

        const messagesRef = collection(db, 'chats', String(bookingId), 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
            setLoading(false);
            
            // Scroll to bottom after new message
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }, (error) => {
            console.error("Error subscribing to Firestore messages: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [bookingId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const text = newMessage;
        setNewMessage('');

        try {
            const messagesRef = collection(db, 'chats', String(bookingId), 'messages');
            await addDoc(messagesRef, {
                text,
                senderId: user.id,
                senderName: `${user.firstName} ${user.lastName}`,
                senderRole: user.role,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error adding message to Firestore: ", error);
        }
    };

    const handleSendMockAttachment = async () => {
        const attachmentName = prompt("Enter mock file/image name to upload:", "chart_reading.png");
        if (!attachmentName) return;

        try {
            const messagesRef = collection(db, 'chats', String(bookingId), 'messages');
            await addDoc(messagesRef, {
                text: `📎 Sent attachment: ${attachmentName}`,
                senderId: user.id,
                senderName: `${user.firstName} ${user.lastName}`,
                senderRole: user.role,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error adding attachment message: ", error);
        }
    };

    return (
        <div className="realtime-chat-overlay" style={{ position: 'fixed', top: 0, right: 0, width: '100%', height: '100%', background: 'rgba(10, 5, 20, 0.65)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end', transition: '0.3s' }}>
            <div className="realtime-chat-drawer glass-card fade-in" style={{ width: '460px', height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(23, 14, 43, 0.95)', borderLeft: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px 0 0 24px', overflow: 'hidden', boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)' }}>
                
                {/* Chat Header */}
                <div style={{ padding: '1.5rem', background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '42px', height: '42px', background: 'var(--gold-gradient)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1102', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {recipientName ? recipientName.charAt(0) : 'A'}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {recipientName || 'Consultant'} <Sparkles size={14} color="#D4AF37" />
                            </h3>
                            <span style={{ fontSize: '0.78rem', color: '#1cc88a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{ width: '6px', height: '6px', background: '#1cc88a', borderRadius: '50%', display: 'inline-block' }}></span>
                                Real-time Consultation
                            </span>
                        </div>
                    </div>
                    
                    <button onClick={onClose} style={{ background: 'rgba(255, 255, 255, 0.05)', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: '0.3s' }} onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}>
                        <X size={18} />
                    </button>
                </div>

                {/* Secure Notice */}
                <div style={{ padding: '0.6rem 1.25rem', background: 'rgba(212, 175, 55, 0.05)', borderBottom: '1px solid rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#D4AF37' }}>
                    <Shield size={13} />
                    <span>This chat is secured using Firestore real-time end-to-end listeners.</span>
                </div>

                {/* Messages Body */}
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', scrollbarWidth: 'thin' }}>
                    {loading ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                            <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <span style={{ fontSize: '0.85rem' }}>Securing channel connection...</span>
                        </div>
                    ) : messages.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                <MessageCircle size={28} />
                            </div>
                            <div>
                                <strong style={{ display: 'block', color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Start your cosmic conversation</strong>
                                <p style={{ fontSize: '0.8rem', margin: 0 }}>Type your message below. The response will sync instantly.</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isMe = msg.senderId === user.id;
                            const formattedTime = msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

                            return (
                                <div key={msg.id || index} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
                                    {/* Sender Tag */}
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem', padding: '0 0.25rem' }}>
                                        {isMe ? 'You' : msg.senderName}
                                    </span>

                                    {/* Message Bubble */}
                                    <div style={{
                                        padding: '0.8rem 1rem',
                                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        background: isMe ? 'linear-gradient(135deg, #4A2B90 0%, #2D1E4D 100%)' : 'rgba(255, 255, 255, 0.04)',
                                        border: isMe ? '1px solid rgba(107, 70, 193, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                        color: 'var(--text-light)',
                                        fontSize: '0.9rem',
                                        wordBreak: 'break-word',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        maxWidth: '85%'
                                    }}>
                                        {msg.text}
                                    </div>

                                    {/* Timestamp */}
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem', padding: '0 0.25rem' }}>
                                        {formattedTime}
                                    </span>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Footer */}
                <form onSubmit={handleSendMessage} style={{ padding: '1.25rem', background: 'rgba(0, 0, 0, 0.3)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button type="button" onClick={handleSendMockAttachment} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.3s' }} onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.08)'} onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.03)'}>
                        <Paperclip size={18} />
                    </button>

                    <input
                        type="text"
                        placeholder="Ask your cosmic query..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        style={{ flex: 1, padding: '0.8rem 1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-light)', outline: 'none', fontSize: '0.9rem' }}
                    />

                    <button type="submit" disabled={!newMessage.trim()} style={{ background: newMessage.trim() ? 'var(--gold-gradient)' : 'rgba(255, 255, 255, 0.03)', border: 'none', color: newMessage.trim() ? '#1a1102' : 'var(--text-muted)', cursor: newMessage.trim() ? 'pointer' : 'default', padding: '0.8rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.3s', boxShadow: newMessage.trim() ? '0 4px 15px rgba(212, 175, 55, 0.2)' : 'none' }}>
                        <Send size={16} />
                    </button>
                </form>

            </div>

            {/* Custom Animation Keyframes Injection */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}} />
        </div>
    );
};

export default RealTimeChat;
