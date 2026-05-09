/**
 * pages/LoginPage.jsx — Demo role selector
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ROLES = [
  {
    key:   'student',
    emoji: '🎓',
    title: 'Student',
    desc:  'Watch lessons, use the AI chatbot, take quizzes',
    dest:  '/dashboard',
    color: '#3b82f6',
  },
  {
    key:   'instructor',
    emoji: '🎙',
    title: 'Instructor',
    desc:  'Upload videos, manage courses, track ingestion',
    dest:  '/instructor',
    color: '#e8572a',
  },
];

export default function LoginPage() {
  const navigate  = useNavigate();
  const [hov, setHov] = useState(null);

  const pick = (role) => {
    localStorage.setItem('demo_role', role.key);
    navigate(role.dest);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", padding: 24,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: '#e8572a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 900, color: '#fff',
        }}>K</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>SheryAI</div>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>AI · DEMO</div>
        </div>
      </div>

      <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: '#fff', textAlign: 'center' }}>
        Choose your role
      </h1>
      <p style={{ margin: '0 0 40px', color: '#555', fontSize: 14, textAlign: 'center' }}>
        This is a demo — no password needed. Pick a role to continue.
      </p>

      {/* Role cards */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 600 }}>
        {ROLES.map(role => (
          <button
            key={role.key}
            onClick={() => pick(role)}
            onMouseEnter={() => setHov(role.key)}
            onMouseLeave={() => setHov(null)}
            style={{
              flex: '1 1 220px', maxWidth: 260,
              padding: '32px 24px', borderRadius: 16,
              background: hov === role.key ? '#161616' : '#111',
              border: `2px solid ${hov === role.key ? role.color : 'rgba(255,255,255,0.07)'}`,
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.18s',
              transform: hov === role.key ? 'translateY(-4px)' : 'none',
              boxShadow: hov === role.key ? `0 12px 40px ${role.color}22` : 'none',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>{role.emoji}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{role.title}</div>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{role.desc}</div>
            <div style={{
              marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 8,
              background: `${role.color}18`, color: role.color,
              fontSize: 12, fontWeight: 700,
            }}>
              Enter as {role.title} →
            </div>
          </button>
        ))}
      </div>

      <p style={{ marginTop: 40, color: '#333', fontSize: 12 }}>
        Demo mode · No real data is stored · Role resets on logout
      </p>
    </div>
  );
}
