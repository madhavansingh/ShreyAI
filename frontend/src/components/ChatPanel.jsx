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

// ── Lightweight markdown → React renderer (no extra deps) ─────────────────────
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H3 ###
    if (line.startsWith('### ')) {
      const content = line.slice(4).trim();
      elements.push(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, margin:'24px 0 10px', borderBottom:'1px solid rgba(255,107,0,.15)', paddingBottom:8 }}>
          <span style={{ fontSize:18, fontWeight:800, color:'#fff', lineHeight:1.3 }}
                dangerouslySetInnerHTML={{ __html: inlineFormat(content) }} />
        </div>
      );
    }
    // H2 ##
    else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{ margin:'28px 0 12px', fontSize:20, fontWeight:800, color:'#FF6B00', lineHeight:1.3 }}
            dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(3)) }} />
      );
    }
    // H1 #
    else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} style={{ margin:'0 0 16px', fontSize:24, fontWeight:900, color:'#fff' }}
            dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(2)) }} />
      );
    }
    // Divider ---
    else if (/^[-]{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} style={{ border:'none', borderTop:'1px solid #1e1e1e', margin:'20px 0' }} />);
    }
    // Bullet - item
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ margin:'8px 0 12px', paddingLeft:20, display:'flex', flexDirection:'column', gap:6 }}>
          {items.map((item, j) => (
            <li key={j} style={{ color:'#ccc', fontSize:14, lineHeight:1.65 }}
                dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          ))}
        </ul>
      );
      continue;
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ margin:'8px 0 12px', paddingLeft:24, display:'flex', flexDirection:'column', gap:6 }}>
          {items.map((item, j) => (
            <li key={j} style={{ color:'#ccc', fontSize:14, lineHeight:1.65 }}
                dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          ))}
        </ol>
      );
      continue;
    }
    // Blockquote >
    else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} style={{ margin:'12px 0', padding:'10px 16px', borderLeft:'3px solid #FF6B00', background:'rgba(255,107,0,.06)', borderRadius:'0 8px 8px 0' }}>
          <p style={{ margin:0, color:'#aaa', fontSize:14, fontStyle:'italic', lineHeight:1.6 }}
             dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(2)) }} />
        </blockquote>
      );
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height:8 }} />);
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={i} style={{ margin:'4px 0', color:'#ccc', fontSize:14, lineHeight:1.7 }}
           dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      );
    }
    i++;
  }
  return elements;
}

// Inline: **bold**, *italic*, `code`, [link](url)
function inlineFormat(str) {
  return str
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;font-weight:700">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em style="color:#e2c97e">$1</em>')
    .replace(/`(.+?)`/g,       '<code style="background:rgba(255,255,255,.08);padding:1px 6px;border-radius:4px;font-family:monospace;font-size:13px;color:#7dd3fc">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#FF6B00;text-decoration:none" target="_blank">$1</a>');
}

// ── Sanitize text for jsPDF (Helvetica only supports Latin-1 / cp1252) ─────────
function sanitizeForPDF(str) {
  const emojiMap = {
    '\uD83C\uDFAF': 'TL;DR - ', '\uD83E\uDDE0': 'Core Concepts - ',
    '\uD83D\uDCCB': 'Key Points - ', '\uD83D\uDCA1': 'Idea: ',
    '\u26A1': 'Quick-Recall: ', '\uD83D\uDD11': 'Key: ',
    '\uD83D\uDCCC': '', '\u2705': '[OK] ', '\u274C': '[X] ',
    '\uD83D\uDCDD': 'Note: ', '\uD83D\uDE80': '', '\u2B50': '',
    '\uD83D\uDCE3': '', '\uD83C\uDFA1': '', '\uD83D\uDCCA': '',
    '\uD83D\uDD25': '', '\uD83D\uDCAC': '', '\u26A0\uFE0F': '[!] ',
    '\uD83D\uDC49': '> ', '\uD83C\uDFC1': '',
  };
  let out = str;
  for (const [emoji, label] of Object.entries(emojiMap)) {
    out = out.split(emoji).join(label);
  }
  // Unicode -> ASCII substitutions
  out = out
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*')
    .replace(/[\u2500-\u257F]/g, '-')
    .replace(/\u00A0/g, ' ');
  // Strip all non-Latin-1 (removes emoji, Devanagari, CJK, etc.)
  out = out.replace(/[^\x00-\xFF]/g, '');
  return out.trim();
}

// ── PDF Generator ──────────────────────────────────────────────────────────────
async function downloadSummaryPDF(summary, title) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxW   = pageW - margin * 2;
  let y        = margin;

  const addPage = () => { doc.addPage(); y = margin; };
  const checkY  = (need = 8) => { if (y + need > pageH - margin) addPage(); };

  // Header bar
  doc.setFillColor(255, 107, 0);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SheryAI - AI Lecture Summary', margin, 9.5);  // ASCII only
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-US', { day:'2-digit', month:'short', year:'numeric' }), pageW - margin, 9.5, { align:'right' });
  y = 22;

  // Lesson title — sanitized
  const safeTitle = sanitizeForPDF(title || 'Lecture Summary');
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(safeTitle, maxW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 6;

  // Orange divider
  doc.setDrawColor(255, 107, 0);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // Body — process every line with sanitizeForPDF
  const rawLines = summary.split('\n');
  for (const rawLine of rawLines) {
    // 1. Strip markdown syntax
    const stripped = rawLine
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '"$1"')
      .replace(/^#{1,3}\s+/, '')
      .replace(/^[-*]\s+/, '')
      .replace(/^>\s+/, '')
      .replace(/^---+$/, '');

    // 2. Sanitize — removes emoji, Devanagari, special Unicode
    const clean = sanitizeForPDF(stripped);
    if (!clean) { y += 2; continue; }

    // 3. Detect line type from ORIGINAL line (before stripping)
    const isHeading  = /^#{1,3}\s/.test(rawLine);
    const isBullet   = /^[-*\u2022]\s/.test(rawLine.trim());
    const isNumbered = /^\d+\.\s/.test(rawLine);
    const isHR       = /^---+$/.test(rawLine.trim());
    const isQA       = /^[QA]:\s/.test(clean);

    if (isHeading) {
      checkY(14);
      if (y > 40) {
        doc.setDrawColor(235, 235, 235);
        doc.setLineWidth(0.25);
        doc.line(margin, y - 3, pageW - margin, y - 3);
      }
      doc.setFontSize(11.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 80, 0);
      const hLines = doc.splitTextToSize(clean, maxW);
      checkY(hLines.length * 6.5 + 6);
      doc.text(hLines, margin, y);
      y += hLines.length * 6.5 + 6;

    } else if (isBullet) {
      checkY(7);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text('-', margin + 1, y);
      const bLines = doc.splitTextToSize(clean, maxW - 7);
      checkY(bLines.length * 5.5 + 3);
      doc.text(bLines, margin + 6, y);
      y += bLines.length * 5.5 + 3;

    } else if (isNumbered) {
      checkY(7);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      const nLines = doc.splitTextToSize(clean, maxW - 6);
      checkY(nLines.length * 5.5 + 3);
      doc.text(nLines, margin + 4, y);
      y += nLines.length * 5.5 + 3;

    } else if (isHR) {
      checkY(6);
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 6;

    } else if (isQA) {
      checkY(7);
      const isQ = clean.startsWith('Q:');
      doc.setFontSize(10);
      doc.setFont('helvetica', isQ ? 'bold' : 'normal');
      doc.setTextColor(isQ ? 20 : 55, isQ ? 20 : 55, isQ ? 20 : 55);
      const qLines = doc.splitTextToSize(clean, maxW);
      checkY(qLines.length * 5.5 + 2);
      doc.text(qLines, margin, y);
      y += qLines.length * 5.5 + (isQ ? 1.5 : 5);

    } else {
      checkY(7);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const pLines = doc.splitTextToSize(clean, maxW);
      checkY(pLines.length * 5.5 + 2);
      doc.text(pLines, margin, y);
      y += pLines.length * 5.5 + 3;
    }
  }

  // Footer on every page
  const safeFooterTitle = sanitizeForPDF(title || 'Lecture Summary');
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`SheryAI * ${safeFooterTitle} * Page ${p} of ${total}`, pageW / 2, pageH - 8, { align: 'center' });
  }

  doc.save(`SheryAI_Summary_${safeTitle.replace(/\s+/g,'_').slice(0,40)}.pdf`);
}

// ── Summary Modal ─────────────────────────────────────────────────────────────
function SummaryModal({ lessonId, lessonTitle, onClose }) {
  const [type,    setType]    = useState('full');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

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

  const handleDownload = async () => {
    if (!summary || loading) return;
    setPdfBusy(true);
    try { await downloadSummaryPDF(summary, lessonTitle); }
    finally { setPdfBusy(false); }
  };

  const btnStyle = (t) => ({
    padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
    background: type === t ? '#FF6B00' : 'rgba(255,255,255,0.06)',
    color:      type === t ? '#fff'     : '#888',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: '#0e0e0e', border: '1px solid #1e1e1e',
        borderRadius: 24, width: '100%', maxWidth: 680,
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 100px rgba(0,0,0,0.8)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <span style={{ fontSize:22 }}>📄</span>
                <h3 style={{ margin:0, color:'#fff', fontSize:18, fontWeight:800 }}>Lecture Summary</h3>
              </div>
              {lessonTitle && <p style={{ margin:0, fontSize:12, color:'#555' }}>📚 {lessonTitle}</p>}
            </div>
            <button onClick={onClose} style={{ background:'none', border:'1px solid #222', borderRadius:8, color:'#555', cursor:'pointer', fontSize:18, padding:'4px 10px', lineHeight:1 }}>✕</button>
          </div>

          {/* Controls row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:16, borderBottom:'1px solid #1a1a1a' }}>
            <div style={{ display:'flex', gap:8 }}>
              <button style={btnStyle('full')}     onClick={() => fetchSummary('full')}>Full Lecture</button>
              <button style={btnStyle('last5min')} onClick={() => fetchSummary('last5min')}>Last 5 Min</button>
            </div>
            <button
              onClick={handleDownload}
              disabled={!summary || loading || pdfBusy}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'7px 16px', borderRadius:10, border:'none', cursor: (!summary||loading||pdfBusy)?'not-allowed':'pointer',
                background: (!summary||loading||pdfBusy) ? '#1a1a1a' : 'rgba(255,107,0,.15)',
                color: (!summary||loading||pdfBusy) ? '#444' : '#FF6B00',
                fontSize:12, fontWeight:700, transition:'all .2s',
              }}
            >
              {pdfBusy ? '⏳ Generating…' : '⬇ Download PDF'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px 24px' }}>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:16 }}>
              <div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid #1a1a1a', borderTop:'3px solid #FF6B00', animation:'spin 0.8s linear infinite' }} />
              <p style={{ color:'#555', margin:0, fontSize:14 }}>Generating your summary with AI…</p>
            </div>
          ) : (
            <div style={{ color:'#ccc', fontSize:14, lineHeight:1.7 }}>
              {renderMarkdown(summary)}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
      `}</style>
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
      {showSummary && <SummaryModal lessonId={lessonId} lessonTitle={lesson?.title} onClose={() => setShowSummary(false)} />}

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
