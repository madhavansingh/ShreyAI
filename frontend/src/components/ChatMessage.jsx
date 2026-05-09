/**
 * components/ChatMessage.jsx
 * Renders a single chat message with rich markdown formatting.
 * Handles: ## headings, ### sub-headings, ``` code blocks, `inline code`,
 *          **bold**, - bullets, 1. numbered lists, --- dividers, blank-line spacing.
 */
import React from 'react';
import { parseTimestamps } from './TimestampChip';

// ── Inline styles: **bold** and `code` ────────────────────────────────────────
function applyInlineStyles(text, keyPrefix) {
  if (!text) return null;

  // Split on **bold** and `code` simultaneously
  const parts = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={`${keyPrefix}-t-${last}`}>{text.slice(last, match.index)}</span>);
    }
    const raw = match[0];
    if (raw.startsWith('`')) {
      parts.push(
        <code key={`${keyPrefix}-c-${match.index}`} style={{
          background:   'rgba(255,255,255,0.08)',
          border:       '1px solid rgba(255,255,255,0.12)',
          borderRadius: 4,
          padding:      '1px 6px',
          fontFamily:   '"JetBrains Mono", "Fira Code", monospace',
          fontSize:      '0.88em',
          color:         '#e2c4ff',
        }}>
          {raw.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(
        <strong key={`${keyPrefix}-b-${match.index}`} style={{ color: '#fff', fontWeight: 700 }}>
          {raw.slice(2, -2)}
        </strong>
      );
    }
    last = match.index + raw.length;
  }
  if (last < text.length) {
    parts.push(<span key={`${keyPrefix}-e`}>{text.slice(last)}</span>);
  }

  return parts.length > 0 ? parts : <span key={keyPrefix}>{text}</span>;
}

// ── Render a single line's inline content (timestamps + bold/code) ─────────────
function renderInline(line, onSeek, keyPrefix) {
  const parts = parseTimestamps(line, onSeek);
  return parts.map((part, i) =>
    typeof part === 'string'
      ? applyInlineStyles(part, `${keyPrefix}-${i}`)
      : part
  );
}

// ── Full markdown block renderer ────────────────────────────────────────────────
function renderMarkdown(text, onSeek) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Fenced code block ```
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'code';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={`code-${i}`} style={{ margin: '10px 0' }}>
          <div style={{
            display:        'flex',
            alignItems:     'center',
            gap:            6,
            background:     'rgba(255,255,255,0.06)',
            borderRadius:   '8px 8px 0 0',
            padding:        '4px 12px',
            borderBottom:   '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{lang}</span>
          </div>
          <pre style={{
            margin:       0,
            padding:      '12px 14px',
            background:   'rgba(0,0,0,0.35)',
            borderRadius: '0 0 8px 8px',
            fontSize:     13,
            fontFamily:   '"JetBrains Mono", "Fira Code", monospace',
            color:        '#c4e4ff',
            overflowX:    'auto',
            lineHeight:   1.6,
            border:       '1px solid rgba(255,255,255,0.08)',
            borderTop:    'none',
          }}>
            {codeLines.join('\n')}
          </pre>
        </div>
      );
      i++; // skip closing ```
      continue;
    }

    // ── Horizontal rule --- or ───
    if (/^(-{3,}|─{3,})$/.test(trimmed)) {
      elements.push(
        <hr key={`hr-${i}`} style={{
          border:     'none',
          borderTop:  '1px solid rgba(255,255,255,0.12)',
          margin:     '14px 0',
        }} />
      );
      i++;
      continue;
    }

    // ── H2 heading ##
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} style={{
          fontSize:     '1.05em',
          fontWeight:   700,
          color:        'var(--accent, #a855f7)',
          margin:       '16px 0 6px',
          paddingBottom: 4,
          borderBottom: '1px solid rgba(168,85,247,0.25)',
          letterSpacing: '0.01em',
        }}>
          {renderInline(trimmed.slice(3), onSeek, `h2-${i}`)}
        </h2>
      );
      i++;
      continue;
    }

    // ── H3 heading ###
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} style={{
          fontSize:    '0.97em',
          fontWeight:  700,
          color:       '#c4a8ff',
          margin:      '12px 0 4px',
          letterSpacing: '0.01em',
        }}>
          {renderInline(trimmed.slice(4), onSeek, `h3-${i}`)}
        </h3>
      );
      i++;
      continue;
    }

    // ── Bullet list item - or •
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const content = trimmed.startsWith('- ') ? trimmed.slice(2) : trimmed.slice(2);
      elements.push(
        <div key={`li-${i}`} style={{
          display:      'flex',
          gap:          8,
          marginBottom: 5,
          paddingLeft:  4,
          alignItems:   'flex-start',
        }}>
          <span style={{
            color:      'var(--accent, #a855f7)',
            flexShrink: 0,
            marginTop:  3,
            fontSize:   10,
          }}>◆</span>
          <span style={{ flex: 1, lineHeight: 1.6 }}>
            {renderInline(content, onSeek, `li-${i}`)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // ── Numbered list 1.
    if (/^\d+\.\s/.test(trimmed)) {
      const num     = trimmed.match(/^(\d+)\./)?.[1];
      const content = trimmed.replace(/^\d+\.\s*/, '');
      elements.push(
        <div key={`ol-${i}`} style={{
          display:      'flex',
          gap:          8,
          marginBottom: 5,
          paddingLeft:  4,
          alignItems:   'flex-start',
        }}>
          <span style={{
            color:      'var(--accent, #a855f7)',
            flexShrink: 0,
            minWidth:   18,
            fontWeight: 700,
            fontSize:   12,
            marginTop:  3,
          }}>{num}.</span>
          <span style={{ flex: 1, lineHeight: 1.6 }}>
            {renderInline(content, onSeek, `ol-${i}`)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // ── Empty line → paragraph spacer
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} style={{ height: 8 }} />);
      i++;
      continue;
    }

    // ── Normal paragraph line
    elements.push(
      <div key={`p-${i}`} style={{ marginBottom: 3, lineHeight: 1.7 }}>
        {renderInline(line, onSeek, `p-${i}`)}
      </div>
    );
    i++;
  }

  return elements;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ChatMessage({ message, onSeek, isStreaming = false }) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      display:       'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap:           10,
      alignItems:    'flex-start',
      padding:       '4px 0',
    }}>
      {/* Avatar */}
      <div style={{
        width:          32,
        height:         32,
        borderRadius:   '50%',
        flexShrink:     0,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       15,
        background:     isUser
          ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
          : 'linear-gradient(135deg, #1e1b4b, #312e81)',
        boxShadow:      '0 2px 8px rgba(0,0,0,0.35)',
        border:         '1px solid rgba(255,255,255,0.1)',
      }}>
        {isUser ? '👤' : '✨'}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth:     '82%',
        padding:      isUser ? '10px 14px' : '14px 16px',
        borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        background:   isUser
          ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(168,85,247,0.2))'
          : 'rgba(255,255,255,0.04)',
        border:       isUser
          ? '1px solid rgba(168,85,247,0.4)'
          : '1px solid rgba(255,255,255,0.08)',
        fontSize:     13.5,
        lineHeight:   1.65,
        color:        'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
      }}>
        {isUser ? (
          <span style={{ lineHeight: 1.6 }}>{message.content}</span>
        ) : (
          <div style={{ wordBreak: 'break-word' }}>
            {renderMarkdown(message.content, onSeek)}
            {isStreaming && (
              <span style={{
                display:       'inline-block',
                width:         7,
                height:        14,
                background:    'var(--accent, #a855f7)',
                marginLeft:    2,
                borderRadius:  2,
                animation:     'blink 0.8s step-end infinite',
                verticalAlign: 'middle',
                opacity:       0.9,
              }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
