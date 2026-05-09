/**
 * pages/QuizPage.jsx — Sheryians-style quiz with orange accent + Navbar
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

export default function QuizPage() {
  const { lessonId } = useParams();
  const [quiz,     setQuiz]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [current,  setCurrent]  = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score,    setScore]    = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers,  setAnswers]  = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/chat/quiz`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ lessonId, count: 5, type: 'mcq' }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setQuiz(data.questions);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [lessonId]);

  const choose = (opt) => { if (!revealed) setSelected(opt); };

  const confirmAnswer = () => {
    if (!selected) return;
    const q       = quiz[current];
    const correct = selected.startsWith(q.answer);
    if (correct) setScore(s => s + 1);
    setAnswers(a => [...a, { question: q.question, selected, correct, answer: q.answer, explanation: q.explanation }]);
    setRevealed(true);
  };

  const next = () => {
    if (current + 1 >= quiz.length) { setFinished(true); }
    else { setCurrent(c => c + 1); setSelected(null); setRevealed(false); }
  };

  const restart = () => {
    setCurrent(0); setSelected(null); setRevealed(false);
    setScore(0); setFinished(false); setAnswers([]);
  };

  const pct = quiz.length > 0 ? Math.round((score / quiz.length) * 100) : 0;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)', gap: 16 }}>
        <div style={{ fontSize: 48, animation: 'spin 1s linear infinite' }}>⟳</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Generating quiz with AI…</p>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)', gap: 16 }}>
        <p style={{ fontSize: 40 }}>⚠️</p>
        <p style={{ color: 'var(--red)', fontSize: 14 }}>{error}</p>
        <Link to={`/lesson/${lessonId}`} style={{ color: 'var(--accent)', fontSize: 13 }}>← Back to Lesson</Link>
      </div>
    </div>
  );

  /* ── Results screen ─────────────────────────────────────────────────────── */
  if (finished) {
    const grade = pct >= 80 ? '🏆' : pct >= 60 ? '🎯' : '📚';
    const msg   = pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : 'Keep studying!';
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <Navbar />
        <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 36, textAlign: 'center',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{grade}</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: '#fff' }}>
              {score}/{quiz.length} — {pct}%
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 28px', fontSize: 16 }}>{msg}</p>

            {/* Score bar */}
            <div className="progress-bar" style={{ height: 10, marginBottom: 32 }}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>

            {/* Answer review */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, textAlign: 'left' }}>
              {answers.map((a, i) => (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: a.correct ? 'var(--green-bg)' : 'rgba(239,68,68,0.06)',
                  border: `1px solid ${a.correct ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#fff' }}>
                    {a.correct ? '✅' : '❌'} Q{i+1}: {a.question}
                  </p>
                  {!a.correct && (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                      Correct: <strong style={{ color: 'var(--green)' }}>{a.answer})</strong> · {a.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={restart} className="btn-orange" style={{ padding: '11px 24px', fontSize: 14 }}>
                🔄 Try Again
              </button>
              <Link to={`/lesson/${lessonId}`} className="btn-ghost" style={{ padding: '11px 24px', fontSize: 14 }}>
                ← Back to Lesson
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = quiz[current];

  /* ── Question screen ────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 24px' }}>
        {/* Back link */}
        <Link to={`/lesson/${lessonId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
          ← Back to Lesson
        </Link>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}>
          {/* Progress bar */}
          <div style={{ background: 'var(--bg-card2)', height: 4 }}>
            <div style={{
              width: `${(current / quiz.length) * 100}%`, height: '100%',
              background: 'var(--accent)', transition: 'width 0.3s',
            }} />
          </div>

          <div style={{ padding: '24px 28px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                Question {current + 1} of {quiz.length}
              </span>
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: 'var(--accent-light)', color: 'var(--accent)',
              }}>
                Score: {score}
              </span>
            </div>

            {/* Question */}
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, lineHeight: 1.5, color: '#fff' }}>
              {q.question}
            </h2>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {q.options.map((opt, i) => {
                const letter  = opt.charAt(0);
                const isRight = revealed && letter === q.answer;
                const isWrong = revealed && selected === opt && letter !== q.answer;
                const isSel   = selected === opt && !revealed;
                return (
                  <button
                    key={i}
                    onClick={() => choose(opt)}
                    style={{
                      padding:     '13px 16px',
                      borderRadius: 12,
                      border:      `1.5px solid ${
                        isRight ? 'rgba(34,197,94,0.5)'
                      : isWrong ? 'rgba(239,68,68,0.5)'
                      : isSel   ? 'var(--accent-border)'
                      : 'var(--border)'}`,
                      background:  isRight ? 'var(--green-bg)'
                                 : isWrong ? 'rgba(239,68,68,0.08)'
                                 : isSel   ? 'var(--accent-light)'
                                 : 'var(--bg-card2)',
                      color:       isRight ? 'var(--green)' : isWrong ? '#fca5a5' : '#fff',
                      fontSize:    14, fontWeight: 500,
                      textAlign:   'left', cursor: revealed ? 'default' : 'pointer',
                      transition:  'all 0.15s',
                      display:     'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: isRight ? 'rgba(34,197,94,0.2)' : isWrong ? 'rgba(239,68,68,0.2)' : isSel ? 'var(--accent-light)' : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 12,
                      color: isRight ? 'var(--green)' : isWrong ? '#fca5a5' : isSel ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {isRight ? '✓' : isWrong ? '✗' : letter}
                    </span>
                    {opt.substring(3)}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {revealed && q.explanation && (
              <div style={{
                padding: '12px 16px', borderRadius: 12,
                background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
                marginBottom: 20,
              }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--accent)', lineHeight: 1.6 }}>
                  💡 <strong>Explanation:</strong> {q.explanation}
                </p>
                {q.startLabel && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                    📍 Covered at <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{q.startLabel}</span> in the lecture
                  </p>
                )}
              </div>
            )}

            {/* Action button */}
            {!revealed ? (
              <button
                onClick={confirmAnswer}
                disabled={!selected}
                className={selected ? 'btn-orange' : ''}
                style={{
                  width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                  cursor: selected ? 'pointer' : 'not-allowed',
                  background: selected ? 'var(--accent)' : 'var(--bg-hover)',
                  color: selected ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: 15, transition: 'all 0.2s',
                }}
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={next}
                className="btn-orange"
                style={{ width: '100%', padding: '13px', borderRadius: 12, fontSize: 15 }}
              >
                {current + 1 >= quiz.length ? '🏆 See Results' : 'Next Question →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
