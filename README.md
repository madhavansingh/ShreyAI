# 🎓 Shery AI — AI-Powered Learning Platform

> Transform any video lecture into a fully interactive learning experience. Upload an MP4 or paste a YouTube URL — Shery auto-generates chapters, a context-aware AI tutor, quizzes, summaries, and live subtitles. No manual tagging required.

[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Admin%2013-orange?logo=firebase)](https://firebase.google.com)
[![Nemotron](https://img.shields.io/badge/Nemotron--3--Nano-green?logo=nvidia)](https://ai.google.dev)
[![Cloud Run](https://img.shields.io/badge/Deploy-Cloud%20Run-blue?logo=google-cloud)](https://cloud.google.com/run)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com)

---

## ✨ Feature Matrix

| Feature | How It Works |
|---|---|
| 🎬 **Dual Ingestion** | YouTube URL (caption fetch) or direct MP4/WebM/MOV upload (up to 500 MB) |
| 📝 **Auto Transcription** | AssemblyAI speech-to-text with word-level timestamps; YouTube uses native captions |
| 🤖 **AI Tutor — Shery** | Nemotron-3-Nano-30B, RAG over transcript chunks, streams token-by-token via SSE |
| 📍 **YouTube-Style Chapters** | Nemotron generates N chapters (1 per ~20 s) with start timestamps; renders on video timeline |
| ⏱️ **Clickable Timestamps** | AI responses embed `(MM:SS)` markers that jump the video player when clicked |
| 🎙️ **Live Subtitles** | Word-by-word reveal synced to playback; auto-romanises Devanagari to Roman script |
| 🧠 **Quiz Generation** | Nemotron generates MCQ/short-answer quizzes from transcript; tracked per student |
| 📄 **Lecture Summary** | Full, range, or last-5-min summary modes with structured Markdown output |
| 💬 **Session Persistence** | Chat history stored in Firestore (capped at 20 messages), resumed on page reload |
| 👩‍🏫 **Instructor Dashboard** | Upload courses, monitor per-lesson processing progress with real-time polling |
| 🎓 **Student Dashboard** | Browse enrolled courses, resume lessons, view quiz scores |
| 🔐 **Firebase Auth** | Google OAuth + email/password; role-based access (Student / Instructor) |
| 📦 **Firebase Storage** | Videos stored at `gs://sherbot-tit.firebasestorage.app`, streamed via signed URL |

---

## 🏗️ Technology Stack

### Backend
| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 20 | Server runtime |
| Framework | Express 4 | HTTP routing, middleware |
| AI — Chat | Google Nemotron-3-Nano-30B (`@google/generative-ai`) | SSE-streamed RAG chat, quiz, summary |
| AI — Embeddings | None (BM25 keyword search) | Retrieval without external embedding API |
| Transcription | AssemblyAI SDK | Speech-to-text for uploaded videos |
| Database | Cloud Firestore | Lessons, chunks, sessions, users |
| Storage | Firebase Storage (GCS) | Persistent video file storage |
| Auth Verification | Firebase Admin SDK | ID token & role verification |
| Security | Helmet, express-rate-limit | Headers hardening, abuse prevention |
| Logging | Morgan | HTTP request logging |
| File Upload | Multer (memoryStorage) | In-memory buffer, streamed to GCS |
| Containerisation | Docker (node:20-slim) | Cloud Run deployment image |

### Frontend
| Layer | Technology | Purpose |
|---|---|---|
| Framework | React 18 + Vite 6 | SPA, HMR in dev |
| Routing | React Router v7 | Client-side navigation |
| Styling | Tailwind CSS 3 | Utility-first CSS |
| Animation | Framer Motion 12 | Page transitions, chat animations |
| Firebase Client | Firebase JS SDK 11 | Auth, Firestore, Storage |
| HTTP | Native `fetch` | REST + SSE API calls |
| PDF | jsPDF | Export quiz/summary as PDF |
| Icons | Lucide React | Icon library |
| Video | HTML5 `<video>` + react-player | Dual YouTube iframe / native playback |
| Deployment | Vercel | CDN, edge network, `/api/*` proxy |

### Infrastructure
| Service | Role |
|---|---|
| Google Cloud Run (asia-south1) | Backend container, auto-scales to zero |
| Firebase Storage | Video object storage with CORS |
| Cloud Firestore | NoSQL, real-time capable |
| Firebase Auth | Identity provider |
| Vercel | Frontend CDN + reverse proxy |
| Google Cloud Build | Docker image build pipeline |
| Artifact Registry | Docker image storage |

## 🧠 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VERCEL (Frontend CDN)                    │
│  React 18 SPA  ──  /api/* proxy  ──►  Cloud Run Backend     │
│  roviq.xyz / sheryai.vercel.app                           │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Firestore   │  │  Firebase    │  │  Firebase    │
    │  (NoSQL DB)  │  │    Auth      │  │  Storage     │
    │  lessons     │  │  Google OAuth│  │  (videos/)   │
    │  chunks      │  │  Email/Pass  │  │  GCS bucket  │
    │  sessions    │  └──────────────┘  └──────────────┘
    └──────────────┘
              │
    ┌─────────▼──────────┐
    │  External APIs      │
    │  ┌──────────────┐   │
    │  │  AssemblyAI  │   │  ← Upload video transcription
    │  ├──────────────┤   │
    │  │ Nemotron-3-Nano-30B │   │  ← Chat, quiz, chapters, summary
    │  ├──────────────┤   │
    │  │  YouTube     │   │  ← Caption fetch (fast path)
    │  │  Transcript  │   │
    │  └──────────────┘   │
    └─────────────────────┘
```

---

## 🔄 AI Ingestion Pipeline

The ingestion system has two parallel flows managed by `ingestOrchestrator.js`. Both run **fire-and-forget** via `setImmediate()` — the HTTP response returns immediately (201) and the frontend polls `/status` for real-time progress.

### Flow A — YouTube (Fast Path)

```
POST /api/lessons/ingest-youtube
        │
        ▼ (background, setImmediate)
┌────────────────────────────────────────────────────┐
│ runYoutubeIngest()                                  │
│                                                     │
│  1. fetchYoutubeTranscript(url)     [10% progress]  │
│     └─ youtube-transcript npm pkg                   │
│     └─ Returns [{text, start, end}]                 │
│                                                     │
│  2. chunkTranscript(transcript)     [40%]           │
│     └─ 30s windows, 5s overlap                      │
│     └─ Min 10 words per chunk                       │
│                                                     │
│  3. embedChunks(chunks, lessonId)   [60%]           │
│     └─ Batched Firestore writes (20/batch)          │
│     └─ transcriptChunks/{lessonId}_{padded_index}   │
│                                                     │
│  4. generateStarterQuestions()  ┐  [85%]            │
│     generateTopicSegments()     ┘  (parallel)       │
│     └─ Both call Nemotron-3-Nano-30B                       │
│                                                     │
│  5. Update lesson: status='ready', progress=100     │
│     invalidateCache(lessonId)                       │
└────────────────────────────────────────────────────┘
```

### Flow B — Uploaded Video (Full Pipeline)

```
POST /api/lessons/upload  (multipart/form-data, up to 500MB)
        │
        ▼ Phase A (in request handler, before setImmediate)
┌─────────────────────────────────────────────────────┐
│ Firebase Storage Upload                              │
│  bucket.file(`videos/${lessonId}.${ext}`).save()    │
│  videoUrl = firebasestorage.googleapis.com/...      │
│  → Persisted to Firestore lesson doc                │
└─────────────────────────────────────────────────────┘
        │
        ▼ Phase B (background, setImmediate)
┌─────────────────────────────────────────────────────┐
│ runUploadIngest()  — Progress: 1% → 100%            │
│                                                     │
│  Phase 1 (1→15%):  uploadBufferToAssemblyAI()       │
│    └─ Streams buffer to AssemblyAI Files API        │
│    └─ Smooth ticker: +1% every 800ms (UX)           │
│                                                     │
│  Phase 2 (15%):    submitTranscript(uploadUrl)      │
│    └─ POST to AssemblyAI with language hint         │
│                                                     │
│  Phase 3 (16→78%): pollTranscriptUntilDone()        │
│    └─ GET every 3s, +1% per poll                    │
│    └─ normalizeAssemblyResult() → [{text,start,end}]│
│                                                     │
│  Phase 4 (79→82%): chunkTranscript()                │
│  Phase 5 (83→87%): embedChunks() → Firestore       │
│  Phase 6 (88→95%): Nemotron metadata (parallel)      │
│  Phase 7 (100%):   status='ready', cache cleared   │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 RAG Chat Architecture

The chat system is a **streaming RAG pipeline** built entirely without a vector database — using BM25 keyword search instead.

```
POST /api/chat/stream  (SSE endpoint)
           │
           ▼
┌──────────────────────────────────────────────────────┐
│ streamChat()  in chatService.js                       │
│                                                       │
│  1. getChunks(lessonId)                               │
│     └─ In-memory cache (chunkCache.js)                │
│     └─ Falls back to Firestore query on cache miss    │
│                                                       │
│  2. bm25Search(message, allChunks, k=7)               │
│     └─ Stopword filtering                             │
│     └─ TF-IDF scoring with BM25 normalization:        │
│        idf = log((N - df + 0.5) / (df + 0.5) + 1)    │
│        norm = tf*(k1+1) / (tf + k1*(1-b+b*dl/avgdl)) │
│        k1=1.5, b=0.75                                 │
│     └─ Returns top-7 chunks by score                  │
│                                                       │
│  3. findTemporalChunks(allChunks, currentTime, n=2)   │
│     └─ Chunks within ±90s of video playback position  │
│     └─ Sorted by proximity to currentTime             │
│                                                       │
│  4. buildContextBlocks(semantic, temporal)            │
│     └─ Deduplicate by chunkIndex                      │
│     └─ Sort by startTime                              │
│     └─ Format: "[MM:SS - MM:SS]\n{text}"              │
│                                                       │
│  5. Build Nemotron prompt:                              │
│     systemInstruction = SYSTEM_INSTRUCTION            │
│       (injected with currentTimeLabel)                │
│     userMessage = context + "\n---\n" + question      │
│     history = last 6 messages (formatted for API)     │
│                                                       │
│  6. nemotronFlash.generateContentStream()               │
│     temperature=0.35, maxOutputTokens=1500            │
│                                                       │
│  7. Stream tokens via SSE:                            │
│     { type: 'token', content: '...' }                 │
│                                                       │
│  8. generateFollowUpQuestions(fullResponse)           │
│     { type: 'followUps', items: [...3 questions] }    │
│                                                       │
│  9. { type: 'done' }  → res.end()                    │
│                                                       │
│  10. saveSessionMessage() — fire and forget           │
└──────────────────────────────────────────────────────┘
```

### SSE Event Protocol

The frontend (`useChat.js`) consumes this SSE stream. Events are newline-delimited JSON:

```
data: {"type":"token","content":"The neural"}
data: {"type":"token","content":" network architecture"}
data: {"type":"followUps","items":["What is backprop?","..."]}
data: {"type":"done"}
```

Error events:
```
data: {"type":"error","message":"Rate limit reached. Please wait."}
```

---

## 📦 Firestore Data Model

### `lessons` collection
```js
{
  lessonId:        "uuid-v4",
  courseId:        "string",
  moduleId:        "string",
  title:           "string",
  description:     "string",
  order:           0,
  source:          "youtube" | "upload",

  // YouTube only
  youtubeUrl:      "https://...",
  youtubeVideoId:  "string",

  // Upload only
  videoUrl:        "https://firebasestorage.googleapis.com/...",
  storagePath:     "gs://sherbot-tit.firebasestorage.app/videos/...",

  // Processing state
  status:          "uploading" | "transcribing" | "processing" | "ready" | "failed",
  progress:        0-100,        // integer, used by frontend progress bar
  chunkCount:      42,
  duration:        3600,         // seconds (float)

  // AI-generated metadata
  starterQuestions: ["string x5"],
  topicSegments: [
    { topic: "Intro to Transformers", startTime: 0, startLabel: "0:00" }
  ],

  createdBy:       "firebase-uid",
  createdAt:       "ISO-8601",
  updatedAt:       "ISO-8601",
  error:           null | "string"
}
```

### `transcriptChunks` collection
```js
// Doc ID: {lessonId}_{00042}  (zero-padded for natural sort)
{
  lessonId:    "uuid",
  chunkIndex:  42,
  text:        "...full text of this 30-second window...",
  startTime:   1260.5,    // seconds
  endTime:     1290.2,
  startLabel:  "21:00",
  endLabel:    "21:30",
  createdAt:   "ISO-8601"
}
```

### `chatSessions` collection
```js
// Doc ID: {studentId}_{lessonId}_{sessionId}
{
  sessionId:  "string",
  lessonId:   "string",
  studentId:  "firebase-uid",
  messages: [                          // capped at 20 messages (last 20 kept)
    { role: "user",      content: "...", timestamp: "ISO" },
    { role: "assistant", content: "...", followUps: [...], timestamp: "ISO" }
  ],
  createdAt: "ISO-8601",
  updatedAt: "ISO-8601"
}
```

---

## 🔒 Authentication & Security

### Auth Flow (Production)
```
Browser  →  Firebase Auth  →  Google OAuth  →  ID Token (JWT)
Browser  →  POST /api/*  →  Authorization: Bearer <idToken>
Backend  →  admin.auth().verifyIdToken(token)  →  { uid, email, role }
```

### Role System
Roles are stored in Firestore `users/{uid}` or as custom claims:

| Role | Capabilities |
|---|---|
| `student` | View lessons, chat, take quiz, view progress |
| `instructor` | All student rights + upload videos, manage courses |

### Rate Limiting
```js
// Global: all routes
windowMs: 15 min,  max: 200 requests

// Chat route (/api/chat/*): stricter
windowMs: 1 min,   max: 30 requests
```

### CORS Policy
```js
// Allowed origins (backend/src/index.js):
allowedOrigins = [
  process.env.FRONTEND_URL,   // set in Cloud Run env
  'http://localhost:5173',
  'http://localhost:5174',
  'https://roviq.xyz',
  'https://www.roviq.xyz',
]
// Dynamic allowance:
/\.vercel\.app$/.test(origin)  // all Vercel preview deployments
```

### Firebase Storage CORS
```json
[{
  "origin": ["*"],
  "method": ["GET", "HEAD", "OPTIONS"],
  "responseHeader": ["Content-Type","Content-Range","Accept-Ranges","Content-Length"],
  "maxAgeSeconds": 3600
}]
```

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 18 | 20 recommended (matches Docker image) |
| npm | ≥ 9 | Comes with Node.js 20 |
| Firebase Project | Any | Firestore + Auth + Storage enabled |
| AssemblyAI | Free tier | [assemblyai.com](https://www.assemblyai.com) |
| Google AI Studio | Free tier | [aistudio.google.com](https://aistudio.google.com) — get Nemotron API key |
| gcloud CLI | Latest | Only needed for deployment |

---

### 1. Clone & Install

```bash
git clone https://github.com/KANISHQ09/sheryai.git
cd sheryai

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

---

### 2. Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → create project
2. Enable **Firestore**, **Authentication** (Google + Email/Password), **Storage**
3. Go to **Project Settings → Service Accounts → Generate New Private Key**
4. Download the JSON — you'll paste it as `FIREBASE_SERVICE_ACCOUNT` below
5. Create the Firestore indexes (see [Firestore Indexes](#firestore-indexes))

Apply CORS to your Storage bucket (run once in Cloud Shell):
```bash
echo '[{"origin":["*"],"method":["GET","HEAD","OPTIONS"],"responseHeader":["Content-Type","Content-Range","Accept-Ranges","Content-Length"],"maxAgeSeconds":3600}]' > cors.json
gcloud storage buckets update gs://YOUR-PROJECT.firebasestorage.app --cors-file=cors.json
```

---

### 3. Configure Environment Variables

**`backend/.env`**
```env
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Firebase Admin (paste entire service-account JSON as single line)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}

# Google Nemotron (from AI Studio)
# Note: stored in backend/src/config/nemotron.js — add GEMINI_API_KEY or NVIDIA_API_KEY
NVIDIA_API_KEY=nvapi-...        # if using NVIDIA-hosted Nemotron
# OR
GEMINI_API_KEY=AIza...          # standard Google AI Studio key

# AssemblyAI
ASSEMBLYAI_API_KEY=your_key

# Cloudinary (optional — for image assets)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

**`frontend/.env`**
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# In dev: leave blank (Vite proxy handles it)
# In production: set to your Cloud Run URL
VITE_BACKEND_URL=
VITE_BACKEND_DIRECT_URL=https://your-service-url.run.app
```

---

### 4. Run Locally

```bash
# Terminal 1 — Backend (port 5001)
cd backend
npm run dev
# Nodemon auto-restarts on file changes
# Kills any existing process on port 5001 first (predev script)

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
# Vite HMR dev server
# /api/* proxied to localhost:5001 (see vite.config.js)
```

Visit: **http://localhost:5173**

---

### 5. Firestore Indexes

Some queries require composite indexes. Add these in Firebase Console → Firestore → Indexes, or via `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "lessons",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "courseId", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "chatSessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "lessonId",  "order": "ASCENDING" },
        { "fieldPath": "studentId", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "transcriptChunks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "lessonId",   "order": "ASCENDING" },
        { "fieldPath": "chunkIndex", "order": "ASCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

---

## 📡 API Reference

### Base URL
- **Development**: `http://localhost:5001`
- **Production**: `https://sheryai-backend-{hash}.asia-south1.run.app`

All endpoints except `/api/health` require authentication:
```
Authorization: Bearer <Firebase ID Token>
# OR (development only):
x-demo-role: student | instructor
```

---

### Lessons

#### `POST /api/lessons/ingest-youtube`
Ingest a YouTube video. Returns immediately; processing runs in background.

**Role required**: `instructor`

```json
// Request body
{
  "courseId": "course-uuid",
  "moduleId": "default",
  "title": "Intro to Neural Networks",
  "description": "Optional description",
  "youtubeUrl": "https://youtube.com/watch?v=XYZ",
  "order": 0
}

// Response 201
{
  "success": true,
  "lessonId": "uuid",
  "status": "processing",
  "message": "Lesson created. Processing has started in the background."
}
```

---

#### `POST /api/lessons/upload`
Upload a video file (multipart/form-data). Max 500 MB.

**Role required**: `instructor`  
**Note**: Frontend sends this directly to Cloud Run (`VITE_BACKEND_DIRECT_URL`) to bypass Vercel's 4.5 MB proxy limit.

```bash
curl -X POST https://your-backend.run.app/api/lessons/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@lecture.mp4" \
  -F "courseId=course-uuid" \
  -F "title=My Lecture" \
  -F "language=auto"   # or "en", "hi", etc.
```

```json
// Response 201
{
  "success": true,
  "lessonId": "uuid",
  "status": "uploading"
}
```

---

#### `GET /api/lessons/:lessonId/status`
Poll processing progress. Call every 2 seconds until `status === "ready"`.

```json
// Response
{
  "success": true,
  "lessonId": "uuid",
  "status": "transcribing",
  "progress": 47,
  "chunkCount": 0,
  "error": null
}
```

Possible statuses: `uploading → transcribing → processing → ready | failed`

---

#### `GET /api/lessons/:lessonId`
Get full lesson metadata (no transcript chunks).

```json
{
  "success": true,
  "lesson": {
    "lessonId": "uuid",
    "title": "...",
    "status": "ready",
    "videoUrl": "https://firebasestorage.googleapis.com/...",
    "topicSegments": [{ "topic": "Intro", "startTime": 0, "startLabel": "0:00" }],
    "starterQuestions": ["What is...?"],
    "duration": 3600
  }
}
```

---

#### `GET /api/lessons/:lessonId/video`
Stream video. In production redirects (302) to Firebase Storage URL. In dev, streams from local disk with byte-range support for seeking.

---

#### `GET /api/lessons/:lessonId/transcript`
Get ordered transcript chunks for subtitle engine.

```json
{
  "success": true,
  "chunks": [
    { "chunkIndex": 0, "text": "...", "startTime": 0, "endTime": 30.5,
      "startLabel": "0:00", "endLabel": "0:30" }
  ],
  "total": 87
}
```

---

#### `POST /api/lessons/:lessonId/regenerate-chapters`
Re-run Nemotron chapter generation on existing chunks without re-uploading.

**Role required**: `instructor`

---

#### `GET /api/lessons?courseId=UUID`
List all lessons for a course, ordered by `order` field.

---

### Chat

#### `POST /api/chat/stream` — SSE Streaming
The main RAG chat endpoint. Response is `text/event-stream`.

```json
// Request
{
  "lessonId": "uuid",
  "sessionId": "client-generated-uuid",
  "message": "Explain attention mechanism",
  "currentTime": 1842.5   // current video playback position in seconds
}
```

SSE events (each line: `data: {JSON}\n\n`):
```
data: {"type":"token","content":"The attention"}
data: {"type":"token","content":" mechanism works by..."}
data: {"type":"followUps","items":["What is self-attention?","..."]}
data: {"type":"done"}
# On error:
data: {"type":"error","message":"..."}
```

---

#### `POST /api/chat/summary`
Generate a structured lecture summary.

```json
// Request
{
  "lessonId": "uuid",
  "type": "full",       // "full" | "last5min" | "range"
  "startTime": 600,     // only for "range" type
  "endTime": 1200
}
```

---

#### `POST /api/chat/quiz`
Generate quiz questions from transcript.

```json
// Request
{ "lessonId": "uuid", "count": 10, "type": "mcq", "difficulty": "mixed" }

// Response
{
  "success": true,
  "questions": [{
    "question": "What does the attention score represent?",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct": "B",
    "explanation": "..."
  }]
}
```

---

#### `GET /api/chat/session/:lessonId`
Retrieve latest chat session for the authenticated user + lesson pair.

#### `DELETE /api/chat/session/:sessionId`
Clear a chat session (user can only delete their own).

---

### Health

#### `GET /api/health`
```json
{ "status": "ok", "timestamp": "ISO-8601", "uptime": 3600 }
```
Not rate-limited. Used by Cloud Run health checks.

## 🎙️ Subtitle Engine Deep Dive

The subtitle engine (`useSubtitles.js`) is a custom React hook with ~430 lines. It implements word-by-word progressive reveal synced to `requestAnimationFrame` — identical to YouTube/Netflix captions.

### Architecture

```
Firestore transcriptChunks
        │
        ▼ (fetched once per lesson via /transcript)
  [ chunk₀, chunk₁, ..., chunkN ]  ← all chunks in memory
        │
        ▼ requestAnimationFrame loop (rAF)
  Find active chunk by video.currentTime
        │
        ├─ Same chunk? → reveal more words based on time position
        └─ New chunk?  → clear display, start fresh
              │
              ▼
        Devanagari detector (Unicode range U+0900–U+097F)
              │
        ┌─────┴───────┐
        │  LOANWORD   │   Known words (मशीन → "machine")
        │    MAP      │
        └─────┬───────┘
              │ fallback
        Character-level transliteration engine
              (consonant cluster mapping, vowel matra handling)
              │
              ▼
        Roman script output — raw Hindi script never shown
```

### Language Modes

| Mode | Behaviour |
|---|---|
| `hinglish` | Default. English pass-through; Devanagari auto-romanised |
| `hindi` | Alias for hinglish — same output |
| `english` | Pass-through, but Devanagari still romanised as safety fallback |

The LOANWORD_MAP covers ~80 common tech/ML terms (मशीन, डेटा, नेटवर्क, etc.) that a naive character-level transliterator would mangle.

---

## 🗂️ Frontend Architecture

### Route Structure (`App.jsx`)

```
/                     → LandingPage        (public)
/login                → LoginPage          (public)
/dashboard            → DashboardPage      (protected: student)
/courses/:courseId    → CoursePage         (protected: student)
/lesson/:lessonId     → LessonPage         (protected: student)
/quiz/:lessonId       → QuizPage           (protected: student)
/instructor           → InstructorPage     (protected: instructor)
/instructor/courses   → CourseManagerPage  (protected: instructor)
/instructor/create    → CreateCoursePage   (protected: instructor)
*                     → NotFoundPage
```

### `LessonPage.jsx` — The Core View

The largest file in the codebase (~1,000 lines). Three-column layout:

```
┌────────────────┬──────────────────────┬────────────────┐
│   Chapters     │     Video Player     │   AI Tutor     │
│   Sidebar      │                      │   Chat Panel   │
│                │  ┌──────────────┐    │                │
│  Topic list    │  │ <video> or   │    │  Messages      │
│  with          │  │ YouTube      │    │  SSE stream    │
│  timestamps    │  │ iframe       │    │                │
│                │  └──────────────┘    │  Follow-up     │
│  Regenerate    │  Subtitle overlay    │  suggestions   │
│  button        │  Chapter bar         │                │
│                │  Progress: 47%       │  Summary btn   │
└────────────────┴──────────────────────┴────────────────┘
```

Key decisions:
- **Dual player**: YouTube lessons use `<iframe>` (YouTube API); uploaded lessons use native `<video>` for byte-range streaming
- **Chapter bar**: `VideoChapterBar.jsx` renders clickable chapter markers at proportional positions on a timeline bar
- **Chapter auto-regeneration**: If `lesson.topicSegments.length <= 1` on load, automatically calls `/regenerate-chapters`
- **Subtitle position**: Absolutely positioned overlay at bottom of video, hidden when chat panel is open

### Custom Hooks

| Hook | Description |
|---|---|
| `useChat.js` | Manages SSE stream, message history, follow-up state. Sends `currentTime` with every message. |
| `useLessonStatus.js` | Polls `/api/lessons/:id/status` every 2s; stops when `status === 'ready'` or `'failed'` |
| `useSubtitles.js` | rAF-based subtitle engine; fetches transcript, syncs word reveal to playback |

### Auth Context (`AuthContext.jsx`)

```jsx
// Wraps entire app. Provides:
const { user, role, loading, signOut } = useAuth();

// role is read from Firestore users/{uid}.role on login
// Defaults to 'student' if not set
```

### API Client (`services/api.js`)

Two base URLs:
```js
BASE_URL    = VITE_BACKEND_URL    || ''   // proxied through Vercel
DIRECT_URL  = VITE_BACKEND_DIRECT_URL     // direct Cloud Run (bypasses Vercel 4.5MB limit)
```

File uploads always use `DIRECT_URL` to support large files. All other calls use `BASE_URL` (proxied) so they share the same origin and avoid CORS preflight.

---

## 🚢 Production Deployment

### Backend — Google Cloud Run

**Build & Deploy (one command):**

```bash
cd backend

# Generate env vars file for Cloud Run (excludes PORT — it's reserved)
python3 - <<'EOF'
import json, os
env = {}
with open('.env') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, _, v = line.partition('=')
        env[k.strip()] = v.strip()

include = ['FIREBASE_PROJECT_ID','FIREBASE_STORAGE_BUCKET','FIREBASE_SERVICE_ACCOUNT',
           'NVIDIA_API_KEY','ASSEMBLYAI_API_KEY','CLOUDINARY_CLOUD_NAME',
           'CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET']
env['NODE_ENV'] = 'production'
env['FRONTEND_URL'] = 'https://your-app.vercel.app'

with open('/tmp/cloudrun_env.yaml', 'w') as f:
    for k in include + ['NODE_ENV','FRONTEND_URL']:
        if k in env:
            f.write(f'{k}: |\n  {env[k]}\n')
print("✅ /tmp/cloudrun_env.yaml written")
EOF

# Deploy (prompts to create Artifact Registry on first run)
gcloud run deploy sheryai-backend \
  --source . \
  --region asia-south1 \
  --project YOUR_GCP_PROJECT_ID \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --quiet \
  --env-vars-file /tmp/cloudrun_env.yaml
```

**After deploy**, note the service URL:
```
Service URL: https://sheryai-backend-HASH.asia-south1.run.app
```

**Required GCP APIs** (enabled automatically on first use, or enable manually):
```bash
gcloud services enable run.googleapis.com --project YOUR_PROJECT
gcloud services enable cloudbuild.googleapis.com --project YOUR_PROJECT
gcloud services enable artifactregistry.googleapis.com --project YOUR_PROJECT
```

---

### Frontend — Vercel

**Deploy via CLI:**

```bash
cd frontend

# Set production env vars in Vercel dashboard or via CLI:
vercel env add VITE_FIREBASE_API_KEY production
vercel env add VITE_BACKEND_URL production         # leave blank to use proxy
vercel env add VITE_BACKEND_DIRECT_URL production  # set to Cloud Run URL

# Deploy
vercel --prod
```

**Or connect GitHub repo** → Vercel auto-deploys on push to `main`.

**`vercel.json`** (already in repo):
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://CLOUD_RUN_URL/api/:path*" }
  ]
}
```
This proxy means the frontend can call `/api/*` without CORS issues in production.

> ⚠️ **Important**: Vercel's proxy has a 4.5 MB body limit. The video upload endpoint bypasses this by using `VITE_BACKEND_DIRECT_URL` directly in the upload API call.

---

### Dockerfile

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev          # production deps only
COPY src/ ./src/
RUN mkdir -p uploads/videos uploads/audio
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser                   # non-root for security
ENV NODE_ENV=production
ENV PORT=8080                  # Cloud Run expects 8080
EXPOSE 8080
CMD ["node", "src/index.js"]
```

---

### Environment Variables — Production Checklist

| Variable | Set In | Value |
|---|---|---|
| `NODE_ENV` | Cloud Run | `production` |
| `FRONTEND_URL` | Cloud Run | Your Vercel URL |
| `FIREBASE_PROJECT_ID` | Cloud Run | `sherbot-tit` |
| `FIREBASE_STORAGE_BUCKET` | Cloud Run | `sherbot-tit.firebasestorage.app` |
| `FIREBASE_SERVICE_ACCOUNT` | Cloud Run | Full JSON (single line) |
| `NVIDIA_API_KEY` | Cloud Run | Nemotron API key |
| `ASSEMBLYAI_API_KEY` | Cloud Run | AssemblyAI key |
| `VITE_FIREBASE_*` | Vercel | All 6 Firebase config values |
| `VITE_BACKEND_DIRECT_URL` | Vercel | Cloud Run service URL |
| `VITE_BACKEND_URL` | Vercel | Empty (uses Vercel proxy) |

---

## 🛠️ Development Scripts

```bash
# ── Backend ──────────────────────────────────────
cd backend

npm run dev        # nodemon auto-restart; kills port 5001 first
npm start          # production start (no nodemon)
npm test           # placeholder (no tests yet)

# Pre-ingest a video from CLI (offline processing)
node scripts/preIngest.js <lessonId>

# ── Frontend ─────────────────────────────────────
cd frontend

npm run dev        # Vite HMR server on :5173
npm run build      # Production bundle → dist/
npm run preview    # Preview production build locally
npm run lint       # ESLint (0 warnings policy)
```

---

## 🐛 Troubleshooting

### Video not playing in production
1. Check `lesson.videoUrl` in Firestore — must be `https://firebasestorage.googleapis.com/...`
2. Verify Firebase Storage CORS is applied: `gcloud storage buckets describe gs://YOUR_BUCKET --format="json(cors)"`
3. Ensure Firebase Storage Security Rules allow public read: `allow read: if true;`
4. Old lessons saved with `local:` paths won't play — re-upload them

### Backend crash on startup
- Most common cause: `FIREBASE_SERVICE_ACCOUNT` env var is empty or malformed JSON
- Check Cloud Run logs: `gcloud logging read "resource.type=cloud_run_revision" --project YOUR_PROJECT --limit 20`
- The backend calls `process.exit(1)` if Firebase fails to init

### Chat returns "video still processing"
- The lesson `status` in Firestore is not `ready`
- Check `/api/lessons/:id/status` — look at `error` field for failure reason
- Common issue: AssemblyAI quota exceeded or invalid API key

### Port 5001 already in use (macOS)
```bash
# The predev script handles this automatically, but if needed:
lsof -ti:5001 | xargs kill -9
# Or switch to port 5002 in backend/.env: PORT=5002
```

### Subtitle showing Devanagari characters
- Should not happen — the subtitle engine always romanises Devanagari
- If it does: add the problematic word to `LOANWORD_MAP` in `useSubtitles.js`

### Large file upload fails through Vercel
- Expected — Vercel has a 4.5 MB request body limit
- Frontend must set `VITE_BACKEND_DIRECT_URL` to point directly to Cloud Run
- Verify `api.js` uses `DIRECT_URL` for `uploadLesson()`

---

## 📁 Repository Structure

```
sheryai/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── firebase.js          # Admin SDK init (lazy bucket getter)
│   │   │   └── nemotron.js            # Nemotron-3-Nano-30B client init
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js    # Firebase token verify + role check
│   │   │   └── errorHandler.js     # Global Express error handler
│   │   ├── routes/
│   │   │   ├── health.js            # GET /api/health
│   │   │   ├── lessons.js           # Full lesson CRUD + video stream
│   │   │   └── chat.js              # SSE chat, summary, quiz, sessions
│   │   ├── services/
│   │   │   ├── ingestOrchestrator.js  # Master pipeline (YouTube + Upload)
│   │   │   ├── transcriptService.js   # AssemblyAI + YouTube caption fetch
│   │   │   ├── chunkingService.js     # Transcript → 30s overlapping chunks
│   │   │   ├── embeddingService.js    # Chunk storage (Firestore, no vectors)
│   │   │   ├── chatService.js         # BM25 search + Nemotron RAG + streaming
│   │   │   ├── aiMetaService.js       # Chapter + starter question generation
│   │   │   └── chunkCache.js          # In-memory LRU-style chunk cache
│   │   ├── utils/
│   │   │   └── timeFormatter.js       # secondsToLabel() utility
│   │   └── index.js                   # Express app entry point
│   ├── scripts/
│   │   └── preIngest.js              # CLI: offline video pre-processing
│   ├── uploads/
│   │   ├── videos/.gitkeep           # Local fallback (dev only)
│   │   └── audio/.gitkeep
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatMessage.jsx       # Markdown chat bubble renderer
│   │   │   ├── ChatPanel.jsx         # Full chat UI with SSE consumer
│   │   │   ├── DemoSection.jsx       # Landing page demo section
│   │   │   ├── HeroDemo.jsx          # Animated hero for landing page
│   │   │   ├── LessonStatusBadge.jsx # Processing progress indicator
│   │   │   ├── Navbar.jsx            # Top navigation bar
│   │   │   ├── PricingSection.jsx    # Landing page pricing
│   │   │   ├── ProtectedRoute.jsx    # Auth guard HOC
│   │   │   ├── SubtitleOverlay.jsx   # Video subtitle renderer
│   │   │   ├── TimestampChip.jsx     # Clickable (MM:SS) timestamp chip
│   │   │   └── VideoChapterBar.jsx   # YouTube-style chapter timeline bar
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Firebase auth state provider
│   │   ├── hooks/
│   │   │   ├── useChat.js            # SSE chat state manager
│   │   │   ├── useLessonStatus.js    # Real-time processing poller
│   │   │   └── useSubtitles.js       # rAF subtitle engine
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx       # Public marketing page
│   │   │   ├── LoginPage.jsx         # Firebase auth UI
│   │   │   ├── DashboardPage.jsx     # Student home
│   │   │   ├── CoursePage.jsx        # Course lesson list
│   │   │   ├── LessonPage.jsx        # 3-column lesson viewer (main app)
│   │   │   ├── QuizPage.jsx          # Quiz taking + scoring
│   │   │   ├── InstructorPage.jsx    # Instructor dashboard + upload
│   │   │   ├── CourseManagerPage.jsx # Course management
│   │   │   ├── CreateCoursePage.jsx  # New course form
│   │   │   └── NotFoundPage.jsx      # 404
│   │   ├── services/
│   │   │   └── api.js                # Typed API client (fetch wrapper)
│   │   ├── config/
│   │   │   └── firebase.js           # Firebase client SDK init
│   │   ├── App.jsx                   # Router + protected routes
│   │   └── main.jsx                  # React DOM entry point
│   ├── vercel.json                    # Vercel proxy + rewrite config
│   ├── vite.config.js                 # Dev proxy + build config
│   └── package.json
│
├── docs/                              # Design docs + screenshots
├── firestore.rules                    # Firestore security rules
├── firestore.indexes.json             # Composite index definitions
├── firebase.json                      # Firebase project config
└── README.md
```

---

## 🤝 Contributing

### Branch Strategy
```
main        → production (auto-deploys to Vercel + Cloud Run)
develop     → integration branch
feat/*      → feature branches
fix/*       → bug fixes
```

### Workflow
```bash
git checkout -b feat/your-feature
# make changes
git commit -m "feat(chat): add timestamp click to jump video"
git push origin feat/your-feature
# open PR → develop
```

### Commit Convention (Conventional Commits)
```
feat(scope):   new feature
fix(scope):    bug fix
refactor:      code change, no feature/fix
perf:          performance improvement
docs:          documentation only
test:          adding/fixing tests
chore:         build, deps, tooling
```

### Adding a New AI Feature
1. Add service logic in `backend/src/services/`
2. Add route in `backend/src/routes/` (or extend existing)
3. Add typed API function in `frontend/src/services/api.js`
4. Add/extend custom hook if state management needed
5. Wire up in relevant page component

---

## 📊 Key Performance Characteristics

| Operation | Typical Duration |
|---|---|
| YouTube ingestion (30 min video) | ~15–25 seconds |
| Video upload (100 MB file) | ~30–60 seconds upload + transcription |
| AssemblyAI transcription | ~30–120 seconds (depends on duration) |
| Chat response first token | ~500–800 ms |
| Chapter generation | ~3–5 seconds (Nemotron-3-Nano-30B) |
| Transcript chunk load (cached) | <5 ms |
| Transcript chunk load (cold) | ~200–400 ms (Firestore query) |

---

## 📜 License

MIT — see [LICENSE](LICENSE) for details.

---

## 🙌 Acknowledgements

- [AssemblyAI](https://www.assemblyai.com) — world-class speech recognition
- [Google Nemotron](https://ai.google.dev) — powering Shery's intelligence
- [Firebase](https://firebase.google.com) — auth, database, storage infrastructure
- [Vercel](https://vercel.com) — zero-config frontend deployment
- [Google Cloud Run](https://cloud.google.com/run) — serverless container hosting
