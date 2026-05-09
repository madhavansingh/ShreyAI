# Phase 3 — AI Chat Engine
## Goal: Students ask questions and get real-time streaming answers with timestamp citations, follow-up suggestions, and smart summaries.

---

## 3.1 What This Phase Builds

```
Student types question
       ↓
Embed question → Find top-5 relevant chunks (cosine similarity)
       ↓
Build RAG prompt (system role + chunks + chat history + question)
       ↓
Stream Gemini response token-by-token via SSE
       ↓
Frontend renders streaming text + parses timestamps into clickable chips
       ↓
Generate 3 follow-up suggestions after answer completes
       ↓
Save message to chatSessions in Firestore
```

---

## 3.2 Backend Routes to Build

### POST `/api/chat/stream`
**Auth required:** Yes  
**Content-Type:** `application/json`  
**Response-Type:** `text/event-stream` (SSE)

**Request body:**
```json
{
  "lessonId": "string",
  "sessionId": "string (UUID from frontend)",
  "message": "string (student question)",
  "currentTime": 0
}
```

**`currentTime`** = current playback position in seconds (so AI knows what part they're watching)

**What it does (step by step):**
1. Set SSE headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
2. Load lesson document from Firestore to verify it exists and status is `"ready"`
3. If status not `"ready"` → send SSE event `{ type: "error", message: "Video is still processing" }` → close
4. Load chat session from Firestore (or create new one if sessionId not found)
5. Embed the student question using `embeddingService.embedSingleText(message)`
6. Load chunks from in-memory cache using `chunkCache.getChunks(lessonId)`
7. Run `findTopKChunks(questionEmbedding, allChunks, k=7)` — get top 7 relevant chunks
8. Also include 2 chunks near `currentTime` (temporal context — what they're currently watching)
9. Deduplicate chunks (in case temporal chunks overlap with semantic top-k)
10. Build the RAG prompt (see section 3.3)
11. Call Gemini Flash with `generateContentStream()` for streaming
12. For each token received: send SSE event `{ type: "token", content: "..." }`
13. After stream ends: collect full response text
14. Extract all timestamps from response using regex `\((\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)\)`
15. Call `generateFollowUpQuestions(fullResponse, lessonId)` (see 3.4)
16. Send SSE event `{ type: "followUps", items: ["...", "...", "..."] }`
17. Send SSE event `{ type: "done" }`
18. Close SSE connection
19. Save message pair to Firestore `chatSessions` (non-blocking, fire and forget)

---

### POST `/api/chat/summary`
**Auth required:** Yes

**Request body:**
```json
{
  "lessonId": "string",
  "type": "full | last5min | range",
  "startTime": 0,
  "endTime": 300
}
```

**What it does:**
- `full`: Take first + last 20 chunks, generate complete lecture summary
- `last5min`: Load chunks where `startTime >= (totalDuration - 300)`, summarize
- `range`: Load chunks within startTime-endTime range, summarize
- Call Gemini Flash (not streaming) with summary prompt
- Return full summary text in JSON response

---

### POST `/api/chat/quiz`
**Auth required:** Yes

**Request body:**
```json
{
  "lessonId": "string",
  "count": 5,
  "type": "mcq | short"
}
```

**What it does:**
- Load 20 random chunks from the lesson (spread across full duration)
- Send to Gemini with prompt to generate MCQs
- Return structured JSON: `[{ question, options: [A,B,C,D], answer, explanation, timestamp }]`

---

### GET `/api/chat/session/:lessonId`
**Auth required:** Yes

Returns existing chat session for this student + lesson combo.
- Query: `chatSessions` where `lessonId == lessonId` AND `studentId == req.user.uid`
- Returns the most recent session
- Frontend uses this to restore conversation on page refresh

---

### DELETE `/api/chat/session/:sessionId`
**Auth required:** Yes (must own the session)

Clears conversation history. Student can start fresh.

---

## 3.3 RAG Prompt Structure

The prompt sent to Gemini must be structured exactly like this:

**System Instruction (set as systemInstruction field, not in user message):**
```
You are an AI Learning Companion built into an LMS (Learning Management System).
You help students understand video lectures by answering questions based strictly on the lecture transcript.

Rules you must always follow:
1. Answer ONLY from the provided transcript chunks. Never use outside knowledge.
2. Always cite timestamps in format (MM:SS - MM:SS) when referencing content.
3. If the answer is not in the provided chunks, say: "This topic isn't covered in the provided transcript sections. Try asking about [suggest related topic from chunks]."
4. Keep answers clear, educational, and structured. Use bullet points for lists.
5. The student is currently watching at {currentTimeLabel}. Prioritize content near this timestamp when relevant.
6. Respond in the same language the student used to ask the question.
```

**User message structure:**
```
TRANSCRIPT CONTEXT (most relevant sections):

[Chunk 1 - 14:32 - 15:02]
Text of chunk here...

[Chunk 2 - 08:10 - 08:40]
Text of chunk here...

[...up to 9 chunks total]

---
STUDENT QUESTION: {student question}
```

**Conversation history:** Pass last 6 messages (3 exchanges) as `contents` array in Gemini API format. This gives session memory without exceeding token limits.

---

## 3.4 Follow-Up Question Generation

#### `generateFollowUpQuestions(aiAnswer, lessonId)`
- Separate Gemini call (not streaming, fast)
- Prompt: "Based on this AI answer about a lecture: '{aiAnswer}' — suggest 3 natural follow-up questions a student might ask next. Return as JSON array of 3 short strings under 12 words each."
- Parse JSON response
- Fallback if parse fails: return 3 generic questions like ["Can you summarize this section?", "Give me an example", "What comes after this topic?"]

---

## 3.5 Firestore Chat Session Structure

Collection: `chatSessions`  
Document ID: `{studentId}_{lessonId}_{sessionId}`

```json
{
  "sessionId": "uuid",
  "lessonId": "string",
  "studentId": "string",
  "messages": [
    {
      "role": "user",
      "content": "What is gradient descent?",
      "timestamp": "firestore timestamp"
    },
    {
      "role": "assistant",
      "content": "Gradient descent is an optimization algorithm... (14:32 - 15:10)",
      "followUps": ["What is the learning rate?", "How does backpropagation work?", "Summarize this section"],
      "timestamp": "firestore timestamp"
    }
  ],
  "updatedAt": "firestore timestamp"
}
```

**Important:** Only keep last 20 messages in array (use array splice before saving). Prevents unbounded growth.

---

## 3.6 Timestamp Parsing (Frontend)

After receiving the full AI response, the frontend must parse timestamps and render clickable chips.

**Regex pattern:** `/\((\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)\)/g`

**Parse logic:**
- Find all `(MM:SS - MM:SS)` matches in the response text
- For each match: convert start time to seconds using `labelToSeconds()`
- Replace the text match with a `<TimestampChip>` React component
- Render response text as mix of plain text and chip components

**TimestampChip component behavior:**
- Displays as colored pill: `▶ 14:32 - 15:10`
- On click: call `player.seekTo(startTimeInSeconds)` on the video player ref
- Hover: show tooltip "Jump to this moment"

---

## 3.7 SSE Hook (Frontend)

Create `hooks/useChat.js`:

```
State: messages[], isStreaming, currentStreamText, followUps, error

sendMessage(text):
  1. Add user message to messages array immediately
  2. Set isStreaming = true, currentStreamText = ""
  3. Open SSE connection: fetch('/api/chat/stream', { method: POST, body: ... })
  4. Read stream with ReadableStream API
  5. Parse each SSE event:
     - type "token"   → append to currentStreamText
     - type "followUps" → set followUps state
     - type "error"   → set error state
     - type "done"    → add complete AI message to messages[], set isStreaming = false
  6. Handle fetch errors (network failure, 500 errors)

clearSession():
  Call DELETE /api/chat/session/:sessionId
  Reset messages to []
```

---

## 3.8 Summary Feature (Frontend)

Three buttons in the chat panel header:
- **"Full Summary"** → POST `/api/chat/summary` with `type: "full"`
- **"Last 5 Min"** → POST `/api/chat/summary` with `type: "last5min"`
- **"This Section"** → POST `/api/chat/summary` with `type: "range"`, startTime/endTime from current playback position ± 5 minutes

Show loading spinner while waiting. Display summary in a modal or inline in chat.

---

## 3.9 Error Handling

| Error Case | How to Handle |
|---|---|
| Gemini rate limit (429) | Retry after 2 seconds, up to 3 times. Show "Please wait..." to user |
| Video not ready | Show "Video is still processing. Chatbot available once ready." |
| No relevant chunks found | Tell user "This topic doesn't seem to be covered in the video" |
| SSE connection drops | Auto-reconnect once. If fails again, show "Connection lost. Please try again." |
| AssemblyAI timeout | Mark lesson as failed, show error with option to retry |
| YouTube has no captions | Return helpful error: "This YouTube video has no captions. Download and upload the video file instead." |

---

## ✅ Phase 3 Done When:
- [ ] Ask a question → get streaming response with visible typing effect
- [ ] Response contains timestamps in `(MM:SS - MM:SS)` format
- [ ] Clicking timestamp chip seeks video to correct position
- [ ] 3 follow-up chips appear after every answer
- [ ] Clicking a follow-up chip sends it as the next question
- [ ] Ask in Hindi → get answer in Hindi
- [ ] Full summary works for a 1-hour video
- [ ] Last 5-minute summary works
- [ ] Conversation history maintained across 6+ turns
- [ ] Page refresh restores previous conversation
- [ ] Rate limit errors handled gracefully (no crash, user sees friendly message)

## ⏱️ Estimated Time: 3–4 Hours
