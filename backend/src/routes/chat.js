/**
 * routes/chat.js
 * SSE streaming chat, session management, summary, and quiz endpoints.
 */
const express = require('express');
const router  = express.Router();

const { db }                = require('../config/firebase');
const { authMiddleware }    = require('../middleware/authMiddleware');
const {
  streamChat,
  saveSessionMessage,
  generateSummary,
  generateQuiz,
} = require('../services/chatService');

// ── POST /api/chat/stream ─────────────────────────────────────────────────────
router.post('/stream', authMiddleware, async (req, res) => {
  const { lessonId, sessionId, message, currentTime = 0 } = req.body;

  if (!lessonId || !message?.trim()) {
    return res.status(400).json({ success: false, error: 'lessonId and message are required.' });
  }

  // Verify lesson exists and is ready
  const lessonDoc = await db.collection('lessons').doc(lessonId).get().catch(() => null);
  if (!lessonDoc?.exists) {
    return res.status(404).json({ success: false, error: 'Lesson not found.' });
  }
  const lessonData = lessonDoc.data();
  if (lessonData.status !== 'ready') {
    // SSE stream with friendly error
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ type: 'error', message: `Video is still ${lessonData.status}. Chatbot will be available once processing completes.` })}\n\n`);
    res.end();
    return;
  }

  // Load session history from Firestore
  let history = [];
  try {
    const sessionDocId = `${req.user.uid}_${lessonId}_${sessionId}`;
    const sessionDoc   = await db.collection('chatSessions').doc(sessionDocId).get();
    if (sessionDoc.exists) {
      history = sessionDoc.data().messages || [];
    }
  } catch {
    history = [];
  }

  // Set SSE headers
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Handle client disconnect
  req.on('close', () => res.end());

  // Run streaming pipeline
  const result = await streamChat({
    lessonId,
    sessionId,
    message: message.trim(),
    currentTime: Number(currentTime) || 0,
    history,
    res,
  });

  // Save session (fire and forget)
  if (result) {
    setImmediate(() =>
      saveSessionMessage(
        sessionId,
        lessonId,
        req.user.uid,
        message.trim(),
        result.fullResponse,
        result.followUps
      )
    );
  }
});

// ── POST /api/chat/summary ────────────────────────────────────────────────────
router.post('/summary', authMiddleware, async (req, res, next) => {
  try {
    const { lessonId, type = 'full', startTime = 0, endTime } = req.body;
    if (!lessonId) return res.status(400).json({ success: false, error: 'lessonId required.' });

    const summary = await generateSummary(lessonId, type, Number(startTime), Number(endTime));
    res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/chat/quiz ───────────────────────────────────────────────────────
router.post('/quiz', authMiddleware, async (req, res, next) => {
  try {
    const { lessonId, count = 5, type = 'mcq' } = req.body;
    if (!lessonId) return res.status(400).json({ success: false, error: 'lessonId required.' });

    const questions = await generateQuiz(lessonId, Math.min(count, 10), type);
    res.json({ success: true, questions });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/chat/session/:lessonId ──────────────────────────────────────────
router.get('/session/:lessonId', authMiddleware, async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const snapshot = await db.collection('chatSessions')
      .where('lessonId',  '==', lessonId)
      .where('studentId', '==', req.user.uid)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({ success: true, session: null });
    }
    res.json({ success: true, session: snapshot.docs[0].data() });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/chat/session/:sessionId ───────────────────────────────────────
router.delete('/session/:sessionId', authMiddleware, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    // Find the doc (user can only delete their own)
    const snapshot = await db.collection('chatSessions')
      .where('sessionId', '==', sessionId)
      .where('studentId', '==', req.user.uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    await snapshot.docs[0].ref.delete();
    res.json({ success: true, message: 'Session cleared.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
