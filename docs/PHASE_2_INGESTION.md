# Phase 2 — Transcript Ingestion Pipeline
## Goal: Any video (YouTube URL or uploaded file) gets transcribed, chunked, embedded, and stored. Chatbot becomes "AI Ready" for that video.

> **This is the core engine. Everything else depends on this working perfectly.**

---

## 2.1 What This Phase Builds

Two ingestion flows — both produce the same output (chunks in Firestore):

```
Flow A: YouTube URL  → youtube-transcript → normalize → chunk → embed → Firestore
Flow B: Upload file  → Firebase Storage → AssemblyAI → normalize → chunk → embed → Firestore
```

After both flows: lesson `status` field = `"ready"`, chatbot works.

---

## 2.2 Backend Routes to Build

### POST `/api/lessons/ingest-youtube`
**Auth required:** Instructor role only

**Request body:**
```json
{
  "courseId": "string",
  "moduleId": "string",
  "title": "string",
  "description": "string",
  "youtubeUrl": "string",
  "order": 0
}
```

**What it does:**
1. Validate YouTube URL format
2. Create lesson document in Firestore with `status: "pending"`
3. Return `lessonId` immediately to frontend (don't wait for processing)
4. Kick off async processing in background (do not await)
5. Background process: fetch transcript → chunk → embed → save → update status

**Response:** `{ lessonId, status: "processing" }` — returned in under 1 second

---

### POST `/api/lessons/upload`
**Auth required:** Instructor role only
**Content-Type:** `multipart/form-data`

**Form fields:**
- `file` — the video file (.mp4, .webm, .mov, .avi)
- `courseId`, `moduleId`, `title`, `description`, `order`, `language` (optional: `en`, `hi`, `auto`)

**What it does:**
1. Validate file type and size (max 5GB)
2. Create lesson document with `status: "uploading"`
3. Stream file directly to Firebase Storage at path: `videos/{lessonId}/{filename}`
4. On upload complete: update status to `"transcribing"`, trigger AssemblyAI
5. Return `lessonId` immediately, processing continues in background

**Response:** `{ lessonId, status: "uploading" }`

---

### GET `/api/lessons/:lessonId/status`
**Auth required:** Yes (any authenticated user)

**What it returns:**
```json
{
  "lessonId": "string",
  "status": "uploading | transcribing | embedding | ready | failed",
  "progress": 0-100,
  "chunkCount": 0,
  "error": null
}
```

Frontend polls this every 3 seconds to show progress bar.

---

### GET `/api/lessons/:lessonId`
**Auth required:** Yes

Returns the full lesson document including `starterQuestions` and `topicSegments`.

---

## 2.3 Services to Build

### services/transcriptService.js

#### `fetchYoutubeTranscript(youtubeUrl)`
- Extract video ID from YouTube URL (handle all URL formats: watch?v=, youtu.be/, embed/)
- Call `youtube-transcript` package to get captions
- If no captions available: throw error with message "This video has no captions. Please upload the video file instead."
- Normalize output to: `[{ text: string, start: number (seconds), end: number (seconds) }]`
- Handle errors gracefully (private video, captions disabled, region locked)

#### `transcribeUploadedVideo(storageUrl, language)`
- Submit job to AssemblyAI:
  - `audio_url`: Firebase Storage signed URL (valid 1 hour)
  - `speech_model`: `"universal"` (handles accents, Hinglish)
  - `language_detection`: `true` (if language is "auto")
  - `language_code`: the value passed in (if specific language chosen)
  - `punctuate`: `true`
  - `format_text`: `true`
  - `speaker_labels`: `true`
- Poll AssemblyAI status endpoint every 5 seconds
- On completion: normalize to same format as YouTube transcript
- On failure: update lesson status to `"failed"` with error message
- Timeout after 30 minutes (very long videos)

#### `normalizeTranscript(rawTranscript)`
- Input: either YouTube format or AssemblyAI format
- Output: `[{ text, start (seconds), end (seconds) }]`
- Merge very short segments (< 2 words) with adjacent segments
- Strip filler words only if they appear 3+ times consecutively ("um", "uh", "like like like")

---

### services/chunkingService.js

#### `chunkTranscript(normalizedTranscript)`
- Window size: 30 seconds
- Overlap: 5 seconds (last 5 seconds of chunk N = first 5 seconds of chunk N+1)
- Each chunk: accumulate transcript segments until 30 seconds is reached
- Return: `[{ chunkIndex, text, startTime, endTime, startLabel, endLabel }]`
- `startLabel` / `endLabel`: format as `"MM:SS"` if under 1 hour, `"H:MM:SS"` if 1 hour or more
- Minimum chunk size: skip chunks with fewer than 10 words (silence gaps)
- A 1-hour video → ~120 chunks. A 10-hour video → ~1,200 chunks.

---

### services/embeddingService.js

#### `embedChunks(chunks, lessonId)`
- Batch size: 10 chunks per API call
- Delay between batches: 200ms (Gemini rate limit safety)
- For each chunk: call Gemini `text-embedding-004` with the chunk text
- Receive 768-dimensional float array
- Save each chunk to Firestore `transcriptChunks` collection:
  ```
  Document ID: {lessonId}_{chunkIndex}
  Fields: lessonId, chunkIndex, text, startTime, endTime, startLabel, endLabel, embedding (array of 768 floats)
  ```
- Update lesson document `chunkCount` as chunks are saved
- Update lesson `status` to `"embedding"` before starting

#### `embedSingleText(text)`
- Single call to Gemini embedding API
- Returns 768-float array
- Used at query time for embedding student questions

---

### services/aiMetaService.js

#### `generateStarterQuestions(chunks, videoTitle)`
- Take first 15 chunks of the video as context
- Send to Gemini Flash with prompt:
  - "You are an AI tutor. Based on these lecture transcript excerpts from a video titled '{videoTitle}', generate exactly 5 specific, interesting questions a student might want to ask. Return as JSON array of strings. No numbering, no explanation."
- Parse JSON response
- Fallback: if parsing fails, return 5 generic questions
- Save to lesson document `starterQuestions` field

#### `generateTopicSegments(chunks)`
- Feed every 10th chunk (sampled) to Gemini Flash
- Prompt: "Identify distinct topic changes in this lecture. Return JSON array: [{topic: string, startTime: number, startLabel: string}]. Maximum 15 topics."
- Parse and validate each segment has topic, startTime, startLabel
- Save to lesson document `topicSegments` field

---

### services/ingestOrchestrator.js

This is the master function that runs the full pipeline. Called as a background job.

#### `runYoutubeIngest(lessonId, youtubeUrl)`
```
1. Update status → "transcribing"
2. fetchYoutubeTranscript(url)
3. normalizeTranscript(raw)
4. Update status → "embedding"
5. chunks = chunkTranscript(normalized)
6. embedChunks(chunks, lessonId)
7. starterQuestions = generateStarterQuestions(chunks, title)
8. topicSegments = generateTopicSegments(chunks)
9. Update lesson: status → "ready", starterQuestions, topicSegments, duration (last chunk endTime)
```

#### `runUploadIngest(lessonId, storageUrl, language)`
```
1. Update status → "transcribing"
2. Generate signed URL for storageUrl (1 hour validity)
3. transcribeUploadedVideo(signedUrl, language)
4. normalizeTranscript(assemblyAiResult)
5. Update status → "embedding"
6. chunks = chunkTranscript(normalized)
7. embedChunks(chunks, lessonId)
8. starterQuestions = generateStarterQuestions(chunks, title)
9. topicSegments = generateTopicSegments(chunks)
10. Update lesson: status → "ready", starterQuestions, topicSegments, duration
```

Both functions wrap everything in try/catch. On any error: update lesson `status → "failed"`, save `error` message to lesson doc.

---

## 2.4 Utility Functions to Build

### utils/timeFormatter.js
- `secondsToLabel(seconds)` → `"14:32"` or `"1:14:32"`
- `labelToSeconds(label)` → `872` (from `"14:32"`)
- `msToSeconds(ms)` → divide by 1000, round to 2 decimals

### utils/vectorMath.js
- `cosineSimilarity(vecA, vecB)` → float between 0 and 1
  - Dot product of A and B divided by (magnitude of A × magnitude of B)
  - Both vectors are 768-float arrays
- `findTopKChunks(queryEmbedding, allChunks, k=5)` → returns top-k chunks sorted by similarity score

---

## 2.5 In-Memory Cache

In `services/chunkCache.js`:
- A `Map` object: `lessonId → { chunks: [...], loadedAt: Date }`
- `getChunks(lessonId)`: if cached and loaded < 2 hours ago, return from cache. Else load from Firestore, cache, return.
- `invalidateCache(lessonId)`: called after new ingest completes
- Cache stores the full chunk array including embeddings
- A 10-hour video = ~1,200 chunks × 768 floats × 4 bytes = ~3.7MB per video in RAM. Fine for 50+ videos.

---

## 2.6 Pre-Ingest Script for 10 Demo Videos

Create a standalone script `scripts/preIngest.js` that:
- Defines array of 10 YouTube URLs with metadata (title, courseId, category, etc.)
- Calls `runYoutubeIngest()` for each, sequentially (not parallel — avoid rate limits)
- Logs progress for each video
- Run this ONCE before the hackathon presentation: `node scripts/preIngest.js`

---

## ✅ Phase 2 Done When:
- [ ] POST a YouTube URL → lesson created → after 3–5 minutes → status is `"ready"`
- [ ] GET status endpoint shows correct progress through all stages
- [ ] Firestore `transcriptChunks` collection has chunks with 768-float embeddings
- [ ] Lesson doc has `starterQuestions` (5 items) and `topicSegments` (3–15 items)
- [ ] Upload a `.mp4` file → AssemblyAI transcribes it → same result as YouTube flow
- [ ] Hindi/Hinglish audio correctly transcribed by AssemblyAI Universal model
- [ ] Pre-ingest script runs all 10 demo videos without error

## ⏱️ Estimated Time: 4–5 Hours
