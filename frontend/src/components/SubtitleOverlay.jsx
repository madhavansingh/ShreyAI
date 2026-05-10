/**
 * components/SubtitleOverlay.jsx
 * YouTube-style subtitle overlay:
 *   - Shows the current sentence building up word-by-word.
 *   - Clears and restarts when a new sentence block begins.
 *   - Clean, readable styling with smooth wipe/fade transitions.
 *   - CC button + language selector in the video toolbar.
 */

import React, { useState, useRef, useEffect, memo } from 'react';

// ── Split word array into display lines ───────────────────────────────────────
function toLines(words, wordsPerLine = 10) {
  if (!words || !words.length) return [];
  const lines = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(' '));
  }
  // If the sentence gets too long, we might want to restrict to last N lines,
  // but since we clear per chunk, showing all lines is usually best.
  // We'll restrict to last 3 lines just in case chunks are huge.
  return lines.slice(-3);
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

// ── Main overlay — memoized so it only re-renders when captionState changes ───
const SubtitleOverlay = memo(function SubtitleOverlay({ subtitles }) {
  const { enabled, captionState } = subtitles;
  const { words, isNew } = captionState || { words: [], isNew: false };
  
  // Create a stable key for the current sentence block
  const blockKeyRef = useRef(0);
  if (isNew) {
    blockKeyRef.current += 1;
  }

  if (!enabled || !words || words.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes ccSpin { to { transform: rotate(360deg); } }
        @keyframes blockFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wordFadeIn {
          from { opacity: 0.2; }
          to   { opacity: 1; }
        }
      `}</style>

      <div
        aria-live="polite"
        aria-label="Video subtitles"
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          width: '100%',
          maxWidth: '90%',
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div 
          key={blockKeyRef.current} // Retriggers animation on new sentence
          style={{
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            borderRadius: 6,
            padding: '8px 16px',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
            animation: 'blockFadeIn 0.2s ease-out',
            display: 'inline-block',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: 'clamp(14px, 1.8vw, 22px)',
              fontWeight: 600,
              lineHeight: 1.4,
              color: '#ffffff',
              fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
              letterSpacing: '0.02em',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {words.map((word, wordIndex, arr) => {
              const isLastWord = wordIndex === arr.length - 1;
              const animate = isLastWord && !isNew;
              
              return (
                <span 
                  key={wordIndex} 
                  style={{ 
                    marginRight: isLastWord ? 0 : '0.25em',
                    animation: animate ? 'wordFadeIn 0.1s ease-out' : 'none',
                    display: 'inline-block' // Prevents word splitting across lines mid-word
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
});

export default SubtitleOverlay;
