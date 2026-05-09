/**
 * pages/DashboardPage.jsx  — Sheryians-style Classroom page
 * Left: enrolled courses + module accordion
 * Right: Notifications + Progress Heatmap
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getLessons } from '../services/api';
import Navbar from '../components/Navbar';
import LessonStatusBadge from '../components/LessonStatusBadge';

const DEMO_COURSE = 'demo-course-001';

// ── Mini heatmap ──────────────────────────────────────────────────────────────
function HeatMap({ lessons }) {
  const cells = 80;
  const readyCount = lessons.filter(l => l.status === 'ready').length;
  // Mock some activity based on readyCount
  const active = Math.min(readyCount * 8, cells);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16,1fr)', gap: 3 }}>
        {Array.from({ length: cells }).map((_, i) => {
          const intensity = i < active
            ? i < active * 0.3 ? 0.3 : i < active * 0.6 ? 0.6 : i < active * 0.85 ? 0.85 : 1
            : 0;
          return (
            <div key={i} style={{
              width: '100%', paddingTop: '100%',
              borderRadius: 3,
              background: intensity > 0
                ? `rgba(232,87,42,${intensity})`
                : 'rgba(255,255,255,0.06)',
            }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Less</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[0.15, 0.35, 0.6, 0.85, 1].map((o, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(232,87,42,${o})` }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>More</span>
      </div>
    </div>
  );
}

// ── Lesson row in accordion ───────────────────────────────────────────────────
function LessonRow({ lesson, index }) {
  const navigate   = useNavigate();
  const isReady    = lesson.status === 'ready';
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={() => isReady && navigate(`/lesson/${lesson.id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         12,
        padding:     '11px 16px',
        borderRadius: 8,
        background:  hov && isReady ? 'var(--bg-hover)' : 'transparent',
        cursor:      isReady ? 'pointer' : 'default',
        transition:  'background 0.15s',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: isReady ? 'var(--green-bg)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isReady ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: isReady ? 'var(--green)' : 'var(--text-muted)',
      }}>
        {isReady ? '✓' : '▶'}
      </div>

      {/* Title */}
      <span style={{
        flex: 1, fontSize: 13, fontWeight: 500,
        color: hov && isReady ? '#fff' : 'var(--text-secondary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {index + 1} - {lesson.title}
      </span>

      {/* Status + score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {lesson.chunkCount > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {lesson.chunkCount} chunks
          </span>
        )}
        {!isReady && (
          <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>
            {lesson.status}
          </span>
        )}
        {isReady && (
          <div style={{ display: 'flex', gap: 6 }}>
            <Link
              to={`/lesson/${lesson.id}`}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}
            >Watch</Link>
            <span style={{ color: 'var(--border)' }}>·</span>
            <Link
              to={`/lesson/${lesson.id}/quiz`}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}
            >Quiz</Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [lessons,   setLessons]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(true);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    getLessons(DEMO_COURSE)
      .then(d  => { setLessons(d.lessons || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const readyCount = lessons.filter(l => l.status === 'ready').length;
  const pct        = lessons.length > 0 ? Math.round((readyCount / lessons.length) * 100) : 0;

  const filteredLessons = lessons.filter(l =>
    l.title?.toLowerCase().includes(search.toLowerCase())
  );

  // Find next unwatched lesson
  const nextLesson = lessons.find(l => l.status === 'ready');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 0,
        minHeight: 'calc(100vh - var(--nav-h))',
      }}>

        {/* ── Left: Course Content ─────────────────────────────────────────── */}
        <div style={{ padding: '28px 32px', borderRight: '1px solid var(--border)', overflowY: 'auto' }}>

          {/* Course header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>←</Link>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
              AI Learning Companion
            </h1>
          </div>

          {/* Progress card */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px 22px', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
                {pct}% Complete
              </span>
              {nextLesson && (
                <Link to={`/lesson/${nextLesson.id}`} className="btn-orange" style={{ padding: '6px 14px', fontSize: 12 }}>
                  Resume Learning
                </Link>
              )}
            </div>
            <div className="progress-bar" style={{ marginBottom: 12 }}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ display: 'flex', gap: 28 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lessons</span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                  {readyCount}/{lessons.length}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI Indexed</span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                  {readyCount}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quizzes</span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                  {readyCount} available
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 4,
            borderBottom: '1px solid var(--border)',
            marginBottom: 20, paddingBottom: 0,
          }}>
            {['All Modules', 'Announcements'].map((tab, i) => (
              <button key={tab} style={{
                padding: '8px 16px', background: 'none', border: 'none',
                fontSize: 13, fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? '#fff' : 'var(--text-muted)',
                borderBottom: i === 0 ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1, cursor: 'pointer',
              }}>
                {i === 0 ? '⊞' : '📣'} {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 12px', marginBottom: 16,
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search lessons…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13 }}
            />
          </div>

          {/* Module accordion */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 32, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            }}>
              {/* Module header */}
              <button
                onClick={() => setExpanded(e => !e)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'none', border: 'none',
                  borderBottom: expanded ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14 }}>📹</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Video Lessons</span>
                  {nextLesson && (
                    <Link
                      to={`/lesson/${nextLesson.id}`}
                      onClick={e => e.stopPropagation()}
                      className="btn-orange"
                      style={{ padding: '4px 12px', fontSize: 11 }}
                    >
                      Resume Learning
                    </Link>
                  )}
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 16, transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                  ⌃
                </span>
              </button>

              {/* Lessons list */}
              {expanded && (
                <div style={{ padding: '8px' }}>
                  {filteredLessons.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {search ? 'No results found.' : 'No lessons yet. Add some from Instructor Studio.'}
                    </div>
                  ) : (
                    filteredLessons.map((l, i) => (
                      <LessonRow key={l.id} lesson={l} index={i} />
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Notifications + Heatmap ──────────────────────────────── */}
        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Notifications */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>All Notifications</span>
            </div>
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                No notifications available
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                You're all caught up! Check back later for updates.
              </p>
            </div>
          </div>

          {/* Progress Heatmap */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Progress Heatmap</span>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--accent)' }}>
                {readyCount * 8} lessons explored so far!
              </p>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <HeatMap lessons={lessons} />
            </div>
          </div>

          {/* Quick stats */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 18px',
          }}>
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#fff' }}>Quick Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nextLesson && (
                <Link to={`/lesson/${nextLesson.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
                  color: 'var(--accent)', fontSize: 13, fontWeight: 600,
                }}>
                  ▶ Continue Learning
                </Link>
              )}
              <Link to="/instructor" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', fontSize: 13,
                }}>
                  🎙 Instructor Studio
              </Link>
              {nextLesson && (
                <Link to={`/lesson/${nextLesson.id}/quiz`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', fontSize: 13,
                }}>
                  🧠 Take a Quiz
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
