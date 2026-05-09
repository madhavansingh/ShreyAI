/**
 * VideoChapterBar — Premium YouTube-style chapter timeline
 * Renders as a floating glassmorphism overlay at the BOTTOM of the video container.
 * Features: gradient segments · glowing playhead · silky hover cards · click-to-seek
 */
import { useState, useRef, useCallback } from 'react';

// ── 10 vivid chapter colours (HSL pairs: [track, glow]) ──────────────────────
const CHAPTER_COLORS = [
  ['#f97316', 'rgba(249,115,22,0.5)'],
  ['#8b5cf6', 'rgba(139,92,246,0.5)'],
  ['#06b6d4', 'rgba(6,182,212,0.5)'],
  ['#10b981', 'rgba(16,185,129,0.5)'],
  ['#f59e0b', 'rgba(245,158,11,0.5)'],
  ['#ec4899', 'rgba(236,72,153,0.5)'],
  ['#3b82f6', 'rgba(59,130,246,0.5)'],
  ['#a855f7', 'rgba(168,85,247,0.5)'],
  ['#14b8a6', 'rgba(20,184,166,0.5)'],
  ['#ef4444', 'rgba(239,68,68,0.5)'],
];

function fmtTime(s) {
  if (!s && s !== 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoChapterBar({ segments = [], duration = 0, currentTime = 0, onSeek }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [tooltipX, setTooltipX]     = useState(0);
  const barRef = useRef(null);

  // ── Hooks MUST come before any early return ─────────────────────────────────
  const handleMouseMove = useCallback((e, idx) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setTooltipX(Math.max(60, Math.min(x, rect.width - 60)));
    setHoveredIdx(idx);
  }, []);

  const handleClick = useCallback((e) => {
    if (!barRef.current || !duration) return;
    const rect  = barRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek?.(ratio * duration);
  }, [duration, onSeek]);

  // Guard: nothing to render until data is ready
  if (!segments.length || !duration) return null;

  // Derived data (after guard — no hooks below this line)
  const enriched = segments.map((seg, i) => ({
    ...seg,
    endTime: segments[i + 1]?.startTime ?? duration,
    color: CHAPTER_COLORS[i % CHAPTER_COLORS.length][0],
    glow:  CHAPTER_COLORS[i % CHAPTER_COLORS.length][1],
  }));

  const activeIdx = enriched.reduce((acc, seg, i) => {
    if (currentTime >= seg.startTime) return i;
    return acc;
  }, 0);

  const playheadPct = Math.min((currentTime / duration) * 100, 100);
  const hovered     = hoveredIdx !== null ? enriched[hoveredIdx] : null;

  return (
    <>
      <style>{`
        @keyframes chapterPulse {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.015); }
        }
        .vcb-seg {
          transition: filter 0.2s, transform 0.2s;
          cursor: pointer;
          transform-origin: center bottom;
        }
        .vcb-seg:hover {
          filter: brightness(1.35);
          transform: scaleY(1.5);
        }
        .vcb-seg.active {
          animation: chapterPulse 2s ease-in-out infinite;
        }
        .vcb-tooltip {
          transition: opacity 0.15s ease, transform 0.15s ease;
          pointer-events: none;
        }
        .vcb-playhead {
          transition: left 0.08s linear;
        }
      `}</style>

      {/* ── Outer wrapper: absolute overlay at bottom of video ─────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          /* fade-out gradient so it blends above the native controls */
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.82) 100%)',
          padding: '28px 16px 10px',
          pointerEvents: 'none',
        }}
      >
        {/* ── Chapter label strip above the bar ─────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: 2,
          marginBottom: 5,
          pointerEvents: 'auto',
        }}>
          {enriched.map((seg, i) => {
            const widthPct = ((seg.endTime - seg.startTime) / duration) * 100;
            const isActive = i === activeIdx;
            return (
              <div
                key={i}
                onClick={() => onSeek?.(seg.startTime)}
                style={{
                  flex: `0 0 ${widthPct}%`,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  opacity: isActive ? 1 : 0.55,
                  transition: 'opacity 0.2s',
                  padding: '0 2px',
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <span style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? seg.color : '#ccc',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                  letterSpacing: '0.02em',
                  textShadow: isActive ? `0 0 12px ${seg.glow}` : 'none',
                  transition: 'color 0.2s, text-shadow 0.2s',
                }}>
                  {i === 0 ? `${seg.startLabel}` : seg.startLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Tooltip hover card ─────────────────────────────────────────── */}
        {hovered && (
          <div
            className="vcb-tooltip"
            style={{
              position: 'absolute',
              bottom: 54,
              left: tooltipX - 70,
              width: 160,
              background: 'rgba(15,15,20,0.92)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: `1px solid ${hovered.color}55`,
              borderRadius: 10,
              padding: '10px 12px',
              boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px ${hovered.color}22`,
              zIndex: 20,
            }}
          >
            {/* coloured accent top line */}
            <div style={{
              height: 2,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${hovered.color}, transparent)`,
              marginBottom: 8,
            }} />
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: hovered.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Chapter {hoveredIdx + 1}
            </p>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
              {hovered.topic}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>
              {fmtTime(hovered.startTime)} → {fmtTime(hovered.endTime)}
            </p>
            {/* little caret */}
            <div style={{
              position: 'absolute',
              bottom: -6,
              left: 70,
              width: 10,
              height: 6,
              clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
              background: hovered.color,
              opacity: 0.7,
            }} />
          </div>
        )}

        {/* ── Main progress track ────────────────────────────────────────── */}
        <div
          ref={barRef}
          onClick={handleClick}
          style={{
            position: 'relative',
            height: 6,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            cursor: 'pointer',
            overflow: 'visible',
            display: 'flex',
            gap: 2,
            pointerEvents: 'auto',
          }}
        >
          {enriched.map((seg, i) => {
            const widthPct  = ((seg.endTime - seg.startTime) / duration) * 100;
            const isActive  = i === activeIdx;

            // How far into THIS segment are we?
            let fillPct = 0;
            if (currentTime >= seg.endTime)       fillPct = 100;
            else if (currentTime >= seg.startTime)
              fillPct = ((currentTime - seg.startTime) / (seg.endTime - seg.startTime)) * 100;

            return (
              <div
                key={i}
                className={`vcb-seg ${isActive ? 'active' : ''}`}
                onMouseMove={e => handleMouseMove(e, i)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={e => { e.stopPropagation(); onSeek?.(seg.startTime); }}
                style={{
                  flex: `0 0 calc(${widthPct}% - 2px)`,
                  height: '100%',
                  borderRadius: 999,
                  background: `rgba(255,255,255,0.13)`,
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: isActive ? `0 0 10px ${seg.glow}` : 'none',
                  transition: 'box-shadow 0.3s',
                }}
              >
                {/* filled portion */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, bottom: 0,
                  width: `${fillPct}%`,
                  background: `linear-gradient(90deg, ${seg.color}cc, ${seg.color})`,
                  borderRadius: 999,
                  transition: 'width 0.12s linear',
                  boxShadow: fillPct > 0 ? `0 0 8px ${seg.glow}` : 'none',
                }} />
              </div>
            );
          })}

          {/* Glowing playhead dot */}
          <div
            className="vcb-playhead"
            style={{
              position: 'absolute',
              top: '50%',
              left: `${playheadPct}%`,
              transform: 'translate(-50%, -50%)',
              width: 13,
              height: 13,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: `0 0 0 3px rgba(255,255,255,0.25), 0 0 12px ${enriched[activeIdx]?.glow || 'rgba(249,115,22,0.6)'}`,
              zIndex: 5,
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* ── Chapter name pill under the bar ───────────────────────────── */}
        <div style={{
          marginTop: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: enriched[activeIdx]?.color,
            boxShadow: `0 0 8px ${enriched[activeIdx]?.glow}`,
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: enriched[activeIdx]?.color,
            letterSpacing: '0.01em',
            textShadow: `0 0 10px ${enriched[activeIdx]?.glow}`,
          }}>
            {enriched[activeIdx]?.topic}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto', fontFamily: 'monospace' }}>
            {fmtTime(currentTime)} / {fmtTime(duration)}
          </span>
        </div>
      </div>
    </>
  );
}
