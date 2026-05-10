/**
 * components/SubtitleOverlay.jsx
 * Renders CC button, language selector, and the subtitle text overlay.
 *
 * Props:
 *   subtitles  — object returned by useSubtitles()
 *   isFullscreen — boolean (optional), for z-index management
 */

import React, { useState, useRef, useEffect } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_LINES       = 2;
const WORDS_PER_LINE  = 8; // wrap after N words

// ── Wrap words into max 2 lines ───────────────────────────────────────────────
function wrapToLines(words, wordsPerLine = WORDS_PER_LINE, maxLines = MAX_LINES) {
  const lines = [];
  for (let i = 0; i < words.length && lines.length < maxLines; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(' '));
  }
  return lines;
}

// ── CC / Settings panel ───────────────────────────────────────────────────────
function SubtitleControls({ subtitles }) {
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);
  const btnRef   = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current   && !btnRef.current.contains(e.target)
      ) {
        setShowPanel(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const { enabled, toggleEnabled, language, changeLanguage, hasTranscript, loading } = subtitles;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {/* CC Button */}
      <button
        ref={btnRef}
        onClick={() => {
          if (!hasTranscript && !loading) return;
          toggleEnabled();
        }}
        title={
          loading         ? 'Loading transcript…' :
          !hasTranscript  ? 'No transcript available' :
          enabled         ? 'Disable subtitles' :
                            'Enable subtitles (CC)'
        }
        style={{
          width: 36, height: 26,
          borderRadius: 5,
          border: enabled ? '2px solid #fff' : '1px solid rgba(255,255,255,0.35)',
          background: enabled
            ? 'rgba(255,255,255,0.25)'
            : 'rgba(0,0,0,0.55)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.03em',
          cursor: hasTranscript || loading ? 'pointer' : 'not-allowed',
          opacity: !hasTranscript && !loading ? 0.4 : 1,
          transition: 'all 0.18s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          backdropFilter: 'blur(4px)',
        }}
      >
        {loading ? (
          <span style={{ fontSize: 9, animation: 'ccSpin 1s linear infinite', display: 'inline-block' }}>⟳</span>
        ) : 'CC'}
      </button>

      {/* Settings cog — only shown when enabled */}
      {enabled && hasTranscript && (
        <button
          ref={panelRef.current ? undefined : undefined}
          onClick={() => setShowPanel(p => !p)}
          title="Subtitle settings"
          style={{
            width: 26, height: 26,
            borderRadius: 5,
            border: '1px solid rgba(255,255,255,0.25)',
            background: showPanel ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.55)',
            color: '#fff',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            backdropFilter: 'blur(4px)',
          }}
        >
          ⚙
        </button>
      )}

      {/* Settings dropdown */}
      {showPanel && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            bottom: 36,
            right: 0,
            width: 200,
            background: 'rgba(15,15,20,0.92)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            padding: '12px 14px',
            zIndex: 9999,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <p style={{
            margin: '0 0 10px',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Subtitle Language
          </p>

          {[
            { id: 'english',  label: 'English',  desc: 'Clean English' },
            { id: 'hinglish', label: 'Hinglish', desc: 'Mixed Hindi-English tone' },
          ].map(lang => (
            <button
              key={lang.id}
              onClick={() => { changeLanguage(lang.id); setShowPanel(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 10px',
                borderRadius: 7,
                border: language === lang.id
                  ? '1px solid rgba(232,87,42,0.5)'
                  : '1px solid transparent',
                background: language === lang.id
                  ? 'rgba(232,87,42,0.15)'
                  : 'transparent',
                cursor: 'pointer',
                marginBottom: 4,
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                border: language === lang.id
                  ? '2px solid var(--accent, #e8572a)'
                  : '2px solid rgba(255,255,255,0.25)',
                background: language === lang.id ? 'var(--accent, #e8572a)' : 'transparent',
                flexShrink: 0,
                transition: 'all 0.15s',
              }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>{lang.label}</p>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{lang.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main overlay ──────────────────────────────────────────────────────────────
export default function SubtitleOverlay({ subtitles }) {
  const { enabled, visibleWords, activeChunk, language } = subtitles;

  const prevChunkRef = useRef(null);
  const [visible, setVisible]     = useState(false);
  const [fade, setFade]           = useState(false);
  const fadeTimerRef = useRef(null);

  // Manage fade-in / fade-out
  const hasText = visibleWords.length > 0;
  useEffect(() => {
    if (hasText) {
      clearTimeout(fadeTimerRef.current);
      setVisible(true);
      requestAnimationFrame(() => setFade(true));
    } else {
      setFade(false);
      fadeTimerRef.current = setTimeout(() => setVisible(false), 300);
    }
    return () => clearTimeout(fadeTimerRef.current);
  }, [hasText]);

  // Track chunk transitions for animation
  useEffect(() => {
    if (activeChunk?.chunkIndex !== prevChunkRef.current?.chunkIndex) {
      prevChunkRef.current = activeChunk;
    }
  }, [activeChunk]);

  if (!enabled) return null;

  const lines = wrapToLines(visibleWords);
  const displayText = lines.join('\n');

  return (
    <>
      {/* Inject keyframes */}
      <style>{`
        @keyframes ccSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes subtitleWordIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {visible && (
        <div
          aria-live="polite"
          aria-label="Video subtitles"
          style={{
            position:    'absolute',
            bottom:      48,          // above chapter bar
            left:        '50%',
            transform:   'translateX(-50%)',
            zIndex:      200,
            maxWidth:    '82%',
            width:       'max-content',
            pointerEvents: 'none',
            transition:  'opacity 0.28s ease, transform 0.28s ease',
            opacity:     fade ? 1 : 0,
            transform:   fade
              ? 'translateX(-50%) translateY(0)'
              : 'translateX(-50%) translateY(6px)',
          }}
        >
          <div
            style={{
              background:    'rgba(8,8,12,0.82)',
              backdropFilter:'blur(8px)',
              borderRadius:  10,
              padding:       '8px 18px',
              textAlign:     'center',
              border:        '1px solid rgba(255,255,255,0.07)',
              boxShadow:     '0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            {lines.map((line, lineIdx) => (
              <p
                key={`${activeChunk?.chunkIndex}-${lineIdx}`}
                style={{
                  margin:      lineIdx === 0 ? 0 : '2px 0 0',
                  fontSize:    'clamp(13px, 1.4vw, 17px)',
                  fontWeight:  600,
                  lineHeight:  1.45,
                  color:       '#ffffff',
                  whiteSpace:  'nowrap',
                  fontFamily:  '"Inter", "Segoe UI", system-ui, sans-serif',
                  textShadow:  '0 1px 4px rgba(0,0,0,0.8)',
                  letterSpacing: language === 'hinglish' ? '0.01em' : '0',
                }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Re-export controls for placing in the video toolbar
export { SubtitleControls };
