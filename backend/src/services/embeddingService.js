/**
 * services/embeddingService.js
 * Embedding-free version — stores chunks in Firestore without vector embeddings.
 * Uses BM25-style keyword search at query time instead.
 */

const { db } = require('../config/firebase');

const BATCH_SIZE = 20;

/**
 * No-op: returns null since we use keyword search instead of vectors.
 */
async function embedSingleText(text) {
  return null;
}

/**
 * Save transcript chunks to Firestore WITHOUT embeddings.
 * Updates lesson chunkCount as it progresses.
 */
async function embedChunks(chunks, lessonId) {
  const lessonRef = db.collection('lessons').doc(lessonId);
  let savedCount = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const firestoreBatch = db.batch();

    for (const chunk of batch) {
      const docId  = `${lessonId}_${String(chunk.chunkIndex).padStart(5, '0')}`;
      const docRef = db.collection('transcriptChunks').doc(docId);

      firestoreBatch.set(docRef, {
        lessonId,
        chunkIndex: chunk.chunkIndex,
        text:       chunk.text,
        startTime:  chunk.startTime,
        endTime:    chunk.endTime,
        startLabel: chunk.startLabel,
        endLabel:   chunk.endLabel,
        // No embedding field — keyword search used instead
        createdAt:  new Date().toISOString(),
      });
    }

    await firestoreBatch.commit();
    savedCount += batch.length;
    await lessonRef.update({ chunkCount: savedCount });
    console.log(`   📦 Saved ${savedCount}/${chunks.length} chunks`);
  }

  console.log(`✅ Chunks saved — ${savedCount} total for lesson ${lessonId}`);
}

module.exports = { embedSingleText, embedChunks };
