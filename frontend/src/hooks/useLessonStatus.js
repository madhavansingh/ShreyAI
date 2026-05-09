/**
 * hooks/useLessonStatus.js
 * Polls GET /api/lessons/:lessonId/status every 3 seconds until ready or failed.
 */
import { useState, useEffect, useRef } from 'react';
import { getLessonStatus } from '../services/api';

const POLL_INTERVAL_MS = 3000;

export function useLessonStatus(lessonId, enabled = true) {
  const [status, setStatus]     = useState(null);   // 'processing' | 'transcribing' | 'embedding' | 'ready' | 'failed'
  const [progress, setProgress] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!lessonId || !enabled) return;

    const poll = async () => {
      try {
        const data = await getLessonStatus(lessonId);
        setStatus(data.status);
        setProgress(data.progress || 0);
        setChunkCount(data.chunkCount || 0);
        setError(data.error || null);
        setLoading(false);

        // Stop polling when terminal state reached
        if (data.status === 'ready' || data.status === 'failed') {
          clearInterval(intervalRef.current);
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
        clearInterval(intervalRef.current);
      }
    };

    poll(); // Immediate first call
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [lessonId, enabled]);

  return { status, progress, chunkCount, error, loading };
}
