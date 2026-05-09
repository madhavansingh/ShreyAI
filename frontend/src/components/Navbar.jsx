/**
 * components/Navbar.jsx — Demo role indicator + switch button
 */
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [role, setRole] = useState(localStorage.getItem('demo_role') || 'student');
  const isInstructor = role === 'instructor';

  // Sync if role changes elsewhere
  useEffect(() => {
    const sync = () => setRole(localStorage.getItem('demo_role') || 'student');
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const switchRole = () => {
    localStorage.removeItem('demo_role');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav style={{
      height:         'var(--nav-h)',
      background:     'var(--bg-nav)',
      borderBottom:   '1px solid var(--border)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0 24px',
      position:       'sticky',
      top:            0,
      zIndex:         100,
    }}>
      {/* Logo */}
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 800, color: '#fff',
        }}>K</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2, color: '#fff' }}>kodr</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1, letterSpacing: '0.05em' }}>AURA</div>
        </div>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <NavLink to="/dashboard"   active={isActive('/dashboard')}  label="📚 Dashboard" />
        {isInstructor && <NavLink to="/instructor" active={isActive('/instructor')} label="🎙 Studio" />}
      </div>

      {/* Right — role badge + switch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Role badge */}
        <div style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: isInstructor ? 'rgba(232,87,42,0.12)' : 'rgba(59,130,246,0.12)',
          color: isInstructor ? 'var(--accent)' : '#60a5fa',
          border: `1px solid ${isInstructor ? 'rgba(232,87,42,0.25)' : 'rgba(59,130,246,0.25)'}`,
        }}>
          {isInstructor ? '🎙 Instructor' : '🎓 Student'}
        </div>

        {/* Switch role */}
        <button
          onClick={switchRole}
          title="Switch role"
          style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.target.style.color = '#fff'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={e => { e.target.style.color = 'var(--text-muted)'; e.target.style.borderColor = 'var(--border)'; }}
        >
          ⇄ Switch
        </button>
      </div>
    </nav>
  );
}

function NavLink({ to, active, label }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
        color: active ? 'var(--accent)' : hov ? '#fff' : 'var(--text-muted)',
        background: active ? 'var(--accent-light)' : hov ? 'var(--bg-hover)' : 'transparent',
        textDecoration: 'none', transition: 'all 0.15s',
      }}
    >
      {label}
    </Link>
  );
}
