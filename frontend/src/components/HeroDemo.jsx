/**
 * HeroDemo.jsx – Landing page interactive sections
 * 1. Video Studio  (like InstructorStudio, public, instructor role)
 * 2. AI Video Chat (ChatGPT-style, student role + SSE streaming)
 */
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { useChat } from '../hooks/useChat';
import { useLessonStatus } from '../hooks/useLessonStatus';
import ChatMessage from './ChatMessage';

/* ── API helpers ─────────────────────────────────────────────────── */
const post = (path, body, role = 'instructor') =>
  fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-role': role },
    body: JSON.stringify(body),
  }).then(r => r.json());

const postForm = (path, fd) =>
  fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'x-demo-role': 'instructor' },
    body: fd,
  }).then(r => r.json());

/* ── LessonStatusBadge ───────────────────────────────────────────── */
function Badge({ lessonId, initialStatus }) {
  const skip = initialStatus === 'ready' || initialStatus === 'failed';
  const { status, progress } = useLessonStatus(lessonId, !skip);
  const s = status || initialStatus;
  const colors = { ready:'#22c55e', failed:'#ef4444', processing:'#f59e0b', transcribing:'#f59e0b', embedding:'#3b82f6' };
  const labels = { ready:'✅ Ready', failed:'❌ Failed', processing:'⚙️ Processing…', transcribing:'🎙 Transcribing…', embedding:'🔢 Embedding…' };
  return (
    <span style={{ fontSize:11, fontWeight:700, color: colors[s]||'#888', display:'flex', alignItems:'center', gap:4 }}>
      {labels[s] || s}
      {progress > 0 && s !== 'ready' && <span style={{ color:'#666' }}>({progress}%)</span>}
    </span>
  );
}

/* ── Video Studio ────────────────────────────────────────────────── */
export function VideoStudio({ onLessonReady }) {
  const [tab, setTab]           = useState('youtube');
  const [ytForm, setYt]         = useState({ title:'', youtubeUrl:'', description:'' });
  const [upForm, setUp]         = useState({ title:'', description:'' });
  const [file, setFile]         = useState(null);
  const [lessons, setLessons]   = useState([]);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState('');
  const fileRef = useRef();

  const inputS = {
    width:'100%', padding:'11px 14px', background:'#111', border:'1px solid #2a2a2a',
    borderRadius:10, color:'#fff', fontSize:14, outline:'none',
    boxSizing:'border-box', fontFamily:'inherit', transition:'border-color .2s',
  };
  const labelS = { display:'block', fontSize:12, fontWeight:600, color:'#666', marginBottom:6 };

  const submitYT = async e => {
    e.preventDefault();
    if (!ytForm.youtubeUrl || !ytForm.title) { setErr('Title and YouTube URL are required'); return; }
    setBusy(true); setErr('');
    try {
      const d = await post('/lessons/ingest-youtube', { ...ytForm, courseId:'demo-course-001', order:1 });
      if (!d.lessonId) throw new Error(d.error || 'No lessonId returned');
      const lesson = { lessonId:d.lessonId, title:ytForm.title, source:'youtube', youtubeUrl:ytForm.youtubeUrl, status:'processing' };
      setLessons(p => [lesson, ...p]);
      setYt({ title:'', youtubeUrl:'', description:'' });
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const submitUpload = async e => {
    e.preventDefault();
    if (!file) { setErr('Please select a video file'); return; }
    if (!upForm.title) { setErr('Title is required'); return; }
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', upForm.title);
      fd.append('description', upForm.description);
      fd.append('courseId', 'demo-course-001');
      fd.append('order', '1');
      const d = await postForm('/lessons/upload', fd);
      if (!d.lessonId) throw new Error(d.error || 'Upload failed');
      const lesson = { lessonId:d.lessonId, title:upForm.title, source:'upload', status:'uploading' };
      setLessons(p => [lesson, ...p]);
      setFile(null); if (fileRef.current) fileRef.current.value='';
      setUp({ title:'', description:'' });
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const handleFilePick = e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 500*1024*1024) { setErr('Max file size is 500 MB'); return; }
    setFile(f);
    if (!upForm.title) setUp(p => ({ ...p, title: f.name.replace(/\.[^/.]+$/,'') }));
  };

  return (
    <div style={{ maxWidth:820, margin:'0 auto', padding:'0 24px' }}>
      {/* Input card */}
      <div style={{ background:'#0e0e0e', border:'1px solid #1e1e1e', borderRadius:20, overflow:'hidden', marginBottom:28 }}>
        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #1e1e1e', padding:'0 4px' }}>
          {[['youtube','🎬 YouTube URL'],['upload','📁 Upload Video']].map(([id,label]) => (
            <button key={id} onClick={() => { setTab(id); setErr(''); }} style={{
              padding:'14px 20px', background:'none', border:'none', cursor:'pointer', fontSize:13,
              fontWeight:600, color: tab===id ? 'var(--accent,#FF6B00)' : '#555',
              borderBottom: tab===id ? '2px solid var(--accent,#FF6B00)' : '2px solid transparent',
              transition:'all .2s', fontFamily:'inherit',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ padding:28 }}>
          {tab === 'youtube' && (
            <form onSubmit={submitYT} style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <div>
                <label style={labelS}>Lesson Title *</label>
                <input style={inputS} placeholder="e.g. Introduction to Machine Learning"
                  value={ytForm.title} onChange={e => setYt(p => ({ ...p, title:e.target.value }))} required />
              </div>
              <div>
                <label style={labelS}>YouTube URL *</label>
                <input style={inputS} placeholder="https://www.youtube.com/watch?v=..."
                  value={ytForm.youtubeUrl} onChange={e => setYt(p => ({ ...p, youtubeUrl:e.target.value }))} required />
              </div>
              <div>
                <label style={labelS}>Description (optional)</label>
                <textarea style={{ ...inputS, resize:'vertical', minHeight:72 }}
                  placeholder="What is this lesson about?"
                  value={ytForm.description} onChange={e => setYt(p => ({ ...p, description:e.target.value }))} />
              </div>
              {err && <p style={{ margin:0, color:'#f87171', fontSize:13 }}>⚠️ {err}</p>}
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <button type="submit" disabled={busy} style={{
                  padding:'12px 28px', borderRadius:10, border:'none', cursor: busy?'not-allowed':'pointer',
                  background: busy?'#333':'var(--accent,#FF6B00)', color:'#fff', fontWeight:700,
                  fontSize:14, fontFamily:'inherit', opacity: busy?0.6:1, transition:'all .2s',
                }}>{busy ? '⏳ Submitting…' : '🚀 Create Lesson'}</button>
                <p style={{ margin:0, fontSize:12, color:'#555' }}>Transcription takes 1–3 minutes.</p>
              </div>
            </form>
          )}

          {tab === 'upload' && (
            <form onSubmit={submitUpload} style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <div>
                <label style={labelS}>Video File * (MP4, WebM, MOV — max 500 MB)</label>
                <div onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFilePick({ target:{ files:e.dataTransfer.files } }); }}
                  style={{
                    border:'2px dashed #333', borderRadius:14, padding:32, textAlign:'center',
                    cursor:'pointer', background: file?'rgba(255,107,0,.04)':'#0a0a0a',
                    transition:'all .2s', borderColor: file?'var(--accent,#FF6B00)':'#333',
                  }}>
                  <input ref={fileRef} type="file" accept="video/*,audio/*" style={{ display:'none' }} onChange={handleFilePick} />
                  {file ? (
                    <div>
                      <p style={{ margin:0, color:'var(--accent,#FF6B00)', fontWeight:600 }}>📎 {file.name}</p>
                      <p style={{ margin:'4px 0 0', fontSize:12, color:'#555' }}>{(file.size/1024/1024).toFixed(1)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ margin:'0 0 8px', fontSize:32 }}>📤</p>
                      <p style={{ margin:0, color:'#555', fontSize:14 }}>Click or drag & drop your video here</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={labelS}>Lesson Title *</label>
                <input style={inputS} placeholder="e.g. Lecture 3 — Gradient Descent"
                  value={upForm.title} onChange={e => setUp(p => ({ ...p, title:e.target.value }))} required />
              </div>
              <div>
                <label style={labelS}>Description (optional)</label>
                <textarea style={{ ...inputS, resize:'vertical', minHeight:72 }}
                  placeholder="What is this lecture about?"
                  value={upForm.description} onChange={e => setUp(p => ({ ...p, description:e.target.value }))} />
              </div>
              {err && <p style={{ margin:0, color:'#f87171', fontSize:13 }}>⚠️ {err}</p>}
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <button type="submit" disabled={busy||!file} style={{
                  padding:'12px 28px', borderRadius:10, border:'none', cursor: (busy||!file)?'not-allowed':'pointer',
                  background: (busy||!file)?'#333':'var(--accent,#FF6B00)', color:'#fff', fontWeight:700,
                  fontSize:14, fontFamily:'inherit', opacity:(busy||!file)?0.6:1, transition:'all .2s',
                }}>{busy ? '⏳ Uploading…' : '📤 Upload & Process'}</button>
                <p style={{ margin:0, fontSize:12, color:'#555' }}>Supports Hindi, Hinglish, and accented English.</p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Lessons list */}
      {lessons.length > 0 && (
        <div style={{ background:'#0e0e0e', border:'1px solid #1e1e1e', borderRadius:20, overflow:'hidden' }}>
          <div style={{ padding:'16px 24px', borderBottom:'1px solid #1a1a1a', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'#fff' }}>Session Videos</h3>
              <p style={{ margin:'2px 0 0', fontSize:12, color:'#555' }}>Auto-updating every 3 s · Click Ready lesson to chat</p>
            </div>
            <span style={{ padding:'4px 12px', borderRadius:20, background:'rgba(255,107,0,.1)', color:'var(--accent,#FF6B00)', fontSize:12, fontWeight:700 }}>{lessons.length}</span>
          </div>
          {lessons.map(l => (
            <LessonRow key={l.lessonId} lesson={l} onReady={onLessonReady} />
          ))}
        </div>
      )}

      {lessons.length === 0 && (
        <div style={{ background:'#0e0e0e', border:'1px solid #1e1e1e', borderRadius:20, padding:56, textAlign:'center' }}>
          <p style={{ fontSize:48, margin:'0 0 14px' }}>🎓</p>
          <p style={{ margin:0, color:'#555', fontSize:14 }}>No videos added yet. Use the form above to get started.</p>
        </div>
      )}
    </div>
  );
}

function LessonRow({ lesson, onReady }) {
  const skip = lesson.status === 'ready' || lesson.status === 'failed';
  const { status } = useLessonStatus(lesson.lessonId, !skip);
  const s = status || lesson.status;
  const isReady = s === 'ready';

  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 24px', borderBottom:'1px solid #111', gap:12,
      cursor: isReady ? 'pointer' : 'default',
      background: 'transparent', transition:'background .15s',
    }}
    onClick={() => isReady && onReady?.(lesson)}
    onMouseEnter={e => isReady && (e.currentTarget.style.background='rgba(255,107,0,.04)')}
    onMouseLeave={e => e.currentTarget.style.background='transparent'}
    >
      <div>
        <p style={{ margin:0, fontWeight:600, fontSize:14, color:'#fff' }}>{lesson.title}</p>
        <p style={{ margin:'3px 0 0', fontSize:11, color:'#555' }}>
          {lesson.source === 'youtube' ? '🎬 YouTube' : '📁 Upload'}
          {lesson.youtubeUrl ? ` · ${lesson.youtubeUrl.substring(0,42)}…` : ''}
        </p>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <Badge lessonId={lesson.lessonId} initialStatus={lesson.status} />
        {isReady && <span style={{ fontSize:11, color:'#FF6B00', fontWeight:600 }}>Chat →</span>}
      </div>
    </div>
  );
}

/* ── AI Video Chat (ChatGPT style) ───────────────────────────────── */
export function AIVideoChat({ lesson, onBack }) {
  const { messages, isStreaming, currentStreamText, followUps, error, sendMessage, stopStreaming, clearSession } = useChat(lesson?.lessonId);
  const [input, setInput]         = useState('');
  const [showSum, setShowSum]     = useState(false);
  const [summary, setSummary]     = useState('');
  const [sumLoad, setSumLoad]     = useState(false);
  const inputRef     = useRef();
  const scrollBoxRef = useRef(); // ref on the scrollable messages container

  // Scroll within the chat box only — never scrolls the whole page
  useEffect(() => {
    const el = scrollBoxRef.current;
    if (!el) return;
    // Smooth scroll when a new full message arrives; instant during token streaming
    if (!isStreaming) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, currentStreamText, isStreaming]);

  const send = (text = input) => {
    const t = (typeof text === 'string' ? text : input).trim();
    if (!t || isStreaming) return;
    setInput('');
    sendMessage(t, () => 0);
  };

  const fetchSummary = async () => {
    setShowSum(true); setSumLoad(true); setSummary('');
    try {
      const r = await fetch('/api/chat/summary', {
        method:'POST', headers:{ 'Content-Type':'application/json','x-demo-role':'student' },
        body: JSON.stringify({ lessonId: lesson.lessonId, type:'full' }),
      });
      const d = await r.json();
      setSummary(d.summary || 'No summary available.');
    } catch { setSummary('Failed to generate summary.'); }
    finally { setSumLoad(false); }
  };

  const starters = [
    'Give me a full summary of this video',
    'What are the key concepts explained?',
    'What problems does this lecture solve?',
    'Quiz me on the main ideas',
  ];

  const hasMessages = messages.length > 0 || isStreaming;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#050505', fontFamily:"'Inter',sans-serif" }}>

      {/* Top bar */}
      <div style={{ padding:'12px 20px', borderBottom:'1px solid #1a1a1a', display:'flex', alignItems:'center', gap:12, flexShrink:0, background:'#0a0a0a' }}>
        <button onClick={onBack} style={{ background:'none', border:'1px solid #222', borderRadius:8, color:'#666', padding:'6px 12px', cursor:'pointer', fontSize:12, fontFamily:'inherit' }}>← Back</button>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontWeight:700, fontSize:14, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            🎬 {lesson?.title || 'AI Video Chat'}
          </p>
          <p style={{ margin:0, fontSize:11, color:'#444' }}>AI Video Intelligence · Powered by SheryAI</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchSummary} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #222', background:'#111', color:'#888', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>📄 Summary</button>
          {hasMessages && <button onClick={clearSession} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid rgba(239,68,68,.2)', background:'rgba(239,68,68,.05)', color:'#f87171', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>🗑 Clear</button>}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollBoxRef} style={{ flex:1, overflowY:'auto', padding:'24px 20px', display:'flex', flexDirection:'column', gap:16 }}>
        {!hasMessages && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:24, padding:24 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B00,#ff9500)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 16px', boxShadow:'0 0 40px rgba(255,107,0,.3)' }}>🎬</div>
              <h3 style={{ margin:'0 0 8px', color:'#fff', fontSize:22, fontWeight:800 }}>AI Video Intelligence</h3>
              <p style={{ margin:0, color:'#555', fontSize:14, lineHeight:1.6, maxWidth:400 }}>
                Ask me anything about <strong style={{ color:'#FF6B00' }}>{lesson?.title}</strong>. I'll cite exact timestamps so you can jump to the moment.
              </p>
            </div>
            <div style={{ width:'100%', maxWidth:560 }}>
              <p style={{ margin:'0 0 12px', fontSize:11, color:'#444', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>Try asking</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {starters.map((q,i) => (
                  <button key={i} onClick={() => send(q)} style={{
                    padding:'12px 14px', borderRadius:12, border:'1px solid #1e1e1e', background:'#0e0e0e',
                    color:'#888', fontSize:13, cursor:'pointer', textAlign:'left', lineHeight:1.4,
                    fontFamily:'inherit', transition:'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,107,0,.3)'; e.currentTarget.style.color='#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#1e1e1e'; e.currentTarget.style.color='#888'; }}
                  >💬 {q}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map(msg => <ChatMessage key={msg.id} message={msg} onSeek={() => {}} />)}

        {isStreaming && currentStreamText && (
          <ChatMessage message={{ role:'assistant', content:currentStreamText, id:'streaming' }} isStreaming />
        )}
        {isStreaming && !currentStreamText && (
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ width:32,height:32,borderRadius:'50%',background:'#FF6B00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0 }}>🎬</div>
            <div style={{ padding:'12px 16px',borderRadius:'4px 18px 18px 18px',background:'#111',border:'1px solid #222',display:'flex',gap:6 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:7,height:7,borderRadius:'50%',background:'#FF6B00',animation:`bounce 1.2s ease-in-out ${i*.2}s infinite` }} />)}
            </div>
          </div>
        )}
        {error && <div style={{ padding:'10px 14px',borderRadius:10,background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',color:'#f87171',fontSize:13 }}>⚠️ {error}</div>}
        {followUps.length > 0 && !isStreaming && (
          <div style={{ paddingLeft:42 }}>
            <p style={{ margin:'0 0 8px',fontSize:11,color:'#444',fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em' }}>Follow-up questions</p>
            <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
              {followUps.map((q,i) => (
                <button key={i} onClick={() => send(q)} style={{ padding:'6px 14px',borderRadius:20,border:'1px solid rgba(255,107,0,.3)',background:'rgba(255,107,0,.05)',color:'#FF6B00',fontSize:12,cursor:'pointer',fontFamily:'inherit',transition:'all .15s' }}>{q}</button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Input */}
      <div style={{ padding:'16px 20px', borderTop:'1px solid #1a1a1a', flexShrink:0, background:'#0a0a0a' }}>
        <div style={{ display:'flex',gap:10,alignItems:'flex-end',background:'#111',border:'1px solid #222',borderRadius:16,padding:'10px 14px',maxWidth:860,margin:'0 auto',transition:'border-color .2s' }}
          onFocusCapture={e => e.currentTarget.style.borderColor='rgba(255,107,0,.4)'}
          onBlurCapture={e => e.currentTarget.style.borderColor='#222'}
        >
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); }}}
            placeholder="Ask anything about this video… (Enter to send)"
            rows={1} style={{ flex:1,background:'none',border:'none',outline:'none',color:'#fff',fontSize:14,resize:'none',fontFamily:'inherit',lineHeight:1.5,maxHeight:120,overflowY:'auto' }}
            onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'; }}
          />
          <button onClick={isStreaming?stopStreaming:send} disabled={!isStreaming&&!input.trim()} style={{
            width:38,height:38,borderRadius:'50%',border:'none',flexShrink:0,
            cursor:(!isStreaming&&!input.trim())?'not-allowed':'pointer',
            background:isStreaming?'rgba(239,68,68,.2)':'#FF6B00',
            color:isStreaming?'#f87171':'#fff',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',
            opacity:(!isStreaming&&!input.trim())?0.4:1,transition:'all .2s',
          }}>{isStreaming?'⏹':'↑'}</button>
        </div>
        <p style={{ margin:'8px auto 0',fontSize:11,color:'#333',textAlign:'center',maxWidth:860 }}>Enter to send · Shift+Enter for new line · Powered by SheryAI</p>
      </div>

      {/* Summary modal */}
      {showSum && (
        <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }} onClick={() => setShowSum(false)}>
          <div style={{ background:'#0e0e0e',border:'1px solid #222',borderRadius:20,padding:28,maxWidth:640,width:'100%',maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 25px 80px rgba(0,0,0,.7)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
              <h3 style={{ margin:0,color:'#fff',fontSize:18,fontWeight:700 }}>📄 Lecture Summary</h3>
              <button onClick={() => setShowSum(false)} style={{ background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:20 }}>✕</button>
            </div>
            <div style={{ flex:1,overflowY:'auto',color:'#aaa',fontSize:14,lineHeight:1.7 }}>
              {sumLoad ? <div style={{ textAlign:'center',padding:40,color:'#555' }}>⟳ Generating summary…</div>
                : <pre style={{ margin:0,fontFamily:'inherit',whiteSpace:'pre-wrap' }}>{summary}</pre>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-6px);opacity:1} }
      `}</style>
    </div>
  );
}

/* ── Default export: orchestrates both ───────────────────────────── */
export default function HeroDemo() {
  const [activeLesson, setActiveLesson] = useState(null);

  if (activeLesson) {
    return (
      <div style={{ height:'calc(100vh - 80px)', minHeight:600 }}>
        <AIVideoChat lesson={activeLesson} onBack={() => setActiveLesson(null)} />
      </div>
    );
  }
  return <VideoStudio onLessonReady={setActiveLesson} />;
}
