/**
 * pages/LessonPage.jsx
 * 3-column Sheryians-style lesson view:
 *   Col 1 (280px) — Lesson sidebar (lesson list, progress)
 *   Col 2 (flex)  — AI Chat / Class info (middle panel — tabbed)
 *   Col 3 (flex)  — Video player (right panel — titled "Video Lecture")
 *
 * The AI chatbot lives in the middle column, always visible alongside the video.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatPanel from '../components/ChatPanel';
import LessonStatusBadge from '../components/LessonStatusBadge';
import VideoChapterBar from '../components/VideoChapterBar';
import SubtitleOverlay, { SubtitleControls } from '../components/SubtitleOverlay';
import { useSubtitles } from '../hooks/useSubtitles';
import { getLesson, getLessons } from '../services/api';
import { useLessonStatus } from '../hooks/useLessonStatus';

const DEMO_COURSE = 'demo-course-001';
const BASE_URL    = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

// Build the video streaming URL — relative so Vite's /api proxy forwards it to the backend
function buildVideoUrl(lessonId) {
  return `/api/lessons/${lessonId}/video`;
}

// ── Lesson sidebar row ─────────────────────────────────────────────────────────
function SidebarLessonRow({ lesson, index, isActive, onClick }) {
  const [hov, setHov] = useState(false);
  const isReady = lesson.status === 'ready';

  return (
    <div
      onClick={() => isReady && onClick(lesson)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        10,
        padding:    '9px 14px',
        borderRadius: 6,
        background: isActive ? 'var(--accent-light)' : hov && isReady ? 'var(--bg-hover)' : 'transparent',
        border:     isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
        cursor:     isReady ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        background: isActive ? 'var(--accent)' : isReady ? 'var(--green-bg)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive ? 'var(--accent)' : isReady ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: isActive ? '#fff' : isReady ? 'var(--green)' : 'var(--text-muted)',
      }}>
        {isActive ? '▶' : isReady ? '✓' : '○'}
      </div>
      <span style={{
        flex: 1, fontSize: 12, fontWeight: isActive ? 600 : 400,
        color: isActive ? 'var(--accent)' : hov && isReady ? '#fff' : 'var(--text-secondary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {index + 1} - {lesson.title}
      </span>
      {lesson.chunkCount > 0 && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
          {lesson.chunkCount}c
        </span>
      )}
    </div>
  );
}

export default function LessonPage() {
  const { lessonId } = useParams();
  const navigate     = useNavigate();

  const [lesson,       setLesson]       = useState(null);
  const [allLessons,   setAllLessons]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [midTab,       setMidTab]       = useState('ai');    // 'class' | 'ai'
  const [currentTime,  setCurrentTime]  = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const playerRef      = useRef(null);  // YouTube iframe OR native <video>
  const pollRef        = useRef(null);
  const videoRef       = useRef(null);  // native <video> element ref
  // Subtitle engine needs a live currentTime ref (avoids stale closure in rAF)
  const currentTimeRef = useRef(0);

  const { status: liveStatus } = useLessonStatus(
    lessonId,
    lesson?.status !== 'ready' && lesson?.status !== 'failed'
  );

  // Load lesson + all lessons for sidebar
  useEffect(() => {
    Promise.all([
      getLesson(lessonId),
      getLessons(DEMO_COURSE),
    ]).then(([lessonData, lessonsData]) => {
      setLesson(lessonData.lesson);
      setAllLessons(lessonsData.lessons || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [lessonId]);

  // Refresh when transcription completes (status → ready)
  useEffect(() => {
    if (liveStatus === 'ready' && lesson?.status !== 'ready') {
      getLesson(lessonId).then(d => setLesson(d.lesson)).catch(() => {});
    }
  }, [liveStatus]);

  // Auto-regenerate chapters if lesson is ready but has ≤ 1 chapter (stale data)
  const autoRegenDone = useRef(false);
  useEffect(() => {
    const isReady = (liveStatus || lesson?.status) === 'ready';
    if (!isReady || !lesson || autoRegenDone.current) return;
    if ((lesson.topicSegments?.length ?? 0) <= 1) {
      autoRegenDone.current = true;
      console.log('🔄 Auto-regenerating chapters (stale data detected)…');
      fetch(`/api/lessons/${lessonId}/regenerate-chapters`, {
        method: 'POST',
        headers: { 'x-demo-role': localStorage.getItem('demo_role') || 'student' },
      })
        .then(r => r.json())
        .then(data => {
          if (data.topicSegments) {
            setLesson(prev => ({ ...prev, topicSegments: data.topicSegments }));
            console.log(`✅ Auto-regen: ${data.topicSegments.length} chapters loaded`);
          }
        })
        .catch(e => console.error('Auto-regen failed:', e));
    }
  }, [lesson?.status, liveStatus, lesson?.topicSegments?.length, lessonId]);

  // Poll for videoUrl while still in 'uploading' state (Firebase Storage may not be done yet)
  useEffect(() => {
    if (lesson?.videoUrl || lesson?.status === 'failed') return; // already have it
    if (lesson?.source !== 'upload') return; // only for uploaded lessons
    const t = setInterval(() => {
      getLesson(lessonId).then(d => {
        if (d.lesson?.videoUrl) setLesson(d.lesson); // got it — stop polling
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [lesson?.videoUrl, lesson?.source, lesson?.status, lessonId]);

  // YouTube time tracking
  useEffect(() => {
    if (!lesson?.youtubeVideoId) return;
    const handler = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'infoDelivery' && data.info?.currentTime !== undefined) {
          const t = data.info.currentTime;
          currentTimeRef.current = t;          // keep ref live for subtitle engine
          setCurrentTime(Math.floor(t));
        }
      } catch { }
    };
    window.addEventListener('message', handler);
    pollRef.current = setInterval(() => {
      playerRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }), '*'
      );
    }, 500);   // poll every 500ms for smoother subtitle sync on YouTube
    return () => {
      window.removeEventListener('message', handler);
      clearInterval(pollRef.current);
    };
  }, [lesson?.youtubeVideoId]);

  // seekTo — works for both YouTube iframe and native <video>
  const seekTo = useCallback((seconds) => {
    if (lesson?.youtubeVideoId) {
      playerRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }), '*'
      );
    } else if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
    setCurrentTime(seconds);
  }, [lesson?.youtubeVideoId]);

  // getVideoTime — reads live playback position for sending to AI backend
  const getVideoTime = useCallback(() => {
    if (videoRef.current) return Math.floor(videoRef.current.currentTime || 0);
    return currentTime;   // YouTube fallback (polled every 2 s)
  }, [currentTime]);

  const currentIdx   = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson   = allLessons[currentIdx - 1];
  const nextLesson   = allLessons[currentIdx + 1];
  const isReady      = (liveStatus || lesson?.status) === 'ready';
  const currentStatus = liveStatus || lesson?.status;

  // ── Subtitle engine ────────────────────────────────────────────────────────
  const isYouTube = Boolean(lesson?.youtubeVideoId);
  // New API: always pass both refs; hook picks whichever is populated
  const subtitles = useSubtitles(
    lessonId,
    isYouTube ? null : videoRef,
    isYouTube ? currentTimeRef : null,
    isYouTube
  );

  // Progress of this module
  const readyCount = allLessons.filter(l => l.status === 'ready').length;
  const pct        = allLessons.length > 0 ? Math.round((readyCount / allLessons.length) * 100) : 0;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 36, animation: 'spin 1s linear infinite' }}>⟳</div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading lesson…</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const tabBtn = (id, label, icon) => (
    <button
      onClick={() => setMidTab(id)}
      style={{
        padding: '10px 18px', background: 'none', border: 'none',
        fontSize: 13, fontWeight: midTab === id ? 600 : 400,
        color: midTab === id ? '#fff' : 'var(--text-muted)',
        borderBottom: `2px solid ${midTab === id ? 'var(--accent)' : 'transparent'}`,
        marginBottom: -1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      <span style={{ color: midTab === id ? 'var(--accent)' : 'inherit' }}>{icon}</span>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* 3-column main area */}
      <div style={{
        display:  'grid',
        gridTemplateColumns: sidebarCollapsed
          ? '52px 1fr 1fr'
          : '280px 1fr 1fr',
        height:   'calc(100vh - var(--nav-h))',
        overflow: 'hidden',
        transition: 'grid-template-columns 0.25s ease',
      }}>

        {/* ══ COL 1: Left Sidebar ══════════════════════════════════════════ */}
        <div style={{
          borderRight:   '1px solid var(--border)',
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden',
          background:    'var(--bg-nav)',
        }}>
          {/* Sidebar header */}
          <div style={{
            padding: '12px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            {!sidebarCollapsed && (
              <Link to="/dashboard" style={{
                fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                ← Go Back
              </Link>
            )}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: 12,
                marginLeft: sidebarCollapsed ? 'auto' : 0,
              }}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>

          {!sidebarCollapsed && (
            <>
              {/* Current lesson label */}
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
              }}>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 10px', width: '100%', cursor: 'pointer',
                }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>◀</span>
                  <span style={{
                    fontSize: 11, color: '#fff', fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left',
                  }}>
                    {lesson?.title}
                  </span>
                </button>
              </div>

              {/* Module progress */}
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
                background: 'var(--bg-card)',
                margin: '10px 10px 0',
                borderRadius: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{pct}% Complete</span>
                </div>
                <div className="progress-bar" style={{ marginBottom: 10 }}>
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[['Video', readyCount, allLessons.length], ['MCQs', readyCount, allLessons.length]].map(([label, a, b]) => (
                    <div key={label}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{a}/{b}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lesson list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 4px', marginBottom: 4,
                }}>
                  <span style={{ fontSize: 12 }}>📖</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    LESSON
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
                    {currentIdx + 1}/{allLessons.length}
                  </span>
                </div>
                {allLessons.map((l, i) => (
                  <SidebarLessonRow
                    key={l.id}
                    lesson={l}
                    index={i}
                    isActive={l.id === lessonId}
                    onClick={(l) => navigate(`/lesson/${l.id}`)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ══ COL 2: Middle — Tabbed (Class Info / AI Chat) ═══════════════ */}
        <div style={{
          borderRight:   '1px solid var(--border)',
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden',
        }}>
          {/* Tab bar */}
          <div style={{
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center',
            padding: '0 16px', flexShrink: 0,
            background: 'var(--bg-nav)',
          }}>
            {tabBtn('class', 'Class',    '○')}
            {tabBtn('ai',    'AI Tutor', '🤖')}

            {/* Right: bookmark */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <LessonStatusBadge status={currentStatus} chunkCount={lesson?.chunkCount || 0} />
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>
                🔖
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* ── Class tab ─────────────────────────────────────────────── */}
            {midTab === 'class' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
                {/* Title + complete button */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                      {lesson?.title}
                    </h2>
                    {lesson?.description && (
                      <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {lesson.description}
                      </p>
                    )}
                  </div>
                  {isReady && (
                    <button className="btn-orange" style={{ flexShrink: 0, fontSize: 12 }}>
                      ✓ Mark Complete
                    </button>
                  )}
                </div>

                {/* Source tag */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}>
                    {lesson?.source === 'youtube' ? '🎬 YouTube' : '📁 Upload'}
                  </span>
                  {lesson?.chunkCount > 0 && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
                      color: 'var(--accent)',
                    }}>
                      🤖 {lesson.chunkCount} AI chunks
                    </span>
                  )}
                </div>

                {/* Topic segments */}
                {isReady && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        📍 Chapters {lesson?.topicSegments?.length > 0 ? `(${lesson.topicSegments.length})` : ''}
                      </p>
                      <button
                        onClick={async () => {
                          const btn = document.getElementById('regen-chapters-btn');
                          if (btn) { btn.textContent = '⟳ Generating…'; btn.disabled = true; }
                          try {
                            await fetch(`/api/lessons/${lessonId}/regenerate-chapters`, {
                              method: 'POST',
                              headers: { 'x-demo-role': localStorage.getItem('demo_role') || 'student' },
                            });
                            const d = await fetch(`/api/lessons/${lessonId}`, {
                              headers: { 'x-demo-role': localStorage.getItem('demo_role') || 'student' },
                            }).then(r => r.json());
                            if (d.lesson) setLesson(d.lesson);
                          } catch(e) { console.error(e); }
                          if (btn) { btn.textContent = '↺ Regenerate'; btn.disabled = false; }
                        }}
                        id="regen-chapters-btn"
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 8px',
                          borderRadius: 6, border: '1px solid var(--accent-border)',
                          background: 'var(--accent-light)', color: 'var(--accent)',
                          cursor: 'pointer',
                        }}
                      >
                        ↺ Regenerate
                      </button>
                    </div>

                    {lesson?.topicSegments?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {lesson.topicSegments.map((seg, i) => (
                          <button
                            key={i}
                            onClick={() => seekTo(seg.startTime)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              padding: '9px 12px', borderRadius: 8,
                              background: 'var(--bg-card)', border: '1px solid var(--border)',
                              cursor: 'pointer', textAlign: 'left',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'var(--accent-light)';
                              e.currentTarget.style.borderColor = 'var(--accent-border)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'var(--bg-card)';
                              e.currentTarget.style.borderColor = 'var(--border)';
                            }}
                          >
                            <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace', flexShrink: 0 }}>
                              {seg.startLabel}
                            </span>
                            <span style={{ fontSize: 13, color: '#fff', flex: 1 }}>{seg.topic}</span>
                            <span style={{ fontSize: 12, color: 'var(--accent)' }}>▶</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                        No chapters yet — click ↺ Regenerate to generate them from the transcript.
                      </p>
                    )}
                  </div>
                )}

                {/* Not ready state */}
                {!isReady && (
                  <div style={{
                    padding: '24px', borderRadius: 10,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    textAlign: 'center', marginTop: 20,
                  }}>
                    <p style={{ margin: '0 0 6px', fontSize: 24 }}>⚙️</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                      Video is {currentStatus}. AI features unlock when ready.
                    </p>
                  </div>
                )}

                {/* Related Links placeholder */}
                <div style={{ marginTop: 24 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Related Links
                  </p>
                  {lesson?.youtubeUrl ? (
                    <a
                      href={lesson.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        color: 'var(--text-secondary)', fontSize: 13,
                      }}
                    >
                      🎬 Open on YouTube ↗
                    </a>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No related links</p>
                  )}
                </div>
              </div>
            )}

            {/* ── AI Tutor tab ───────────────────────────────────────────── */}
            {midTab === 'ai' && (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <ChatPanel
                  lessonId={lessonId}
                  lesson={lesson}
                  onSeek={seekTo}
                  getVideoTime={getVideoTime}
                  compact
                />
              </div>
            )}
          </div>

          {/* Orange FAB for AI on class tab */}
          {midTab === 'class' && (
            <button
              onClick={() => setMidTab('ai')}
              style={{
                position: 'absolute',
                bottom: 80, right: '37%',
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--accent)', border: 'none',
                color: '#fff', fontSize: 20, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(232,87,42,0.5)',
                transition: 'transform 0.15s',
                zIndex: 20,
              }}
              onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
              title="Open AI Tutor"
            >
              🤖
            </button>
          )}
        </div>

        {/* ══ COL 3: Right — Video Player ══════════════════════════════════ */}
        <div style={{
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden',
          height:        '100%',          /* ← must be explicit for child flex:1 to work */
        }}>
          {/* Video panel header */}
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0, background: 'var(--bg-nav)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Video Lecture</span>
              <span style={{ color: 'var(--accent)', fontSize: 14 }}>▶</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Subtitle CC controls */}
              {isReady && <SubtitleControls subtitles={subtitles} />}

              <button
                onClick={() => setMidTab('ai')}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Doubt?
              </button>
              <Link
                to={`/lesson/${lessonId}/quiz`}
                style={{
                  padding: '5px 12px', borderRadius: 6,
                  background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
                  color: '#fbbf24', fontSize: 11, fontWeight: 600, textDecoration: 'none',
                }}
              >
                🧠 Quiz
              </Link>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>
                ⛶
              </button>
            </div>
          </div>

          {/* Video */}
          <div style={{ flex: 1, background: '#000', position: 'relative', minHeight: 0 }}>
            {/* ── Subtitle overlay ────────────────────────────────────── */}
            <SubtitleOverlay subtitles={subtitles} />

            {/* ── Chapter bar overlay (bottom of video) ──────────────── */}
            {lesson?.topicSegments?.length > 0 && (
              <VideoChapterBar
                segments={lesson.topicSegments}
                duration={videoDuration || 0}
                currentTime={currentTime}
                onSeek={seekTo}
              />
            )}

            {lesson?.youtubeVideoId ? (
              /* ── YouTube iframe ─────────────────────────────────────────── */
              <iframe
                ref={playerRef}
                src={`https://www.youtube.com/embed/${lesson.youtubeVideoId}?enablejsapi=1&modestbranding=1&rel=0&origin=${window.location.origin}`}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={lesson?.title}
              />
            ) : lesson?.storagePath?.startsWith('local:') ? (
              /* ── Native HTML5 video player (absolute fill) ──────────────── */
              <video
                ref={videoRef}
                src={buildVideoUrl(lessonId)}
                controls
                playsInline
                preload="metadata"
                style={{
                  position:   'absolute',
                  inset:       0,
                  width:      '100%',
                  height:     '100%',
                  objectFit:  'contain',
                  background: '#000',
                  outline:    'none',
                  display:    'block',
                }}
                onLoadedMetadata={(e) => {
                  setVideoDuration(Math.floor(e.target.duration) || 0);
                }}
                onTimeUpdate={(e) => {
                  // Update both state (for chapters/UI) and ref (for subtitle rAF loop)
                  currentTimeRef.current = e.target.currentTime;
                  const t = Math.floor(e.target.currentTime);
                  if (t !== currentTime) setCurrentTime(t);
                }}
                onError={(e) => console.error('Video load error:', e.target.error)}
              />
            ) : (
              /* ── Placeholder while videoUrl is being prepared ───────────── */
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16,
                background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #000 100%)',
              }}>
                <div style={{ fontSize: 48, opacity: 0.6, animation: 'spin 2s linear infinite' }}>⟳</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                  {currentStatus === 'failed'
                    ? '❌ Processing failed'
                    : 'Preparing video player…'}
                </p>
                {lesson?.title && (
                  <p style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.3)',
                    textAlign: 'center', padding: '0 32px',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {lesson.title}
                  </p>
                )}
                <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom nav — Prev/Next lesson ─────────────────────────────────── */}
      <div style={{
        position:   'fixed',
        bottom:     0, left: 0, right: 0,
        height:     52,
        background: 'var(--bg-nav)',
        borderTop:  '1px solid var(--border)',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap:        12,
        zIndex:     50,
      }}>
        <button
          onClick={() => prevLesson && navigate(`/lesson/${prevLesson.id}`)}
          disabled={!prevLesson}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: prevLesson ? '#fff' : 'var(--text-muted)',
            cursor: prevLesson ? 'pointer' : 'not-allowed', fontSize: 16,
          }}
        >
          ‹
        </button>

        <div style={{
          padding: '8px 28px', borderRadius: 20,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          fontSize: 13, fontWeight: 600, color: '#fff',
        }}>
          Lesson {currentIdx + 1}/{allLessons.length}
        </div>

        <button
          onClick={() => nextLesson && navigate(`/lesson/${nextLesson.id}`)}
          disabled={!nextLesson}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: nextLesson ? '#fff' : 'var(--text-muted)',
            cursor: nextLesson ? 'pointer' : 'not-allowed', fontSize: 16,
          }}
        >
          ›
        </button>
      </div>

      {/* Bottom padding so content doesn't hide behind fixed nav */}
      <div style={{ height: 52 }} />
    </div>
  );
}
