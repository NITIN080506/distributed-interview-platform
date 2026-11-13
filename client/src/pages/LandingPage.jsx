import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ───────────── Intersection-observer reveal ───────────── */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ───────────── Data ───────────── */
const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: 'Docker Sandboxed Execution',
    desc: 'Every code submission runs in an isolated Docker container — safe, reproducible, and fully configurable per language.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: 'Real-Time Collaboration',
    desc: 'Code together live with cursor presence, instant sync, and shared editor state powered by WebSockets.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: 'Multi-Language Support',
    desc: 'JavaScript, Python, C++, Java, Go, Rust — run and evaluate code in any major language out of the box.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    title: 'WebRTC Video Chat',
    desc: 'Face-to-face video and audio built right into the interview room — no third-party meeting links needed.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M12 2a4 4 0 014 4c0 1.95-1.4 3.58-3.25 3.93" />
        <path d="M8.56 13.44A5 5 0 0012 22a5 5 0 003.44-8.56" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <path d="M9 9l3 3 3-3" />
      </svg>
    ),
    title: 'AI Code Review',
    desc: 'Get instant AI-powered analysis of code quality, complexity, edge cases, and optimization suggestions.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
    title: 'Interactive Whiteboard',
    desc: 'Sketch algorithms, draw diagrams, and explain ideas visually with a shared real-time whiteboard.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Create a Session',
    desc: 'Pick a coding problem, select the language, and generate a shareable room link in seconds.',
  },
  {
    num: '02',
    title: 'Code Together Live',
    desc: 'Both participants join the room with a synced editor, video chat, whiteboard, and instant code execution.',
  },
  {
    num: '03',
    title: 'Review & Evaluate',
    desc: 'Run tests, view AI analysis, and make hiring decisions — all captured and replayable.',
  },
];

const techStack = [
  { name: 'React', color: '#61dafb' },
  { name: 'Node.js', color: '#68a063' },
  { name: 'Docker', color: '#2496ed' },
  { name: 'Redis', color: '#dc382d' },
  { name: 'PostgreSQL', color: '#336791' },
  { name: 'WebSockets', color: '#6d28d9' },
];

/* ───────────── Component ───────────── */
export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-blue-400">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span className="gradient-text text-xl font-bold tracking-tight">CodePulse</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost">Sign In</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-section">
        {/* Ambient glow blobs */}
        <div className="hero-glow hero-glow--blue" />
        <div className="hero-glow hero-glow--indigo" />

        <div className="hero-content">
          <Reveal>
            <div className="hero-badge">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              Now in Public Beta
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="hero-headline">
              <span className="gradient-text">Real-Time Collaborative</span>
              <br />
              Coding Interviews
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="hero-tagline">
              A distributed platform for live coding interviews with sandboxed execution,
              video chat, AI review, and a shared whiteboard — everything you need in one room.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="hero-ctas">
              <Link to="/register" className="btn-primary btn-lg">
                Get Started
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-2 inline-block">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L11.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.04-1.08l3.158-2.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link to="/login" className="btn-ghost btn-lg">
                Sign In
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-section">
        <div className="section-container">
          <Reveal>
            <p className="section-eyebrow">Features</p>
            <h2 className="section-title">Everything you need to run<br className="hidden sm:block" /> world-class technical interviews</h2>
          </Reveal>

          <div className="features-grid">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="glass-card feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-section">
        <div className="section-container">
          <Reveal>
            <p className="section-eyebrow">How It Works</p>
            <h2 className="section-title">Three steps to a better interview</h2>
          </Reveal>

          <div className="steps-grid">
            {steps.map((s, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="step-card">
                  <span className="step-num">{s.num}</span>
                  <h3 className="step-title">{s.title}</h3>
                  <p className="step-desc">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="landing-section">
        <div className="section-container text-center">
          <Reveal>
            <p className="section-eyebrow">Tech Stack</p>
            <h2 className="section-title">Built on proven, scalable technologies</h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="tech-grid">
              {techStack.map((t) => (
                <div key={t.name} className="tech-chip" style={{ '--chip-color': t.color }}>
                  <span className="tech-dot" style={{ background: t.color }} />
                  {t.name}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="landing-section">
        <div className="section-container">
          <Reveal>
            <div className="cta-banner">
              <h2 className="cta-banner-title gradient-text">Ready to transform your hiring?</h2>
              <p className="cta-banner-desc">
                Start running collaborative coding interviews in minutes — no setup headaches.
              </p>
              <Link to="/register" className="btn-primary btn-lg">
                Create Free Account
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-2 inline-block">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L11.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.04-1.08l3.158-2.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="section-container">
          <div className="footer-inner">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-400">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span className="font-semibold text-slate-200">CodePulse</span>
            </div>
            <div className="footer-links">
              <Link to="/problems" className="footer-link">Problems</Link>
              <Link to="/sessions" className="footer-link">Sessions</Link>
              <Link to="/login" className="footer-link">Sign In</Link>
              <Link to="/register" className="footer-link">Register</Link>
            </div>
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} CodePulse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
