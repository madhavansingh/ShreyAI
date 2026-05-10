/**
 * hooks/useSubtitles.js
 * Real-time subtitle sync engine.
 * Fix: loop function stored in a ref so rAF always calls the latest version
 * without stale closure issues.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_DIRECT_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:5001';

// ── Find chunk whose [startTime, endTime] contains `time` ─────────────────────
// Linear scan — safe for overlapping intervals (unlike binary search)
function findActiveChunk(chunks, time) {
  if (!chunks || chunks.length === 0) return null;

  // Find all chunks that overlap current time, pick the latest-starting one
  let best = null;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (time >= c.startTime && time <= c.endTime + 0.5) {
      // Prefer the chunk whose startTime is closest to (but not after) currentTime
      if (!best || c.startTime > best.startTime) {
        best = c;
      }
    }
  }
  if (best) return best;

  // Small gap between chunks — look up to 2s ahead
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (c.startTime > time && c.startTime - time < 2.0) {
      return c;
    }
  }
  return null;
}

function getWords(text) {
  return (text || '').split(/\s+/).filter(Boolean);
}

function getVisibleWordCount(chunk, currentTime) {
  if (!chunk) return 0;
  const chunkDuration = Math.max(chunk.endTime - chunk.startTime, 1);
  const elapsed = Math.max(0, currentTime - chunk.startTime);
  const words = getWords(chunk.text);
  if (words.length === 0) return 0;
  const wps = words.length / chunkDuration;
  // +0.3s head-start so first word shows immediately
  const visible = Math.floor((elapsed + 0.3) * wps);
  return Math.min(visible, words.length);
}

export function useSubtitles(lessonId, videoRef, currentTimeRef) {
  const [enabled, setEnabled]           = useState(false);
  const [language, setLanguage]         = useState('english');
  const [chunks, setChunks]             = useState([]);
  const [activeChunk, setActiveChunk]   = useState(null);
  const [visibleWords, setVisibleWords] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  const rafRef          = useRef(null);
  const enabledRef      = useRef(false);
  const chunksRef       = useRef([]);
  const lastChunkIdx    = useRef(null);
  const lastWordCount   = useRef(0);

  // Keep refs in sync with state so the rAF loop always sees latest values
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { chunksRef.current = chunks; }, [chunks]);

  // ── rAF loop — defined in a ref so it's always fresh, no stale closure ───────
  const loopFnRef = useRef(null);
  loopFnRef.current = () => {
    if (!enabledRef.current || chunksRef.current.length === 0) {
      rafRef.current = requestAnimationFrame(loopFnRef.current);
      return;
    }

    // Read current playback time
    let currentTime = 0;
    if (videoRef?.current) {
      currentTime = videoRef.current.currentTime || 0;
    } else if (currentTimeRef?.current !== undefined) {
      currentTime = currentTimeRef.current;
    }

    const chunk = findActiveChunk(chunksRef.current, currentTime);
    const chunkIdx = chunk?.chunkIndex ?? null;

    // Chunk changed → reset
    if (chunkIdx !== lastChunkIdx.current) {
      lastChunkIdx.current = chunkIdx;
      lastWordCount.current = 0;
      setActiveChunk(chunk);
      setVisibleWords([]);
    }

    if (chunk) {
      const wordCount = getVisibleWordCount(chunk, currentTime);
      if (wordCount !== lastWordCount.current) {
        lastWordCount.current = wordCount;
        setVisibleWords(getWords(chunk.text).slice(0, wordCount));
      }
    }

    rafRef.current = requestAnimationFrame(loopFnRef.current);
  };

  // ── Start loop once on mount, stop on unmount ──────────────────────────────
  useEffect(() => {
    rafRef.current = requestAnimationFrame(loopFnRef.current);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // intentionally empty — loop runs forever, gated by enabledRef

  // ── When subtitles disabled → clear display ───────────────────────────────
  useEffect(() => {
    if (!enabled) {
      setActiveChunk(null);
      setVisibleWords([]);
      lastChunkIdx.current = null;
      lastWordCount.current = 0;
    }
  }, [enabled]);

  // ── Fetch transcript ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!lessonId) return;
    setLoading(true);
    setError(null);
    const role = localStorage.getItem('demo_role') || 'student';

    fetch(`${BACKEND_URL}/api/lessons/${lessonId}/transcript`, {
      headers: { 'x-demo-role': role },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.chunks?.length > 0) {
          const sorted = [...data.chunks].sort((a, b) => a.startTime - b.startTime);
          setChunks(sorted);
        } else {
          setError('No transcript data available.');
        }
      })
      .catch(() => setError('Could not load transcript.'))
      .finally(() => setLoading(false));

    return () => {
      setChunks([]);
      setActiveChunk(null);
      setVisibleWords([]);
      lastChunkIdx.current = null;
      lastWordCount.current = 0;
    };
  }, [lessonId]);

  const toggleEnabled  = useCallback(() => setEnabled(e => !e), []);
  const changeLanguage = useCallback((lang) => setLanguage(lang), []);

  return {
    enabled,
    toggleEnabled,
    language,
    changeLanguage,
    activeChunk,
    visibleWords,
    chunks,
    loading,
    error,
    hasTranscript: chunks.length > 0,
  };
}
