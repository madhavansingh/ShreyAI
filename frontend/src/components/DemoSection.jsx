import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';

const BASE = '';
// ingest/upload routes require instructor role — use it directly for public demo
const ingestHeaders = () => ({ 'x-demo-role': 'instructor' });
const chatRole = 'student';

function StatusBadge({ status }) {
  const map = {
    pending:      { color:'#f59e0b', label:'⏳ Queued' },
    transcribing: { color:'#3b82f6', label:'🎙 Transcribing…' },
    chunking:     { color:'#8b5cf6', label:'🧠 Indexing…' },
    ready:        { color:'#22c55e', label:'✅ Ready' },
    failed:       { color:'#ef4444', label:'❌ Failed' },
  };
  const s = map[status] || { color:'#666', label: status };
  return (
    <span style={{ fontSize:12, fontWeight:600, color:s.color, background:`${s.color}18`, border:`1px solid ${s.color}44`, borderRadius:99, padding:'4px 12px' }}>
      {s.label}
    </span>
  );
}

function ChatUI({ lessonId, onQuiz }) {
  // Ensure chat always runs as student in demo mode
  useEffect(() => {
    if (!localStorage.getItem('demo_role')) localStorage.setItem('demo_role', 'student');
  }, []);
  const { messages, isStreaming, currentStreamText, followUps, error, sendMessage, stopStreaming, clearSession } = useChat(lessonId);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, currentStreamText]);

  const send = (txt) => {
    const m = (txt || input).trim();
    if (!m || isStreaming) return;
    setInput('');
    sendMessage(m, () => 0);
  };

  const hasMsg = messages.length > 0 || isStreaming;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:420 }}>
      {/* toolbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid #1a1a1a', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:'rgba(255,107,0,.15)', border:'1px solid rgba(255,107,0,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🤖</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>AI Tutor</div>
            <div style={{ fontSize:11, color:'#555' }}>Ask anything about this lecture</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onQuiz} style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(251,191,36,.3)', background:'rgba(251,191,36,.08)', color:'#fbbf24', fontSize:11, fontWeight:700, cursor:'pointer' }}>🧠 Quiz</button>
          {hasMsg && <button onClick={clearSession} style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(239,68,68,.2)', background:'rgba(239,68,68,.05)', color:'#f87171', fontSize:11, cursor:'pointer' }}>🗑 Clear</button>}
        </div>
      </div>

      {/* messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
        {!hasMsg && (
          <div style={{ textAlign:'center', padding:'40px 24px', color:'#444' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#fff', marginBottom:6 }}>Your AI Tutor is ready</div>
            <div style={{ fontSize:12, color:'#555', lineHeight:1.6 }}>Ask anything about this video — I'll cite the exact timestamp.</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:20 }}>
              {['Summarize the key points','What happens at the start?','Give me a quick overview'].map(q => (
                <button key={q} onClick={() => send(q)} style={{ padding:'8px 14px', borderRadius:10, border:'1px solid #2a2a2a', background:'#111', color:'#aaa', fontSize:12, cursor:'pointer', textAlign:'left', transition:'all .15s' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor='rgba(255,107,0,.4)'; e.currentTarget.style.color='#fff'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor='#2a2a2a'; e.currentTarget.style.color='#aaa'; }}>
                  💬 {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ display:'flex', gap:10, justifyContent: msg.role==='user'?'flex-end':'flex-start' }}>
            {msg.role==='assistant' && <div style={{ width:28, height:28, borderRadius:'50%', background:'#FF6B00', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>🤖</div>}
            <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius: msg.role==='user'?'18px 4px 18px 18px':'4px 18px 18px 18px', background:msg.role==='user'?'#FF6B00':'#1a1a1a', border:msg.role==='user'?'none':'1px solid #2a2a2a', color:msg.role==='user'?'#000':'#e5e5e5', fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap' }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isStreaming && currentStreamText && (
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'#FF6B00', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>🤖</div>
            <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius:'4px 18px 18px 18px', background:'#1a1a1a', border:'1px solid #2a2a2a', color:'#e5e5e5', fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap' }}>
              {currentStreamText}<span style={{ opacity:.6, animation:'blink 1s infinite' }}>▋</span>
            </div>
          </div>
        )}
        {isStreaming && !currentStreamText && (
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'#FF6B00', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🤖</div>
            <div style={{ padding:'10px 16px', borderRadius:'4px 18px 18px 18px', background:'#1a1a1a', border:'1px solid #2a2a2a', display:'flex', gap:6 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#FF6B00', animation:`bounce 1.2s ease ${i*.2}s infinite` }} />)}
            </div>
          </div>
        )}
        {error && <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', color:'#f87171', fontSize:13 }}>⚠️ {error}</div>}
        {followUps.length > 0 && !isStreaming && (
          <div style={{ paddingLeft:38 }}>
            <div style={{ fontSize:10, color:'#555', fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>Follow-up questions</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {followUps.map((q,i) => (
                <button key={i} onClick={() => send(q)} style={{ padding:'6px 14px', borderRadius:20, border:'1px solid rgba(255,107,0,.3)', background:'rgba(255,107,0,.05)', color:'#FF6B00', fontSize:12, cursor:'pointer' }}>{q}</button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid #1a1a1a', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end', background:'#111', border:'1px solid #2a2a2a', borderRadius:14, padding:'8px 12px' }}>
          <textarea
            ref={inputRef} value={input} rows={1} placeholder="Ask anything about this lecture…"
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'; }}
            style={{ flex:1, background:'none', border:'none', outline:'none', color:'#fff', fontSize:14, resize:'none', fontFamily:'inherit', lineHeight:1.5, maxHeight:120 }}
          />
          <button onClick={isStreaming ? stopStreaming : () => send()} disabled={!isStreaming && !input.trim()}
            style={{ width:36, height:36, borderRadius:'50%', border:'none', background:isStreaming?'rgba(239,68,68,.2)':'#FF6B00', color:isStreaming?'#f87171':'#000', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity:(!isStreaming&&!input.trim())?0.4:1 }}>
            {isStreaming ? '⏹' : '↑'}
          </button>
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-6px);opacity:1}}`}</style>
    </div>
  );
}

export default function DemoSection() {
  const [tab, setTab] = useState('youtube'); // 'youtube' | 'upload'
  const [ytUrl, setYtUrl] = useState('');
  const [file, setFile] = useState(null);
  const [lessonId, setLessonId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  const poll = (id) => {
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${BASE}/api/lessons/${id}/status`, { headers: { 'x-demo-role': 'student' } });
        const d = await r.json();
        setStatus(d.status);
        if (d.status === 'ready' || d.status === 'failed') clearInterval(pollRef.current);
      } catch {}
    }, 3000);
  };

  const submitYT = async () => {
    if (!ytUrl.trim()) return;
    setLoading(true); setErr(''); setLessonId(null); setStatus(null);
    try {
      const r = await fetch(`${BASE}/api/lessons/ingest-youtube`, {
        method:'POST', headers:{ ...ingestHeaders(), 'Content-Type':'application/json' },
        body: JSON.stringify({ youtubeUrl: ytUrl.trim(), courseId:'demo-course-001', title:'Demo Lesson' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setLessonId(d.lesson?.lessonId || d.lessonId);
      setStatus(d.lesson?.status || 'pending');
      poll(d.lesson?.lessonId || d.lessonId);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const submitFile = async () => {
    if (!file) return;
    setLoading(true); setErr(''); setLessonId(null); setStatus(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('courseId', 'demo-course-001');
    fd.append('title', file.name.replace(/\.[^.]+$/, ''));
    try {
      const r = await fetch(`${BASE}/api/lessons/upload`, { method:'POST', headers: ingestHeaders(), body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setLessonId(d.lesson?.lessonId || d.lessonId);
      setStatus(d.lesson?.status || 'pending');
      poll(d.lesson?.lessonId || d.lessonId);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  const isReady = status === 'ready';

  return (
    <section style={{ padding:'96px 40px', background:'#050505', borderTop:'1px solid #111' }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#FF6B00', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12 }}>Live Demo</div>
          <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:800, color:'#fff', marginBottom:12 }}>Try It Right Now — Free</h2>
          <p style={{ fontSize:16, color:'#666', maxWidth:480, margin:'0 auto', lineHeight:1.7 }}>Paste a YouTube URL or upload a local video. Your AI tutor is ready in seconds.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: isReady ? '1fr 1fr' : '1fr', gap:24, transition:'all .4s' }}>
          {/* LEFT: input panel */}
          <div style={{ background:'#0a0a0a', border:'1px solid #1a1a1a', borderRadius:24, overflow:'hidden' }}>
            {/* tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid #1a1a1a' }}>
              {[['youtube','🎬 YouTube URL'],['upload','📁 Upload Video']].map(([key,label]) => (
                <button key={key} onClick={() => setTab(key)}
                  style={{ flex:1, padding:'14px', border:'none', background:'none', fontSize:13, fontWeight:tab===key?700:400, color:tab===key?'#FF6B00':'#555', borderBottom:`2px solid ${tab===key?'#FF6B00':'transparent'}`, cursor:'pointer', transition:'all .15s' }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding:28 }}>
              {tab === 'youtube' ? (
                <>
                  <label style={{ fontSize:12, fontWeight:600, color:'#666', display:'block', marginBottom:8 }}>YouTube URL</label>
                  <div style={{ display:'flex', gap:10 }}>
                    <input value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && submitYT()}
                      placeholder="https://www.youtube.com/watch?v=..."
                      style={{ flex:1, background:'#111', border:'1px solid #2a2a2a', borderRadius:10, padding:'12px 16px', color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit' }}
                    />
                    <button onClick={submitYT} disabled={loading || !ytUrl.trim()}
                      style={{ padding:'12px 20px', borderRadius:10, background:'#FF6B00', color:'#000', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', opacity:loading||!ytUrl.trim()?0.5:1, whiteSpace:'nowrap' }}>
                      {loading ? '…' : 'Analyze →'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label style={{ fontSize:12, fontWeight:600, color:'#666', display:'block', marginBottom:8 }}>Video File (MP4, MOV, WebM)</label>
                  <div onClick={() => fileInputRef.current?.click()}
                    style={{ border:'2px dashed #2a2a2a', borderRadius:12, padding:'32px 24px', textAlign:'center', cursor:'pointer', transition:'border-color .15s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor='rgba(255,107,0,.4)'}
                    onMouseOut={e => e.currentTarget.style.borderColor='#2a2a2a'}>
                    <div style={{ fontSize:36, marginBottom:8 }}>📁</div>
                    <div style={{ fontSize:13, color:file?'#FF6B00':'#555' }}>{file ? file.name : 'Click to choose a video file'}</div>
                    <input ref={fileInputRef} type="file" accept="video/*" style={{ display:'none' }} onChange={e => setFile(e.target.files[0])} />
                  </div>
                  {file && (
                    <button onClick={submitFile} disabled={loading}
                      style={{ marginTop:14, width:'100%', padding:'12px', borderRadius:10, background:'#FF6B00', color:'#000', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', opacity:loading?0.5:1 }}>
                      {loading ? 'Uploading…' : 'Analyze Video →'}
                    </button>
                  )}
                </>
              )}

              {err && <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', color:'#f87171', fontSize:12 }}>❌ {err}</div>}

              {/* status */}
              {lessonId && status && (
                <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:'#666' }}>Processing status</span>
                    <StatusBadge status={status} />
                  </div>
                  {!isReady && (
                    <div style={{ height:4, background:'#1a1a1a', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:'60%', background:'linear-gradient(90deg,#FF6B00,#FFB347)', borderRadius:99, animation:'shimmer 1.5s infinite' }} />
                    </div>
                  )}
                  {isReady && (
                    <div style={{ padding:14, borderRadius:12, background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.2)', color:'#22c55e', fontSize:13 }}>
                      🎉 AI is ready! Chat on the right →
                    </div>
                  )}
                </div>
              )}

              {!lessonId && (
                <div style={{ marginTop:28, padding:20, borderRadius:14, background:'#111', border:'1px solid #1a1a1a' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#444', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>What you get</div>
                  {['🎙 Full audio transcript','⚡ Auto-generated chapters','🤖 AI chat with timestamps','📄 Lecture summaries','🧠 Quiz generation'].map(f => (
                    <div key={f} style={{ fontSize:13, color:'#666', padding:'6px 0', borderBottom:'1px solid #1a1a1a', display:'flex', alignItems:'center', gap:8 }}>{f}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: chat panel */}
          {isReady && (
            <div style={{ background:'#0a0a0a', border:'1px solid rgba(255,107,0,.2)', borderRadius:24, overflow:'hidden' }}>
              <ChatUI lessonId={lessonId} onQuiz={() => window.open(`/lesson/${lessonId}/quiz`, '_blank')} />
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
    </section>
  );
}
