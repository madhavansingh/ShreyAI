import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: "'Inter', sans-serif" }}>
      <Navbar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)', gap: 20, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 56, marginBottom: 4 }}>🔥</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 900, color: '#fff' }}>SheryAI</h1>
        <p style={{ margin: '0 0 28px', fontSize: 16, color: 'var(--text-muted)', maxWidth: 420 }}>
          AI-powered learning — ask your lecture anything, get instant answers with timestamps.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" style={{ padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 15, background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
            Get Started →
          </Link>
          <Link to="/dashboard" style={{ padding: '12px 28px', borderRadius: 10, fontWeight: 600, fontSize: 15, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
            My Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
