/**
 * LandingPage.jsx — Full landing page using the 5 provided components
 * Integrates: LandingPage structure + HeroDemo + ExplanationPanel + CodeEditor + AIChat
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroDemo, { VideoStudio, AIVideoChat } from '../components/HeroDemo';
import '../landing.css';

// ── Utility ──────────────────────────────────────────────────────────────────
const MaterialIcon = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

// ── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onGetStarted }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const close = () => setMobileOpen(false);

  return (
    <header className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <div className="logo">
          <a href="#home" className="logo-link">
            <span className="logo-shery">SHERY</span> <span className="logo-ai">AI</span>
          </a>
        </div>

        <nav className={`nav-links ${mobileOpen ? 'mobile-open' : ''}`}>
          <a href="#home"     className="nav-link" onClick={close}>Home</a>
          <a href="#features" className="nav-link" onClick={close}>Features</a>
          <a href="#studio"   className="nav-link" onClick={close}>Studio</a>
          <a href="#ai-chat" className="nav-link" onClick={close}>AI Chat</a>

          <a href="#usp"      className="nav-link" onClick={close}>Why Us</a>
          <a href="#contact"  className="nav-link" onClick={close}>Contact</a>
          <button className="btn-primary mobile-cta" onClick={() => { close(); onGetStarted(); }}>Get Started</button>
        </nav>

        <div className="nav-actions">
          <button className="btn-ghost nav-signin" onClick={onGetStarted}>Sign In</button>
          <button className="btn-primary nav-cta"   onClick={onGetStarted}>Get Started</button>
          <button
            className={`hamburger ${mobileOpen ? 'active' : ''}`}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <MaterialIcon name={mobileOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
      {mobileOpen && <div className="nav-backdrop" onClick={close} />}
    </header>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onGetStarted, demoRef }) {
  return (
    <section className="hero" id="home">
      <div className="hero-radial-bg" />
      <div className="hero-content">
        <h1 className="hero-title">
          Learn <span className="text-gradient">Faster</span>.<br />
          Understand <span className="text-gradient">Better</span>.
        </h1>
        <p className="hero-subtitle">
          AI-powered learning companion that transforms long video lectures into
          interactive, searchable, and personalized learning experiences.
        </p>
        <div className="hero-cta-row">
          <button className="btn-primary btn-lg hero-cta-primary" onClick={onGetStarted}>
            Start Learning <MaterialIcon name="arrow_forward" />
          </button>
          <button
            className="btn-ghost btn-lg"
            onClick={() => demoRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            Try Demo
          </button>
        </div>

        {/* Mockup */}
        <div className="mockup-wrapper">
          <div className="mockup-glow" />
          <div className="mockup-panel glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['#ff5f57','#febc2e','#28c840'].map(c => (
                <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#000', borderRadius: 12, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'rgba(255,107,0,.6)' }}>▶</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['What is gradient descent?','Explain backpropagation','Jump to 14:22 →'].map((q, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, background: i===2?'rgba(255,107,0,.1)':'rgba(255,255,255,.04)', border: i===2?'1px solid rgba(255,107,0,.3)':'1px solid rgba(255,255,255,.06)', color: i===2?'#FF6B00':'#888' }}>{q}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Stats ────────────────────────────────────────────────────────────────────
const stats = [
  { icon: 'speed',         title: '10x Faster Revision',      desc: 'Instantly jump to core concepts without scrubbing through hours of video.' },
  { icon: 'psychology',    title: 'AI-Powered Context',        desc: 'Our AI understands every word, slide, and diagram mentioned in your lectures.' },
  { icon: 'support_agent', title: '24/7 Learning Assistant',   desc: 'Get instant answers, anytime, based specifically on your course content.' },
];
function Stats() {
  return (
    <section className="stats-section">
      <div className="section-inner">
        <div className="stats-grid">
          {stats.map(s => (
            <div key={s.title} className="stat-card glass-panel">
              <MaterialIcon name={s.icon} className="stat-icon" />
              <h3 className="stat-title">{s.title}</h3>
              <p className="stat-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Problems ─────────────────────────────────────────────────────────────────
const problems = [
  { icon: 'error_outline', title: 'Passive Watching',  desc: 'Staring at screens for hours leads to low retention and high fatigue.' },
  { icon: 'search_off',    title: 'Concept Hunt',      desc: 'Students waste up to 40% of study time just finding specific lecture parts.' },
  { icon: 'smart_toy',     title: 'Generic AI',        desc: "Standard chatbots don't know what happened at minute 14:02 of your lecture." },
  { icon: 'block',         title: 'Static Content',    desc: "Videos are linear and static. They don't adapt to your specific questions." },
];
function Problems() {
  return (
    <section className="problems-section" id="problems">
      <div className="section-inner">
        <div className="section-header">
          <h2 className="section-title">Why Traditional LMS Platforms Fail</h2>
          <p className="section-subtitle">Learning platforms haven't evolved with the way students actually study.</p>
        </div>
        <div className="problems-grid">
          {problems.map(p => (
            <div key={p.title} className="problem-card">
              <MaterialIcon name={p.icon} className="problem-icon" />
              <h4 className="problem-title">{p.title}</h4>
              <p className="problem-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Solution ─────────────────────────────────────────────────────────────────
function Solution() {
  return (
    <section className="solution-section" id="solution">
      <div className="solution-glow-orb" />
      <div className="section-inner solution-inner">
        <div className="solution-text">
          <span className="overline-label">Our Solution</span>
          <h2 className="solution-heading">Meet Shery AI</h2>
          <p className="solution-body">
            We built a contextual learning assistant that integrates directly into your lecture interface,
            knowing exactly what is being discussed on screen at any given moment.
          </p>
          <ul className="solution-list">
            {[
              { icon: 'auto_stories', title: 'Session Memory', desc: 'AI remembers your previous questions and the specific context of the current module.' },
              { icon: 'bolt',         title: 'Streaming AI Responses', desc: 'Get instant, real-time insights without waiting for long processing times.' },
            ].map(item => (
              <li key={item.title} className="solution-item">
                <div className="solution-icon-box"><MaterialIcon name={item.icon} /></div>
                <div>
                  <h4 className="solution-item-title">{item.title}</h4>
                  <p className="solution-item-desc">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="chat-card-wrapper">
          <div className="chat-card-glow" />
          <div className="chat-card glass-panel">
            <div className="chat-card-header">
              <div className="chat-avatar"><MaterialIcon name="smart_toy" className="chat-avatar-icon" /></div>
              <div>
                <h5 className="chat-card-title">Contextual Assistant</h5>
                <span className="badge-beta">BETA</span>
              </div>
            </div>
            <div className="chat-messages">
              <div className="chat-bubble user-bubble">Explain the 'Docker Compose' YAML structure simply?</div>
              <div className="chat-bubble ai-bubble">
                <p>Docker Compose uses a YAML file to define services, networks, and volumes for multi-container applications.</p>
                <button className="jump-btn"><MaterialIcon name="play_circle" className="jump-icon" /> Jump to 05:22</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Features Grid ─────────────────────────────────────────────────────────────
function FeaturesGrid() {
  return (
    <section className="features-section" id="features">
      <div className="section-inner">
        <div className="section-header"><h2 className="section-title">Core Intelligence Features</h2></div>
        <div className="features-grid">
          <div className="feature-card feature-card-6 glass-panel">
            <MaterialIcon name="auto_stories" className="feature-inline-icon" />
            <h3 className="feature-title">Smart Chapters</h3>
            <p className="feature-desc">AI automatically detects topic shifts and generates logical chapters with timestamps.</p>
          </div>
          <div className="feature-card feature-card-6 glass-panel">
            <MaterialIcon name="play_circle" className="feature-inline-icon" />
            <h3 className="feature-title">Jump-to-Moment</h3>
            <p className="feature-desc">Ask the AI and it takes you to the exact frame where a concept is first mentioned.</p>
          </div>
          <div className="feature-card feature-card-sm glass-panel">
            <MaterialIcon name="psychology" className="feature-inline-icon" />
            <h3 className="feature-title">Session Memory</h3>
            <p className="feature-desc">The AI keeps track of what you've mastered across multiple sessions.</p>
          </div>
          <div className="feature-card feature-card-sm glass-panel">
            <MaterialIcon name="quiz" className="feature-inline-icon" />
            <h3 className="feature-title">Contextual Q&amp;A</h3>
            <p className="feature-desc">Ask about specific slides or code snippets appearing in the video frame.</p>
          </div>
          <div className="feature-card feature-card-md glass-panel">
            <MaterialIcon name="auto_awesome" className="feature-inline-icon" />
            <h3 className="feature-title">Smart Summaries</h3>
            <p className="feature-desc">Generate concise, high-impact study notes from any lecture at the click of a button.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
const steps = [
  { num: '1', title: 'Upload',   desc: 'Upload any video lecture or paste a YouTube link.' },
  { num: '2', title: 'Extract',  desc: 'Our engine extracts transcripts, OCR, and key visual moments.' },
  { num: '3', title: 'Analyze',  desc: 'AI builds a deep knowledge graph of the entire content.' },
  { num: '4', title: 'Interact', desc: 'Ask questions, jump to moments, and study smarter.' },
];
function HowItWorks() {
  return (
    <section className="how-section" id="process">
      <div className="section-inner">
        <div className="section-header"><h2 className="section-title">Master Any Course in 4 Steps</h2></div>
        <div className="steps-grid">
          {steps.map(s => (
            <div key={s.num} className="step-item">
              <div className="step-circle orange-glow"><span className="step-num">{s.num}</span></div>
              <h4 className="step-title">{s.title}</h4>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function Pricing({ onGetStarted }) {
  return (
    <section className="pricing-section" id="pricing">
      <div className="section-inner">
        <div className="section-header">
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-subtitle">Choose the plan that fits your learning journey.</p>
        </div>
        <div className="pricing-grid">
          <div className="pricing-card glass-panel">
            <div className="pricing-header">
              <h3 className="pricing-name">Explorer</h3>
              <div className="pricing-price">$0<span>/mo</span></div>
            </div>
            <ul className="pricing-features">
              <li><MaterialIcon name="check" /> 3 Video analysis / month</li>
              <li><MaterialIcon name="check" /> Basic AI summaries</li>
              <li><MaterialIcon name="check" /> 720p Video support</li>
              <li><MaterialIcon name="check" /> Community support</li>
            </ul>
            <button className="btn-ghost pricing-btn" onClick={onGetStarted}>Start Free</button>
          </div>
          <div className="pricing-card pricing-card-featured glass-panel orange-glow">
            <div className="featured-badge">Most Popular</div>
            <div className="pricing-header">
              <h3 className="pricing-name">Scholar</h3>
              <div className="pricing-price">$19<span>/mo</span></div>
            </div>
            <ul className="pricing-features">
              <li><MaterialIcon name="check" /> Unlimited video analysis</li>
              <li><MaterialIcon name="check" /> Advanced contextual Q&amp;A</li>
              <li><MaterialIcon name="check" /> 4K Video support</li>
              <li><MaterialIcon name="check" /> Priority AI processing</li>
              <li><MaterialIcon name="check" /> Export study notes</li>
            </ul>
            <button className="btn-primary pricing-btn" onClick={onGetStarted}>Get Started</button>
          </div>
          <div className="pricing-card glass-panel">
            <div className="pricing-header">
              <h3 className="pricing-name">Institution</h3>
              <div className="pricing-price">$99<span>/mo</span></div>
            </div>
            <ul className="pricing-features">
              <li><MaterialIcon name="check" /> Team collaboration</li>
              <li><MaterialIcon name="check" /> API Access</li>
              <li><MaterialIcon name="check" /> Custom AI training</li>
              <li><MaterialIcon name="check" /> Dedicated account manager</li>
            </ul>
            <button className="btn-ghost pricing-btn" onClick={onGetStarted}>Contact Sales</button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── USP ───────────────────────────────────────────────────────────────────────
function USP() {
  return (
    <section className="usp-section" id="usp">
      <div className="usp-card glass-panel">
        <div className="usp-glow-orb" />
        <div className="usp-inner">
          <h2 className="usp-title">More Than Just Video AI</h2>
          <p className="usp-quote">"We don't help users watch videos. We help them <span className="usp-highlight">understand</span> them."</p>
          <div className="usp-compare">
            <div className="usp-col usp-bad">
              <div className="usp-col-label bad"><MaterialIcon name="cancel" /> Standard Platforms</div>
              <p className="usp-col-desc">Scrubbing for info, no context, forgetful chat interfaces, passive watching.</p>
            </div>
            <div className="usp-col usp-good">
              <div className="usp-col-label good"><MaterialIcon name="check_circle" /> Shery AI</div>
              <p className="usp-col-desc">Contextual grounding, session-aware memory, visual link triggers, deep retention.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTA({ onGetStarted }) {
  return (
    <section className="cta-section">
      <div className="cta-inner">
        <h2 className="cta-title">Ready to Transform the Way You Learn?</h2>
        <p className="cta-subtitle">
          Join thousands of students saving hours every week with Shery AI.
        </p>
        <button className="btn-primary btn-xl orange-glow" onClick={onGetStarted}>
          Start Learning Now
        </button>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="logo"><span className="logo-shery">SHERY</span> <span className="logo-ai">AI</span></div>
          <p className="footer-tagline">The ultimate AI command center for modern education. Learn smarter, revise faster.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h5 className="footer-col-title">Legal</h5>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
          </div>
          <div className="footer-col">
            <h5 className="footer-col-title">Support</h5>
            <a href="#" className="footer-link">Security</a>
            <a href="#" className="footer-link">Help Center</a>
          </div>
          <div className="footer-col">
            <h5 className="footer-col-title">Dev</h5>
            <a href="#" className="footer-link">API Docs</a>
            <a href="#" className="footer-link">Integrations</a>
          </div>
        </div>
        <div className="footer-social">
          <a href="#" className="social-btn glass-panel" aria-label="Link"><MaterialIcon name="link" /></a>
          <a href="#" className="social-btn glass-panel" aria-label="Code"><MaterialIcon name="code" /></a>
        </div>
      </div>
      <div className="footer-copy"><p>© 2024 Shery AI. Built for the future of learning.</p></div>
    </footer>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate       = useNavigate();
  const demoRef        = useRef(null);
  const chatRef        = useRef(null);
  const [activeLesson, setActiveLesson] = useState(null);

  // Load Google Fonts & Material Icons
  useEffect(() => {
    [
      { id: 'gf-montserrat', href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap' },
      { id: 'gf-mat-icons',  href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200' },
    ].forEach(({ id, href }) => {
      if (!document.getElementById(id)) {
        const el = Object.assign(document.createElement('link'), { id, rel: 'stylesheet', href });
        document.head.appendChild(el);
      }
    });
  }, []);

  const goLogin = () => navigate('/login');

  const handleLessonReady = (lesson) => {
    setActiveLesson(lesson);
    // Smoothly scroll to the AI chat section
    setTimeout(() => chatRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <div className="landing-root">
      <Navbar onGetStarted={goLogin} />
      <main>
        <Hero onGetStarted={goLogin} demoRef={demoRef} />
        <Stats />
        <Problems />
        <Solution />
        <FeaturesGrid />
        <HowItWorks />

        {/* ── VIDEO STUDIO ── */}
        <section id="studio" ref={demoRef} style={{ padding: '100px 0 80px', background: '#070707', borderTop: '1px solid #111' }}>
          <div className="section-inner" style={{ marginBottom: 52 }}>
            <div className="section-header">
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:20, background:'rgba(255,107,0,.1)', border:'1px solid rgba(255,107,0,.2)', color:'#FF6B00', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:18 }}>
                🎬 Video Studio
              </span>
              <h2 className="section-title">Add Any Video. AI Does the Rest.</h2>
              <p className="section-subtitle" style={{ maxWidth:560 }}>
                Paste a YouTube URL or upload your lecture. SheryAI transcribes, indexes, and makes it fully conversational — in minutes.
              </p>
            </div>
          </div>
          <VideoStudio onLessonReady={handleLessonReady} />
        </section>

        {/* ── AI VIDEO CHAT ── */}
        <section id="ai-chat" ref={chatRef} style={{ padding: '100px 0 80px', background: '#050505', borderTop: '1px solid #111' }}>
          <div className="section-inner" style={{ marginBottom: 52 }}>
            <div className="section-header">
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:20, background:'rgba(255,107,0,.1)', border:'1px solid rgba(255,107,0,.2)', color:'#FF6B00', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:18 }}>
                🤖 AI Video Chat
              </span>
              <h2 className="section-title">ChatGPT — but for Your Videos</h2>
              <p className="section-subtitle" style={{ maxWidth:560 }}>
                Ask anything. Get timestamped answers. Understand every concept your lecturer explains — instantly.
              </p>
            </div>
          </div>

          {activeLesson ? (
            <div style={{ maxWidth:900, margin:'0 auto', padding:'0 24px', height:680, borderRadius:24, overflow:'hidden', border:'1px solid #1a1a1a', boxShadow:'0 40px 120px rgba(0,0,0,.8)' }}>
              <AIVideoChat lesson={activeLesson} onBack={() => setActiveLesson(null)} />
            </div>
          ) : (
            <div style={{ maxWidth:720, margin:'0 auto', padding:'0 24px' }}>
              <div style={{ background:'#0a0a0a', border:'1px solid #1a1a1a', borderRadius:24, padding:56, textAlign:'center' }}>
                <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,rgba(255,107,0,.15),rgba(255,149,0,.05))', border:'1px solid rgba(255,107,0,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 24px' }}>🎬</div>
                <h3 style={{ margin:'0 0 12px', color:'#fff', fontSize:22, fontWeight:800 }}>Add a Video First</h3>
                <p style={{ margin:'0 0 28px', color:'#555', fontSize:15, lineHeight:1.6 }}>
                  Use the <strong style={{ color:'#FF6B00' }}>Video Studio</strong> above to add a YouTube lecture or upload a video.
                  Once it's processed, come back here to start chatting with AI about it.
                </p>
                <button
                  onClick={() => demoRef.current?.scrollIntoView({ behavior:'smooth' })}
                  style={{ padding:'12px 28px', borderRadius:12, border:'none', background:'var(--accent,#FF6B00)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}
                >↑ Go to Video Studio</button>
              </div>
            </div>
          )}
        </section>


        <USP />
        <CTA onGetStarted={goLogin} />
      </main>
      <Footer />
    </div>
  );
}
