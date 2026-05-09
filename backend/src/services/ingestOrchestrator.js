/**
 * services/ingestOrchestrator.js
 * Master pipeline for YouTube and uploaded-video ingestion.
 * Runs as a background async job — caller does NOT await this.
 *
 * Progress map (upload flow):
 *   1–14  : uploading buffer to AssemblyAI files API
 *   15     : upload done, job submitted
 *   16–78  : polling AssemblyAI every 3s (+1% per poll = real progress)
 *   79–82  : chunking transcript
 *   83–87  : saving chunks to Firestore
 *   88–95  : AI metadata generation
 *   96–100 : finalising
 */

const { db } = require('../config/firebase');
const {
  fetchYoutubeTranscript,
  uploadBufferToAssemblyAI,
  submitTranscript,
  pollTranscriptUntilDone,
  normalizeAssemblyResult,
} = require('./transcriptService');
const { chunkTranscript }   = require('./chunkingService');
const { embedChunks }       = require('./embeddingService');
const { generateStarterQuestions, generateTopicSegments } = require('./aiMetaService');
const { invalidateCache }   = require('./chunkCache');

// ── Helper: write progress to Firestore ──────────────────────────────────────
async function updateLessonStatus(lessonId, fields) {
  await db.collection('lessons').doc(lessonId).update({
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

// ── Helper: safely push a progress update (never throws) ─────────────────────
async function safeProgress(lessonId, status, progress) {
  await updateLessonStatus(lessonId, { status, progress }).catch(() => {});
}

// ── Flow A: YouTube (captions already available — fast path) ──────────────────
async function runYoutubeIngest(lessonId, youtubeUrl, title) {
  console.log(`\n🎬 [YouTube Ingest] Starting for lesson ${lessonId}`);
  console.log(`   URL: ${youtubeUrl}`);

  try {
    await safeProgress(lessonId, 'transcribing', 10);
    console.log('   Step 1: Fetching YouTube transcript...');
    const normalizedTranscript = await fetchYoutubeTranscript(youtubeUrl);
    console.log(`   ✅ Transcript fetched — ${normalizedTranscript.length} segments`);

    await safeProgress(lessonId, 'processing', 40);
    console.log('   Step 2: Chunking...');
    const chunks = chunkTranscript(normalizedTranscript);
    console.log(`   ✅ ${chunks.length} chunks`);
    if (chunks.length === 0) throw new Error('No chunks — transcript may be too short.');

    await safeProgress(lessonId, 'processing', 60);
    console.log('   Step 3: Saving chunks...');
    await embedChunks(chunks, lessonId);

    await safeProgress(lessonId, 'processing', 85);
    console.log('   Step 4: Generating AI metadata...');
    const [starterQuestions, topicSegments] = await Promise.all([
      generateStarterQuestions(chunks, title),
      generateTopicSegments(chunks),
    ]);

    const duration = chunks[chunks.length - 1]?.endTime || 0;
    await updateLessonStatus(lessonId, {
      status: 'ready', progress: 100,
      chunkCount: chunks.length, duration, starterQuestions, topicSegments,
    });
    invalidateCache(lessonId);
    console.log(`\n✅ [YouTube Ingest] DONE — lesson ${lessonId} is ready!\n`);
  } catch (err) {
    console.error(`❌ [YouTube Ingest] FAILED for ${lessonId}:`, err.message);
    await updateLessonStatus(lessonId, { status: 'failed', progress: 0, error: err.message }).catch(() => {});
  }
}

// ── Flow B: Uploaded Video ────────────────────────────────────────────────────
async function runUploadIngest(lessonId, fileBuffer, fileMime, fileName, language, title) {
  console.log(`\n📁 [Upload Ingest] Starting for lesson ${lessonId}`);
  console.log(`   File: ${fileName} (${fileMime}, ${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

  try {
    // ── Phase 1: Upload buffer (1 → 15%) ────────────────────────────────────
    await safeProgress(lessonId, 'uploading', 1);
    console.log('   Phase 1: Uploading buffer to AssemblyAI...');

    // Simulate smooth upload progress based on file size
    // (real HTTP progress isn't exposed by the SDK, so we tick while awaiting)
    let uploadPct = 1;
    const uploadTicker = setInterval(() => {
      if (uploadPct < 14) {
        uploadPct++;
        safeProgress(lessonId, 'uploading', uploadPct);
      }
    }, 800); // 1% every 0.8s → 14% over ~11s

    const uploadUrl = await uploadBufferToAssemblyAI(fileBuffer);
    clearInterval(uploadTicker);
    await safeProgress(lessonId, 'uploading', 15);
    console.log('   ✅ Upload done.');

    // ── Phase 2: Submit transcription job (still 15%) ──────────────────────
    const transcriptId = await submitTranscript(uploadUrl, language);
    console.log(`   Transcript job ID: ${transcriptId}`);

    // ── Phase 3: Poll for completion (16 → 78%, +1% per 3s poll) ──────────
    console.log('   Phase 3: Polling transcription (1% per poll)...');
    const rawTranscript = await pollTranscriptUntilDone(
      transcriptId,
      async (pct) => safeProgress(lessonId, 'transcribing', pct),
      16,   // startPct
      78,   // endPct
    );
    const normalizedTranscript = normalizeAssemblyResult(rawTranscript);
    console.log(`   ✅ Transcript done — ${normalizedTranscript.length} segments`);

    // ── Phase 4: Chunking (79 → 82%) ──────────────────────────────────────
    await safeProgress(lessonId, 'processing', 79);
    console.log('   Phase 4: Chunking...');
    const chunks = chunkTranscript(normalizedTranscript);
    console.log(`   ✅ ${chunks.length} chunks`);
    if (chunks.length === 0) throw new Error('No chunks generated — transcript may be empty.');

    await safeProgress(lessonId, 'processing', 82);

    // ── Phase 5: Save chunks (83 → 87%) ───────────────────────────────────
    console.log('   Phase 5: Saving chunks to Firestore...');
    await embedChunks(chunks, lessonId);
    await safeProgress(lessonId, 'processing', 87);

    // ── Phase 6: AI metadata (88 → 95%) ───────────────────────────────────
    await safeProgress(lessonId, 'processing', 88);
    console.log('   Phase 6: Generating AI metadata...');
    const [starterQuestions, topicSegments] = await Promise.all([
      generateStarterQuestions(chunks, title),
      generateTopicSegments(chunks),
    ]);
    await safeProgress(lessonId, 'processing', 95);

    // ── Phase 7: Done (100%) ──────────────────────────────────────────────
    const duration = chunks[chunks.length - 1]?.endTime || 0;
    await updateLessonStatus(lessonId, {
      status:          'ready',
      progress:        100,
      chunkCount:      chunks.length,
      duration,
      starterQuestions,
      topicSegments,
    });

    invalidateCache(lessonId);
    console.log(`\n✅ [Upload Ingest] DONE — lesson ${lessonId} is ready!\n`);
  } catch (err) {
    console.error(`❌ [Upload Ingest] FAILED for ${lessonId}:`, err.message);
    await updateLessonStatus(lessonId, {
      status:   'failed',
      progress: 0,
      error:    err.message,
    }).catch(() => {});
  }
}

module.exports = { runYoutubeIngest, runUploadIngest };
