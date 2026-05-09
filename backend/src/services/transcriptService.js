/**
 * services/transcriptService.js
 * Handles YouTube transcript fetching AND AssemblyAI transcription for uploaded videos.
 * Both outputs are normalized to the same format:
 *   [{ text: string, start: number (seconds), end: number (seconds) }]
 */

const { YoutubeTranscript } = require('youtube-transcript');
const { AssemblyAI }        = require('assemblyai');
const { msToSeconds }       = require('../utils/timeFormatter');

const assemblyClient = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

// ── YouTube ID extractor ────────────────────────────────────────────────────
function extractYoutubeId(url) {
  const patterns = [
    /(?:v=|\/v\/|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/, // raw ID
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return null;
}

// ── YouTube Transcript ──────────────────────────────────────────────────────
async function fetchYoutubeTranscript(youtubeUrl) {
  const videoId = extractYoutubeId(youtubeUrl);
  if (!videoId) throw new Error('Invalid YouTube URL format.');

  let raw;
  try {
    raw = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (err) {
    if (err.message?.includes('disabled') || err.message?.includes('No transcript')) {
      throw new Error(
        'This video has no captions available. Please upload the video file directly instead.'
      );
    }
    throw new Error(`YouTube transcript error: ${err.message}`);
  }

  if (!raw || raw.length === 0) {
    throw new Error(
      'This video has no captions available. Please upload the video file directly instead.'
    );
  }

  return normalizeTranscript(raw.map(seg => ({
    text:  seg.text,
    start: msToSeconds(seg.offset),          // youtube-transcript gives ms
    end:   msToSeconds(seg.offset + seg.duration),
  })));
}

// ── Step 1: Upload buffer to AssemblyAI, returns an upload_url ───────────────
// NOTE: assemblyClient.files.upload() returns the URL string directly (not an object)
async function uploadBufferToAssemblyAI(fileBuffer) {
  console.log('📤 Uploading buffer to AssemblyAI files API...');
  const { Readable } = require('stream');
  const stream = Readable.from(fileBuffer);
  const uploadUrl = await assemblyClient.files.upload(stream);  // returns string
  if (!uploadUrl || typeof uploadUrl !== 'string') {
    throw new Error(`AssemblyAI files.upload() returned unexpected value: ${JSON.stringify(uploadUrl)}`);
  }
  console.log('   ✅ Buffer uploaded →', uploadUrl);
  return uploadUrl;
}

// ── Step 2: Submit transcription job, returns transcript ID immediately ───────
async function submitTranscript(audioUrl, language = 'auto') {
  const config = {
    audio_url:          audioUrl,
    speech_models:      ['universal-2'],  // SDK v4 requires explicit value; valid: universal-2, universal-3-pro
    punctuate:          true,
    format_text:        true,
    language_detection: language === 'auto',
  };
  if (language !== 'auto') {
    config.language_code      = language;
    config.language_detection = false;
  }
  console.log('📝 Submitting transcription job to AssemblyAI...');
  const submitted = await assemblyClient.transcripts.submit(config);
  console.log('   ✅ Job submitted, transcript ID:', submitted.id);
  return submitted.id;
}

// ── Step 3: Poll until done, calls onProgress(pct) every poll ────────────────
// pct runs from `startPct` to `endPct` over the polling duration (1% per tick)
async function pollTranscriptUntilDone(transcriptId, onProgress, startPct = 20, endPct = 78) {
  const POLL_INTERVAL_MS = 3000; // 3 seconds per poll
  let pct = startPct;

  while (true) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const result = await assemblyClient.transcripts.get(transcriptId);

    if (result.status === 'error') {
      throw new Error(`AssemblyAI transcription failed: ${result.error}`);
    }

    if (result.status === 'completed') {
      console.log(`✅ AssemblyAI done — ${result.words?.length || 0} words`);
      return result;
    }

    // Still queued or processing — nudge progress by 1%
    if (pct < endPct) {
      pct = Math.min(pct + 1, endPct);
      if (onProgress) await onProgress(pct);
    }

    console.log(`   ⏳ AssemblyAI status: ${result.status} (${pct}%)`);
  }
}

// ── Normalize AssemblyAI completed transcript → segment array ────────────────
function normalizeAssemblyResult(transcript) {
  if (!transcript.words || transcript.words.length === 0) {
    return [{
      text:  transcript.text || '',
      start: 0,
      end:   transcript.audio_duration || 0,
    }];
  }
  const segments = [];
  const GROUP_SIZE = 10;
  for (let i = 0; i < transcript.words.length; i += GROUP_SIZE) {
    const group = transcript.words.slice(i, i + GROUP_SIZE);
    segments.push({
      text:  group.map(w => w.text).join(' '),
      start: msToSeconds(group[0].start),
      end:   msToSeconds(group[group.length - 1].end),
    });
  }
  return normalizeTranscript(segments);
}

// ── Legacy helper kept for YouTube flow (blocking, no custom progress) ────────
async function transcribeUploadedVideo(audioUrl, language = 'auto') {
  const config = {
    audio_url:          audioUrl,
    punctuate:          true,
    format_text:        true,
    language_detection: language === 'auto',
  };
  if (language !== 'auto') {
    config.language_code      = language;
    config.language_detection = false;
  }
  const transcript = await assemblyClient.transcripts.transcribe(config);
  if (transcript.status === 'error') throw new Error(`AssemblyAI error: ${transcript.error}`);
  return normalizeAssemblyResult(transcript);
}

// ── Normalization ─────────────────────────────────────────────────────────────
function normalizeTranscript(rawSegments) {
  if (!rawSegments || rawSegments.length === 0) return [];

  const normalized = [];
  let buffer = null;

  const FILLER_PATTERN = /\b(um|uh|like|you know|basically)\b/gi;

  for (const seg of rawSegments) {
    const cleaned = seg.text
      .replace(/\[.*?\]/g, '')   // remove [Music], [Applause] etc.
      .trim();

    if (!cleaned) continue;

    const wordCount = cleaned.split(/\s+/).length;

    // Merge very short segments (< 2 words) into buffer
    if (wordCount < 2 && buffer) {
      buffer.text += ' ' + cleaned;
      buffer.end = seg.end;
      continue;
    }

    if (buffer) {
      // Remove excessive filler repetitions (3+ consecutive)
      buffer.text = buffer.text.replace(/((\bum\b|\buh\b|\blike\b)\s*){3,}/gi, '$2 ');
      normalized.push(buffer);
    }

    buffer = {
      text:  cleaned,
      start: seg.start,
      end:   seg.end,
    };
  }

  if (buffer) normalized.push(buffer);
  return normalized;
}

module.exports = {
  fetchYoutubeTranscript,
  transcribeUploadedVideo,
  uploadBufferToAssemblyAI,
  submitTranscript,
  pollTranscriptUntilDone,
  normalizeAssemblyResult,
  normalizeTranscript,
  extractYoutubeId,
};
