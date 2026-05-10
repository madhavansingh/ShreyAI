# 🎓 SheryAI — AI-Powered Learning Platform

> An intelligent LMS where every lecture becomes an interactive learning experience. Upload or link a video, and the AI automatically generates chapters, a chatbot tutor, quizzes, and searchable transcripts — all in real time.

![Platform Preview](docs/screenshots/WhatsApp%20Image%202026-05-09%20at%2019.04.18.jpeg)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎬 **Video Ingestion** | Upload MP4/WebM/MOV or paste a YouTube URL |
| 📝 **Auto Transcription** | AssemblyAI-powered speech-to-text with timestamps |
| 🤖 **AI Tutor Chatbot** | Gemini-powered chat anchored to your current playback position |
| 📍 **YouTube-Style Chapters** | Auto-generated chapter markers on the video timeline with hover previews |
| ⏱️ **Clickable Timestamps** | AI responses include jump-to timestamps; click to seek instantly |
| 🧠 **Auto Quiz Generation** | MCQ quizzes generated from lecture content |
| 📊 **Progress Tracking** | Per-lesson completion tracking for students |
| 👩‍🏫 **Instructor Dashboard** | Upload/manage courses, monitor student progress |
| 🔐 **Role-Based Auth** | Student / Instructor roles via Firebase Auth |

---

## 🏗️ Architecture

```
sheryai/
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/           # Firebase, Gemini, NVIDIA client setup
│   │   ├── middleware/       # Auth (role-based), error handler
│   │   ├── routes/           # lessons.js, chat.js, health.js
│   │   ├── services/         # Core AI pipeline
│   │   │   ├── ingestOrchestrator.js   # Master pipeline (YouTube + Upload)
│   │   │   ├── transcriptService.js    # AssemblyAI + YouTube captions
│   │   │   ├── chunkingService.js      # Transcript → semantic chunks
│   │   │   ├── embeddingService.js     # Chunk → Firestore vector store
│   │   │   ├── chatService.js          # Gemini RAG chat
│   │   │   ├── aiMetaService.js        # Chapter + starter questions
│   │   │   └── chunkCache.js           # In-memory chunk cache
│   │   └── utils/            # Time formatters, vector math
│   ├── scripts/
│   │   └── preIngest.js      # CLI tool: pre-process videos offline
│   └── uploads/
│       └── videos/           # Local video storage (gitignored; .gitkeep only)
│
├── frontend/                 # React 18 + Vite SPA
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── VideoChapterBar.jsx   # YouTube-style chapter overlay
│   │   │   ├── ChatPanel.jsx         # AI tutor chat UI
│   │   │   ├── TimestampChip.jsx     # Clickable timestamp chips
│   │   │   ├── ChatMessage.jsx       # Chat bubble renderer
│   │   │   ├── LessonStatusBadge.jsx # Processing progress badge
│   │   │   └── Navbar.jsx
│   │   ├── pages/            # Route-level page components
│   │   │   ├── LessonPage.jsx        # Main 3-column lesson view
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── InstructorPage.jsx
│   │   │   ├── CourseManagerPage.jsx
│   │   │   ├── QuizPage.jsx
│   │   │   └── LoginPage.jsx
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── useChat.js            # Chat state + API integration
│   │   │   └── useLessonStatus.js    # Real-time lesson processing poll
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Firebase Auth provider
│   │   ├── services/
│   │   │   └── api.js                # Typed API client
│   │   └── config/
│   │       └── firebase.js           # Firebase client init
│
├── docs/                     # Implementation plans & design docs
├── firebase.json             # Firebase project config
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Firestore composite indexes
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Firebase project | With Firestore + Auth enabled |
| AssemblyAI account | [assemblyai.com](https://www.assemblyai.com) — free tier works |
| Google AI Studio key | [aistudio.google.com](https://aistudio.google.com) — Gemini Flash |

---

### 1. Clone & Install

```bash
git clone https://github.com/KANISHQ09/sheryai.git
cd sheryai

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

---

### 2. Configure Environment Variables

**Backend** — copy and fill in `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

```env
# backend/.env

PORT=5001

# Firebase Admin SDK (Service Account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# AssemblyAI (for uploaded video transcription)
ASSEMBLYAI_API_KEY=your_assemblyai_key

# Demo auth bypass (for development without Firebase Auth tokens)
DEMO_STUDENT_SECRET=student
DEMO_INSTRUCTOR_SECRET=instructor
```

**Frontend** — copy and fill in `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

```env
# frontend/.env

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

### 3. Run Locally

Open **two terminals**:

```bash
# Terminal 1 — Backend (port 5001)
cd backend
npm run dev
```

```bash
# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Visit: **[http://localhost:5173](http://localhost:5173)**

---

## 🔑 How Authentication Works (Dev Mode)

In development, the Vite proxy injects an `x-demo-role` header so you don't need real Firebase tokens:

| Role | Access |
|---|---|
| `student` | View lessons, chat, quiz |
| `instructor` | Upload lessons, manage courses |

The `authMiddleware.js` reads this header and maps it to a role. In production, replace with real Firebase ID token verification.

---

## 🧠 AI Pipeline Flow

```
Video Upload / YouTube URL
         │
         ▼
  AssemblyAI Transcription
  (or YouTube caption fetch)
         │
         ▼
   Transcript Chunking
   (~60s semantic windows)
         │
    ┌────┴────┐
    ▼         ▼
 Embeddings  AI Metadata
 (Firestore) │
             ├── 5 Starter Questions
             └── N YouTube-Style Chapters
                  (1 chapter per ~20s)
```

**Chat RAG flow:**
```
User message + current video timestamp
         │
         ▼
 Semantic search over transcript chunks
         │
         ▼
 Top-K chunks → Gemini Flash prompt
         │
         ▼
 Response with clickable timestamps
```

---

## 📍 Chapter Generation

Chapters are auto-generated on every new lesson using Gemini Flash. If an existing lesson has ≤ 1 chapter (stale data), the frontend **auto-regenerates** chapters on page load.

You can also manually regenerate via the **↺ Regenerate** button in the lesson sidebar, or via API:

```bash
POST /api/lessons/:lessonId/regenerate-chapters
Headers: x-demo-role: instructor
```

---

## 📁 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `POST` | `/api/lessons` | Create a new lesson (YouTube URL) |
| `POST` | `/api/lessons/upload` | Upload a video file |
| `GET` | `/api/lessons/:id` | Get lesson + metadata |
| `GET` | `/api/lessons/:id/video` | Stream video with byte-range support |
| `POST` | `/api/lessons/:id/regenerate-chapters` | Re-run AI chapter generation |
| `GET` | `/api/lessons?courseId=...` | List lessons for a course |
| `POST` | `/api/chat` | Send a chat message (RAG) |

---

## 🛠️ Scripts

```bash
# Backend dev server (nodemon auto-restart)
cd backend && npm run dev

# Frontend dev server (Vite HMR)
cd frontend && npm run dev

# Frontend production build
cd frontend && npm run build

# Pre-ingest a video offline (CLI tool)
cd backend && node scripts/preIngest.js <lessonId>
```

---

## 🗂️ docs/ Folder

| File | Description |
|---|---|
| `AI_Learning_Companion_Implementation_Plan.md` | Full product spec |
| `PHASE_1_FOUNDATION.md` | Auth, DB, project scaffold |
| `PHASE_2_INGESTION.md` | Video upload + transcription |
| `PHASE_3_AI_CHAT.md` | RAG chat + timestamp system |
| `PHASE_4_LMS_PLATFORM.md` | Course management, quiz, progress |
| `PHASE_5_DEPLOY_DEMO.md` | Production deployment guide |
| `VidAsk_AI_Production_System_Design.docx` | System design document |
| `screenshots/` | UI screenshots |

---

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feat/your-feature`
5. Open a Pull Request

