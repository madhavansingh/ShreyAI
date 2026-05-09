/**
 * utils/vectorMath.js
 * Cosine similarity search over 768-dimensional Gemini embeddings.
 */

/**
 * Cosine similarity between two equal-length float arrays.
 * Returns a value between 0 (unrelated) and 1 (identical).
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number}
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot  += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  if (magnitude === 0) return 0;
  return dot / magnitude;
}

/**
 * Find the top-k most semantically similar chunks to a query embedding.
 * @param {number[]} queryEmbedding  — 768-float array from embedSingleText()
 * @param {Array}    allChunks       — array of chunk objects, each with .embedding field
 * @param {number}   k               — how many top results to return (default 5)
 * @returns {Array}  top-k chunks sorted by similarity desc, each with .score appended
 */
function findTopKChunks(queryEmbedding, allChunks, k = 5) {
  if (!queryEmbedding || !allChunks || allChunks.length === 0) return [];

  const scored = allChunks
    .filter(chunk => chunk.embedding && chunk.embedding.length === queryEmbedding.length)
    .map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k);
}

module.exports = { cosineSimilarity, findTopKChunks };
