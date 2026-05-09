/**
 * components/LessonStatusBadge.jsx
 * Shows a colour-coded badge + animated progress bar while a lesson processes.
 */
import React from 'react';

const STATUS_META = {
  uploading:    { label: 'Uploading',    color: '#e8572a', pulse: true  },
  processing:   { label: 'Processing',   color: '#e8572a', pulse: true  },
  transcribing: { label: 'Transcribing', color: '#f59e0b', pulse: true  },
  embedding:    { label: 'Embedding',    color: '#e8572a', pulse: true  },
  ready:        { label: 'Ready ✓',      color: '#22c55e', pulse: false },
  failed:       { label: 'Failed ✗',     color: '#ef4444', pulse: false },
};

export default function LessonStatusBadge({ status, progress = 0, chunkCount = 0, error }) {
  const meta = STATUS_META[status] || STATUS_META.processing;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Badge */}
      <span style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           6,
        padding:       '3px 10px',
        borderRadius:  20,
        fontSize:       12,
        fontWeight:    600,
        background:    meta.color + '22',
        color:         meta.color,
        border:        `1px solid ${meta.color}55`,
        width:         'fit-content',
      }}>
        {meta.pulse && (
          <span style={{
            width: 7, height: 7,
            borderRadius: '50%',
            background: meta.color,
            display: 'inline-block',
            animation: 'pulse 1.4s ease-in-out infinite',
          }} />
        )}
        {meta.label}
      </span>

      {/* Progress bar (show when actively processing) */}
      {meta.pulse && progress > 0 && (
        <div style={{ width: '100%', maxWidth: 220 }}>
          <div style={{
            height: 5,
            borderRadius: 9999,
            background: '#ffffff18',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width:  `${progress}%`,
              background: `linear-gradient(90deg, ${meta.color}99, ${meta.color})`,
              borderRadius: 9999,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
          {progress}%{chunkCount > 0 ? ` · ${chunkCount} chunks` : ''}
          </p>
        </div>
      )}

      {/* Error message */}
      {status === 'failed' && error && (
        <p style={{ fontSize: 12, color: '#ef4444', margin: 0, maxWidth: 260 }}>
          {error}
        </p>
      )}

      {/* Ready info */}
      {status === 'ready' && chunkCount > 0 && (
        <p style={{ fontSize: 11, color: '#22c55e', margin: 0 }}>
          {chunkCount} chunks indexed
        </p>
      )}
    </div>
  );
}
