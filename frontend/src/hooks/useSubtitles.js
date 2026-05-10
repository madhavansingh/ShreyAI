/**
 * hooks/useSubtitles.js
 * Production-ready subtitle sync engine.
 *
 * Data flow:
 *   1. Fetch transcript chunks from /api/lessons/:id/transcript
 *   2. On each video timeupdate, find the active chunk (binary search)
 *   3. Progressively reveal words in that chunk as playback advances
 *   4. Support English and Hinglish rendering
 *   5. Clean up all timers on unmount
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_DIRECT_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:5001';

// ── Binary search: find chunk whose [startTime, endTime] contains `time` ──────
function findActiveChunk(chunks, time) {
  if (!chunks || chunks.length === 0) return null;

  let lo = 0, hi = chunks.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = chunks[mid];
    if (time < c.startTime) {
      hi = mid - 1;
    } else if (time > c.endTime) {
      lo = mid + 1;
    } else {
      return c;
    }
  }

  // Gap between chunks — look slightly ahead (within 1.5s)
  const ahead = chunks.find(
    c => c.startTime > time && c.startTime - time < 1.5
  );
  return ahead || null;
}

// ── Split chunk text into words array ─────────────────────────────────────────
function getWords(text) {
  return (text || '').split(/\s+/).filter(Boolean);
}

// ── Calculate how many words to show based on time elapsed in chunk ───────────
function getVisibleWordCount(chunk, currentTime) {
  if (!chunk) return 0;
  const chunkDuration = Math.max(chunk.endTime - chunk.startTime, 0.5);
  const elapsed = Math.max(0, currentTime - chunk.startTime);
  const words = getWords(chunk.text);
  if (words.length === 0) return 0;

  // Words per second
  const wps = words.length / chunkDuration;
  // +0.5s head-start so first word appears immediately
  const visible = Math.floor((elapsed + 0.5) * wps);
  return Math.min(visible, words.length);
}

export function useSubtitles(lessonId, videoRef, currentTimeRef, isYouTube) {
  const [enabled, setEnabled]             = useState(false);
  const [language, setLanguage]           = useState('english'); // 'english' | 'hinglish'
  const [chunks, setChunks]               = useState([]);
  const [activeChunk, setActiveChunk]     = useState(null);
  const [visibleWords, setVisibleWords]   = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);

  const rafRef         = useRef(null);
  const lastChunkRef   = useRef(null);
  const lastWordCount  = useRef(0);

  // ── Fetch transcript on mount / lessonId change ────────────────────────────
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
        if (data.success && data.chunks) {
          // Sort by startTime to ensure binary search works
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
    };
  }, [lessonId]);

  // ── rAF loop: runs only when subtitles are enabled ─────────────────────────
  const syncLoop = useCallback(() => {
    if (!enabled || chunks.length === 0) return;

    // Get current playback time from native video or YouTube polling ref
    let currentTime = 0;
    if (videoRef?.current) {
      currentTime = videoRef.current.currentTime || 0;
    } else if (currentTimeRef?.current !== undefined) {
      currentTime = currentTimeRef.current;
    }

    const chunk = findActiveChunk(chunks, currentTime);

    // Chunk changed — reset word reveal
    if (chunk?.chunkIndex !== lastChunkRef.current?.chunkIndex) {
      lastChunkRef.current = chunk;
      lastWordCount.current = 0;
      setActiveChunk(chunk);
      setVisibleWords(chunk ? [] : []);
    }

    if (chunk) {
      const wordCount = getVisibleWordCount(chunk, currentTime);
      if (wordCount !== lastWordCount.current) {
        lastWordCount.current = wordCount;
        setVisibleWords(getWords(chunk.text).slice(0, wordCount));
      }
    }

    rafRef.current = requestAnimationFrame(syncLoop);
  }, [enabled, chunks, videoRef, currentTimeRef]);

  // ── Start / stop rAF loop ─────────────────────────────────────────────────
  useEffect(() => {
    if (enabled && chunks.length > 0) {
      rafRef.current = requestAnimationFrame(syncLoop);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setActiveChunk(null);
      setVisibleWords([]);
      lastChunkRef.current = null;
      lastWordCount.current = 0;
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, chunks, syncLoop]);

  // ── Toggle CC ─────────────────────────────────────────────────────────────
  const toggleEnabled = useCallback(() => setEnabled(e => !e), []);

  // ── Change language instantly ─────────────────────────────────────────────
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
