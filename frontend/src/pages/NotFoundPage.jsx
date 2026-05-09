import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif",
      textAlign: 'center', padding: 24,
    }}>
      <div style={{ fontSize: 96, fontWeight: 900, color: 'rgba(255,255,255,0.05)', lineHeight: 1 }}>404</div>
      <div style={{ marginTop: -32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#fff' }}>Page not found</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>The page you're looking for doesn't exist.</p>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link to="/" style={{
          padding: '10px 22px', borderRadius: 10, fontWeight: 600, fontSize: 14,
          background: 'var(--accent)', color: '#fff', textDecoration: 'none',
        }}>← Go Home</Link>
        <Link to="/dashboard" style={{
          padding: '10px 22px', borderRadius: 10, fontWeight: 600, fontSize: 14,
          background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
          textDecoration: 'none',
        }}>My Courses</Link>
      </div>
    </div>
  );
}
