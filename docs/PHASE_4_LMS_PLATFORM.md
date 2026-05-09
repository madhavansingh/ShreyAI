# Phase 4 — LMS Platform (Frontend + Backend)
## Goal: A real, working LMS with course catalog, enrollment, video player, instructor dashboard, student dashboard, and the AI chat panel fully integrated.

---

## 4.1 Pages to Build

| Page | Route | Who Sees It |
|---|---|---|
| Home / Course Catalog | `/` | Everyone (public) |
| Login | `/login` | Unauthenticated users |
| Course Detail | `/course/:courseId` | Everyone |
| Video Player + AI Chat | `/lesson/:lessonId` | Enrolled students + Instructors |
| Student Dashboard | `/dashboard` | Students |
| Instructor Dashboard | `/instructor` | Instructors only |
| Create Course | `/instructor/create-course` | Instructors only |
| Course Manager | `/instructor/course/:courseId` | Instructor who owns the course |
| 404 | `*` | Everyone |

---

## 4.2 Backend Routes to Build

### Courses

**POST `/api/courses`** (instructor only)
- Create course document in Firestore
- Fields: title, description, thumbnailUrl, category, instructorId, instructorName
- Add courseId to instructor's `createdCourseIds` array

**GET `/api/courses`**
- List all courses (public)
- Optional query params: `?category=`, `?search=`
- Return array of course documents (without modules detail, just metadata)

**GET `/api/courses/:courseId`**
- Return full course document including modules array
- Include lessons metadata for each module (title, duration, status, order)

**PUT `/api/courses/:courseId`** (instructor, must own course)
- Update course title, description, thumbnail, category
- Add/reorder/remove modules

---

### Lessons

**POST `/api/lessons`** (instructor only)
- Create a lesson entry (without video yet)
- Link to courseId + moduleId
- Returns lessonId

(The actual video ingest — YouTube or upload — is handled by Phase 2 endpoints)

**GET `/api/lessons/:lessonId`**
- Return lesson metadata: title, duration, status, sourceType, starterQuestions, topicSegments
- Does NOT return transcript chunks (those are fetched internally by chat API)

**DELETE `/api/lessons/:lessonId`** (instructor only)
- Delete lesson + all its transcriptChunks from Firestore
- Delete video from Firebase Storage if it was an upload
- Invalidate chunk cache

---

### Enrollments

**POST `/api/enrollments`** (student only)
- Body: `{ courseId }`
- Create enrollment document: `{ studentId, courseId, enrolledAt, completedLessonIds: [], lessonProgress: {} }`
- Add courseId to student's `enrolledCourseIds` array

**GET `/api/enrollments/my-courses`** (student only)
- Return all courses the student is enrolled in with their progress

**PATCH `/api/enrollments/progress`** (student only)
- Body: `{ courseId, lessonId, watchedSeconds }`
- Update `lessonProgress[lessonId]` in enrollment document
- If `watchedSeconds >= lesson.duration * 0.9` (90% watched) → add to `completedLessonIds`
- Called from video player every 30 seconds

---

## 4.3 Frontend Pages — Detailed Spec

### Page: Home / Course Catalog (`/`)

**Layout:**
- Top navbar: Logo, "Browse Courses", Login/Profile button
- Hero section: Headline, subheadline, "Start Learning" CTA button
- Filter bar: Category pills (All, Machine Learning, Python, Web Dev, etc.)
- Course grid: 3 columns on desktop, 1 on mobile
- Each course card: thumbnail, title, instructor name, lesson count, category badge

**Course Card on click:** Navigate to `/course/:courseId`

**Search:** Search bar filters courses by title in real-time (client-side filter on loaded courses list)

---

### Page: Login (`/login`)

- Google Sign-In button (primary)
- Email/Password form (secondary)
- On first Google login: show role selection modal — "I am a Student" / "I am an Instructor"
- Save role to Firestore `users` document
- Redirect: students → `/dashboard`, instructors → `/instructor`

---

### Page: Course Detail (`/course/:courseId`)

**Layout:**
- Course thumbnail (hero banner)
- Course title, instructor name, category, enrollment count
- "Enroll Now" button (if not enrolled) or "Continue Learning" (if enrolled)
- Description section
- Curriculum accordion: Modules → Lessons list
  - Each lesson row: lesson title, duration, lock icon if not enrolled
  - If enrolled: lesson title is clickable → navigates to `/lesson/:lessonId`
- Instructor section: name, avatar

---

### Page: Video Player + AI Chat (`/lesson/:lessonId`)

**This is the most important page. It has two panels side by side.**

**Left Panel — Video Player (60% width on desktop)**
- Use `react-player` component
- Supports both YouTube URLs and direct Firebase Storage video URLs
- Show lesson title above player
- Below player: course name → module name → lesson name breadcrumb
- Topic Timeline Sidebar (collapsible):
  - List of topic segments with timestamps
  - Each item clickable → seeks video to that timestamp
- Next/Previous lesson navigation buttons
- Mark as Complete button (calls progress API)

**Right Panel — AI Chat Panel (40% width on desktop)**
- Header: "AI Learning Companion" title + Clear Chat button + Summary buttons
- Starter Questions section (shown when no messages yet):
  - Heading: "Not sure what to ask? Try:"
  - 5 question chips from lesson `starterQuestions`
  - Clicking a chip sends it as the first message
- Messages area (scrollable):
  - User messages: right aligned, colored bubble
  - AI messages: left aligned, white card
  - AI messages: render timestamp chips inline (see Phase 3 spec)
  - Streaming message shows animated cursor while typing
- Follow-up chips: shown below last AI message, 3 chips
- Input area at bottom:
  - Text input (multiline, Enter to send, Shift+Enter for new line)
  - Send button
  - Processing status badge: "AI Ready" (green) or "Processing..." (yellow) based on lesson status

**Mobile layout:** Stack vertically — video on top, chat below (collapsible)

---

### Page: Student Dashboard (`/dashboard`)

**Layout:**
- Welcome message: "Welcome back, {name}"
- "Continue Learning" section: Last 3 accessed lessons with progress bar
- "My Courses" grid: All enrolled courses with progress percentage
- Each course card: thumbnail, title, progress bar (`completedLessons / totalLessons`)
- Click course card → go to Course Detail page

---

### Page: Instructor Dashboard (`/instructor`)

**Layout:**
- "My Courses" section: List of courses the instructor created
  - Each row: course title, lesson count, enrolled students count
  - Edit button → Course Manager page
- "Create New Course" button → Create Course page
- Quick stats: Total courses, Total lessons, Total students enrolled

---

### Page: Create Course (`/instructor/create-course`)

**Form fields:**
- Course title (required)
- Description (required, textarea)
- Category (dropdown: Machine Learning, Python, Web Dev, Data Science, etc.)
- Thumbnail image (upload to Firebase Storage)

On submit: POST `/api/courses` → redirect to Course Manager for the new course

---

### Page: Course Manager (`/instructor/course/:courseId`)

**Layout:**
- Course info at top (editable)
- Modules section (add/remove/reorder modules)
- Each module: expandable → shows lessons inside
- "Add Lesson" button inside each module → opens modal

**Add Lesson Modal:**
- Lesson title (required)
- Lesson description
- Video source: radio buttons — "YouTube URL" or "Upload Video"
- If YouTube: URL input field
- If Upload: file picker (accepts .mp4, .webm, .mov)
- Language selector: Auto-detect / English / Hindi / Hinglish
- On submit: call appropriate ingest endpoint (Phase 2)
- After submit: show lesson in list with status badge showing progress

**Lesson Status Badge:**
- 🔴 Failed — with retry button
- 🟡 Uploading / Transcribing / Embedding — with animated spinner + percentage
- 🟢 Ready — clickable to preview

**Frontend polls `/api/lessons/:lessonId/status` every 3 seconds for lessons that are not yet "ready"**

---

## 4.4 Shared UI Components to Build

| Component | Description |
|---|---|
| `Navbar` | Logo, navigation links, user avatar dropdown (profile, switch role, sign out) |
| `CourseCard` | Thumbnail, title, instructor, category badge, lesson count |
| `LessonRow` | Title, duration, completion checkmark, lock icon |
| `TimestampChip` | Clickable pill that seeks video. Props: startTime, endTime, label |
| `StatusBadge` | Color-coded badge for lesson processing status |
| `ProgressBar` | Animated fill bar. Props: current, total |
| `ChatMessage` | Renders message with timestamp chips parsed inline |
| `FollowUpChips` | Row of 3 clickable question suggestion chips |
| `TopicSidebar` | List of topic segments, clickable |
| `SummaryModal` | Modal showing generated summary with close button |
| `LoadingSpinner` | Centered animated spinner |
| `Toast` | Success/error notifications via react-hot-toast |

---

## 4.5 Design System (Apply Consistently)

**Colors:**
- Primary: Deep indigo `#4F46E5`
- Accent: Violet `#7C3AED`
- Background: `#0F0F1A` (dark) or `#F8FAFC` (light)
- Chat user bubble: `#4F46E5`
- Chat AI card: white with subtle border
- Success: `#10B981` | Warning: `#F59E0B` | Error: `#EF4444`

**Typography:**
- Font: Inter (Google Fonts)
- Heading: `font-bold text-2xl`
- Body: `text-base`
- Caption: `text-sm text-gray-500`

**Animations (Framer Motion):**
- Chat messages: slide-in from bottom, fade-in
- Streaming text: cursor blink animation
- Follow-up chips: stagger fade-in (100ms delay each)
- Page transitions: fade between routes
- Course cards: subtle scale-up on hover

---

## 4.6 Backend Routes for Instructor Statistics

**GET `/api/instructor/stats`** (instructor only)
- Total courses created
- Total lessons across all courses
- Total unique students enrolled across all courses
- Most asked question per lesson (from chatSessions — aggregated)

---

## ✅ Phase 4 Done When:
- [ ] Instructor can create a course, add modules, upload a video, and see it processed
- [ ] Student can browse courses, enroll, and access lesson page
- [ ] Video plays correctly (YouTube and uploaded)
- [ ] AI chat panel appears beside the video
- [ ] Starter questions show when chat first opens
- [ ] Topic sidebar shows and clicking seeks video
- [ ] Progress is saved when student watches lessons
- [ ] Student dashboard shows enrolled courses with progress
- [ ] Instructor dashboard shows all their courses
- [ ] All pages are mobile-responsive
- [ ] Unauthenticated users can't access protected pages

## ⏱️ Estimated Time: 4–5 Hours
