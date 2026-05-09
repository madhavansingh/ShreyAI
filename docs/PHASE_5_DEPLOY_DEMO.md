# Phase 5 — Polish, Performance, Deployment & Demo Prep
## Goal: Everything deployed live, 10 videos pre-ingested, performance optimized, zero crashes during demo, judge-ready presentation flow.

---

## 5.1 Performance Optimizations

### Backend

**In-Memory Chunk Cache (already built in Phase 2)**
- Verify it works correctly: second request for same lessonId returns from cache, not Firestore
- Log cache hits vs misses in dev mode to confirm
- Cache should hold at least 20 lessons simultaneously before eviction

**Response Caching for Common Questions**
- After a chat response completes, hash the question: `SHA256(lessonId + normalizedQuestion)`
- Store in a simple in-memory `Map`: `questionHash → { answer, followUps, cachedAt }`
- On new question: check cache first. If found and cached < 6 hours ago → return cached answer instantly
- Do NOT cache: personalized questions, questions with "what did I just watch", "right now" type questions
- This reduces Gemini calls by 30–50% when multiple students ask the same thing

**Gemini Request Queue**
- Use a simple in-memory queue with concurrency limit of 20 simultaneous Gemini requests
- If queue is full: add to queue, send SSE event `{ type: "queued", position: N }` to client
- Client shows "Your question is in queue (position 3)..." with animated dots
- Process queue FIFO with 100ms spacing between requests

**Firestore Read Optimization**
- For `/api/courses` list endpoint: cache in memory for 60 seconds (courses don't change frequently)
- For lesson status polling: cache status for 3 seconds (frontend polls every 3s anyway)

---

### Frontend

**Code Splitting**
- Lazy load the Lesson page (heaviest page with video player and chat)
- Lazy load Instructor dashboard pages
- Keep Home, Login, Course Detail as eager-loaded (small pages, fast first impression)

**Video Player Optimization**
- For YouTube videos: pass `youtube` type to react-player, let YouTube handle CDN
- For uploaded videos: use Firebase Storage CDN URL directly in react-player
- Always set `playing={false}` initially — don't autoplay

**Chat Panel Optimization**
- Virtualize message list if more than 50 messages (use `react-window`)
- Debounce input: don't send partial words to API, only on Enter or button click
- Pre-load starter questions when lesson page first mounts (fetch lesson data eagerly)

---

## 5.2 Error Handling Hardening (Do This Before Demo)

Go through every API endpoint and ensure:
- Every route has try/catch
- Every error returns consistent JSON: `{ success: false, error: "Human readable message", code: 4XX/5XX }`
- No endpoint ever exposes internal error stack traces to client
- All Firestore writes have retry logic (max 3 retries on failure)

Go through every frontend page and ensure:
- Every API call has error state handled (show toast or inline error message)
- Loading states exist for every async operation
- Empty states exist: no courses yet, no lessons yet, chat not started, video processing
- 404 page is styled and has "Go Home" button

---

## 5.3 Pre-Ingest the 10 Demo Videos

### The 10 Videos to Pre-Ingest

Choose 10 videos covering different subjects, lengths, and languages:

| # | Subject | Language | Approximate Length |
|---|---|---|---|
| 1 | Python Programming Basics | English | 1 hour |
| 2 | Machine Learning Intro | English | 2 hours |
| 3 | Web Development HTML/CSS | English | 45 min |
| 4 | Data Structures - Arrays | English | 30 min |
| 5 | React.js Crash Course | English | 1.5 hours |
| 6 | Linear Algebra for ML | English | 1 hour |
| 7 | Python for Data Science | Hindi | 1 hour |
| 8 | Machine Learning in Hindi | Hindi | 1.5 hours |
| 9 | Database / SQL Basics | English | 45 min |
| 10 | Deep Learning Fundamentals | English | 2 hours |

**How to pick each video:**
- Must be a real YouTube video with actual captions enabled
- Test that `youtube-transcript` can fetch it before finalizing the list
- Choose videos from well-known channels (freeCodeCamp, Krish Naik, CodeWithHarry, MIT OpenCourseWare, etc.)

### Pre-Ingest Process
- Create the course structure in Firestore first (2 courses: "Programming Fundamentals" and "Machine Learning")
- Add modules and lesson documents pointing to each video
- Run `node scripts/preIngest.js` — this will take 2–4 hours depending on video lengths
- Verify all 10 show `status: "ready"` in Firestore console
- Test chatbot on each video — ask 2–3 questions, verify answers have timestamps

---

## 5.4 Deployment

### Backend — Deploy to Render

1. Create new Web Service on Render
2. Connect GitHub repo, set root directory to `/backend`
3. Build command: `npm install`
4. Start command: `node src/index.js`
5. Add all environment variables from `.env` to Render dashboard
6. For `FIREBASE_SERVICE_ACCOUNT`: paste the entire JSON as a single line string
7. After deploy: test `https://your-render-url.onrender.com/api/health`
8. Note the URL — this becomes `VITE_BACKEND_URL` in frontend production

**Important Render settings:**
- Instance type: at least 512MB RAM (for in-memory chunk cache)
- Auto-deploy: ON (deploys on every push to main branch)
- Health check path: `/api/health`

### Frontend — Deploy to Vercel

1. Install Vercel CLI or connect GitHub repo to Vercel dashboard
2. Set root directory to `/frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add all `VITE_` environment variables in Vercel dashboard
6. Set `VITE_BACKEND_URL` to your Render backend URL
7. After deploy: test the live URL — login, browse courses, open a lesson

**Important Vercel settings:**
- Framework preset: Vite
- Enable automatic HTTPS (default)
- Add custom domain if you have one

### CORS Configuration
After getting production URLs, update backend CORS:
```
FRONTEND_URL=https://your-vercel-app.vercel.app
```
And add your Vercel domain to Firebase Auth authorized domains list.

---

## 5.5 Firebase Production Configuration

**Firestore Indexes to Create (prevents query failures):**
- `chatSessions`: compound index on `lessonId` + `studentId` + `updatedAt` (descending)
- `transcriptChunks`: compound index on `lessonId` + `chunkIndex`
- `enrollments`: compound index on `studentId` + `courseId`
- `lessons`: compound index on `courseId` + `moduleId` + `order`

**Firestore Backup:**
- Enable daily Firestore backup in Firebase console
- Export to Firebase Storage bucket before the hackathon presentation

**Firebase Storage CORS:**
Set CORS rules to allow frontend domain to read videos:
```json
[{"origin": ["https://your-vercel-app.vercel.app", "http://localhost:5173"], "method": ["GET"], "maxAgeSeconds": 3600}]
```

---

## 5.6 Final Testing Checklist (Run 2 Hours Before Presentation)

### Functionality Tests
- [ ] Google Sign-In works on production URL
- [ ] Student can enroll in a course
- [ ] All 10 pre-ingested videos show AI Ready status
- [ ] Chatbot answers questions on all 10 videos
- [ ] Timestamps in answers are clickable and seek video correctly
- [ ] Follow-up chips appear and work
- [ ] Full summary generates for at least 2 different videos
- [ ] Last-5-min summary generates correctly
- [ ] Hindi video chatbot answers in Hindi when asked in Hindi
- [ ] Upload a new .mp4 → status goes through all stages → chatbot works
- [ ] Paste a new YouTube URL → same result
- [ ] Student progress saves correctly
- [ ] Both mobile and desktop layouts work

### Performance Tests
- [ ] Open lesson page → chatbot loads within 2 seconds
- [ ] First question response starts streaming within 3 seconds
- [ ] Status polling updates UI correctly during video processing
- [ ] No memory leaks: navigate between 5 different lessons — no browser slowdown

### Edge Cases to Test
- [ ] Ask a question about something NOT in the video → AI says "not covered" gracefully
- [ ] Ask in Hindi on an English video → AI still answers (from English transcript)
- [ ] Open same lesson in two browser tabs simultaneously → both work independently
- [ ] Refresh page mid-chat → conversation history restores

---

## 5.7 Hackathon Presentation Script (5 Minutes)

**Minute 1 — Problem & Solution (speak, don't demo)**
> "Every student on an LMS watches video lectures alone. No one to ask questions, no way to find a specific concept, no real-time help. We built an AI companion that lives inside every video."

**Minute 2 — Core Demo: Ask a Question**
- Open a pre-loaded video (pick the ML video — visually impressive)
- Show starter questions appear automatically
- Type a question (or click a starter chip)
- Let streaming response appear live
- Click a timestamp chip → video seeks to that moment

**Minute 3 — Summary + Follow-ups**
- Click "Last 5 Min Summary" → show generated summary
- Click one of the follow-up chips → show it sends as next question

**Minute 4 — Live Video Addition (wow moment)**
- Say: "This works on any video. Watch."
- Paste a new YouTube URL the judges suggest (have 3 backup URLs ready)
- Show processing progress bar going through all stages
- When ready: immediately ask a question and get a real answer
- Say: "That video was never in our system 4 minutes ago."

**Minute 5 — Scale & Stack**
- Show Instructor Dashboard: "Instructors can upload their own videos too — Hindi, English, any accent"
- Show Student Dashboard with progress tracking
- Close with: "Same system can run inside any existing LMS. The RAG pipeline is video-source-agnostic. At 100,000 users it runs on Vertex AI for ~$550/month."

---

## 5.8 Backup Plans for Demo Day

| What Could Go Wrong | Backup Plan |
|---|---|
| Internet too slow for live ingest | Have 2 "extra" videos already pre-ingested but not shown — present as "live" |
| Gemini API down | Extremely unlikely but: have a screenshot recording of a previous session |
| Vercel frontend down | Run `npm run dev` locally as backup |
| Render backend down | Switch `VITE_BACKEND_URL` to `localhost:5000` on your machine, keep backend running |
| YouTube video has no captions | Have 3 backup URLs pre-tested with captions confirmed working |
| AssemblyAI slow | Use YouTube URL flow for live demo instead of upload |

---

## ✅ Phase 5 Done When:
- [ ] Frontend live on Vercel with production URL
- [ ] Backend live on Render with production URL
- [ ] All 10 videos pre-ingested and AI Ready on production
- [ ] Chatbot works on all 10 videos on production URL (not localhost)
- [ ] Live ingest works on production (YouTube + upload)
- [ ] Hindi/Hinglish video transcribed correctly on production
- [ ] All Firestore indexes created and no index errors in logs
- [ ] Full presentation script rehearsed at least twice
- [ ] Backup plans tested

## ⏱️ Estimated Time: 2–3 Hours

---

## 📋 Total Time Breakdown

| Phase | What | Time |
|---|---|---|
| Phase 1 | Foundation + Infrastructure | 2–3 hrs |
| Phase 2 | Ingestion Pipeline | 4–5 hrs |
| Phase 3 | AI Chat Engine | 3–4 hrs |
| Phase 4 | LMS Platform | 4–5 hrs |
| Phase 5 | Polish + Deploy + Demo | 2–3 hrs |
| **Total** | | **15–20 hrs** |
