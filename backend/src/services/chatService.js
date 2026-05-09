/**
 * services/chatService.js
 * Core RAG pipeline: embed question → semantic search → build prompt → stream Gemini.
 */
const { geminiFlash }       = require('../config/gemini');
const { getChunks }         = require('./chunkCache');
const { secondsToLabel }    = require('../utils/timeFormatter');
const { db }                = require('../config/firebase');

// ── BM25-style keyword search (no embedding API needed) ───────────────────────
function bm25Search(query, chunks, k = 7) {
  const stopwords = new Set(['a','an','the','is','it','in','on','at','to','of','and','or','for','with','this','that','was','are','be','as','by','from']);
  const tokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2 && !stopwords.has(t));
  if (!tokens.length) return chunks.slice(0, k);

  const avgLen = chunks.reduce((s, c) => s + c.text.length, 0) / chunks.length;
  const k1 = 1.5, b = 0.75;

  // Document frequency
  const df = {};
  tokens.forEach(t => {
    df[t] = chunks.filter(c => c.text.toLowerCase().includes(t)).length;
  });

  const scored = chunks.map(chunk => {
    const text = chunk.text.toLowerCase();
    const words = text.split(/\W+/);
    const tf = {};
    words.forEach(w => { tf[w] = (tf[w] || 0) + 1; });

    const score = tokens.reduce((sum, t) => {
      const termFreq = tf[t] || 0;
      if (!termFreq) return sum;
      const idf = Math.log((chunks.length - df[t] + 0.5) / (df[t] + 0.5) + 1);
      const norm = (termFreq * (k1 + 1)) / (termFreq + k1 * (1 - b + b * text.length / avgLen));
      return sum + idf * norm;
    }, 0);

    return { ...chunk, _score: score };
  });

  return scored.sort((a, b) => b._score - a._score).slice(0, k);
}

const SYSTEM_INSTRUCTION = `You are Aura — an elite AI Learning Companion embedded inside an intelligent LMS.
Your role is to be the world's best private tutor for the video lecture the student is watching.

## Core Rules
1. Answer STRICTLY from the provided transcript chunks — never invent or use outside knowledge.
2. **Always cite timestamps** when referencing specific moments. Format: \`(MM:SS)\` for a single moment or \`(MM:SS – MM:SS)\` for a range. These render as clickable jump buttons in the UI — the student can click them to jump directly to that point in the video. NEVER skip timestamps when quoting the lecture.
3. If a topic is not in the chunks, say exactly: "This isn't covered in the sections I can see. You might want to ask about [suggest a related topic from the context]."
4. Respond in the SAME language the student uses (Hindi, English, Hinglish, etc.).
5. The student's current playback position is {currentTimeLabel}. When relevant, anchor your answer to nearby content first.

## Response Quality Standards
Every response must be:
- **Precise**: Only state what the transcript actually says. No padding.
- **Educational**: Explain *why*, not just *what*. Use analogies when helpful.
- **Scannable**: Use headers, bullets, and code blocks so the student can absorb quickly.
- **Confident**: Write like a brilliant senior engineer tutoring a junior — calm, clear, authoritative.

## Formatting Rules (STRICT)
- Use ## for section headings, ### for sub-headings
- Use **bold** for key terms on first introduction
- Use bullet lists (- item) for enumerating concepts, steps, or examples
- Use numbered lists (1. step) for sequential processes
- Use \`inline code\` for technical terms, commands, variable names, function names
- Use \`\`\`language\n...\n\`\`\` for multi-line code examples
- Add a blank line between every paragraph and list block
- End with a ─── divider, then a **💡 Key Takeaway** — one crisp sentence summarising the answer
- NEVER output raw asterisks visibly as **word** — always wrap the term cleanly`;

// ── RAG context builder ──────────────────────────────────────────────────────
function buildContextBlocks(semanticChunks, temporalChunks) {
  // Merge and deduplicate by chunkIndex
  const seen = new Set();
  const all  = [...semanticChunks, ...temporalChunks].filter(c => {
    if (seen.has(c.chunkIndex)) return false;
    seen.add(c.chunkIndex);
    return true;
  });

  // Sort by startTime for readability
  all.sort((a, b) => a.startTime - b.startTime);

  return all
    .map(c => `[${c.startLabel} - ${c.endLabel}]\n${c.text}`)
    .join('\n\n');
}

// ── Follow-up question generator ─────────────────────────────────────────────
async function generateFollowUpQuestions(aiAnswer) {
  const FALLBACK = [
    'Can you give me an example of this?',
    'Summarize this section for me',
    'What comes after this topic?',
  ];
  try {
    const prompt = `Based on this AI tutor answer about a lecture:\n"${aiAnswer.substring(0, 800)}"\n\nSuggest 3 natural follow-up questions a student might ask next. Make them short (under 10 words each), specific, and relevant.\n\nReturn ONLY a JSON array of 3 strings, no explanation:\n["Question 1?", "Question 2?", "Question 3?"]`;

    const result = await geminiFlash.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 200 },
    });
    const text = result.response.text().trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No array');
    const q = JSON.parse(match[0]);
    return Array.isArray(q) ? q.slice(0, 3) : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

// ── Temporal chunk finder (chunks near current playback time) ─────────────────
function findTemporalChunks(allChunks, currentTime, count = 2) {
  if (!currentTime || currentTime <= 0) return [];
  return allChunks
    .filter(c => Math.abs(c.startTime - currentTime) < 90) // within 90 seconds
    .sort((a, b) => Math.abs(a.startTime - currentTime) - Math.abs(b.startTime - currentTime))
    .slice(0, count);
}

// ── History formatter ────────────────────────────────────────────────────────
function formatHistory(messages) {
  return messages.slice(-6).map(m => ({
    role:  m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
}

// ── Main streaming chat function ─────────────────────────────────────────────
/**
 * Runs RAG pipeline and streams response via SSE.
 * @param {object} opts
 * @param {Response} res — Express response object for SSE
 */
async function streamChat({ lessonId, sessionId, message, currentTime = 0, history = [], res }) {
  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // 1. Load all chunks from cache
    const allChunks = await getChunks(lessonId);
    if (!allChunks || allChunks.length === 0) {
      sendEvent({ type: 'error', message: 'No transcript data found. The video may still be processing.' });
      res.end();
      return null;
    }

    // 2. Keyword search (BM25) — top 7 semantically relevant chunks
    const semanticChunks = bm25Search(message, allChunks, 7);

    // 3. Temporal context (2 chunks near currentTime)
    const temporalChunks = findTemporalChunks(allChunks, currentTime, 2);

    // 5. Build context string
    const contextBlocks = buildContextBlocks(semanticChunks, temporalChunks);
    if (!contextBlocks.trim()) {
      sendEvent({ type: 'error', message: 'Could not find relevant content in the transcript.' });
      res.end();
      return null;
    }

    // 6. Build prompt
    const currentTimeLabel = secondsToLabel(currentTime);
    const systemInstruction = SYSTEM_INSTRUCTION.replace('{currentTimeLabel}', currentTimeLabel);

    const userMessage = `TRANSCRIPT CONTEXT (most relevant sections):\n\n${contextBlocks}\n\n---\nSTUDENT QUESTION: ${message}`;

    // 7. Prepare conversation history
    const formattedHistory = formatHistory(history);

    // 8. Stream from Gemini
    const streamResult = await geminiFlash.generateContentStream({
      systemInstruction,
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      generationConfig: { temperature: 0.35, maxOutputTokens: 1500 },
    });

    // 9. Stream tokens
    let fullResponse = '';
    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        sendEvent({ type: 'token', content: text });
      }
    }

    // 10. Generate follow-ups
    const followUps = await generateFollowUpQuestions(fullResponse);
    sendEvent({ type: 'followUps', items: followUps });
    sendEvent({ type: 'done' });
    res.end();

    return { fullResponse, followUps };
  } catch (err) {
    console.error('❌ streamChat error:', err.message);
    // Retry on rate limit
    if (err.status === 429) {
      sendEvent({ type: 'error', message: 'Rate limit reached. Please wait a moment and try again.' });
    } else {
      sendEvent({ type: 'error', message: 'AI service error. Please try again.' });
    }
    res.end();
    return null;
  }
}

// ── Save session to Firestore ────────────────────────────────────────────────
async function saveSessionMessage(sessionId, lessonId, studentId, userMsg, aiMsg, followUps) {
  try {
    const docId  = `${studentId}_${lessonId}_${sessionId}`;
    const docRef = db.collection('chatSessions').doc(docId);
    const snap   = await docRef.get();

    const now      = new Date().toISOString();
    const newMsgs  = [
      { role: 'user',      content: userMsg, timestamp: now },
      { role: 'assistant', content: aiMsg, followUps, timestamp: now },
    ];

    if (snap.exists) {
      const existing = snap.data().messages || [];
      const merged   = [...existing, ...newMsgs].slice(-20); // cap at 20 messages
      await docRef.update({ messages: merged, updatedAt: now });
    } else {
      await docRef.set({
        sessionId, lessonId, studentId,
        messages: newMsgs,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (err) {
    console.error('⚠️  Failed to save session (non-critical):', err.message);
  }
}

// ── Summary generator ────────────────────────────────────────────────────────
async function generateSummary(lessonId, type, startTime, endTime) {
  const allChunks = await getChunks(lessonId);
  if (!allChunks?.length) throw new Error('No transcript chunks found');

  let selectedChunks;
  const totalDuration = allChunks[allChunks.length - 1]?.endTime || 0;

  if (type === 'full') {
    const first20 = allChunks.slice(0, 20);
    const last20  = allChunks.slice(-20);
    const seen    = new Set(first20.map(c => c.chunkIndex));
    selectedChunks = [...first20, ...last20.filter(c => !seen.has(c.chunkIndex))];
  } else if (type === 'last5min') {
    const cutoff = Math.max(0, totalDuration - 300);
    selectedChunks = allChunks.filter(c => c.startTime >= cutoff);
  } else if (type === 'range') {
    selectedChunks = allChunks.filter(c => c.startTime >= startTime && c.endTime <= endTime);
  } else {
    selectedChunks = allChunks.slice(0, 30);
  }

  if (!selectedChunks?.length) throw new Error('No transcript content found for this range.');

  const context = selectedChunks
    .map(c => `[${c.startLabel}] ${c.text}`)
    .join('\n\n');

  const scopeInstruction = {
    full:    'Provide a complete, comprehensive summary covering every major topic, concept, and example from the lecture.',
    last5min:'Focus exclusively on the final section: concluding arguments, key takeaways, and any calls to action.',
    range:   'Summarise only the content within the given timestamp range — nothing outside it.',
  }[type] || 'Summarise the main content.';

  const prompt = `You are an elite educational content curator. Your job is to produce a beautifully structured, deeply insightful lecture summary that a student could use as a complete study reference.

${scopeInstruction}

## Required Output Format

### 🎯 TL;DR
One powerful sentence that captures the entire point of this lecture section.

### 🧠 Core Concepts
For each major concept covered:
- **Concept Name** — clear, precise definition or explanation in 1–2 sentences

### 📋 Key Points
Bullet list of the most important facts, insights, or arguments (5–8 points).

### 💡 Examples & Definitions
Any concrete examples, analogies, code snippets, or definitions mentioned by the lecturer.

### ⚡ Quick-Recall Flashcards
3–5 Q&A pairs a student could use to test themselves:
**Q:** Question?
**A:** Answer.

───

TRANSCRIPT:
${context}`;

  const result = await geminiFlash.generateContent(prompt);
  return result.response.text();
}

// ── Quiz generator ───────────────────────────────────────────────────────────
async function generateQuiz(lessonId, count = 5, type = 'mcq') {
  const allChunks = await getChunks(lessonId);
  if (!allChunks?.length) throw new Error('No transcript data found');

  // Sample chunks spread across the full lecture
  const step = Math.max(1, Math.floor(allChunks.length / 20));
  const sampled = allChunks.filter((_, i) => i % step === 0).slice(0, 20);

  const context = sampled.map(c => `[${c.startLabel}] ${c.text}`).join('\n\n');

  const prompt = type === 'mcq'
    ? `Based on this lecture transcript, generate exactly ${count} multiple choice questions.
Return ONLY a valid JSON array with this exact structure:
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A","explanation":"...","startLabel":"MM:SS"}]

TRANSCRIPT:
${context}`
    : `Based on this lecture transcript, generate exactly ${count} short-answer questions with answers.
Return ONLY a valid JSON array:
[{"question":"...","answer":"...","explanation":"...","startLabel":"MM:SS"}]

TRANSCRIPT:
${context}`;

  const result = await geminiFlash.generateContent(prompt);
  const text   = result.response.text().trim();
  const match  = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Failed to generate quiz questions');
  return JSON.parse(match[0]);
}

module.exports = {
  streamChat,
  saveSessionMessage,
  generateSummary,
  generateQuiz,
  generateFollowUpQuestions,
};
