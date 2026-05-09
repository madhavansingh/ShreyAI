/**
 * components/TimestampChip.jsx
 * Clickable timestamp pill rendered inside chat messages.
 * On click: seeks the video player to that exact moment.
 *
 * Supported formats (auto-detected):
 *   (1:23)           single timestamp — parens
 *   (1:23 - 2:45)    range — hyphen
 *   (1:23 – 2:45)    range — em dash  ← AI default
 *   [1:23]           single — brackets
 *   [1:23 - 2:45]    range — brackets
 */
import React, { useState } from 'react';

// ── Pill component ────────────────────────────────────────────────────────────
export default function TimestampChip({ label, startTime, onSeek }) {
  const [hov, setHov] = useState(false);

  const handleClick = () => {
    if (typeof onSeek === 'function') onSeek(startTime);
  };

  return (
    <>
      <button
        onClick={handleClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        title={`▶ Jump to ${label}`}
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          gap:            4,
          padding:        '2px 9px',
          borderRadius:   20,
          border:         `1px solid ${hov ? 'var(--accent)' : 'var(--accent-border, rgba(232,87,42,0.35))'}`,
          background:     hov
            ? 'linear-gradient(135deg, rgba(232,87,42,0.25), rgba(251,146,60,0.15))'
            : 'rgba(232,87,42,0.07)',
          color:          'var(--accent, #e8572a)',
          fontSize:        11,
          fontWeight:     700,
          cursor:         'pointer',
          transition:     'all 0.15s',
          transform:      hov ? 'scale(1.06) translateY(-1px)' : 'scale(1)',
          verticalAlign:  'middle',
          margin:         '0 3px',
          fontFamily:     '"JetBrains Mono", "Fira Code", monospace',
          whiteSpace:     'nowrap',
          letterSpacing:  '0.02em',
          boxShadow:      hov ? '0 0 10px rgba(232,87,42,0.35)' : 'none',
          userSelect:     'none',
        }}
      >
        <span style={{ fontSize: 9, opacity: hov ? 1 : 0.8 }}>▶</span>
        {label}
      </button>
      <style>{`
        @keyframes ts-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function labelToSeconds(label) {
  if (!label) return 0;
  const parts = label.trim().split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

/**
 * parseTimestamps(text, onSeek)
 *
 * Scans the text for timestamp patterns and returns a mixed array of
 * strings and <TimestampChip> React elements, ready for rendering.
 *
 * Matches:
 *   (MM:SS)             single, parens
 *   (MM:SS - MM:SS)     range, hyphen
 *   (MM:SS – MM:SS)     range, en/em dash  ← AI model's preferred format
 *   [MM:SS]             single, brackets
 *   [MM:SS - MM:SS]     range, brackets
 */
export function parseTimestamps(text, onSeek) {
  if (!text) return [text];

  const T   = '\\d{1,2}:\\d{2}(?::\\d{2})?';          // time part: 1:23 or 1:23:45
  const SEP = '\\s*[-\u2013\u2014]\\s*';               // separator: - or – or —
  const re  = new RegExp(
    `([\\(\\[])` +           // group 1: opening bracket type
    `(${T})` +               // group 2: start time
    `(?:${SEP}(${T}))?` +    // group 3: optional end time
    `[\\)\\]]`,              // closing bracket (any)
    'g',
  );

  const parts   = [];
  let lastIdx   = 0;
  let match;

  while ((match = re.exec(text)) !== null) {
    // Push preceding text
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }

    const startLabel = match[2];
    const endLabel   = match[3];
    const startTime  = labelToSeconds(startLabel);
    const label      = endLabel ? `${startLabel} – ${endLabel}` : startLabel;

    parts.push(
      <TimestampChip
        key={`ts-${match.index}`}
        label={label}
        startTime={startTime}
        onSeek={onSeek}
      />
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}
