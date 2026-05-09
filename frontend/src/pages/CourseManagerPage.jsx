import Navbar from '../components/Navbar';
export default function CourseManagerPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: "'Inter', sans-serif" }}>
      <Navbar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)', gap: 14, textAlign: 'center' }}>
        <p style={{ fontSize: 48, margin: 0 }}>🏗️</p>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Course Manager</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>Coming soon in Phase 4</p>
      </div>
    </div>
  );
}
