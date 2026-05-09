# 🚀 AI Learning Companion — Full Implementation Plan
### 15-Hour Hackathon Build | Team: 3–4 People
### Stack: React + Node.js + Firebase + Gemini API

---

## 📋 Official Problem Statement

> **AI-Powered Learning Companion for LMS**

**Problem Statement:**
Learners often struggle to revise long video lectures, locate concepts, and resolve doubts in real time.

**What Needs to be Built:**
Develop an AI-powered assistant integrated into an LMS video player using RAG-based contextual understanding.

**Required Core Features:**

| Feature | Description |
|---|---|
| **Contextual Q&A** | Ask questions directly from lecture transcripts |
| **Smart Summaries** | Generate topic-wise and last 5-minute summaries |
| **Jump-to-Moment** | Clickable timestamps to navigate video sections |
| **Streaming Responses** | Real-time AI-generated responses |
| **Session Memory** | Retains conversation context within sessions |

> All 5 core features are fully implemented in this plan. Additional LMS features (course structure, video upload, student/instructor roles, progress tracking) are built on top.

---

## 🎯 The Big Idea

**Problem:** Students passively watch long lecture videos on online course platforms. They can't locate specific concepts, can't revise efficiently, and get no real-time support. This is true for any LMS — whether hosting YouTube videos or instructor-uploaded recordings.

**What This Is:** A fully working AI-powered LMS platform where instructors create courses, upload their own video lectures (or link YouTube videos), and every video automatically gets an embedded AI chatbot. Students enroll in courses, watch lectures, and have a personal AI tutor available for every single video — regardless of length, subject, or source.

**Video Source Support:**
- **YouTube URL** → transcript fetched automatically via `youtube-transcript` npm
- **Direct Upload** → `.mp4`/`.webm` uploaded to Firebase Storage → transcribed via AssemblyAI → same AI pipeline

**Presentation Strategy:**
> Show a live LMS with real courses, real uploaded/linked videos, real enrolled students. The 10 pre-loaded videos demonstrate breadth. Judges can upload a new video or paste a new YouTube URL — the system processes it live and the chatbot is immediately functional. Every response is a real Gemini API call. Nothing is hardcoded.

---

## 🏗️ System Architecture (High Level)

```
┌──────────────────────────────────────────────────────────────┐
│                     LMS FRONTEND (React)                      │
│                                                              │
│  STUDENT SIDE                   INSTRUCTOR SIDE              │
│  Browse Courses → Enroll         Create Course → Add Modules │
│  My Courses → Watch Lecture      Upload Video / Paste YT URL │
│  Video Page → AI Chat Panel      View student questions      │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTP + SSE
┌───────────────────────▼──────────────────────────────────────┐
│                      NODE.JS BACKEND                          │
│                                                              │
│  Auth → Courses → Lessons → Ingest → Chat → Summary → Quiz   │
└──────┬───────────────┬──────────────────┬────────────────────┘
       │               │                  │
┌──────▼──────┐  ┌─────▼──────┐  ┌───────▼──────────────────┐
│  Gemini API │  │  Firebase  │  │  Transcript Layer         │
│  Flash 2.5  │  │ Firestore  │  │  youtube-transcript (YT)  │
│  Embeddings │  │ Storage    │  │  AssemblyAI (uploads)     │
└─────────────┘  └────────────┘  └──────────────────────────┘
```

---

## 🛠️ Final Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Tailwind CSS + Framer Motion | Fast, beautiful, animated UI |
| Backend | Node.js + Express | Lightweight, SSE-friendly |
| AI Chat + Summaries | Gemini 2.5 Flash | Fast, cost-effective, long context |
| Semantic Embeddings | Gemini text-embedding-004 | 768-dim, accurate retrieval |
| Vector Search | In-memory cosine similarity | Zero infra, handles 10hr+ videos |
| Transcript — YouTube | youtube-transcript npm | Auto-fetches YT captions with ms timestamps |
| Transcript — Uploads | AssemblyAI API | Transcribes `.mp4`/`.webm` with word-level timestamps |
| Video Upload | Firebase Storage + Multer | Stream upload, generate signed URLs |
| Database | Firebase Firestore | Real-time, no-SQL, zero setup |
| Auth | Firebase Auth (Google OAuth) | Instructor and student roles via custom claims |
| Streaming | Server-Sent Events (SSE) | Real-time token streaming from Gemini |
| Deployment | Vercel (frontend) + Render (backend) | Free tier, instant deploy |

---

## 🎬 The 10 Pre-Loaded Videos

All 10 videos are real YouTube videos with captions available. The ingest pipeline runs on them before the presentation so the chatbot is immediately responsive. All must have auto-captions enabled on YouTube.

| # | Category | Target Duration | Purpose |
|---|---|---|---|
| 1 | Machine Learning (full course) | 8–10 hours | Proves the system handles extreme video length |
| 2 | Python Programming | 4–6 hours | Dense technical content, great Q&A showcase |
| 3 | Data Structures & Algorithms | 2–3 hours | Concept-heavy, ideal for timestamp precision |
| 4 | System Design | 1–2 hours | Architecture concepts, strong follow-up chains |
| 5 | Web Development (React) | 3–4 hours | Familiar topic for most developer judges |
| 6 | Mathematics / Calculus | 1–2 hours | Non-CS domain, shows breadth of the system |
| 7 | English / Communication | 30–60 min | Non-technical audience use case |
| 8 | History / General Knowledge | 30–60 min | Broad subject, tests general Q&A quality |
| 9 | Science (Physics/Chemistry) | 1–2 hours | Academic/school use case |
| 10 | Entrepreneurship / Business | 45–90 min | Relevant for judge background |

**Selection Criteria:** Every video must have captions (not auto-generated where accuracy is poor). Test each video with `youtube-transcript` before finalizing the list. Run the full ingest pipeline the night before the presentation so Firestore has all chunks and embeddings ready.

**Live Addition by Judges:** If a judge pastes a new YouTube URL, the system ingests it live. A 1-hour video takes approximately 3–5 minutes to process (transcript fetch + batch embed). A progress bar in the UI reflects real ingest status. Once complete, the chatbot is fully functional on that video immediately.

---

## ✨ Full Feature Set

### LMS Platform Features

| # | Feature | What It Does |
|---|---|---|
| 1 | **Course Creation** | Instructor creates a course with title, description, thumbnail, category, price |
| 2 | **Module / Section Structure** | Each course has ordered modules, each module has ordered video lessons |
| 3 | **Video Upload** | Instructor uploads `.mp4`/`.webm` directly → stored in Firebase Storage → transcribed by AssemblyAI |
| 4 | **YouTube Video Link** | Instructor pastes a YouTube URL → transcript auto-fetched → same AI pipeline as uploads |
| 5 | **Student Enrollment** | Students browse catalog, enroll in courses, get access to all lessons |
| 6 | **Progress Tracking** | Firestore tracks which lessons a student has watched and their watch percentage |
| 7 | **Instructor Dashboard** | View all courses, lesson count, enrolled students, most-asked questions per video |
| 8 | **Student Dashboard** | View enrolled courses, continue where left off, see lesson completion status |

### AI Chatbot Features (Core — Must Ship)

| # | Feature | What It Does |
|---|---|---|
| 9 | **Contextual Q&A** | Ask anything → AI answers from the actual lecture transcript with timestamp citations |
| 10 | **Clickable Timestamps** | Every AI answer has `(MM:SS - MM:SS)` chips → clicking seeks video to that exact moment |
| 11 | **SSE Streaming** | Gemini response streams token-by-token — live typing effect |
| 12 | **Session Memory** | Full conversation history passed to Gemini — follow-up questions work naturally |
| 13 | **Starter Questions** | 5 video-specific questions auto-generated and shown when student opens any lesson |
| 14 | **Follow-up Chips** | After every answer, 3 contextual next questions appear as clickable chips |
| 15 | **Smart Summaries** | Full lecture summary, last-5-min revision, or any custom time range |
| 16 | **Topic Timeline Sidebar** | Auto-detected topic segments shown as a sidebar — click any topic to jump to it |
| 17 | **Video Processing Status** | Real-time progress bar: Uploading → Transcribing → Embedding → Ready |

### Bonus Features (Build If Time Allows)

| # | Feature | What It Does |
|---|---|---|
| 18 | **Quiz Generator** | "Give me 5 MCQs from this lecture" → Gemini generates quiz from real transcript |
| 19 | **Notes Export** | "Generate my notes" → downloadable bullet-point summary as text |
| 20 | **Multi-language Q&A** | Ask in Hindi/Hinglish → AI responds in same language |
| 21 | **Cross-Lesson Search** | "Where is gradient descent explained in this course?" → searches all videos |

---

## 🗄️ Data Architecture (Firestore)

### Collection: `users`
Stores all users — instructors and students.

| Field | Type | Description |
|---|---|---|
| `uid` | string | Firebase Auth UID |
| `name` | string | Display name |
| `email` | string | Email address |
| `role` | string | `student` or `instructor` |
| `enrolledCourseIds` | string[] | (students) Courses they've joined |
| `createdCourseIds` | string[] | (instructors) Courses they own |
| `createdAt` | timestamp | Account creation time |

---

### Collection: `courses`
One document per course.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique course ID |
| `title` | string | Course title |
| `description` | string | Short description |
| `thumbnailUrl` | string | Cover image URL |
| `category` | string | e.g., "Machine Learning", "Python" |
| `instructorId` | string | UID of course creator |
| `instructorName` | string | Instructor display name |
| `enrolledCount` | number | Total enrolled students |
| `modules` | object[] | Ordered array of `{id, title, lessonIds[]}` |
| `createdAt` | timestamp | Creation time |

---

### Collection: `lessons`
One document per video lesson inside a course.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique lesson ID |
| `courseId` | string | Parent course ID |
| `moduleId` | string | Parent module ID |
| `title` | string | Lesson title |
| `description` | string | Brief lesson description |
| `sourceType` | string | `youtube` or `upload` |
| `youtubeUrl` | string | (if YouTube) Full URL |
| `videoStorageUrl` | string | (if upload) Firebase Storage signed URL |
| `thumbnailUrl` | string | Lesson thumbnail |
| `duration` | number | Total duration in seconds |
| `status` | string | `pending` → `transcribing` → `embedding` → `ready` |
| `chunkCount` | number | Total transcript chunks |
| `starterQuestions` | string[] | 5 AI-generated starter questions |
| `topicSegments` | object[] | `[{topic, startTime, startLabel}]` |
| `order` | number | Sort order within module |
| `createdAt` | timestamp | Upload/link time |

---

### Collection: `transcriptChunks`
One document per 30-second segment of every lesson video.

| Field | Type | Description |
|---|---|---|
| `lessonId` | string | Reference to parent lesson |
| `chunkIndex` | number | Sequential index (0, 1, 2...) |
| `text` | string | Raw transcript text for this chunk |
| `startTime` | number | Start time in seconds |
| `endTime` | number | End time in seconds |
| `startLabel` | string | Human-readable `MM:SS` or `H:MM:SS` |
| `endLabel` | string | Human-readable end time |
| `embedding` | number[] | 768-dimensional Gemini embedding vector |

---

### Collection: `enrollments`
One document per student–course pair.

| Field | Type | Description |
|---|---|---|
| `id` | string | `{studentId}_{courseId}` |
| `studentId` | string | Firebase Auth UID |
| `courseId` | string | Enrolled course ID |
| `enrolledAt` | timestamp | When they enrolled |
| `completedLessonIds` | string[] | Lessons marked complete |
| `lessonProgress` | object | `{lessonId: watchedSeconds}` |

---

### Collection: `chatSessions`
One document per student session per lesson.

| Field | Type | Description |
|---|---|---|
| `sessionId` | string | UUID, generated client-side |
| `lessonId` | string | Which lesson this session is for |
| `studentId` | string | Firebase Auth UID (or `anonymous`) |
| `messages` | object[] | `[{role, content, followUps, timestamp}]` |
| `updatedAt` | timestamp | Last message time |

---

## 🔄 Core AI Pipeline (Detailed)

### Phase A — Lesson Video Ingest (YouTube URL)

```
Step 1: Instructor pastes YouTube URL → POST /api/lessons/ingest-youtube
Step 2: Backend fetches full transcript via youtube-transcript npm
        → Returns: [{text, offset(ms), duration(ms)}]
Step 3: Chunk into 30-second windows with 5-second overlap
        → A 10-hour video produces ~1,200 chunks
Step 4: Batch embed all chunks using Gemini text-embedding-004
        → 10 chunks per batch, 200ms delay between batches
        → Each chunk: 768-float embedding array
Step 5: Save all chunks to Firestore transcriptChunks collection
Step 6: Gemini generates 5 starter questions from first 15 chunks
Step 7: Gemini generates topic segments from abbreviated chunk labels
Step 8: Update lesson status → "ready", save starterQuestions + topicSegments
```

### Phase A2 — Lesson Video Ingest (Direct Upload)

```
Step 1: Instructor uploads .mp4/.webm → POST /api/lessons/upload (multipart)
Step 2: Backend streams file to Firebase Storage → gets a signed URL
Step 3: Submit signed URL to AssemblyAI Transcription API
        → AssemblyAI returns job ID immediately (async)
Step 4: Poll AssemblyAI every 5 seconds for job completion
        → Status: queued → processing → completed
        → Returns: [{text, start(ms), end(ms)}] with word-level timestamps
Step 5: Normalize to same format as YouTube transcript
Step 6: Same chunking → embedding → Firestore steps as Phase A
Step 7: Update lesson status → "ready"

NOTE: A 1-hour uploaded video takes ~4-8 minutes total (upload + AssemblyAI).
      A 1-hour YouTube video takes ~3-5 minutes (embed batching is the bottleneck).
      Both show real-time progress in the UI via polling GET /api/lessons/:id/status
```

---

### Phase B — Student Asks a Question (Real-Time)

```
Step 1: Student types question in chat panel → submits
Step 2: Frontend sends POST /api/chat with {videoId, sessionId, message}
Step 3: Backend opens SSE stream to frontend
Step 4: Backend embeds the question using Gemini text-embedding-004
Step 5: Load all chunks for this videoId from in-memory cache
        → First request: load from Firestore → cache in Map()
        → Subsequent requests: instant from memory (~50ms for 1,200 chunks)
Step 6: Compute cosine similarity between question embedding and all chunks
Step 7: Return top 5 most relevant chunks with their timestamps
Step 8: Build RAG prompt:
        → System role: "AI Learning Companion, answer only from transcript"
        → Inject top 5 chunks with [startLabel - endLabel] prefixes
        → Inject last 6 messages from session history (for follow-up context)
        → Append student question
Step 9: Stream Gemini response token-by-token via SSE → live typing on frontend
Step 10: After full response received:
         → Generate 3 follow-up question chips using Gemini
         → Send follow-ups as final SSE event
Step 11: Save full exchange to Firestore chatSessions
Step 12: Close SSE stream
```

---

### Phase C — Smart Summary Request

```
Step 1: Student clicks "Summarise the video" / "Give me a 1-minute summary"
Step 2: Frontend sends POST /api/summary with {videoId, type, fromSec, toSec}
Step 3: Backend loads relevant chunks:
        - type="full"    → all chunks
        - type="last5"   → chunks from (totalDuration - 300s) to end
        - type="range"   → chunks between fromSec and toSec
Step 4: Build summary prompt with context
Step 5: Gemini generates topic-grouped bullet-point summary
Step 6: Return to frontend — rendered as formatted markdown
```

---

## 📐 UI/UX Design Specification

### Page 1 — Home / LMS Library

**Layout:** Clean dark theme header with logo + "AI-Powered LMS" tagline  
**Content:** Grid of 10 video cards (3 per row on desktop, 1 on mobile)  
**Each Card Shows:**
- YouTube thumbnail
- Video title + creator name
- Duration badge (e.g., "8h 42m")
- Category tag (e.g., "Machine Learning")
- "AI Ready ✓" green badge once processed
- Hover effect: subtle scale + glow

---

### Page 2 — Video Page (The Main Experience)

**Full Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: Logo + Video Title + "Powered by Gemini" badge      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              VIDEO PLAYER (react-player, full width)         │
│              YouTube embed, controls visible                 │
│                                                              │
├───────────────────────┬──────────────────────────────────────┤
│  TOPIC TIMELINE       │  AI CHAT PANEL                       │
│  (left sidebar)       │  (right main area)                   │
│                       │                                      │
│  ● 0:00 Introduction  │  🤖 Ask about this video             │
│  ● 12:30 Core Concept │                                      │
│  ● 45:00 Deep Dive    │  "Hello! Not sure what to ask?"      │
│  ● 1:22:10 Examples   │                                      │
│  ● 2:01:00 Summary    │  [Chip] Summarise the video          │
│                       │  [Chip] What will I learn?           │
│  (clicking any item   │  [Chip] Explain backpropagation      │
│   seeks the video)    │  [Chip] What is gradient descent?    │
│                       │  [Chip] Give me a 1-min summary      │
│                       │                                      │
│                       │  ─── Chat History ───                │
│                       │                                      │
│                       │  [Student bubble]                    │
│                       │  What is overfitting?                │
│                       │                                      │
│                       │  [AI bubble]                         │
│                       │  Overfitting occurs when...          │
│                       │  → (23:14 - 24:30) ← clickable chip │
│                       │  → (1:12:05 - 1:13:20)              │
│                       │                                      │
│                       │  You might also ask:                 │
│                       │  [How to prevent overfitting?]       │
│                       │  [What is regularization?]           │
│                       │  [Underfitting vs overfitting?]      │
│                       │                                      │
│                       │  [Ask a question...        →  ]      │
│                       │  AI can make mistakes. Double-check. │
└───────────────────────┴──────────────────────────────────────┘
```

---

### Color & Design Language

| Element | Spec |
|---|---|
| Background | `gray-950` (near black) |
| Cards / Panels | `gray-900` with `gray-800` borders |
| Primary Accent | Violet (`violet-500` / `violet-600`) |
| Timestamp Chips | `violet-900/50` bg, `violet-300` text, monospace font |
| Starter/Follow-up Chips | `gray-800` → hover `violet-900/40`, pill shape |
| AI Bubble | `gray-800` background, left-aligned |
| User Bubble | `violet-600` background, right-aligned |
| Font | Inter (Google Fonts) |
| Animations | Framer Motion — message slide-in, chip fade, streaming cursor |

---

## 📡 API Endpoints

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/videos/ingest` | Process YouTube URL → extract, chunk, embed, store | Admin |
| `GET` | `/api/videos` | List all 10 videos with status and metadata | Public |
| `GET` | `/api/videos/:id` | Get single video + starter questions + topic segments | Public |
| `POST` | `/api/chat` | Ask question → SSE stream of Gemini response + follow-ups | Public |
| `GET` | `/api/chat/:sessionId` | Get chat history for a session | Public |
| `POST` | `/api/summary` | Generate full / last-5-min / range summary | Public |
| `POST` | `/api/quiz` | Generate 5 MCQs from video transcript | Public |
| `GET` | `/health` | Server health check | Public |

---

## ⏱️ 15-Hour Build Schedule

| Hour | Task | Owner | Output |
|---|---|---|---|
| 0:00–0:30 | Project setup: repo, env, Firebase project, API keys | All | Running dev servers |
| 0:30–1:30 | Backend: transcript fetch + chunking service | A | Chunks from any YT URL |
| 1:30–3:00 | Backend: Gemini embedding + cosine search service | A | Semantic search working |
| 3:00–4:00 | Backend: `/api/videos/ingest` route end-to-end | A + C | Full ingest pipeline |
| 4:00–5:00 | Backend: Gemini prompts (starter Qs, topics, follow-ups) | A | Prompt service ready |
| 5:00–6:00 | Backend: `/api/chat` SSE streaming route | A | Streaming chat works |
| 6:00–6:30 | Backend: `/api/summary` route | A | Summaries working |
| 6:30–7:00 | Ingest all 10 demo videos (run pipeline, verify) | C | All 10 "ready" in Firestore |
| 7:00–8:30 | Frontend: React app, routing, home page video grid | B | 10 video cards visible |
| 8:30–10:00 | Frontend: Video page layout + react-player integration | B | Video plays on page |
| 10:00–11:30 | Frontend: ChatPanel component (starter Qs, input, bubbles) | B | Chat UI renders |
| 11:30–12:30 | Frontend: `useChat` SSE hook + timestamp chip parsing | B | Streaming + seek works |
| 12:30–13:00 | Frontend: Topic timeline sidebar | B | Sidebar seeks video |
| 13:00–13:30 | Frontend: Follow-up chips + summary button | B | Full chat experience |
| 13:30–14:00 | UI Polish: animations, loading states, mobile layout | B + D | Looks stunning |
| 14:00–14:30 | Deploy: Vercel (frontend) + Render (backend) | C + D | Live URL working |
| 14:30–15:00 | Demo rehearsal: test all 10 videos, script the pitch | All | Flawless demo ready |

---

## 👥 Team Roles

### Person A — AI + Backend Engineer
- All Node.js/Express code
- Transcript extraction service
- Gemini embedding pipeline
- Cosine similarity search
- All Gemini prompt engineering
- SSE streaming chat API
- Summary + quiz endpoints
- In-memory chunk cache

### Person B — Frontend Engineer
- React app setup + routing
- Home page (video library grid)
- Video page layout
- `react-player` integration
- ChatPanel component
- MessageBubble with timestamp parsing
- `useChat` SSE streaming hook
- Topic timeline sidebar
- All animations (Framer Motion)

### Person C — Firebase + Integration Engineer
- Firebase project setup
- Firestore collections and rules
- Firebase Auth setup
- Running the ingest pipeline on all 10 videos
- API integration (connect frontend to backend)
- Environment variables + CORS config
- Deployment setup

### Person D — Demo + Quality Engineer
- Select and test all 10 YouTube videos (captions available, varied topics)
- Test every feature end-to-end
- Script the 3–5 minute judge demo
- Prepare the pitch slides
- Bug fixes and edge cases
- Rehearse the live demo flow

---

## 🎬 Presentation Flow (5 Minutes)

### Opening (30 seconds)
> "Students waste hours re-watching lectures just to find one concept. We built the solution — a fully working AI learning companion that knows everything about every video in your LMS."

### Step 1 — Show the LMS Library (30 seconds)
- Open the home page
- Show 10 video cards from different subjects and lengths
- Point out the "AI Ready ✓" badge on each — every one is live and queryable

### Step 2 — Open the 10-Hour Machine Learning Video (45 seconds)
- Click it — video loads, topic timeline populates on the left
- Show 5 starter questions auto-generated in the chat panel
- Say: *"The AI has read and understood this entire 10-hour lecture — ask anything"*

### Step 3 — Ask a Real Question, Watch It Stream (60 seconds)
- Type: "What is backpropagation?"
- Watch Gemini stream the response live, token by token
- Point to the timestamp citation chip in the answer — e.g., `(1:23:14 - 1:24:30)`
- Click the chip → video jumps to that exact moment
- Say: *"Every answer is grounded in the real transcript, with exact citations you can verify"*

### Step 4 — Follow-up in Context (30 seconds)
- Click one of the 3 follow-up question chips
- Show a context-aware answer (AI remembers the conversation)
- Say: *"It maintains the full conversation — just like a real tutor"*

### Step 5 — Smart Revision (30 seconds)
- Type: "Give me a 1-minute summary of the last 5 minutes"
- Show bullet-point revision notes generated from the actual transcript

### Step 6 — Live: Add a Brand New Video (60 seconds)
- Open the "Add Video" page
- Paste any YouTube URL (can be judge's choice)
- Watch the progress bar: Fetching transcript → Generating embeddings → Ready
- Once ready, open the video page — starter questions already generated
- Ask a question → live answer with real timestamp citations
- Say: *"Any YouTube video. Any length. Ready to query in under 5 minutes."*

### Close (15 seconds)
> "This is a fully working system — real transcripts, real semantic search, real Gemini responses. Drop this into any LMS and every student gets a personal AI tutor for every lecture."

---

## 📋 Pre-Hackathon Checklist

Complete the night before:

- [ ] Firebase project created with Firestore + Storage enabled
- [ ] Gemini API key generated, rate limits checked (Flash tier sufficient)
- [ ] All 10 YouTube URLs selected and verified — test each with `youtube-transcript` to confirm captions work
- [ ] Full ingest pipeline tested end-to-end on at least 3 videos (including a 5hr+ one)
- [ ] All 10 videos ingested → Firestore has all chunks and embeddings → all show "AI Ready ✓"
- [ ] Live video addition flow tested — paste a new URL, watch it process, query it immediately
- [ ] Backend deployed to Render with all environment variables set
- [ ] Frontend deployed to Vercel, pointing to production backend URL
- [ ] Chat, summaries, timestamps, and follow-ups tested on the deployed URL
- [ ] Mobile responsiveness checked (judges may view on phones)
- [ ] Presentation flow rehearsed at least twice, including the live video addition step
- [ ] Have 3–5 backup YouTube URLs ready for judges to choose from during live addition

---

## 🔮 Future Scope (Tell Judges This)

| Feature | Impact |
|---|---|
| Real LMS Plugin (Moodle/Canvas) | Drop-in integration for any institution |
| Multi-language Support | Hindi, Hinglish, regional languages |
| Auto Quiz Generation | Exam prep from any lecture |
| Notes PDF Export | One-click downloadable study material |
| Cross-Video Search | "Explain X across all my courses" |
| Student Analytics Dashboard | Instructors see most asked questions, knowledge gaps |
| Personalized Learning Paths | AI recommends what to watch next based on questions asked |
| Production Vector DB | Pinecone / pgvector for 100k+ video scale |
| Mobile App | React Native version for learning on the go |

---

## 🏆 Pitch Line

> *"We built an AI-powered learning companion that works on any video in any LMS — 5 minutes or 10 hours long — giving every student a personal tutor that reads the entire lecture, cites exact timestamps, remembers your conversation, and turns passive video watching into an active, intelligent learning experience. Built with Gemini AI, deployed in 15 hours."*

---

## 🧩 Key Technical Decisions Explained

| Decision | Reason |
|---|---|
| In-memory cosine similarity over Pinecone | Zero infrastructure, sub-50ms search, works on free tier |
| 30-second chunks with 5-second overlap | Balances context window usage with precision; handles 10hr videos (~1,200 chunks) |
| SSE over WebSockets | Simpler server-side, no connection management, perfect for one-way streaming |
| Gemini text-embedding-004 over OpenAI | Same Gemini ecosystem, 768-dim, free tier sufficient for hackathon |
| Firestore over PostgreSQL | Zero setup, real-time, generous free tier, works out of the box |
| youtube-transcript npm over Whisper | Captions are free and instant; Whisper adds cost and latency |
| Session UUID on client | No auth needed for demo; UUID persists conversation in same tab |
| Pre-ingest all 10 videos | Demo runs instantly, no waiting; judges see a "production-ready" system |
| React-Player over custom embed | Handles YouTube + direct URLs, exposes seekTo API cleanly |
| Vercel + Render | Free tier, GitHub deploy, zero DevOps time |
