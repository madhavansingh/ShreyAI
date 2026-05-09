/**
 * services/chunkCache.js
 * In-memory LRU-style cache for transcript chunks.
 * Avoids Firestore reads on every chat message.
 */

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_CACHE_SIZE = 100; // max 100 lessons cached simultaneously

// Map<lessonId, { chunks: Array, loadedAt: Date }>
const cache = new Map();

const { db } = require('../config/firebase');

/**
 * Get chunks for a lesson — from cache if fresh, else load from Firestore.
 * @param {string} lessonId
 * @returns {Promise<Array>}
 */
async function getChunks(lessonId) {
  const cached = cache.get(lessonId);
  const now = Date.now();

  if (cached && (now - cached.loadedAt) < CACHE_TTL_MS) {
    return cached.chunks;
  }

  // Load from Firestore — try ordered query first, fall back to unordered if index missing
  let snapshot;
  try {
    snapshot = await db
      .collection('transcriptChunks')
      .where('lessonId', '==', lessonId)
      .orderBy('chunkIndex', 'asc')
      .get();
  } catch (indexErr) {
    // Composite index not yet built — fetch without orderBy and sort in memory
    console.warn(`⚠️  Index not ready, falling back to in-memory sort for lesson ${lessonId}`);
    snapshot = await db
      .collection('transcriptChunks')
      .where('lessonId', '==', lessonId)
      .get();
  }

  if (snapshot.empty) return [];

  const chunks = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => a.chunkIndex - b.chunkIndex);  // sort in memory

  // Evict oldest entry if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  cache.set(lessonId, { chunks, loadedAt: now });
  return chunks;

}

/**
 * Remove cached chunks for a lesson (called after re-ingest).
 * @param {string} lessonId
 */
function invalidateCache(lessonId) {
  cache.delete(lessonId);
  console.log(`🗑️  Cache invalidated for lesson: ${lessonId}`);
}

/**
 * Get current cache stats (useful for debugging).
 */
function getCacheStats() {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlHours: CACHE_TTL_MS / 3600000,
    keys: Array.from(cache.keys()),
  };
}

module.exports = { getChunks, invalidateCache, getCacheStats };
