# Phase 1 — Foundation & Infrastructure Setup
## Goal: Both servers running, Firebase connected, all API keys working, folder structure production-ready.

---

## 1.1 Project Structure to Create

```
sheryai/
├── backend/                  ← Node.js + Express
│   ├── src/
│   │   ├── routes/           ← API route files
│   │   ├── services/         ← Business logic (transcript, embed, ai)
│   │   ├── middleware/       ← auth, error handler, rate limiter
│   │   ├── utils/            ← helpers (chunking, cosine similarity, time formatter)
│   │   ├── config/           ← firebase admin init, gemini init
│   │   └── index.js          ← Entry point
│   ├── .env                  ← All secrets
│   └── package.json
│
├── frontend/                 ← React (Vite)
│   ├── src/
│   │   ├── pages/            ← Home, Course, Lesson, Dashboard pages
│   │   ├── components/       ← Reusable UI components
│   │   ├── hooks/            ← Custom React hooks
│   │   ├── services/         ← API call functions
│   │   ├── context/          ← Auth context
│   │   └── main.jsx
│   ├── .env                  ← Public Firebase config
│   └── package.json
```

---

## 1.2 Accounts & API Keys to Set Up (Do This First)

| Service | What to Do | Key Name in .env |
|---|---|---|
| **Google AI Studio** | Create project → Get API key → Add credit card for pay-as-you-go | `GEMINI_API_KEY` |
| **Firebase** | Create project → Enable Firestore, Storage, Authentication | See below |
| **AssemblyAI** | Create account → Get API key | `ASSEMBLYAI_API_KEY` |

### Firebase — Enable These Exact Services:
1. **Firestore Database** — Start in production mode, region: `asia-south1` (Mumbai)
2. **Firebase Storage** — Default bucket
3. **Authentication** — Enable: Google provider + Email/Password provider
4. **Service Account** — Generate private key JSON → used in backend as `FIREBASE_SERVICE_ACCOUNT`

---

## 1.3 Backend Environment Variables (.env)

```
GEMINI_API_KEY=your_key_here
ASSEMBLYAI_API_KEY=your_key_here
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}   ← paste entire JSON as string
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## 1.4 Backend — Packages to Install

```
express
cors
dotenv
firebase-admin
@google/generative-ai
assemblyai
multer
multer-storage-firebase (or: stream upload directly to Firebase Storage)
uuid
express-rate-limit
helmet
morgan
nodemon (dev)
```

---

## 1.5 Backend — What to Build in Phase 1

### index.js (Entry Point)
- Initialize Express app
- Apply middleware: cors (allow frontend URL), helmet, morgan, express.json()
- Apply rate limiter: 100 requests per 15 minutes per IP (using express-rate-limit)
- Mount all route files under `/api`
- Global error handler middleware at the bottom
- Listen on PORT from .env
- Log "Server running on port X" on start

### config/firebase.js
- Initialize firebase-admin using service account from .env
- Export: `db` (Firestore instance), `bucket` (Storage bucket instance)
- This file is imported by all services that need Firebase

### config/gemini.js
- Initialize `@google/generative-ai` with GEMINI_API_KEY
- Export: `geminiFlash` (Gemini 2.5 Flash model instance), `embeddingModel` (text-embedding-004 instance)

### middleware/errorHandler.js
- Catch all unhandled errors
- Return JSON: `{ success: false, error: message, code: statusCode }`
- Log error to console in dev, suppress in prod

### middleware/authMiddleware.js
- Verify Firebase ID token from `Authorization: Bearer <token>` header
- Attach `req.user = { uid, email, role }` to request
- Return 401 if token missing or invalid

### routes/health.js
- GET `/api/health` → returns `{ status: "ok", timestamp }` — used to verify server is alive

---

## 1.6 Frontend — Packages to Install

```
react-router-dom
axios
react-player
framer-motion
firebase (client SDK)
react-hot-toast
lucide-react (icons)
@tailwindcss/vite (or install Tailwind CSS v3 manually)
```

---

## 1.7 Frontend — What to Build in Phase 1

### Firebase Client Config (src/config/firebase.js)
- Initialize Firebase app with config from .env (VITE_ prefixed variables)
- Export: `auth`, `db`, `storage` (client-side Firebase instances)

### Context: AuthContext (src/context/AuthContext.jsx)
- Wrap entire app in this provider
- Expose: `currentUser`, `userRole`, `loading`, `signInWithGoogle()`, `signOut()`
- On auth state change: fetch user document from Firestore `users` collection
- If user doc doesn't exist (first login): create it with role `student` by default

### Routing (src/main.jsx + App.jsx)
Set up these routes:
- `/` → Home page (course catalog)
- `/login` → Login page
- `/dashboard` → Student dashboard (protected)
- `/instructor` → Instructor dashboard (protected, instructor role only)
- `/course/:courseId` → Course detail page
- `/lesson/:lessonId` → Video player + AI chat page (protected)
- `*` → 404 page

### Protected Route Component
- If not logged in → redirect to `/login`
- If wrong role (student accessing instructor page) → redirect to `/dashboard`

### .env for Frontend
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_BACKEND_URL=http://localhost:5000
```

---

## 1.8 Firestore — Collections to Initialize

Create these collections manually in Firebase Console with one sample document each so indexes work:

### `users`
```json
{
  "uid": "sample",
  "name": "Sample User",
  "email": "sample@test.com",
  "role": "student",
  "enrolledCourseIds": [],
  "createdCourseIds": [],
  "createdAt": "timestamp"
}
```

### `courses` — empty for now, created in Phase 4

### `lessons` — empty for now, created in Phase 2

### `transcriptChunks` — empty for now, created in Phase 2

### `chatSessions` — empty for now, created in Phase 3

### `enrollments` — empty for now, created in Phase 4

---

## 1.9 Firestore Security Rules to Apply

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    match /courses/{courseId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'instructor';
    }

    match /lessons/{lessonId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'instructor';
    }

    match /transcriptChunks/{chunkId} {
      allow read: if request.auth != null;
      allow write: if false; // backend only via admin SDK
    }

    match /chatSessions/{sessionId} {
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.studentId;
    }

    match /enrollments/{enrollmentId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 1.10 Firebase Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{lessonId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 5 * 1024 * 1024 * 1024; // 5GB max
    }
  }
}
```

---

## ✅ Phase 1 Done When:
- [ ] `GET http://localhost:5000/api/health` returns `{ status: "ok" }`
- [ ] React app loads at `http://localhost:5173`
- [ ] Google Sign-In works and creates a user document in Firestore
- [ ] User role is stored and readable from AuthContext
- [ ] All .env variables are set and loaded correctly
- [ ] No console errors in browser or terminal

---

## ⏱️ Estimated Time: 2–3 Hours
