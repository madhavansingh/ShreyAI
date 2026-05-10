/**
 * components/SubtitleOverlay.jsx
 * YouTube-style subtitle overlay:
 *   - Shows rolling window of last N words as a continuous stream
 *   - No flicker: only re-renders when displayWords array actually changes
 *   - CC button + language selector in the video toolbar
 */

import React, { useState, useRef, useEffect, memo } from 'react';

// ── Split word array into display lines ───────────────────────────────────────
function toLines(words, wordsPerLine = 7) {
  if (!words.length) return [];
  // Always show the LAST two lines worth
  const lines = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(' '));
  }
  return lines.slice(-2); // keep only last 2 lines
}

// ── CC Controls (placed in video toolbar) ────────────────────────────────────
export function SubtitleControls({ subtitles }) {
  const [showPanel, setShowPanel] = useState(false);
  const wrapRef = useRef(null);

  const { enabled, toggleEnabled, language, changeLanguage, hasTranscript, loading } = subtitles;

  // Close on outside click
  useEffect(() => {
    const fn = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowPanel(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const canToggle = hasTranscript || loading;

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5 }}>

      {/* CC pill */}
      <button
        onClick={() => canToggle && toggleEnabled()}
        title={
          loading        ? 'Loading transcript…'
          : !hasTranscript ? 'No transcript available'
          : enabled      ? 'Disable subtitles'
                         : 'Enable subtitles (CC)'
        }
        style={{
          height: 26, minWidth: 36, padding: '0 8px',
          borderRadius: 6,
          border: enabled ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
          background: enabled ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.6)',
          color: '#fff',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
          cursor: canToggle ? 'pointer' : 'not-allowed',
          opacity: !canToggle ? 0.38 : 1,
          transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          userSelect: 'none',
        }}
      >
        {loading
          ? <span style={{ fontSize: 10, display: 'inline-block', animation: 'ccSpin 0.9s linear infinite' }}>⟳</span>
          : 'CC'
        }
      </button>

      {/* Settings cog (only when enabled) */}
      {enabled && hasTranscript && (
        <button
          onClick={() => setShowPanel(p => !p)}
          title="Subtitle language"
          style={{
            width: 26, height: 26, borderRadius: 6,
            border: `1px solid ${showPanel ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'}`,
            background: showPanel ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.6)',
            color: '#fff', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)', transition: 'all 0.15s',
          }}
        >
          ⚙
        </button>
      )}

      {/* Language dropdown */}
      {showPanel && (
        <div style={{
          position: 'absolute', bottom: 34, right: 0,
          width: 198,
          background: 'rgba(12,12,18,0.96)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: '10px 12px',
          zIndex: 9999,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
        }}>
          <p style={{
            margin: '0 0 8px', fontSize: 10, fontWeight: 700,
            color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Subtitle Language
          </p>

          {[
            { id: 'english',  label: 'English',  sub: 'Roman script only' },
            { id: 'hinglish', label: 'Hinglish', sub: 'Auto Roman transliteration' },
          ].map(opt => {
            const active = language === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => { changeLanguage(opt.id); setShowPanel(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '7px 9px', borderRadius: 7,
                  border: active ? '1px solid rgba(232,87,42,0.45)' : '1px solid transparent',
                  background: active ? 'rgba(232,87,42,0.13)' : 'transparent',
                  cursor: 'pointer', marginBottom: 3, textAlign: 'left',
                  transition: 'all 0.12s',
                }}
              >
                <span style={{
                  width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
                  border: active ? '2px solid #e8572a' : '2px solid rgba(255,255,255,0.25)',
                  background: active ? '#e8572a' : 'transparent',
                  transition: 'all 0.12s',
                }} />
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#fff' }}>{opt.label}</p>
                  <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{opt.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main overlay — memoized so it only re-renders when displayWords changes ───
const SubtitleOverlay = memo(function SubtitleOverlay({ subtitles }) {
  const { enabled, displayWords } = subtitles;
  const lines = toLines(displayWords);

  if (!enabled || lines.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes ccSpin { to { transform: rotate(360deg); } }
        @keyframes subFadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        aria-live="polite"
        aria-label="Video subtitles"
        style={{
          position: 'absolute',
          bottom: 52,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          maxWidth: '84%',
          pointerEvents: 'none',
          width: 'max-content',
          animation: 'subFadeIn 0.15s ease',
        }}
      >
        <div style={{
          background: 'rgba(6,6,10,0.84)',
          backdropFilter: 'blur(10px)',
          borderRadius: 9,
          padding: '7px 16px 8px',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
        }}>
          {lines.map((line, i) => (
            <p
              key={i}
              style={{
                margin: i === 0 ? 0 : '1px 0 0',
                fontSize: 'clamp(13px, 1.35vw, 16px)',
                fontWeight: 600,
                lineHeight: 1.5,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                letterSpacing: '0.01em',
              }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </>
  );
});

export default SubtitleOverlay;
