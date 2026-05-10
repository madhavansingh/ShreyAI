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
 *
 * Language modes:
 *   'hinglish' – DEFAULT. English words kept as-is; any Devanagari/Hindi word
 *                is auto-transliterated to Roman. No raw Hindi script ever shown.
 *   'hindi'    – Devanagari → Roman transliteration (same output, alias)
 *   'english'  – pass-through, BUT Devanagari is still auto-romanized as a
 *                safety fallback so raw Hindi script never leaks into subtitles.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_DIRECT_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:5001';

// ── Loanword dictionary: English tech/common words written in Devanagari ────
// These are the biggest source of bad output (मशीन → "msheen" instead of "machine")
const LOANWORD_MAP = {
  // ML / DS / AI
  'मशीन': 'machine', 'मशीन': 'machine', 'लर्निंग': 'learning', 'लर्निग': 'learning',
  'डेटा': 'data', 'डाटा': 'data', 'डेटासेट': 'dataset',
  'साइंस': 'science', 'सायंस': 'science', 'साइंटिस्ट': 'scientist',
  'आर्टिफिशियल': 'artificial', 'इंटेलिजेंस': 'intelligence',
  'न्यूरल': 'neural', 'नेटवर्क': 'network',
  'डीप': 'deep', 'ट्रांसफार्मर': 'transformer', 'अटेंशन': 'attention',
  'मॉडल': 'model', 'ट्रेनिंग': 'training', 'टेस्टिंग': 'testing',
  'वैलिडेशन': 'validation', 'ओवरफिटिंग': 'overfitting',
  'अल्गोरिदम': 'algorithm', 'एल्गोरिदम': 'algorithm',
  'रिग्रेशन': 'regression', 'क्लासिफिकेशन': 'classification',
  'क्लस्टरिंग': 'clustering', 'फीचर': 'feature', 'लेबल': 'label',
  'एम्बेडिंग': 'embedding', 'टोकन': 'token', 'टोकनाइजेशन': 'tokenization',
  'इनपुट': 'input', 'आउटपुट': 'output', 'लेयर': 'layer',
  'वेट': 'weight', 'बायस': 'bias', 'ग्रेडिएंट': 'gradient',
  'ऑप्टिमाइजर': 'optimizer', 'लॉस': 'loss', 'एक्यूरेसी': 'accuracy',
  'प्रिडिक्शन': 'prediction', 'प्रोबेबिलिटी': 'probability',
  'मैट्रिक्स': 'matrix', 'वेक्टर': 'vector',
  // Tech / programming
  'कंप्यूटर': 'computer', 'सॉफ्टवेयर': 'software', 'हार्डवेयर': 'hardware',
  'प्रोग्रामिंग': 'programming', 'कोडिंग': 'coding', 'कोड': 'code',
  'डेटाबेस': 'database', 'क्लाउड': 'cloud', 'सर्वर': 'server',
  'फ्रेमवर्क': 'framework', 'लाइब्रेरी': 'library', 'फंक्शन': 'function',
  'वेरिएबल': 'variable', 'इंटीग्रेशन': 'integration', 'डिप्लॉयमेंट': 'deployment',
  'इंटरनेट': 'internet', 'वेबसाइट': 'website', 'एपीआई': 'API',
  'एप्लीकेशन': 'application', 'एप्लिकेशन': 'application',
  'टेक्नोलॉजी': 'technology', 'इंजीनियरिंग': 'engineering',
  'डेवलपमेंट': 'development', 'टूल': 'tool', 'प्लेटफॉर्म': 'platform',
  // Common Hinglish filler / grammar
  'ऑलमोस्ट': 'almost', 'बेसिकली': 'basically', 'एक्चुअली': 'actually',
  'लिटरली': 'literally', 'प्रॉब्लम': 'problem', 'सॉल्यूशन': 'solution',
  'एग्जाम्पल': 'example', 'कॉन्सेप्ट': 'concept', 'टॉपिक': 'topic',
  'वीडियो': 'video', 'चैनल': 'channel', 'कोर्स': 'course',
  'लेक्चर': 'lecture', 'स्टूडेंट': 'student', 'टीचर': 'teacher',
  'पॉइंट': 'point', 'नोट्स': 'notes', 'क्वेश्चन': 'question',
  'आंसर': 'answer', 'रिजल्ट': 'result', 'स्कोर': 'score',
};

// ── Devanagari → Roman transliteration (improved engine) ─────────────────────
// Consonants WITHOUT implicit 'a' — we add it contextually
const CONSONANT_MAP = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh',
  'न': 'n', 'प': 'p', 'फ': 'f', 'ब': 'b', 'भ': 'bh',
  'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l',
  'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
};

// Standalone vowels (start of word / after another vowel)
const VOWEL_MAP = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
};

// Dependent vowel signs (matras) — replace the inherent 'a' of the consonant
const MATRA_MAP = {
  'ा': 'aa', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ृ': 'ri',
};

const HALANT     = '्';   // virama — suppresses inherent vowel
const ANUSVARA   = 'ं';   // nasal
const VISARGA    = 'ः';   // aspiration
const CHANDRABINDU = 'ँ'; // nasalisation

function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Improved Devanagari → Roman transliteration.
 *
 * Steps:
 *  1. Check LOANWORD_MAP first (handles मशीन → machine, डेटा → data, etc.)
 *  2. Process char-by-char tracking consonant+matra/halant pairs
 *  3. Apply word-final schwa deletion (drop trailing 'a' on bare final consonant)
 */
function transliterateDevanagari(text) {
  if (!text) return '';

  // ── 1. Whole-word loanword lookup (strip trailing punctuation for match) ──
  const punct = text.match(/[^a-zA-Z\u0900-\u097F]*$/)?.[0] ?? '';
  const core  = text.slice(0, text.length - punct.length);
  if (LOANWORD_MAP[core]) return LOANWORD_MAP[core] + punct;

  // ── 2. Character-level transliteration ───────────────────────────────────
  const chars = [...text];   // spread handles multi-codepoint chars
  let result = '';
  let i = 0;

  while (i < chars.length) {
    const ch   = chars[i];
    const next = chars[i + 1] ?? '';

    if (CONSONANT_MAP[ch] !== undefined) {
      const base = CONSONANT_MAP[ch];

      if (next === HALANT) {
        // Consonant cluster — no vowel, skip halant
        result += base;
        i += 2;
      } else if (MATRA_MAP[next] !== undefined) {
        // Matra replaces inherent 'a'
        result += base + MATRA_MAP[next];
        i += 2;
      } else {
        // Bare consonant — add inherent 'a'
        result += base + 'a';
        i += 1;
      }
    } else if (VOWEL_MAP[ch] !== undefined) {
      result += VOWEL_MAP[ch];
      i += 1;
    } else if (MATRA_MAP[ch] !== undefined) {
      // Orphan matra (rare) — just emit vowel
      result += MATRA_MAP[ch];
      i += 1;
    } else if (ch === ANUSVARA || ch === CHANDRABINDU) {
      result += 'n';
      i += 1;
    } else if (ch === VISARGA) {
      result += 'h';
      i += 1;
    } else if (/[\u0900-\u097F]/.test(ch)) {
      // Unknown Devanagari codepoint — skip
      i += 1;
    } else {
      // Non-Devanagari (Latin, digits, punctuation) — pass through
      result += ch;
      i += 1;
    }
  }

  // ── 3. Word-final schwa deletion ─────────────────────────────────────────
  // Hindi drops the inherent 'a' on the last consonant (e.g. mashin not mashina)
  result = result.replace(/a([^aeiou\s]*)$/, '$1');

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize a single word so subtitles ALWAYS render in Roman/English script.
 *
 * Hard rule (applies to every language mode — no raw Devanagari ever shown):
 *   • Word has Devanagari chars  →  loanword dict first, then transliterate
 *   • Word is already Roman      →  keep exactly as-is (English words untouched)
 *   • Numeric / symbol token     →  keep as-is
 *
 * Returns the normalized string, or '' to drop the word from the subtitle.
 */
function normalizeWord(word, _language) {
  if (!word) return '';

  // NEVER emit raw Devanagari — always convert to Roman script
  if (hasDevanagari(word)) {
    return transliterateDevanagari(word) || '';
  }

  // Already Roman (English word, number, punctuation) — keep as-is
  return word;
}

// ── Build sentence blocks from transcript chunks ───────────────────────────────
// Each block: { words: [{word, ts}], startTime, endTime }
function buildSentenceBlocks(chunks) {
  if (!chunks?.length) return [];

  const sorted = [...chunks].sort((a, b) => a.startTime - b.startTime);
  const blocks = [];

  let currentWords = [];
  let blockStart  = -1;
  let blockEnd    = -1;

  const flushBlock = () => {
    if (currentWords.length > 0) {
      blocks.push({ startTime: blockStart, endTime: blockEnd, words: currentWords });
      currentWords = [];
    }
  };

  const MAX_WORDS = 12; // Roughly 2 lines of text

  for (const chunk of sorted) {
    if (!chunk.text?.trim()) continue;
    const words = chunk.text.split(/\s+/).filter(Boolean);
    if (!words.length) continue;

    const startTime = chunk.startTime;
    const endTime   = chunk.endTime;
    if (startTime >= endTime) continue;

    const wordDuration = (endTime - startTime) / words.length;

    // Silence gap > 0.8 s → new sentence block
    if (currentWords.length > 0 && startTime - blockEnd > 0.8) {
      flushBlock();
    }

    for (let i = 0; i < words.length; i++) {
      if (currentWords.length === 0) blockStart = startTime + i * wordDuration;

      const wordText = words[i];
      const wTs      = startTime + i * wordDuration;
      currentWords.push({ word: wordText, ts: wTs });
      blockEnd = startTime + (i + 1) * wordDuration;

      const isEndOfSentence = /[.!?]$/.test(wordText);

      if (currentWords.length >= MAX_WORDS || (isEndOfSentence && currentWords.length >= 4)) {
        flushBlock();
      }
    }
  }

  flushBlock();
  return blocks;
}

// ── Binary search: block active at time t ─────────────────────────────────────
function findActiveBlock(blocks, t) {
  if (!blocks.length) return -1;
  if (t < blocks[0].startTime) return -1;
  if (t >= blocks[blocks.length - 1].endTime) return blocks.length - 1;

  let lo = 0, hi = blocks.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b   = blocks[mid];
    if      (t < b.startTime) hi = mid - 1;
    else if (t >= b.endTime)  lo = mid + 1;
    else return mid;
  }

  // In a gap — show previous block if it ended < 0.5 s ago
  const prev = lo - 1;
  if (prev >= 0 && t - blocks[prev].endTime < 0.5) return prev;
  return -1;
}

// ── Binary search: visible word count at time t ───────────────────────────────
function visibleWordCount(block, t) {
  if (t < block.startTime) return 0;
  if (t >= block.endTime)  return block.words.length;

  let lo = 0, hi = block.words.length - 1, result = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (block.words[mid].ts <= t) { result = mid + 1; lo = mid + 1; }
    else                           { hi = mid - 1; }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
export function useSubtitles(lessonId, videoRef, currentTimeRef) {
  const [enabled,      setEnabled]      = useState(false);
  // Supported values: 'english' | 'hindi' | 'hinglish'
  const [language,     setLanguage]     = useState('hinglish'); // default: romanize Hindi on the fly
  const [hasTranscript, setHasTranscript] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  // { words: string[], isNew: bool }  — isNew triggers sentence-clear animation
  const [captionState, setCaptionState] = useState({ words: [], isNew: false });

  // Refs (avoids stale closures in rAF)
  const enabledRef   = useRef(false);
  const blocksRef    = useRef([]);
  const languageRef  = useRef('hinglish');
  const rafRef       = useRef(null);
  const lastBlockRef = useRef(-1);
  const lastCountRef = useRef(0);
  const lastTimeRef  = useRef(-1);

  useEffect(() => { enabledRef.current  = enabled;  }, [enabled]);
  useEffect(() => { languageRef.current = language; }, [language]);

  // ── rAF loop ──────────────────────────────────────────────────────────────
  const loopFn = useRef(null);
  loopFn.current = () => {
    if (!enabledRef.current || !blocksRef.current.length) {
      rafRef.current = requestAnimationFrame(loopFn.current);
      return;
    }

    let t = 0;
    if (videoRef?.current)              t = videoRef.current.currentTime || 0;
    else if (currentTimeRef?.current != null) t = currentTimeRef.current;

    // Seek detection → full reset
    const didSeek = lastTimeRef.current !== -1 && Math.abs(t - lastTimeRef.current) > 2.0;
    if (didSeek) {
      lastBlockRef.current = -1;
      lastCountRef.current = 0;
    }
    lastTimeRef.current = t;

    const blocks   = blocksRef.current;
    const blockIdx = findActiveBlock(blocks, t);

    if (blockIdx < 0) {
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
    const countChanged = count   !== lastCountRef.current;

    if (blockChanged || countChanged) {
      lastBlockRef.current = blockIdx;
      lastCountRef.current = count;

      const words = block.words
        .slice(0, count)
        .map(e => normalizeWord(e.word, lang))
        .filter(Boolean);  // empty strings (unknown glyphs) are dropped

      setCaptionState({ words, isNew: blockChanged });
    }

    rafRef.current = requestAnimationFrame(loopFn.current);
  };

  // Start rAF loop once; keep it running (gated by enabledRef)
  useEffect(() => {
    rafRef.current = requestAnimationFrame(loopFn.current);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear captions when subtitles are disabled
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
      blocksRef.current    = [];
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
    language,           // 'english' | 'hindi' | 'hinglish'
    changeLanguage,
    captionState,       // { words: string[], isNew: bool }
    hasTranscript,
    loading,
    error,
  };
}
