/**
 * QuizPage.jsx — Premium AI Quiz Experience
 * Config → Animated Questions → Timer → Results → Review
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const DIFF_COLOR  = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' };
const DIFF_BG     = { easy: 'rgba(34,197,94,0.08)', medium: 'rgba(245,158,11,0.08)', hard: 'rgba(239,68,68,0.08)' };
const TIMER_SECS  = 30;

/* ── helpers ──────────────────────────────────────────────────────────────── */
function fmtTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

/* ── Config screen ────────────────────────────────────────────────────────── */
function ConfigScreen({ onStart }) {
  const [count, setCount]   = useState(10);
  const [diff,  setDiff]    = useState('mixed');

  const chipStyle = (active) => ({
    padding: '8px 20px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
    fontWeight: 600, transition: 'all 0.15s', border: '1.5px solid',
    borderColor: active ? 'var(--accent)' : 'var(--border)',
    background:  active ? 'var(--accent-light)' : 'var(--bg-card2)',
    color:       active ? 'var(--accent)' : 'var(--text-secondary)',
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'calc(100vh - 60px)', padding:'24px' }}>
      <div style={{ width:'100%', maxWidth:480, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:24, padding:36, boxShadow:'0 30px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:52, marginBottom:12 }}>🧠</div>
          <h1 style={{ margin:'0 0 6px', fontSize:26, fontWeight:800, color:'#fff' }}>AI Quiz</h1>
          <p style={{ margin:0, color:'var(--text-muted)', fontSize:14 }}>Questions generated from this video lecture</p>
        </div>

        <div style={{ marginBottom:24 }}>
          <p style={{ margin:'0 0 10px', fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>NUMBER OF QUESTIONS</p>
          <div style={{ display:'flex', gap:8 }}>
            {[5,10,15].map(n => (
              <button key={n} onClick={() => setCount(n)} style={{ ...chipStyle(count===n), flex:1 }}>{n}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:32 }}>
          <p style={{ margin:'0 0 10px', fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>DIFFICULTY</p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[['mixed','🎲 Mixed'],['easy','🟢 Easy'],['medium','🟡 Medium'],['hard','🔴 Hard']].map(([v,l]) => (
              <button key={v} onClick={() => setDiff(v)} style={{ ...chipStyle(diff===v), flex:'1 0 calc(50% - 4px)' }}>{l}</button>
            ))}
          </div>
        </div>

        <button onClick={() => onStart(count, diff)} className="btn-orange" style={{ width:'100%', padding:'14px', borderRadius:14, fontSize:15, fontWeight:700 }}>
          Start Quiz →
        </button>
      </div>
    </div>
  );
}

/* ── Timer ring ───────────────────────────────────────────────────────────── */
function TimerRing({ seconds, total }) {
  const r = 18, circ = 2 * Math.PI * r;
  const pct = seconds / total;
  const color = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={44} height={44} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
      <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        style={{ transition:'stroke-dashoffset 1s linear, stroke 0.3s' }} />
      <text x={22} y={22} textAnchor="middle" dominantBaseline="central"
        style={{ transform:'rotate(90deg)', transformOrigin:'22px 22px', fill:color, fontSize:11, fontWeight:700 }}>
        {seconds}
      </text>
    </svg>
  );
}

/* ── Question card ────────────────────────────────────────────────────────── */
function QuestionCard({ q, idx, total, score, streak, timeLeft, selected, revealed, onChoose, onConfirm, onNext }) {
  const progress = ((idx) / total) * 100;
  const letter = opt => opt.charAt(0);

  return (
    <div style={{ width:'100%', maxWidth:620, margin:'0 auto', padding:'0 16px' }}>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:600 }}>Q{idx+1} / {total}</span>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {streak >= 2 && <span style={{ fontSize:13, fontWeight:700, color:'#f97316' }}>🔥{streak} streak</span>}
          <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, background:'var(--accent-light)', color:'var(--accent)' }}>
            {score} pts
          </span>
          <TimerRing seconds={timeLeft} total={TIMER_SECS} />
        </div>
      </div>

      {/* Progress */}
      <div style={{ height:4, borderRadius:99, background:'var(--bg-card2)', marginBottom:24, overflow:'hidden' }}>
        <div style={{ width:`${progress}%`, height:'100%', background:'var(--accent)', borderRadius:99, transition:'width 0.4s' }} />
      </div>

      {/* Card */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ padding:'24px 28px 8px' }}>
          {/* Difficulty + topic */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {q.difficulty && (
              <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:DIFF_BG[q.difficulty]||DIFF_BG.medium, color:DIFF_COLOR[q.difficulty]||DIFF_COLOR.medium }}>
                {q.difficulty?.toUpperCase()}
              </span>
            )}
            {q.topic && <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.05)', color:'var(--text-muted)' }}>{q.topic}</span>}
          </div>
          <h2 style={{ margin:'0 0 22px', fontSize:18, fontWeight:700, lineHeight:1.55, color:'#fff' }}>{q.question}</h2>
        </div>

        {/* Options */}
        <div style={{ padding:'0 28px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {q.options.map((opt, i) => {
            const l = letter(opt);
            const isRight = revealed && l === q.answer;
            const isWrong = revealed && selected === opt && l !== q.answer;
            const isSel   = !revealed && selected === opt;
            return (
              <button key={i} onClick={() => onChoose(opt)} style={{
                padding:'13px 16px', borderRadius:13, border:`1.5px solid ${isRight?'rgba(34,197,94,0.5)':isWrong?'rgba(239,68,68,0.5)':isSel?'var(--accent-border)':'var(--border)'}`,
                background: isRight?'rgba(34,197,94,0.1)':isWrong?'rgba(239,68,68,0.1)':isSel?'var(--accent-light)':'var(--bg-card2)',
                color: isRight?'#86efac':isWrong?'#fca5a5':'#fff',
                fontSize:14, fontWeight:500, textAlign:'left', cursor:revealed?'default':'pointer',
                transition:'all 0.15s', display:'flex', alignItems:'center', gap:12,
              }}>
                <span style={{
                  width:28, height:28, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:800, fontSize:12,
                  background: isRight?'rgba(34,197,94,0.2)':isWrong?'rgba(239,68,68,0.2)':isSel?'rgba(249,115,22,0.15)':'rgba(255,255,255,0.06)',
                  color: isRight?'#86efac':isWrong?'#fca5a5':isSel?'var(--accent)':'var(--text-muted)',
                }}>
                  {isRight ? '✓' : isWrong ? '✗' : l}
                </span>
                {opt.substring(3)}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealed && q.explanation && (
          <div style={{ margin:'0 28px 20px', padding:'14px 16px', borderRadius:13, background:'var(--accent-light)', border:'1px solid var(--accent-border)' }}>
            <p style={{ margin:'0 0 6px', fontSize:13, color:'var(--accent)', lineHeight:1.6 }}>
              💡 <strong>Why?</strong> {q.explanation}
            </p>
            {q.startLabel && (
              <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>
                📍 Covered at <span style={{ color:'var(--accent)', fontFamily:'monospace' }}>{q.startLabel}</span> in the lecture
              </p>
            )}
          </div>
        )}

        {/* Action */}
        <div style={{ padding:'0 28px 24px' }}>
          {!revealed ? (
            <button onClick={onConfirm} disabled={!selected} style={{
              width:'100%', padding:'13px', borderRadius:13, border:'none',
              background: selected?'var(--accent)':'var(--bg-hover)',
              color: selected?'#fff':'var(--text-muted)',
              fontWeight:700, fontSize:15, cursor:selected?'pointer':'not-allowed', transition:'all 0.2s',
            }}>
              Check Answer
            </button>
          ) : (
            <button onClick={onNext} className="btn-orange" style={{ width:'100%', padding:'13px', borderRadius:13, fontSize:15 }}>
              {idx+1 >= total ? '🏆 See Results' : 'Next Question →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Results screen ───────────────────────────────────────────────────────── */
function ResultsScreen({ quiz, answers, score, totalTime, onRestart, lessonId }) {
  const [tab, setTab] = useState('overview');
  const pct = Math.round((score / (quiz.length * 10)) * 100);
  const correct = answers.filter(a => a.correct).length;
  const grade = pct >= 80 ? '🏆' : pct >= 60 ? '🎯' : '📚';
  const msg   = pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort!' : 'Keep studying!';
  const maxStreak = answers.reduce((best, _, i) => {
    let s = 0; for (let j = i; j < answers.length && answers[j].correct; j++) s++;
    return Math.max(best, s);
  }, 0);

  const tabStyle = (active) => ({
    padding:'8px 18px', borderRadius:99, fontSize:13, fontWeight:600, cursor:'pointer', border:'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
  });

  return (
    <div style={{ maxWidth:620, margin:'0 auto', padding:'40px 16px' }}>
      {/* Score card */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:24, padding:36, textAlign:'center', marginBottom:16, boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize:60, marginBottom:12 }}>{grade}</div>
        <h1 style={{ margin:'0 0 4px', fontSize:32, fontWeight:900, color:'#fff' }}>{correct}/{quiz.length}</h1>
        <p style={{ margin:'0 0 24px', color:'var(--text-muted)', fontSize:15 }}>{msg}</p>

        {/* Progress ring proxy — CSS bar */}
        <div style={{ height:10, borderRadius:99, background:'var(--bg-card2)', marginBottom:24, overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,var(--accent),#f97316)', borderRadius:99, transition:'width 1s ease' }} />
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', justifyContent:'center', gap:32 }}>
          {[['🎯','Accuracy',`${pct}%`],['⏱️','Time',fmtTime(totalTime)],['🔥','Best streak',maxStreak]].map(([e,l,v]) => (
            <div key={l}>
              <div style={{ fontSize:22 }}>{e}</div>
              <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{v}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:99, padding:4 }}>
        <button style={tabStyle(tab==='overview')} onClick={() => setTab('overview')}>Overview</button>
        <button style={tabStyle(tab==='review')}   onClick={() => setTab('review')}>Review Answers</button>
      </div>

      {tab === 'overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {answers.map((a, i) => (
            <div key={i} style={{ padding:'12px 16px', borderRadius:13, background:'var(--bg-card)', border:`1px solid ${a.correct?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.15)'}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:16 }}>{a.correct ? '✅' : '❌'}</span>
                <span style={{ fontSize:13, fontWeight:600, color:'#fff', flex:1 }}>Q{i+1}: {a.question}</span>
                {a.difficulty && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:DIFF_BG[a.difficulty]||DIFF_BG.medium, color:DIFF_COLOR[a.difficulty]||DIFF_COLOR.medium, fontWeight:700 }}>{a.difficulty}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'review' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {answers.map((a, i) => (
            <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
                <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'#fff' }}>{a.correct?'✅':'❌'} Q{i+1}: {a.question}</p>
                {a.topic && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{a.topic}</span>}
              </div>
              <div style={{ padding:'12px 16px', background: a.correct?'rgba(34,197,94,0.04)':'rgba(239,68,68,0.04)' }}>
                {!a.correct && <p style={{ margin:'0 0 6px', fontSize:12, color:'#fca5a5' }}>Your answer: {a.selected}</p>}
                <p style={{ margin:'0 0 6px', fontSize:12, color:'#86efac' }}>✓ Correct: {a.answer})</p>
                {a.explanation && <p style={{ margin:'0 0 6px', fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>💡 {a.explanation}</p>}
                {a.startLabel && <p style={{ margin:0, fontSize:11, color:'var(--text-muted)' }}>📍 {a.startLabel} in lecture</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'flex', gap:10, marginTop:20 }}>
        <button onClick={onRestart} className="btn-orange" style={{ flex:1, padding:'13px', borderRadius:13, fontSize:14 }}>🔄 Try Again</button>
        <Link to={`/lesson/${lessonId}`} style={{ flex:1, padding:'13px', borderRadius:13, fontSize:14, border:'1px solid var(--border)', color:'#fff', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-card)', fontWeight:600 }}>
          ← Back to Lesson
        </Link>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function QuizPage() {
  const { lessonId } = useParams();

  const [phase,    setPhase]    = useState('config');   // config | loading | quiz | results
  const [quiz,     setQuiz]     = useState([]);
  const [error,    setError]    = useState(null);
  const [current,  setCurrent]  = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score,    setScore]    = useState(0);
  const [streak,   setStreak]   = useState(0);
  const [answers,  setAnswers]  = useState([]);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS);
  const [totalTime,setTotalTime]= useState(0);
  const timerRef  = useRef(null);
  const totalRef  = useRef(null);

  const clearTimers = () => { clearInterval(timerRef.current); clearInterval(totalRef.current); };

  const startTimers = useCallback(() => {
    setTimeLeft(TIMER_SECS);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearTimers(), []);

  const handleTimeout = () => {
    const q = quiz[current];
    if (!q) return;
    setAnswers(a => [...a, { question:q.question, selected:'—', correct:false, answer:`${q.answer}) ...`, explanation:q.explanation, difficulty:q.difficulty, topic:q.topic, startLabel:q.startLabel }]);
    setStreak(0);
    setRevealed(true);
  };

  const startQuiz = async (count, difficulty) => {
    setPhase('loading');
    setError(null);
    try {
      const res  = await fetch('/api/chat/quiz', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-demo-role': localStorage.getItem('demo_role') || 'student' },
        body: JSON.stringify({ lessonId, count, difficulty }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setQuiz(data.questions);
      setCurrent(0); setSelected(null); setRevealed(false);
      setScore(0); setStreak(0); setAnswers([]); setTotalTime(0);
      setPhase('quiz');
      startTimers();
      totalRef.current = setInterval(() => setTotalTime(t => t + 1), 1000);
    } catch (e) {
      setError(e.message);
      setPhase('config');
    }
  };

  const choose = (opt) => { if (!revealed) setSelected(opt); };

  const confirmAnswer = () => {
    if (!selected || revealed) return;
    clearInterval(timerRef.current);
    const q = quiz[current];
    const correct = selected.charAt(0) === q.answer;
    const pts = correct ? (timeLeft > 20 ? 15 : timeLeft > 10 ? 10 : 5) : 0;
    if (correct) { setScore(s => s + pts); setStreak(s => s + 1); }
    else setStreak(0);
    const answerLabel = q.options.find(o => o.charAt(0) === q.answer) || q.answer;
    setAnswers(a => [...a, { question:q.question, selected, correct, answer:answerLabel, explanation:q.explanation, difficulty:q.difficulty, topic:q.topic, startLabel:q.startLabel }]);
    setRevealed(true);
  };

  const next = () => {
    if (current + 1 >= quiz.length) {
      clearTimers();
      setPhase('results');
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setRevealed(false);
      startTimers();
    }
  };

  const restart = () => {
    clearTimers();
    setPhase('config');
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)' }}>
      <Navbar />
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity:0; transform:translateY(18px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .quiz-animate { animation: fadeSlideIn 0.3s ease; }
      `}</style>

      {phase === 'config' && (
        <div className="quiz-animate">
          {error && (
            <div style={{ maxWidth:500, margin:'16px auto 0', padding:'12px 16px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontSize:13 }}>
              ⚠️ {error}
            </div>
          )}
          <ConfigScreen onStart={startQuiz} />
        </div>
      )}

      {phase === 'loading' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'calc(100vh - 60px)', gap:16 }}>
          <div style={{ width:52, height:52, border:'3px solid var(--bg-card2)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>Generating your personalised quiz…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {phase === 'quiz' && quiz[current] && (
        <div className="quiz-animate" style={{ paddingTop:32, paddingBottom:40 }}>
          <QuestionCard
            q={quiz[current]} idx={current} total={quiz.length}
            score={score} streak={streak} timeLeft={timeLeft}
            selected={selected} revealed={revealed}
            onChoose={choose} onConfirm={confirmAnswer} onNext={next}
          />
        </div>
      )}

      {phase === 'results' && (
        <div className="quiz-animate">
          <ResultsScreen quiz={quiz} answers={answers} score={score} totalTime={totalTime} onRestart={restart} lessonId={lessonId} />
        </div>
      )}
    </div>
  );
}
