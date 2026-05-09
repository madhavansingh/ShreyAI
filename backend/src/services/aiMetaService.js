/**
 * services/aiMetaService.js
 * Uses Gemini Flash to generate starter questions and topic segments for each lesson.
 */

const { geminiFlash } = require('../config/gemini');

// ── Starter Questions ─────────────────────────────────────────────────────────

/**
 * Generate 5 starter questions for a lesson based on its first 15 chunks.
 */
async function generateStarterQuestions(chunks, videoTitle) {
  const FALLBACK = [
    `What is the main topic covered in "${videoTitle}"?`,
    'Can you summarize the key concepts explained?',
    'What are the most important points from this lecture?',
    'Are there any prerequisites I should know before watching this?',
    'What are practical applications of what was taught here?',
  ];

  try {
    const contextChunks = chunks.slice(0, 15);
    const context = contextChunks.map(c => `[${c.startLabel}] ${c.text}`).join('\n\n');

    const prompt = `You are an expert AI tutor analyzing a lecture video.

Video title: "${videoTitle}"

Transcript excerpt:
${context}

Based on this content, generate exactly 5 specific, interesting questions a student might want to ask about this lecture. Make them concrete and relevant to the actual content shown above.

Return ONLY a valid JSON array of 5 strings, no explanation, no numbering, no markdown. Example format:
["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

    const result   = await geminiFlash.generateContent(prompt);
    const text     = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');

    const questions = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('Invalid array');

    return questions.slice(0, 5);
  } catch (err) {
    console.warn('⚠️  generateStarterQuestions failed, using fallback:', err.message);
    return FALLBACK;
  }
}

// ── Topic Segments ────────────────────────────────────────────────────────────

/**
 * Identify distinct topic segments (YouTube-style chapters) in a lecture.
 *
 * Strategy:
 *  - Use ALL chunks for short videos (≤50 chunks)
 *  - For longer videos, pick ~50 evenly-spaced chunks so the AI sees the
 *    full arc, not just the beginning
 *  - Target 1 chapter per ~45 seconds (min 3, max 20)
 *
 * @param {Array} chunks  — [{text, startTime, endTime, startLabel}, ...]
 * @returns {Promise<Array<{topic, startTime, startLabel}>>}
 */
async function generateTopicSegments(chunks) {
  const FALLBACK = [];

  try {
    if (!chunks?.length) return FALLBACK;

    const duration    = chunks[chunks.length - 1]?.endTime || chunks[chunks.length - 1]?.startTime || 0;
    const durationMin = Math.floor(duration / 60);
    const durationSec = Math.floor(duration % 60);

    // Target: 1 chapter per ~20 s, at least 5, at most 20
    const targetCount = Math.max(5, Math.min(20, Math.ceil(duration / 20)));

    // ── Pick a representative sample spanning the whole video ────────────────
    let sampled;
    if (chunks.length <= 50) {
      sampled = chunks;                                    // use all for short videos
    } else {
      const step = Math.ceil(chunks.length / 50);
      sampled = chunks.filter((_, i) => i % step === 0).slice(0, 50);
    }

    const context = sampled
      .map(c => `[${c.startLabel} / ${Math.floor(c.startTime)}s] ${c.text.substring(0, 300)}`)
      .join('\n');

    const prompt = `You are an expert at analyzing lecture content and creating YouTube-style chapter markers.

Lecture transcript (total duration: ${durationMin}m ${durationSec}s):
${context}

Generate exactly ${targetCount} YouTube-style chapter timestamps that cover the FULL video from start to finish.
IMPORTANT: Even if the video is short, you MUST produce ${targetCount} distinct chapters by subdividing the content every 15-30 seconds.
Each chapter should capture a specific concept, step, demo, or sub-topic — NOT just one generic "Overview".

Return ONLY a valid JSON array — no markdown, no code fences, no explanation:
[{"topic": "Topic Name Here", "startTime": 0, "startLabel": "0:00"}, ...]

Strict rules:
1. First chapter MUST be startTime 0, startLabel "0:00"
2. You MUST produce EXACTLY ${targetCount} chapters — no fewer, no more
3. Spread chapters EVENLY: approximate interval = ${Math.floor(duration / targetCount)} seconds between each
4. Pick startTime values from the timestamps in the transcript above (nearest match to each interval)
5. startLabel format: "M:SS" (e.g. "0:28", "1:15") — must match startTime exactly
6. Topic names: 2-5 words, specific (e.g. "Installing LangChain", "Configuring Groq API", "Running the Chain")
7. NO duplicates, sort ascending by startTime
8. Do NOT merge everything into one topic — each chapter must be meaningfully different`;

    const result    = await geminiFlash.generateContent(prompt);
    const text      = result.response.text().trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const raw = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(raw)) throw new Error('Not an array');

    // Validate, deduplicate, and sort
    const seen = new Set();
    const segments = raw
      .filter(s => s.topic && typeof s.startTime === 'number' && s.startLabel)
      .sort((a, b) => a.startTime - b.startTime)
      .filter(s => {
        if (seen.has(s.startTime)) return false;
        seen.add(s.startTime);
        return true;
      })
      .slice(0, 20);

    // Ensure we always have a 0:00 chapter
    if (segments.length > 0 && segments[0].startTime !== 0) {
      segments.unshift({ topic: 'Introduction', startTime: 0, startLabel: '0:00' });
    }

    return segments;
  } catch (err) {
    console.warn('⚠️  generateTopicSegments failed:', err.message);
    return FALLBACK;
  }
}

module.exports = { generateStarterQuestions, generateTopicSegments };
