/**
 * hooks/useSubtitles.js
 * Sentence-block subtitle engine.
 *
 * Behaviour (matches YouTube / Netflix captions):
 *   - Each transcript chunk is a "sentence block".
 *   - Words within that block are revealed progressively as playback advances.
 *   - When the block ends, display clears and the next block starts fresh.
 *   - No sliding/removing of previous words within the same sentence.
 *   - Seek / speed-change safe via rAF + refs (no stale closures).
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_DIRECT_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:5001';

// ── Devanagari → Roman transliteration ────────────────────────────────────────
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
    if (DEVANAGARI_MAP[ch] !== undefined) result += DEVANAGARI_MAP[ch];
    else if (/[\u0900-\u097F]/.test(ch)) { /* skip unknown */ }
    else result += ch;
  }
  return result.replace(/\s+/g, ' ').trim();
}

function normalizeWord(word, language) {
  if (!word) return '';
  if (hasDevanagari(word)) return transliterateDevanagari(word);
  return word;
}

// ── Build sentence blocks from transcript chunks ───────────────────────────────
// Each block: { words: [{word, ts}], startTime, endTime }
// Words within a block get linearly interpolated timestamps.
function buildSentenceBlocks(chunks) {
  if (!chunks?.length) return [];

  const sorted = [...chunks].sort((a, b) => a.startTime - b.startTime);
  const blocks = [];

  for (const chunk of sorted) {
    if (!chunk.text?.trim()) continue;
    const words = chunk.text.split(/\s+/).filter(Boolean);
    if (!words.length) continue;

    const startTime = chunk.startTime;
    const endTime   = chunk.endTime;
    if (startTime >= endTime) continue;

    const wordDuration = (endTime - startTime) / words.length;

    blocks.push({
      startTime,
      endTime,
      words: words.map((word, i) => ({
        word,
        ts: startTime + i * wordDuration,
      })),
    });
  }

  return blocks;
}

// ── Binary search: find the block active at time t ────────────────────────────
// Returns block index, or -1 if between blocks (silence gap).
function findActiveBlock(blocks, t) {
  if (!blocks.length) return -1;

  // Quick bounds check
  if (t < blocks[0].startTime) return -1;
  if (t >= blocks[blocks.length - 1].endTime) return blocks.length - 1;

  let lo = 0, hi = blocks.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b   = blocks[mid];
    if (t < b.startTime)  { hi = mid - 1; }
    else if (t >= b.endTime) { lo = mid + 1; }
    else return mid; // t is inside this block
  }

  // t is in a gap between blocks — find the most recent finished block
  // but only show it if it ended < 0.5s ago (feels natural)
  const prev = lo - 1;
  if (prev >= 0 && t - blocks[prev].endTime < 0.5) return prev;
  return -1;
}

// ── Binary search: how many words in block are visible at time t ───────────────
function visibleWordCount(block, t) {
  if (t < block.startTime) return 0;
  if (t >= block.endTime)  return block.words.length;

  // Find last word whose ts <= t
  let lo = 0, hi = block.words.length - 1, result = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (block.words[mid].ts <= t) { result = mid + 1; lo = mid + 1; }
    else                          { hi = mid - 1; }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
export function useSubtitles(lessonId, videoRef, currentTimeRef) {
  const [enabled, setEnabled]             = useState(false);
  const [language, setLanguage]           = useState('english');
  const [hasTranscript, setHasTranscript] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);

  // What the overlay renders: { words: string[], isNew: bool }
  // isNew = true signals the overlay to animate a sentence transition
  const [captionState, setCaptionState] = useState({ words: [], isNew: false });

  // Refs (no stale closures in rAF)
  const enabledRef    = useRef(false);
  const blocksRef     = useRef([]);   // sentence blocks
  const languageRef   = useRef('english');
  const rafRef        = useRef(null);
  const lastBlockRef  = useRef(-1);   // block index rendered last frame
  const lastCountRef  = useRef(0);    // word count rendered last frame
  const lastTimeRef   = useRef(-1);   // for seek detection

  useEffect(() => { enabledRef.current = enabled; },  [enabled]);
  useEffect(() => { languageRef.current = language; }, [language]);

  // ── rAF loop ────────────────────────────────────────────────────────────────
  const loopFn = useRef(null);
  loopFn.current = () => {
    if (!enabledRef.current || !blocksRef.current.length) {
      rafRef.current = requestAnimationFrame(loopFn.current);
      return;
    }

    // Read current playback time
    let t = 0;
    if (videoRef?.current)                       t = videoRef.current.currentTime || 0;
    else if (currentTimeRef?.current != null)    t = currentTimeRef.current;

    // Seek detection — full reset
    const didSeek = lastTimeRef.current !== -1 && Math.abs(t - lastTimeRef.current) > 2.0;
    if (didSeek) {
      lastBlockRef.current = -1;
      lastCountRef.current = 0;
    }
    lastTimeRef.current = t;

    const blocks   = blocksRef.current;
    const blockIdx = findActiveBlock(blocks, t);

    if (blockIdx < 0) {
      // In a gap / before first block / after last block
      if (lastBlockRef.current !== -1 || lastCountRef.current !== 0) {
        lastBlockRef.current = -1;
        lastCountRef.current = 0;
        setCaptionState({ words: [], isNew: false });
      }
      rafRef.current = requestAnimationFrame(loopFn.current);
      return;
    }

    const block = blocks[blockIdx];
    const count = visibleWordCount(block, t);
    const lang  = languageRef.current;

    const blockChanged = blockIdx !== lastBlockRef.current;
    const countChanged = count    !== lastCountRef.current;

    if (blockChanged || countChanged) {
      lastBlockRef.current = blockIdx;
      lastCountRef.current = count;

      const words = block.words
        .slice(0, count)
        .map(e => normalizeWord(e.word, lang))
        .filter(Boolean);

      // isNew = true when block just changed (trigger sentence-clear animation)
      setCaptionState({ words, isNew: blockChanged });
    }

    rafRef.current = requestAnimationFrame(loopFn.current);
  };

  // Start rAF loop once, keep it running (gated by enabledRef)
  useEffect(() => {
    rafRef.current = requestAnimationFrame(loopFn.current);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear on disable
  useEffect(() => {
    if (!enabled) {
      setCaptionState({ words: [], isNew: false });
      lastBlockRef.current = -1;
      lastCountRef.current = 0;
      lastTimeRef.current  = -1;
    }
  }, [enabled]);

  // Fetch transcript + build sentence blocks when lesson changes
  useEffect(() => {
    if (!lessonId) return;
    setLoading(true);
    setError(null);
    setHasTranscript(false);
    blocksRef.current = [];

    const role = localStorage.getItem('demo_role') || 'student';

    fetch(`${BACKEND_URL}/api/lessons/${lessonId}/transcript`, {
      headers: { 'x-demo-role': role },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.chunks?.length > 0) {
          const blocks = buildSentenceBlocks(data.chunks);
          blocksRef.current = blocks;
          setHasTranscript(blocks.length > 0);
        } else {
          setError('No transcript available.');
        }
      })
      .catch(() => setError('Could not load transcript.'))
      .finally(() => setLoading(false));

    return () => {
      blocksRef.current   = [];
      lastBlockRef.current = -1;
      lastCountRef.current = 0;
      lastTimeRef.current  = -1;
      setCaptionState({ words: [], isNew: false });
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
    captionState,   // { words: string[], isNew: bool }
    hasTranscript,
    loading,
    error,
  };
}
