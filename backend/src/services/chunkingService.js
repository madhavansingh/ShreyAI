/**
 * services/chunkingService.js
 * Splits normalized transcript into 30-second overlapping chunks for RAG.
 */
const { secondsToLabel } = require('../utils/timeFormatter');

const CHUNK_WINDOW_SECONDS = 30;
const OVERLAP_SECONDS      = 5;
const MIN_WORDS_PER_CHUNK  = 10;

/**
 * Chunk a normalized transcript into fixed-window segments.
 *
 * @param {Array<{text: string, start: number, end: number}>} normalizedTranscript
 * @returns {Array<{chunkIndex, text, startTime, endTime, startLabel, endLabel}>}
 */
function chunkTranscript(normalizedTranscript) {
  if (!normalizedTranscript || normalizedTranscript.length === 0) return [];

  const chunks = [];
  let chunkIndex = 0;

  // Determine total duration
  const totalDuration = normalizedTranscript[normalizedTranscript.length - 1]?.end || 0;

  let windowStart = 0;

  while (windowStart < totalDuration) {
    const windowEnd = windowStart + CHUNK_WINDOW_SECONDS;

    // Collect all segments that overlap with this window
    const segments = normalizedTranscript.filter(
      seg => seg.start < windowEnd && seg.end > windowStart
    );

    if (segments.length > 0) {
      const text = segments.map(s => s.text.trim()).join(' ').trim();
      const wordCount = text.split(/\s+/).length;

      if (wordCount >= MIN_WORDS_PER_CHUNK) {
        const startTime = segments[0].start;
        const endTime   = segments[segments.length - 1].end;

        chunks.push({
          chunkIndex,
          text,
          startTime,
          endTime,
          startLabel: secondsToLabel(startTime),
          endLabel:   secondsToLabel(endTime),
        });

        chunkIndex++;
      }
    }

    // Advance window with overlap
    windowStart += CHUNK_WINDOW_SECONDS - OVERLAP_SECONDS;
  }

  return chunks;
}

module.exports = { chunkTranscript };
