/**
 * hooks/useSubtitles.js
 * Production subtitle engine — word timeline approach (YouTube-style).
 *
 * Architecture:
 *   1. Fetch transcript chunks from backend
 *   2. Flatten all chunks into a deduplicated per-word timestamp array
 *   3. rAF loop: binary-search the word array for currentTime, render
 *      a rolling window of the last N visible words
 *   4. This guarantees zero gaps — subtitles never stop mid-speech
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_DIRECT_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:5001';

// How many words to keep visible in the rolling window (≈ 2 lines)
const WINDOW_WORDS = 14;

// ── Devanagari → Roman transliteration (basic map for common patterns) ─────────
const DEVANAGARI_MAP = {
  'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ए':'e','ऐ':'ai','ओ':'o','औ':'au',
  'क':'k','ख':'kh','ग':'g','घ':'gh','च':'ch','छ':'chh','ज':'j','झ':'jh',
  'ट':'t','ठ':'th','ड':'d','ढ':'dh','त':'t','थ':'th','द':'d','ध':'dh',
  'न':'n','प':'p','फ':'f','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l',
  'व':'v','श':'sh','ष':'sh','स':'s','ह':'h','क्ष':'ksh','ज्ञ':'gya',
  'ं':'n','ः':'h','ा':'a','ि':'i','ी':'ee','ु':'u','ू':'oo','े':'e','ै':'ai',
  'ो':'o','ौ':'au','्':'','ृ':'ri',
};

function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
}

function transliterateDevanagari(text) {
  let result = '';
  for (const ch of text) {
    if (DEVANAGARI_MAP[ch] !== undefined) {
      result += DEVANAGARI_MAP[ch];
    } else if (/[\u0900-\u097F]/.test(ch)) {
      // Unknown Devanagari — skip
    } else {
      result += ch;
    }
  }
  return result.replace(/\s+/g, ' ').trim();
}

function normalizeText(text, language) {
  if (!text) return '';
  if (language === 'hinglish' && hasDevanagari(text)) {
    return transliterateDevanagari(text);
  }
  // Always strip Devanagari in English mode
  if (hasDevanagari(text)) {
    return transliterateDevanagari(text);
  }
  return text;
}

// ── Build a flat word timeline from overlapping transcript chunks ──────────────
// Each entry: { word: string, ts: number }  (ts = when word should appear, secs)
function buildWordTimeline(chunks) {
  if (!chunks || chunks.length === 0) return [];

  // Sort by startTime
  const sorted = [...chunks].sort((a, b) => a.startTime - b.startTime);

  const timeline = [];
  let coverage = 0; // latest endTime we've committed words for

  for (const chunk of sorted) {
    if (!chunk.text) continue;
    const words = chunk.text.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    const chunkStart = chunk.startTime;
    const chunkEnd   = chunk.endTime;
    if (chunkStart >= chunkEnd) continue;

    // How long each word "takes" within this chunk
    const wordDuration = (chunkEnd - chunkStart) / words.length;

    // Only add words that START after our current coverage (dedup overlaps)
    const effectiveFrom = Math.max(chunkStart, coverage);

    for (let i = 0; i < words.length; i++) {
      const wordTs = chunkStart + i * wordDuration;
      if (wordTs >= effectiveFrom - 0.05) { // 50ms tolerance
        timeline.push({ word: words[i], ts: wordTs });
      }
    }

    if (chunkEnd > coverage) coverage = chunkEnd;
  }

  // Sort by timestamp and remove duplicates (same ts within 50ms of each other)
  timeline.sort((a, b) => a.ts - b.ts);

  const deduped = [];
  for (const entry of timeline) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(entry.ts - prev.ts) < 0.05 && entry.word === prev.word) {
      continue; // true duplicate
    }
    deduped.push(entry);
  }

  return deduped;
}

// ── Binary search: find last word index with ts <= time ───────────────────────
function findLastVisibleIdx(timeline, time) {
  if (!timeline.length) return -1;
  if (time < timeline[0].ts) return -1;
  if (time >= timeline[timeline.length - 1].ts) return timeline.length - 1;

  let lo = 0, hi = timeline.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (timeline[mid].ts <= time) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

// ═══════════════════════════════════════════════════════════════════════════════
export function useSubtitles(lessonId, videoRef, currentTimeRef) {
  const [enabled, setEnabled]           = useState(false);
  const [language, setLanguage]         = useState('english');
  const [hasTranscript, setHasTranscript] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  // What the overlay actually renders
  const [displayWords, setDisplayWords] = useState([]);

  // Refs — avoids stale closure inside rAF
  const enabledRef      = useRef(false);
  const timelineRef     = useRef([]);   // flat word-ts array
  const languageRef     = useRef('english');
  const rafRef          = useRef(null);
  const lastEndIdxRef   = useRef(-1);   // tracks last rendered word index
  const lastTimeRef     = useRef(-1);   // detect seeks

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { languageRef.current = language; }, [language]);

  // ── rAF loop via ref (never goes stale) ──────────────────────────────────────
  const loopFn = useRef(null);
  loopFn.current = () => {
    if (!enabledRef.current || timelineRef.current.length === 0) {
      rafRef.current = requestAnimationFrame(loopFn.current);
      return;
    }

    // Get current playback time
    let t = 0;
    if (videoRef?.current) {
      t = videoRef.current.currentTime || 0;
    } else if (currentTimeRef?.current !== undefined) {
      t = currentTimeRef.current;
    }

    // Detect seek — reset rolling window
    if (Math.abs(t - lastTimeRef.current) > 2.0 && lastTimeRef.current !== -1) {
      lastEndIdxRef.current = -1;
    }
    lastTimeRef.current = t;

    const tl = timelineRef.current;
    const endIdx = findLastVisibleIdx(tl, t);

    // Only update state when something changed
    if (endIdx !== lastEndIdxRef.current) {
      lastEndIdxRef.current = endIdx;

      if (endIdx < 0) {
        setDisplayWords([]);
      } else {
        // Rolling window: last WINDOW_WORDS words
        const startIdx = Math.max(0, endIdx - WINDOW_WORDS + 1);
        const words = tl.slice(startIdx, endIdx + 1).map(e =>
          normalizeText(e.word, languageRef.current)
        ).filter(Boolean);
        setDisplayWords(words);
      }
    }

    rafRef.current = requestAnimationFrame(loopFn.current);
  };

  // ── Start loop on mount, never stop (gated by enabledRef) ───────────────────
  useEffect(() => {
    rafRef.current = requestAnimationFrame(loopFn.current);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear display when disabled ───────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      setDisplayWords([]);
      lastEndIdxRef.current = -1;
      lastTimeRef.current = -1;
    }
  }, [enabled]);

  // ── Fetch & build timeline when lessonId changes ──────────────────────────────
  useEffect(() => {
    if (!lessonId) return;
    setLoading(true);
    setError(null);
    setHasTranscript(false);
    timelineRef.current = [];

    const role = localStorage.getItem('demo_role') || 'student';

    fetch(`${BACKEND_URL}/api/lessons/${lessonId}/transcript`, {
      headers: { 'x-demo-role': role },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.chunks?.length > 0) {
          const timeline = buildWordTimeline(data.chunks);
          timelineRef.current = timeline;
          setHasTranscript(timeline.length > 0);
        } else {
          setError('No transcript available.');
        }
      })
      .catch(() => setError('Could not load transcript.'))
      .finally(() => setLoading(false));

    return () => {
      timelineRef.current = [];
      lastEndIdxRef.current = -1;
      lastTimeRef.current = -1;
      setDisplayWords([]);
      setHasTranscript(false);
    };
  }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleEnabled  = useCallback(() => setEnabled(e => !e), []);
  const changeLanguage = useCallback(lang => setLanguage(lang), []);

  return {
    enabled,
    toggleEnabled,
    language,
    changeLanguage,
    displayWords,
    hasTranscript,
    loading,
    error,
  };
}
