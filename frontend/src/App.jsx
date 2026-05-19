import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AstrologerApplication from './pages/AstrologerApplication';
import ClientDashboard from './pages/ClientDashboard';
import AstrologerDashboard from './pages/AstrologerDashboard';
import WriterDashboard from './pages/WriterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import InfoPage from './pages/InfoPage';
import { SettingsProvider } from './context/SettingsContext';

const Guard = ({ user, allowed, children }) => {
  const token = localStorage.getItem('token');
  if (!user || !token) return <Navigate to="/login" replace />;
  if (allowed && !allowed.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [user, setUser] = useState(() => {
    try { 
      const u = JSON.parse(localStorage.getItem('rootsastro_user'));
      const t = localStorage.getItem('token');
      if (u && t) return u;
      localStorage.removeItem('rootsastro_user');
      localStorage.removeItem('token');
      return null;
    }
    catch { return null; }
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('rootsastro_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('rootsastro_user');
    localStorage.removeItem('token');
  };

  const getDashLink = (role) => {
    return { CLIENT: '/client', ASTROLOGER: '/astrologer', WRITER: '/writer', ADMIN: '/admin' }[role] || '/';
  };

  return (
    <SettingsProvider>
    <Router>
      <div className="cosmic-bg" />
      <div className="stars" />
      <Navbar user={user} onLogout={logout} />
      <Routes>
        <Route path="/" element={user ? <Navigate to={getDashLink(user.role)} replace /> : <Home />} />
        <Route path="/astrologers" element={<Home view="astrologers" />} />
        <Route path="/how-it-works" element={<Home view="how-it-works" />} />
        <Route path="/about" element={<Navigate to="/pages/about-us" replace />} />
        <Route path="/pages/:slug" element={<InfoPage />} />
        
        {/* Auth Pages */}
        <Route path="/login" element={user ? <Navigate to={getDashLink(user.role)} replace /> : <Login onLogin={login} portal="CLIENT" />} />
        <Route path="/login/astrologer" element={user ? <Navigate to={getDashLink(user.role)} replace /> : <Login onLogin={login} portal="ASTROLOGER" />} />
        <Route path="/login/writer" element={user ? <Navigate to={getDashLink(user.role)} replace /> : <Login onLogin={login} portal="WRITER" />} />
        <Route path="/login/admin" element={user ? <Navigate to={getDashLink(user.role)} replace /> : <Login onLogin={login} portal="ADMIN" />} />
        
        {/* Signup: Intelligently handles role/state internally */}
        <Route path="/signup" element={user ? <Navigate to={getDashLink(user.role)} replace /> : <Signup onLogin={login} />} />
        
        {/* Astrologer Application (Wizard): NO REDIRECT AWAY even if 'user' is set */}
        <Route path="/apply" element={<AstrologerApplication onLogin={login} />} />
        
        {/* Protected Dashboard Routes */}
        <Route path="/client" element={<Guard user={user} allowed={['CLIENT']}><ClientDashboard user={user} /></Guard>} />
        <Route path="/astrologer" element={<Guard user={user} allowed={['ASTROLOGER']}><AstrologerDashboard user={user} /></Guard>} />
        <Route path="/writer" element={<Guard user={user} allowed={['WRITER']}><WriterDashboard user={user} /></Guard>} />
        
        {/* Admin Panels */}
        <Route path="/admin" element={<Guard user={user} allowed={['ADMIN', 'SUPERADMIN']}><AdminDashboard user={user} /></Guard>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </SettingsProvider>
  );
}

export default App;
