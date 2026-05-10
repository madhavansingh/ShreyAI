import React, { useEffect } from 'react';

const SheryAILandingPage = () => {
// Inject external styles and fonts dynamically
useEffect(() => {
// Add Tailwind CSS CDN
if (!document.querySelector('#tailwind-cdn')) {
const tailwindLink = document.createElement('link');
tailwindLink.id = 'tailwind-cdn';
tailwindLink.rel = 'stylesheet';
tailwindLink.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
document.head.appendChild(tailwindLink);
}

// Add Google Fonts
if (!document.querySelector('#google-fonts')) {
const fontsLink = document.createElement('link');
fontsLink.id = 'google-fonts';
fontsLink.href =
'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap';
fontsLink.rel = 'stylesheet';
document.head.appendChild(fontsLink);
}

// Add Material Symbols
if (!document.querySelector('#material-symbols')) {
const materialLink = document.createElement('link');
materialLink.id = 'material-symbols';
materialLink.href =
'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
materialLink.rel = 'stylesheet';
document.head.appendChild(materialLink);
}

// Add custom styles for theme and utilities that Tailwind doesn't cover
if (!document.querySelector('#custom-theme-styles')) {
const styleTag = document.createElement('style');
styleTag.id = 'custom-theme-styles';
styleTag.textContent = `
/* Custom color system based on the original design */
.bg-surface { background-color: #000000; }
.bg-surface-container-low { background-color: #050505; }
.bg-surface-container { background-color: #0A0A0A; }
.bg-surface-container-high { background-color: #171717; }
.bg-surface-container-highest { background-color: #1A1A1A; }
.bg-surface-variant { background-color: #121212; }
.bg-primary { background-color: #FF6B00; }
.bg-primary\\/10 { background-color: rgba(255, 107, 0, 0.1); }
.bg-primary\\/5 { background-color: rgba(255, 107, 0, 0.05); }
.bg-white\\/5 { background-color: rgba(255, 255, 255, 0.05); }

.text-on-surface { color: #F5F5F5; }
.text-on-surface-variant { color: #A3A3A3; }
.text-primary { color: #FF6B00; }
.text-error { color: #FF4D4D; }

.border-outline-variant { border-color: #262626; }
.border-primary { border-color: #FF6B00; }
.border-white\\/5 { border-color: rgba(255, 255, 255, 0.05); }
.border-white\\/10 { border-color: rgba(255, 255, 255, 0.1); }

.glass-panel {
background: rgba(10, 10, 10, 0.7);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 107, 0, 0.15);
}

.orange-glow {
box-shadow: 0 0 50px -10px rgba(255, 107, 0, 0.4);
}

.text-gradient {
background: linear-gradient(to right, #FF6B00, #FFB693);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
}

.primary-gradient {
background: linear-gradient(135deg, #FF6B00 0%, #FF8A00 100%);
}

body {
background-color: #000000;
}

/* Additional utility classes that might be needed */
.font-headline-md {
font-family: 'Montserrat', sans-serif;
font-weight: 600;
}

.font-display-lg {
font-family: 'Montserrat', sans-serif;
font-weight: 700;
}

.font-body-lg, .font-body-md, .font-body-sm {
font-family: 'Inter', sans-serif;
}
`;
document.head.appendChild(styleTag);
}
}, []);

// Helper function to handle button clicks
const handleGetStarted = () => {
alert('Welcome to Shery AI! Start your learning journey.');
};

const handleWatchDemo = () => {
alert('Watch demo video would play here.');
};

return (
<div className="dark bg-background text-on-surface font-body-md selection:bg-primary/30">
  {/* TopNavBar */}
  <header className="bg-surface/80 backdrop-blur-xl fixed full-width top-0 z-50 border-b border-white/5 shadow-sm">
    <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
      <div className="font-headline-md text-headline-md font-bold text-primary tracking-tight">Shery AI</div>
      <nav className="hidden md:flex items-center gap-8">
        <a className="font-label-md text-sm font-semibold text-primary border-b-2 border-primary pb-1"
          href="#">Features</a>
        <a className="font-label-md text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200"
          href="#">How It Works</a>
        <a className="font-label-md text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200"
          href="#">Demo</a>
        <a className="font-label-md text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200"
          href="#">About</a>
        <a className="font-label-md text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200"
          href="#">Contact</a>
      </nav>
      <button onClick={handleGetStarted}
        className="primary-gradient text-black px-6 py-2 rounded-lg text-sm font-semibold hover:brightness-110 active:scale-95 transition-all font-bold">
        Get Started
      </button>
    </div>
  </header>

  <main>
    {/* Hero Section */}
    <section className="relative pt-24 pb-32 px-6 overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_center,_rgba(255,107,0,0.12)_0%,_transparent_70%)] pointer-events-none">
      </div>
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <h1 className="font-display-lg text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight text-on-surface">
          Learn <span className="text-gradient">Faster</span>. <br />
          Understand <span className="text-gradient">Better</span>.
        </h1>
        <p className="font-body-lg text-lg text-on-surface-variant max-w-3xl mx-auto mb-10">
          AI-powered learning companion that transforms long video lectures into interactive, searchable, and
          personalized learning experiences.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
          <button onClick={handleGetStarted}
            className="primary-gradient text-black px-10 py-4 rounded-xl font-headline-md text-xl shadow-lg orange-glow flex items-center justify-center gap-2 hover:scale-105 transition-transform">
            Start Learning <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <button onClick={handleWatchDemo}
            className="border border-outline-variant bg-surface-container-high text-on-surface px-10 py-4 rounded-xl font-headline-md text-xl hover:bg-surface-container-highest transition-colors">
            Watch Demo
          </button>
        </div>
        {/* Product Mockup Visual */}
        <div className="relative max-w-5xl mx-auto group">
          <div
            className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-primary/5 rounded-[28px] blur-3xl opacity-40 group-hover:opacity-60 transition duration-1000">
          </div>
          <div className="relative glass-panel rounded-[24px] overflow-hidden shadow-2xl p-3 border-white/10">
            <img className="w-full rounded-xl brightness-90 contrast-110"
              alt="A high-fidelity software dashboard mockup showcasing a dark-themed educational video player. The interface features a central video area with an orange playback bar, a sidebar on the right displaying an AI chat assistant with chat bubbles, and a bottom section with smart chapter navigation. The overall aesthetic is sleek and high-tech, using translucent glassmorphism effects and vibrant orange accents against a deep obsidian background."
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwlxHl4JFgHkhmrf4vcXPwe_ViSoTXtkcUmsglRZ4lnVF4YHTF508NTFhSFnNJczBI-jlWsNySEq1OOKFaMG6xaYMidxicFO3f2UPrcAv3HZmslT8cj8BPCS5-ydmnjmyOdJFs18TSlD68qeWGlEMr30nmY8QBcL5-MtZ9Wulch8aUjJEaSJRhU7xjezxwbPB742kjaEtwV_KXIlCsgvQ6b1z19EQJwkwn1H1lF7Lp3zUnM_dDrVebutQw86cfNlpYIgT7_TI_lhg" />
          </div>
        </div>
      </div>
    </section>

    {/* Stats Section */}
    <section className="py-24 bg-surface-container-low border-y border-outline-variant">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            className="p-8 rounded-2xl glass-panel flex flex-col items-center text-center hover:border-primary/40 transition-colors">
            <div className="text-primary mb-4">
              <span className="material-symbols-outlined text-[56px]">speed</span>
            </div>
            <h3 className="font-headline-md text-2xl mb-2 text-on-surface">10x Faster Revision</h3>
            <p className="text-on-surface-variant text-base">Instantly jump to the core concepts without scrubbing
              through hours of video.</p>
          </div>
          <div
            className="p-8 rounded-2xl glass-panel flex flex-col items-center text-center hover:border-primary/40 transition-colors">
            <div className="text-primary mb-4">
              <span className="material-symbols-outlined text-[56px]">psychology</span>
            </div>
            <h3 className="font-headline-md text-2xl mb-2 text-on-surface">AI-Powered Context</h3>
            <p className="text-on-surface-variant text-base">Our AI understands every word, slide, and diagram mentioned
              in your lectures.</p>
          </div>
          <div
            className="p-8 rounded-2xl glass-panel flex flex-col items-center text-center hover:border-primary/40 transition-colors">
            <div className="text-primary mb-4">
              <span className="material-symbols-outlined text-[56px]">support_agent</span>
            </div>
            <h3 className="font-headline-md text-2xl mb-2 text-on-surface">24/7 Learning Assistant</h3>
            <p className="text-on-surface-variant text-base">Get instant answers to any question, anytime, based
              specifically on your course content.</p>
          </div>
        </div>
      </div>
    </section>

    {/* Problem Section */}
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="font-headline-lg text-3xl md:text-4xl mb-4 text-on-surface">Why Traditional LMS Platforms Fail
          </h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto">Learning platforms haven't evolved with the way
            students actually study.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            className="bg-surface-container-high p-8 rounded-2xl border border-outline-variant hover:border-primary/30 transition-all group">
            <span
              className="material-symbols-outlined text-primary mb-6 text-3xl group-hover:scale-110 transition-transform">error_outline</span>
            <h4 className="font-headline-md text-xl mb-3 text-on-surface">Passive Watching</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">Staring at screens for hours leads to low
              retention and high fatigue.</p>
          </div>
          <div
            className="bg-surface-container-high p-8 rounded-2xl border border-outline-variant hover:border-primary/30 transition-all group">
            <span
              className="material-symbols-outlined text-primary mb-6 text-3xl group-hover:scale-110 transition-transform">search_off</span>
            <h4 className="font-headline-md text-xl mb-3 text-on-surface">Concept Hunt</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">Students waste up to 40% of study time just
              finding specific parts of a lecture.</p>
          </div>
          <div
            className="bg-surface-container-high p-8 rounded-2xl border border-outline-variant hover:border-primary/30 transition-all group">
            <span
              className="material-symbols-outlined text-primary mb-6 text-3xl group-hover:scale-110 transition-transform">smart_toy</span>
            <h4 className="font-headline-md text-xl mb-3 text-on-surface">Generic AI</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">Standard chatbots don't know what happened at
              minute 14:02 of your lecture.</p>
          </div>
          <div
            className="bg-surface-container-high p-8 rounded-2xl border border-outline-variant hover:border-primary/30 transition-all group">
            <span
              className="material-symbols-outlined text-primary mb-6 text-3xl group-hover:scale-110 transition-transform">block</span>
            <h4 className="font-headline-md text-xl mb-3 text-on-surface">Static Content</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">Videos are linear and static. They don't
              adapt to your specific questions.</p>
          </div>
        </div>
      </div>
    </section>

    {/* Solution Section */}
    <section className="py-32 bg-surface-container-low border-y border-outline-variant relative overflow-hidden">
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none">
      </div>
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 items-center gap-20">
        <div>
          <span className="text-primary text-sm font-semibold tracking-widest uppercase mb-6 block">Our Solution</span>
          <h2 className="font-display-lg text-5xl md:text-6xl mb-8 text-on-surface">Meet Shery AI</h2>
          <p className="font-body-lg text-lg text-on-surface-variant mb-10 leading-relaxed">
            We built a contextual learning assistant that doesn't just "talk" to you. It integrates directly into your
            lecture interface, knowing exactly what is being discussed on screen at any given moment.
          </p>
          <ul className="space-y-8">
            <li className="flex gap-5">
              <div
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                <span className="material-symbols-outlined">auto_stories</span>
              </div>
              <div>
                <h4 className="font-headline-md text-xl mb-1 text-on-surface">Session Memory</h4>
                <p className="text-on-surface-variant">AI remembers your previous questions and the specific context of
                  the current module.</p>
              </div>
            </li>
            <li className="flex gap-5">
              <div
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <div>
                <h4 className="font-headline-md text-xl mb-1 text-on-surface">Streaming AI Responses</h4>
                <p className="text-on-surface-variant">Get instant, real-time insights without waiting for long
                  processing times.</p>
              </div>
            </li>
          </ul>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full"></div>
          <div className="relative glass-panel p-8 rounded-[32px] border-primary/30 shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg orange-glow">
                <span className="material-symbols-outlined text-black text-3xl">smart_toy</span>
              </div>
              <div>
                <h5 className="font-headline-md text-xl text-on-surface">Contextual Assistant</h5>
                <span
                  className="text-primary text-[10px] font-bold border border-primary/40 px-3 py-0.5 rounded-full uppercase tracking-tighter">BETA</span>
              </div>
            </div>
            <div className="space-y-5">
              <div
                className="bg-surface-container-highest p-5 rounded-2xl ml-8 text-sm text-on-surface border border-outline-variant shadow-sm">
                Explain the 'Docker Compose' YAML structure simply?
              </div>
              <div
                className="bg-primary/10 p-5 rounded-2xl mr-8 text-sm text-on-surface border border-primary/30 shadow-sm">
                <p className="mb-3 leading-relaxed">Docker Compose uses a YAML file to define services, networks, and
                  volumes for multi-container applications.</p>
                <button
                  className="text-primary text-[12px] font-bold flex items-center gap-2 hover:translate-x-1 transition-transform">
                  <span className="material-symbols-outlined text-sm">play_circle</span> Jump to 05:22
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Features Grid */}
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="font-headline-lg text-3xl md:text-4xl mb-4 text-on-surface">Core Intelligence Features</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
          <div
            className="md:col-span-6 lg:col-span-8 glass-panel p-10 rounded-3xl group overflow-hidden border-white/5 hover:border-primary/20 transition-all">
            <div className="relative z-10">
              <h3 className="font-headline-md text-2xl mb-4 text-on-surface">Smart Chapters</h3>
              <p className="text-on-surface-variant mb-10 max-w-md leading-relaxed">Our AI automatically detects topic
                shifts and generates logical chapters with timestamps, so you can navigate complex subjects instantly.
              </p>
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/5 blur-2xl rounded-xl"></div>
                <img
                  className="w-full rounded-2xl border border-outline-variant shadow-2xl group-hover:scale-[1.01] transition-transform relative"
                  alt="A futuristic UI component showing a timeline with glowing orange markers. Each marker labels a specific learning concept like 'Backpropagation' or 'Gradient Descent' with a corresponding timestamp. The style is ultra-modern, using dark obsidian surfaces and neon orange highlights to represent data-driven insights."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPrcntbwNHJ1chVDIaia7yPcb6YJ3XHsAnMVjEx2fKbZmPMXKBxSNaaZ-4mQ3shvz6cGr89FNGbtDc1VepSaa2kqrCBx640FjHatvKOiI_7d2IaC3oRTum5GCQZADKsEJuSoA8CzDNLV0OOUgThNDe8rmnQ29uDxE3ee05Eld0EtIJa4yK6Z9q2IcHByQmGgtIgwCYoOwAbglI3BcnNqy2RASSW7IGKD9qos0M9uYRrfRh4Yy3hv6Fkn_Q6NYP5BVaICEy-SV5cE4" />
              </div>
            </div>
          </div>
          <div
            className="md:col-span-6 lg:col-span-4 glass-panel p-10 rounded-3xl bg-primary/5 border-primary/30 flex flex-col justify-between hover:bg-primary/[0.08] transition-all">
            <div>
              <h3 className="font-headline-md text-2xl mb-4 text-primary">Jump-to-Moment</h3>
              <p className="text-on-surface-variant leading-relaxed">Found a term you don't know? Ask the AI, and it
                won't just explain it—it will take you to the exact frame where it's first mentioned.</p>
            </div>
            <div className="h-48 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[100px] text-primary/40 drop-shadow-[0_0_20px_rgba(255,107,0,0.3)]">rocket_launch</span>
            </div>
          </div>
          <div
            className="md:col-span-3 lg:col-span-4 bg-surface-container-high p-8 rounded-3xl border border-outline-variant hover:border-primary/20 transition-all">
            <h3 className="font-headline-md text-xl mb-4 text-on-surface">Session Memory</h3>
            <p className="text-on-surface-variant">The AI learns your pace and keeps track of what you've mastered
              across multiple sessions.</p>
          </div>
          <div
            className="md:col-span-3 lg:col-span-4 bg-surface-container-high p-8 rounded-3xl border border-outline-variant hover:border-primary/20 transition-all">
            <h3 className="font-headline-md text-xl mb-4 text-on-surface">Contextual Q&amp;A</h3>
            <p className="text-on-surface-variant">Ask questions about specific slides or code snippets appearing in the
              video frame.</p>
          </div>
          <div
            className="md:col-span-6 lg:col-span-4 bg-surface-container-high p-8 rounded-3xl border border-outline-variant hover:border-primary/20 transition-all">
            <h3 className="font-headline-md text-xl mb-4 text-on-surface">Smart Summaries</h3>
            <p className="text-on-surface-variant">Generate concise, high-impact study notes from any lecture at the
              click of a button.</p>
          </div>
        </div>
      </div>
    </section>

    {/* How It Works */}
    <section className="py-32 bg-surface-container-low border-y border-outline-variant">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="font-headline-lg text-3xl md:text-4xl mb-4 text-on-surface">Master Any Course in 4 Steps</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="text-center group">
            <div
              className="w-20 h-20 rounded-full bg-surface-container-highest border-2 border-primary flex items-center justify-center mx-auto mb-8 shadow-lg orange-glow group-hover:scale-110 transition-transform">
              <span className="font-headline-lg text-3xl text-primary">1</span>
            </div>
            <h4 className="font-headline-md text-xl mb-3 text-on-surface">Upload</h4>
            <p className="text-sm text-on-surface-variant px-4">Upload any video lecture or paste a YouTube link.</p>
          </div>
          <div className="text-center group">
            <div
              className="w-20 h-20 rounded-full bg-surface-container-highest border-2 border-primary flex items-center justify-center mx-auto mb-8 shadow-lg orange-glow group-hover:scale-110 transition-transform">
              <span className="font-headline-lg text-3xl text-primary">2</span>
            </div>
            <h4 className="font-headline-md text-xl mb-3 text-on-surface">Extract</h4>
            <p className="text-sm text-on-surface-variant px-4">Our engine extracts transcripts, OCR, and key visual
              moments.</p>
          </div>
          <div className="text-center group">
            <div
              className="w-20 h-20 rounded-full bg-surface-container-highest border-2 border-primary flex items-center justify-center mx-auto mb-8 shadow-lg orange-glow group-hover:scale-110 transition-transform">
              <span className="font-headline-lg text-3xl text-primary">3</span>
            </div>
            <h4 className="font-headline-md text-xl mb-3 text-on-surface">Analyze</h4>
            <p className="text-sm text-on-surface-variant px-4">AI builds a deep knowledge graph of the entire content.
            </p>
          </div>
          <div className="text-center group">
            <div
              className="w-20 h-20 rounded-full bg-surface-container-highest border-2 border-primary flex items-center justify-center mx-auto mb-8 shadow-lg orange-glow group-hover:scale-110 transition-transform">
              <span className="font-headline-lg text-3xl text-primary">4</span>
            </div>
            <h4 className="font-headline-md text-xl mb-3 text-on-surface">Interact</h4>
            <p className="text-sm text-on-surface-variant px-4">Ask questions, jump to moments, and study smarter.</p>
          </div>
        </div>
      </div>
    </section>

    {/* USP Section */}
    <section className="py-32 px-6">
      <div
        className="max-w-4xl mx-auto glass-panel p-8 md:p-16 rounded-[48px] text-center border-primary/20 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/15 blur-[120px] rounded-full"></div>
        <div className="relative z-10">
          <h2 className="font-headline-lg text-3xl md:text-4xl mb-8 text-on-surface">More Than Just Video AI</h2>
          <p className="font-body-lg text-lg text-on-surface-variant mb-14 italic">
            "We don't help users watch videos. We help them <span
              className="text-primary font-bold not-italic">understand</span> them."
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left max-w-3xl mx-auto">
            <div className="space-y-5 bg-white/5 p-6 rounded-2xl border border-white/5">
              <div className="text-error font-bold flex items-center gap-3">
                <span className="material-symbols-outlined">cancel</span> Standard Platforms
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">Scrubbing for info, no context, forgetful
                chat interfaces, passive watching.</p>
            </div>
            <div className="space-y-5 bg-primary/5 p-6 rounded-2xl border border-primary/20">
              <div className="text-primary font-bold flex items-center gap-3">
                <span className="material-symbols-outlined">check_circle</span> Shery AI
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">Contextual grounding, session-aware memory,
                visual link triggers, deep retention.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Final CTA */}
    <section
      className="py-32 px-6 bg-[radial-gradient(circle_at_top,_rgba(255,107,0,0.18)_0%,_transparent_60%)] border-t border-outline-variant">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="font-display-lg text-4xl md:text-5xl lg:text-6xl mb-8 text-on-surface">Ready to Transform the Way
          You Learn?</h2>
        <p className="font-body-lg text-lg text-on-surface-variant mb-14 max-w-2xl mx-auto leading-relaxed">Join
          thousands of students and professionals who are saving hours of study time every week with Shery AI.</p>
        <button onClick={handleGetStarted}
          className="primary-gradient text-black px-12 md:px-16 py-6 rounded-2xl font-headline-md text-xl md:text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all orange-glow font-bold uppercase tracking-wide">
          Start Learning Now
        </button>
      </div>
    </section>
  </main>

  {/* Footer */}
  <footer className="bg-surface-container-low border-t border-outline-variant">
    <div
      className="flex flex-col md:flex-row justify-between items-start px-6 md:px-8 py-12 md:py-16 max-w-7xl mx-auto">
      <div className="mb-12 md:mb-0">
        <div className="font-headline-md text-2xl text-primary font-bold mb-4">Shery AI</div>
        <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">
          The ultimate AI command center for modern education. Learn smarter, revise faster.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-12 mb-12 md:mb-0">
        <div className="flex flex-col gap-4">
          <h5 className="text-on-surface font-bold text-sm uppercase tracking-widest mb-2">Legal</h5>
          <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy
            Policy</a>
          <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Terms of
            Service</a>
        </div>
        <div className="flex flex-col gap-4">
          <h5 className="text-on-surface font-bold text-sm uppercase tracking-widest mb-2">Support</h5>
          <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Security</a>
          <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Help Center</a>
        </div>
        <div className="flex flex-col gap-4">
          <h5 className="text-on-surface font-bold text-sm uppercase tracking-widest mb-2">Dev</h5>
          <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">API Docs</a>
          <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Integrations</a>
        </div>
      </div>
      <div className="flex gap-4">
        <a className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all border-white/10"
          href="#">
          <span className="material-symbols-outlined">link</span>
        </a>
        <a className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all border-white/10"
          href="#">
          <span className="material-symbols-outlined">code</span>
        </a>
      </div>
    </div>
    <div className="border-t border-white/5 py-8 text-center bg-black">
      <p className="text-sm text-on-surface-variant opacity-40">©️ 2024 Shery AI. Built for the future of learning.</p>
    </div>
  </footer>
</div>
);
};

export default SheryAILandingPage;