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

/* ── Markdown renderer (landing page) ───────────────────────────── */
function inlineFormatHero(str) {
  return str
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;font-weight:700">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em style="color:#e2c97e">$1</em>')
    .replace(/`(.+?)`/g,       '<code style="background:rgba(255,255,255,.08);padding:1px 6px;border-radius:4px;font-family:monospace;font-size:13px;color:#7dd3fc">$1</code>');
}
function renderMarkdownHero(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('### ')) {
      elements.push(<div key={i} style={{ display:'flex',alignItems:'center',gap:8,margin:'20px 0 8px',borderBottom:'1px solid rgba(255,107,0,.15)',paddingBottom:6 }}><span style={{ fontSize:16,fontWeight:800,color:'#fff' }} dangerouslySetInnerHTML={{ __html: inlineFormatHero(line.slice(4)) }} /></div>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ margin:'24px 0 10px',fontSize:18,fontWeight:800,color:'#FF6B00' }} dangerouslySetInnerHTML={{ __html: inlineFormatHero(line.slice(3)) }} />);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} style={{ margin:'0 0 14px',fontSize:22,fontWeight:900,color:'#fff' }} dangerouslySetInnerHTML={{ __html: inlineFormatHero(line.slice(2)) }} />);
    } else if (/^[-]{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} style={{ border:'none',borderTop:'1px solid #1e1e1e',margin:'16px 0' }} />);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) { items.push(lines[i].slice(2)); i++; }
      elements.push(<ul key={`ul-${i}`} style={{ margin:'6px 0 10px',paddingLeft:18,display:'flex',flexDirection:'column',gap:5 }}>{items.map((it,j)=><li key={j} style={{ color:'#ccc',fontSize:14,lineHeight:1.65 }} dangerouslySetInnerHTML={{ __html: inlineFormatHero(it) }} />)}</ul>);
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/,'')); i++; }
      elements.push(<ol key={`ol-${i}`} style={{ margin:'6px 0 10px',paddingLeft:22,display:'flex',flexDirection:'column',gap:5 }}>{items.map((it,j)=><li key={j} style={{ color:'#ccc',fontSize:14,lineHeight:1.65 }} dangerouslySetInnerHTML={{ __html: inlineFormatHero(it) }} />)}</ol>);
      continue;
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i} style={{ margin:'10px 0',padding:'8px 14px',borderLeft:'3px solid #FF6B00',background:'rgba(255,107,0,.06)',borderRadius:'0 8px 8px 0' }}><p style={{ margin:0,color:'#aaa',fontSize:14,fontStyle:'italic' }} dangerouslySetInnerHTML={{ __html: inlineFormatHero(line.slice(2)) }} /></blockquote>);
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height:6 }} />);
    } else {
      elements.push(<p key={i} style={{ margin:'4px 0',color:'#ccc',fontSize:14,lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html: inlineFormatHero(line) }} />);
    }
    i++;
  }
  return elements;
}


/* ── API helpers ─────────────────────────────────────────────────── */
const BACKEND = 'https://sheryai-backend-471820890563.asia-south1.run.app';

const post = (path, body, role = 'instructor') =>
  fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-role': role },
    body: JSON.stringify(body),
  }).then(r => r.json());

// File uploads bypass Vercel's 4.5MB proxy limit → go directly to Cloud Run
const postForm = (path, fd) =>
  fetch(`${BACKEND}/api${path}`, {
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
        <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,.8)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }} onClick={() => setShowSum(false)}>
          <div style={{ background:'#0e0e0e',border:'1px solid #1e1e1e',borderRadius:24,width:'100%',maxWidth:680,maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 30px 100px rgba(0,0,0,.8)',overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding:'20px 24px 0',flexShrink:0 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16 }}>
                <div>
                  <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:4 }}>
                    <span style={{ fontSize:22 }}>📄</span>
                    <h3 style={{ margin:0,color:'#fff',fontSize:18,fontWeight:800 }}>Lecture Summary</h3>
                  </div>
                  {lesson?.title && <p style={{ margin:0,fontSize:12,color:'#555' }}>📚 {lesson.title}</p>}
                </div>
                <button onClick={() => setShowSum(false)} style={{ background:'none',border:'1px solid #222',borderRadius:8,color:'#555',cursor:'pointer',fontSize:18,padding:'4px 10px',lineHeight:1 }}>✕</button>
              </div>
              <div style={{ display:'flex',justifyContent:'flex-end',paddingBottom:16,borderBottom:'1px solid #1a1a1a' }}>
                <button
                  onClick={async () => {
                    if (!summary || sumLoad) return;
                    const { jsPDF } = await import('jspdf');

                    // Sanitize helper — strips emoji & non-Latin-1 so Helvetica renders correctly
                    const san = (s) => {
                      const map = { '\uD83C\uDFAF':'TL;DR - ','\uD83E\uDDE0':'Core Concepts - ','\uD83D\uDCCB':'Key Points - ','\uD83D\uDCA1':'Idea: ','\u26A1':'Quick-Recall: ','\uD83D\uDD11':'Key: ','\uD83D\uDCCC':'','\u2705':'[OK] ','\uD83D\uDCDD':'Note: ','\uD83D\uDE80':'','\u2B50':'','\uD83D\uDCCA':'','\uD83D\uDD25':'','\uD83D\uDCAC':'','\u26A0\uFE0F':'[!] ','\uD83D\uDC49':'> ','\uD83C\uDFC1':'' };
                      let o = s;
                      for (const [k,v] of Object.entries(map)) o = o.split(k).join(v);
                      return o.replace(/[\u2014\u2013]/g,'-').replace(/[\u201C\u201D]/g,'"').replace(/[\u2018\u2019]/g,"'").replace(/\u2026/g,'...').replace(/\u2022/g,'*').replace(/[\u2500-\u257F]/g,'-').replace(/\u00A0/g,' ').replace(/[^\x00-\xFF]/g,'').trim();
                    };

                    const doc = new jsPDF({ unit:'mm', format:'a4' });
                    const pageW=doc.internal.pageSize.getWidth(), pageH=doc.internal.pageSize.getHeight(), margin=18, maxW=pageW-margin*2;
                    let y=margin;
                    const checkY=(n=8)=>{ if(y+n>pageH-margin){doc.addPage();y=margin+6;} };

                    // Header
                    doc.setFillColor(255,107,0); doc.rect(0,0,pageW,14,'F');
                    doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont('helvetica','bold');
                    doc.text('SheryAI - AI Lecture Summary',margin,9.5);
                    doc.setFontSize(9); doc.setFont('helvetica','normal');
                    doc.text(new Date().toLocaleDateString('en-US',{day:'2-digit',month:'short',year:'numeric'}),pageW-margin,9.5,{align:'right'});
                    y=22;

                    // Title
                    const safeT = san(lesson?.title||'Lecture Summary');
                    doc.setTextColor(20,20,20); doc.setFontSize(15); doc.setFont('helvetica','bold');
                    const tl=doc.splitTextToSize(safeT,maxW); doc.text(tl,margin,y); y+=tl.length*7+6;
                    doc.setDrawColor(255,107,0); doc.setLineWidth(0.7); doc.line(margin,y,pageW-margin,y); y+=10;

                    // Body
                    for(const raw of summary.split('\n')){
                      const stripped=raw.replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1').replace(/`(.+?)`/g,'"$1"').replace(/^#{1,3}\s+/,'').replace(/^[-*]\s+/,'').replace(/^>\s+/,'').replace(/^---+$/,'');
                      const clean=san(stripped);
                      if(!clean){y+=2;continue;}
                      const isH=/^#{1,3}\s/.test(raw), isB=/^[-*\u2022]\s/.test(raw.trim()), isN=/^\d+\.\s/.test(raw), isHR=/^---+$/.test(raw.trim()), isQA=/^[QA]:\s/.test(clean);
                      if(isH){
                        checkY(14);
                        if(y>40){doc.setDrawColor(235,235,235);doc.setLineWidth(0.25);doc.line(margin,y-3,pageW-margin,y-3);}
                        doc.setFontSize(11.5); doc.setFont('helvetica','bold'); doc.setTextColor(200,80,0);
                        const hl=doc.splitTextToSize(clean,maxW); checkY(hl.length*6.5+6); doc.text(hl,margin,y); y+=hl.length*6.5+6;
                      } else if(isB){
                        checkY(7); doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(40,40,40);
                        doc.text('-',margin+1,y);
                        const bl=doc.splitTextToSize(clean,maxW-7); checkY(bl.length*5.5+3); doc.text(bl,margin+6,y); y+=bl.length*5.5+3;
                      } else if(isN){
                        checkY(7); doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(40,40,40);
                        const nl=doc.splitTextToSize(clean,maxW-6); checkY(nl.length*5.5+3); doc.text(nl,margin+4,y); y+=nl.length*5.5+3;
                      } else if(isHR){
                        checkY(6); doc.setDrawColor(210,210,210); doc.setLineWidth(0.3); doc.line(margin,y,pageW-margin,y); y+=6;
                      } else if(isQA){
                        checkY(7); const isQ=clean.startsWith('Q:');
                        doc.setFontSize(10); doc.setFont('helvetica',isQ?'bold':'normal'); doc.setTextColor(isQ?20:55,isQ?20:55,isQ?20:55);
                        const ql=doc.splitTextToSize(clean,maxW); checkY(ql.length*5.5+2); doc.text(ql,margin,y); y+=ql.length*5.5+(isQ?1.5:5);
                      } else {
                        checkY(7); doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50);
                        const pl=doc.splitTextToSize(clean,maxW); checkY(pl.length*5.5+2); doc.text(pl,margin,y); y+=pl.length*5.5+3;
                      }
                    }

                    // Footer
                    const total=doc.internal.getNumberOfPages();
                    for(let p=1;p<=total;p++){doc.setPage(p);doc.setFontSize(8);doc.setTextColor(180,180,180);doc.text(`SheryAI * ${safeT} * Page ${p} of ${total}`,pageW/2,pageH-8,{align:'center'});}
                    doc.save(`SheryAI_Summary_${safeT.replace(/\s+/g,'_').slice(0,40)}.pdf`);
                  }}
                  disabled={!summary || sumLoad}
                  style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:10,border:'none',cursor:(!summary||sumLoad)?'not-allowed':'pointer',background:(!summary||sumLoad)?'#1a1a1a':'rgba(255,107,0,.15)',color:(!summary||sumLoad)?'#444':'#FF6B00',fontSize:12,fontWeight:700,transition:'all .2s' }}
                >⬇ Download PDF</button>
              </div>
            </div>
            {/* Body */}
            <div style={{ flex:1,overflowY:'auto',padding:'20px 24px 24px' }}>
              {sumLoad
                ? <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 0',gap:16 }}>
                    <div style={{ width:48,height:48,borderRadius:'50%',border:'3px solid #1a1a1a',borderTop:'3px solid #FF6B00',animation:'spin 0.8s linear infinite' }} />
                    <p style={{ color:'#555',margin:0,fontSize:14 }}>Generating summary with AI…</p>
                  </div>
                : <div style={{ color:'#ccc',fontSize:14,lineHeight:1.7 }}>{renderMarkdownHero(summary)}</div>
              }
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
