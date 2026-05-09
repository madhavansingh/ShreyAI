/**
 * components/ChatPanel.jsx
 * The full AI chat interface — streaming messages, follow-up chips, summary panel, quiz.
 */
import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '../hooks/useChat';
import ChatMessage from './ChatMessage';

const BASE_URL = ''; // relative — Vite proxy forwards /api to the backend

// ── Follow-up chip ────────────────────────────────────────────────────────────
function FollowUpChip({ text, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={() => onClick(text)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:    '6px 14px',
        borderRadius: 20,
        border:     '1px solid var(--accent-border)',
        background: hov ? 'var(--accent-light)' : 'rgba(232,87,42,0.05)',
        color:      'var(--accent)',
        fontSize:    12,
        fontWeight: 500,
        cursor:     'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        transform:  hov ? 'translateY(-1px)' : 'none',
      }}
    >
      {text}
    </button>
  );
}

// ── Starter question button ───────────────────────────────────────────────────
function StarterChip({ text, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={() => onClick(text)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:      '8px 14px',
        borderRadius: 12,
        border:       '1px solid var(--border)',
        background:   hov ? 'var(--bg-hover)' : 'var(--bg-card)',
        color:        'var(--text-secondary)',
        fontSize:      13,
        cursor:       'pointer',
        transition:   'all 0.15s',
        textAlign:    'left',
        lineHeight:   1.4,
        transform:    hov ? 'translateY(-1px)' : 'none',
      }}
    >
      💬 {text}
    </button>
  );
}

// ── Summary Modal ─────────────────────────────────────────────────────────────
function SummaryModal({ lessonId, onClose }) {
  const [type,    setType]    = useState('full');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSummary = async (t) => {
    setType(t);
    setSummary('');
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/chat/summary`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-demo-role': localStorage.getItem('demo_role') || 'student' },
        body:    JSON.stringify({ lessonId, type: t }),
      });
      const data = await res.json();
      setSummary(data.summary || 'No summary available.');
    } catch { setSummary('Failed to generate summary. Please try again.'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchSummary('full'); }, []);

  const btnStyle = (t) => ({
    padding:    '6px 14px',
    borderRadius: 8,
    border:     'none',
    cursor:     'pointer',
    fontSize:    12,
    fontWeight: 600,
    background: type === t ? 'var(--accent-light)' : 'rgba(255,255,255,0.06)',
    color:      type === t ? 'var(--accent)' : 'var(--text-muted)',
    transition: 'all 0.15s',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card2)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 28, maxWidth: 640, width: '100%',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>📄 Lecture Summary</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button style={btnStyle('full')}     onClick={() => fetchSummary('full')}>Full Lecture</button>
          <button style={btnStyle('last5min')} onClick={() => fetchSummary('last5min')}>Last 5 Min</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', color: '#cbd5e1', fontSize: 14, lineHeight: 1.7 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
              <p style={{ color: '#64748b', margin: 0 }}>Generating summary…</p>
            </div>
          ) : (
            <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>{summary}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ChatPanel ────────────────────────────────────────────────────────────
export default function ChatPanel({ lessonId, lesson, onSeek, getVideoTime }) {
  const {
    messages, isStreaming, currentStreamText,
    followUps, error, sendMessage, stopStreaming, clearSession,
  } = useChat(lessonId);

  const [input,       setInput]       = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamText]);

  const handleSend = (text = input) => {
    const msg = (typeof text === 'string' ? text : input).trim();
    if (!msg || isStreaming) return;
    setInput('');
    // pass a getCurrentTime fn so backend anchors its answer to current playback position
    sendMessage(msg, typeof getVideoTime === 'function' ? getVideoTime : () => 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const hasMessages = messages.length > 0 || isStreaming;
  const starterQs   = lesson?.starterQuestions || [];

  const panel = {
    display:       'flex',
    flexDirection: 'column',
    height:        '100%',
    background:    'var(--bg-base)',
    overflow:      'hidden',
    fontFamily:    "'Inter', sans-serif",
  };

  return (
    <div style={panel}>
      {/* Header */}
      <div style={{
        padding:      '14px 18px',
        borderBottom: '1px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        flexShrink:   0,
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🤖</span> AI Tutor
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>
            Ask anything about this lecture
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowSummary(true)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12,
              cursor: 'pointer', fontWeight: 500,
            }}
          >📄 Summary</button>
          {hasMessages && (
            <button
              onClick={clearSession}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
                background: 'rgba(239,68,68,0.05)', color: '#f87171', fontSize: 12,
                cursor: 'pointer', fontWeight: 500,
              }}
            >🗑 Clear</button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-base)' }}>

        {/* Empty state / starters */}
        {!hasMessages && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20, padding: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <h4 style={{ margin: '0 0 6px', color: '#fff', fontSize: 16, fontWeight: 700 }}>Your AI Tutor</h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Ask anything about this lecture. I'll cite timestamps so you can jump to the exact moment.
              </p>
            </div>
            {starterQs.length > 0 && (
              <div style={{ width: '100%' }}>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Try asking:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {starterQs.map((q, i) => (
                    <StarterChip key={i} text={q} onClick={handleSend} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message bubbles */}
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} onSeek={onSeek} />
        ))}

        {/* Live streaming bubble */}
        {isStreaming && currentStreamText && (
          <ChatMessage
            message={{ role: 'assistant', content: currentStreamText, id: 'streaming' }}
            onSeek={onSeek}
            isStreaming
          />
        )}

        {/* Loading indicator (before first token) */}
        {isStreaming && !currentStreamText && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 0' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>🤖</div>
            <div style={{
              padding: '12px 16px', borderRadius: '4px 18px 18px 18px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Follow-up chips */}
        {followUps.length > 0 && !isStreaming && (
          <div style={{ paddingLeft: 42 }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Follow-up questions
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {followUps.map((q, i) => (
                <FollowUpChip key={i} text={q} onClick={handleSend} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding:    '12px 14px',
        borderTop:  '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--bg-nav)',
      }}>
        <div style={{
          display:      'flex',
          gap:          8,
          alignItems:   'flex-end',
          background:   'var(--bg-input)',
          border:       '1px solid var(--border)',
          borderRadius: 14,
          padding:      '8px 12px',
          transition:   'border-color 0.2s',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about any part of this lecture…"
            rows={1}
            style={{
              flex:       1,
              background: 'none',
              border:     'none',
              outline:    'none',
              color:      '#fff',
              fontSize:    14,
              resize:     'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              maxHeight:  120,
              overflowY:  'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={isStreaming ? stopStreaming : handleSend}
            disabled={!isStreaming && !input.trim()}
            style={{
              width:      36,
              height:     36,
              borderRadius: '50%',
              border:     'none',
              cursor:     (!isStreaming && !input.trim()) ? 'not-allowed' : 'pointer',
              background: isStreaming
                ? 'rgba(239,68,68,0.2)'
                : 'var(--accent)',
              color:      isStreaming ? '#f87171' : '#fff',
              fontSize:    16,
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity:    (!isStreaming && !input.trim()) ? 0.4 : 1,
              transition: 'all 0.2s',
            }}
          >
            {isStreaming ? '⏹' : '↑'}
          </button>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      {/* Summary Modal */}
      {showSummary && <SummaryModal lessonId={lessonId} onClose={() => setShowSummary(false)} />}

      {/* Animations */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
