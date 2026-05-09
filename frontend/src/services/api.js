/**
 * services/api.js — Demo auth via x-demo-role header
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

function getRole() {
  return localStorage.getItem('demo_role') || 'student';
}

async function apiFetch(path, options = {}) {
  const headers = {
    'x-demo-role': getRole(),
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res  = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data   = data;
    throw err;
  }
  return data;
}

// ── Lesson APIs ───────────────────────────────────────────────────────────────

export async function ingestYoutubeLesson(payload) {
  return apiFetch('/api/lessons/ingest-youtube', { method: 'POST', body: JSON.stringify(payload) });
}

export async function uploadLesson(formData) {
  return apiFetch('/api/lessons/upload', { method: 'POST', body: formData });
}

export async function getLessonStatus(lessonId) {
  return apiFetch(`/api/lessons/${lessonId}/status`);
}

export async function getLesson(lessonId) {
  return apiFetch(`/api/lessons/${lessonId}`);
}

export async function getLessons(courseId) {
  const data = await apiFetch(`/api/lessons?courseId=${courseId}`);
  // Normalize: ensure every lesson has an `id` field (alias for lessonId)
  if (data.lessons) {
    data.lessons = data.lessons.map(l => ({ ...l, id: l.id || l.lessonId }));
  }
  return data;
}


// ── Health ────────────────────────────────────────────────────────────────────
export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  return res.json();
}

// ── Chat APIs ─────────────────────────────────────────────────────────────────

export async function getChatSession(lessonId) {
  return apiFetch(`/api/chat/session/${lessonId}`);
}

export async function deleteChatSession(sessionId) {
  return apiFetch(`/api/chat/session/${sessionId}`, { method: 'DELETE' });
}

export async function getLectureSummary(lessonId, type = 'full', startTime = 0, endTime = 0) {
  return apiFetch('/api/chat/summary', {
    method: 'POST', body: JSON.stringify({ lessonId, type, startTime, endTime }),
  });
}

export async function generateQuiz(lessonId, count = 5, type = 'mcq') {
  return apiFetch('/api/chat/quiz', {
    method: 'POST', body: JSON.stringify({ lessonId, count, type }),
  });
}
