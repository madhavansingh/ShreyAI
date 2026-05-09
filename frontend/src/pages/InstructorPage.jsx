/**
 * pages/InstructorPage.jsx — Sheryians dark theme with orange accent
 */
import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { ingestYoutubeLesson, uploadLesson } from '../services/api';
import { useLessonStatus } from '../hooks/useLessonStatus';
import LessonStatusBadge from '../components/LessonStatusBadge';
import Navbar from '../components/Navbar';

const DEFAULT_COURSE_ID = 'demo-course-001';

function LessonRow({ lesson }) {
  const { status, progress, chunkCount, error } = useLessonStatus(
    lesson.lessonId,
    lesson.status !== 'ready' && lesson.status !== 'failed'
  );
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '14px 20px', borderBottom: '1px solid var(--border)', gap: 12,
    }}>
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#fff' }}>{lesson.title}</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
          {lesson.source === 'youtube' ? '🎬 YouTube' : '📁 Upload'}
          {lesson.youtubeUrl ? ` · ${lesson.youtubeUrl.substring(0, 42)}…` : ''}
        </p>
      </div>
      <LessonStatusBadge status={status || lesson.status} progress={progress} chunkCount={chunkCount} error={error} />
    </div>
  );
}

export default function InstructorPage() {
  const [activeTab,   setActiveTab]   = useState('youtube');
  const [lessons,     setLessons]     = useState([]);
  const [submitting,  setSubmitting]  = useState(false);
  const fileInputRef = useRef(null);

  const [ytForm, setYtForm] = useState({ title: '', description: '', youtubeUrl: '', courseId: DEFAULT_COURSE_ID, order: 1 });
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', courseId: DEFAULT_COURSE_ID, language: 'auto', order: 1 });
  const [selectedFile, setSelectedFile] = useState(null);

  const handleYoutubeSubmit = async (e) => {
    e.preventDefault();
    if (!ytForm.youtubeUrl || !ytForm.title) return toast.error('Title and YouTube URL required');
    setSubmitting(true);
    try {
      const res = await ingestYoutubeLesson(ytForm);
      setLessons(prev => [{ lessonId: res.lessonId, title: ytForm.title, source: 'youtube', youtubeUrl: ytForm.youtubeUrl, status: 'processing' }, ...prev]);
      toast.success('Lesson created! Processing in background…');
      setYtForm(f => ({ ...f, title: '', description: '', youtubeUrl: '' }));
    } catch (err) { toast.error(err.message || 'Failed to ingest lesson'); }
    finally { setSubmitting(false); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) { toast.error('Max 500MB'); return; }
    setSelectedFile(file);
    if (!uploadForm.title) setUploadForm(f => ({ ...f, title: file.name.replace(/\.[^/.]+$/, '') }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return toast.error('Please select a video file');
    if (!uploadForm.title) return toast.error('Title required');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      Object.entries(uploadForm).forEach(([k, v]) => fd.append(k, v));
      const res = await uploadLesson(fd);
      setLessons(prev => [{ lessonId: res.lessonId, title: uploadForm.title, source: 'upload', status: 'uploading' }, ...prev]);
      toast.success('Video uploading! Processing will start automatically.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadForm(f => ({ ...f, title: '', description: '' }));
    } catch (err) { toast.error(err.message || 'Upload failed'); }
    finally { setSubmitting(false); }
  };

  const card = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 16, overflow: 'hidden',
  };
  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 10, color: '#fff', fontSize: 14,
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 };
  const btnPrimary = {
    padding: '11px 24px', borderRadius: 10, border: 'none',
    cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14,
    background: submitting ? 'var(--bg-hover)' : 'var(--accent)',
    color: '#fff', opacity: submitting ? 0.6 : 1, transition: 'all 0.2s', fontFamily: 'inherit',
  };
  const tabBtn = (id) => ({
    padding: '9px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 13, fontFamily: 'inherit', transition: 'all 0.2s',
    background: activeTab === id ? 'var(--accent-light)' : 'transparent',
    color:      activeTab === id ? 'var(--accent)'       : 'var(--text-muted)',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: "'Inter', sans-serif", color: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800 }}>
            Instructor Studio
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
            Add lessons via YouTube URL or upload a video. AI transcribes and indexes it automatically.
          </p>
        </div>

        {/* Add Lesson Card */}
        <div style={{ ...card, marginBottom: 28 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, padding: '16px 20px 0', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
            <button style={tabBtn('youtube')} onClick={() => setActiveTab('youtube')}>🎬 YouTube URL</button>
            <button style={tabBtn('upload')}  onClick={() => setActiveTab('upload')}>📁 Upload Video</button>
          </div>

          <div style={{ padding: 24 }}>
            {/* YouTube Tab */}
            {activeTab === 'youtube' && (
              <form onSubmit={handleYoutubeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Lesson Title *</label>
                  <input style={inputStyle} placeholder="e.g. Introduction to Machine Learning"
                    value={ytForm.title} onChange={e => setYtForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label style={labelStyle}>YouTube URL *</label>
                  <input style={inputStyle} placeholder="https://www.youtube.com/watch?v=..."
                    value={ytForm.youtubeUrl} onChange={e => setYtForm(f => ({ ...f, youtubeUrl: e.target.value }))} required />
                </div>
                <div>
                  <label style={labelStyle}>Description (optional)</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                    placeholder="What is this lesson about?"
                    value={ytForm.description} onChange={e => setYtForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button type="submit" style={btnPrimary} disabled={submitting}>
                    {submitting ? '⏳ Submitting…' : '🚀 Create Lesson'}
                  </button>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Transcription takes 1–3 minutes. You can leave this page.
                  </p>
                </div>
              </form>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Video File * (MP4, WebM, MOV — max 500MB)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleFileChange({ target: { files: e.dataTransfer.files } }); }}
                    style={{
                      border: '2px dashed var(--accent-border)', borderRadius: 12,
                      padding: 28, textAlign: 'center', cursor: 'pointer',
                      background: 'rgba(232,87,42,0.03)', transition: 'background 0.2s',
                    }}
                  >
                    <input ref={fileInputRef} type="file" accept="video/*,audio/*"
                      style={{ display: 'none' }} onChange={handleFileChange} />
                    {selectedFile ? (
                      <div>
                        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 600 }}>📎 {selectedFile.name}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: '0 0 8px', fontSize: 36 }}>📤</p>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
                          Click or drag & drop your video here
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Lesson Title *</label>
                  <input style={inputStyle} placeholder="e.g. Lecture 3 — Gradient Descent"
                    value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label style={labelStyle}>Language</label>
                  <select style={inputStyle} value={uploadForm.language}
                    onChange={e => setUploadForm(f => ({ ...f, language: e.target.value }))}>
                    <option value="auto">Auto-detect (recommended)</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi / Hinglish</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Description (optional)</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                    placeholder="What is this lecture about?"
                    value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button type="submit" style={btnPrimary} disabled={submitting || !selectedFile}>
                    {submitting ? '⏳ Uploading…' : '📤 Upload & Process'}
                  </button>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Supports Hindi, Hinglish, and accented English.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Lessons list */}
        {lessons.length > 0 && (
          <div style={card}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Session Lessons</h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Updates every 3 seconds automatically.</p>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>
                {lessons.length}
              </span>
            </div>
            {lessons.map(l => <LessonRow key={l.lessonId} lesson={l} />)}
          </div>
        )}

        {/* Empty state */}
        {lessons.length === 0 && (
          <div style={{ ...card, textAlign: 'center', padding: 56 }}>
            <p style={{ fontSize: 48, margin: '0 0 14px' }}>🎓</p>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
              No lessons added yet. Use the form above to get started.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        input::placeholder, textarea::placeholder { color: var(--text-muted); }
        input:focus, textarea:focus, select:focus {
          border-color: var(--accent-border) !important;
          box-shadow: 0 0 0 3px rgba(232,87,42,0.12);
        }
        select option { background: var(--bg-card); color: #fff; }
      `}</style>
    </div>
  );
}
