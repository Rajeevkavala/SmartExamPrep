"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NavbarProps = {
  isSticky: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
};

type PyqFilterItem = {
  label: string;
  defaultHighlight?: boolean;
};

type FaqItem = {
  question: string;
  answer: string;
};

const pyqFilters: PyqFilterItem[] = [
  { label: "All Years" },
  { label: "2024" },
  { label: "2023" },
  { label: "2022" },
  { label: "OS", defaultHighlight: true },
  { label: "Networks" },
  { label: "Algorithms" },
  { label: "DBMS" },
];

const faqItems: FaqItem[] = [
  {
    question: "How does the diagnostic quiz work?",
    answer:
      "On first login, you take a 30-minute adaptive quiz across all GATE CSE subjects. The engine adjusts difficulty in real time based on your responses. The result is a baseline weakness profile that seeds your roadmap. You can retake diagnostics at any point.",
  },
  {
    question: "How is the roadmap generated?",
    answer:
      "The roadmap uses your diagnostic results, your exam date, your daily study hours (set during onboarding), and PYQ topic weightage to build a week-wise plan. It recalculates automatically when your quiz performance changes significantly \u2014 so it stays accurate throughout your prep.",
  },
  {
    question: "What is the spaced revision queue?",
    answer:
      "Every topic you study gets scheduled for review at the optimal interval \u2014 before you'd normally forget it. The interval is performance-aware: topics where you scored low get shorter intervals, stronger topics get longer ones. You can mark topics done to let the system recalibrate.",
  },
  {
    question: "Is the PYQ data verified?",
    answer:
      "Yes. Every question is sourced from official GATE papers and verified against original answer keys before being added to the database. Questions are tagged by subject, topic, subtopic, year, and difficulty. All metadata feeds into the probability scoring model.",
  },
  {
    question: "How does the AI Study Chat differ from ChatGPT?",
    answer:
      "The study chat is grounded in your personal context \u2014 your roadmap, today's planner, and your weakness model. When you ask about a topic, it knows whether that topic is a current weak area, what's scheduled today, and what the GATE probability for it is. Generic AI doesn't have any of that signal.",
  },
  {
    question: "Is there a free trial for Pro?",
    answer:
      "Yes. New accounts get a 7-day full Pro trial \u2014 no credit card required. All AI features, adaptive quizzes, study chat, spaced revision, and analytics are fully available before you decide to subscribe.",
  },
];

const activateOnKey = (
  event: KeyboardEvent<HTMLSpanElement>,
  action: () => void,
) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
};

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <div id="mnav" className={isOpen ? "open" : ""}>
      <Link href="#features" onClick={onClose}>
        Features
      </Link>
      <Link href="#pyq" onClick={onClose}>
        PYQ Bank
      </Link>
      <Link href="#dashboard" onClick={onClose}>
        Dashboard
      </Link>
      <Link href="#pricing" onClick={onClose}>
        Pricing
      </Link>
      <Link href="#faq" onClick={onClose}>
        FAQ
      </Link>
      <Link href="/signup" className="mnav-cta" onClick={onClose}>
        Start Free
      </Link>
    </div>
  );
}

export function Navbar({ isSticky, isMenuOpen, onToggleMenu }: NavbarProps) {
  return (
    <nav id="nav" className={isSticky ? "s" : ""}>
      <div className="w ni">
        <Link href="#hero" className="nl">
          <div className="nm">
            <div className="nm-sq" />
          </div>
          SMART<span style={{ color: "var(--fire)" }}>EXAM</span>PREP
        </Link>

        <div className="nv" id="nv">
          <Link href="#features">Features</Link>
          <Link href="#pyq">PYQ Bank</Link>
          <Link href="#dashboard">Dashboard</Link>
          <Link href="#chat">AI Chat</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="#faq">FAQ</Link>
        </div>

        <div className="na">
          <Link href="/login" className="nb">
            Login
          </Link>
          <Link href="/signup" className="nc">
            <span>Start Free</span>
          </Link>
          <button
            className={`ham${isMenuOpen ? " open" : ""}`}
            id="ham"
            onClick={onToggleMenu}
            aria-label="Menu"
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </nav>
  );
}

export function HeroSection() {
  return (
    <section id="hero">
      <div className="hero-grain" />
      <div className="hero-lines">
        <svg
          viewBox="0 0 1400 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1={0} y1={200} x2={1400} y2={200} stroke="#e8520a" strokeWidth={1} />
          <line x1={0} y1={600} x2={1400} y2={600} stroke="#00d4ff" strokeWidth={1} />
          <line x1={200} y1={0} x2={200} y2={800} stroke="#e8520a" strokeWidth={1} />
          <line x1={700} y1={0} x2={700} y2={800} stroke="#e8520a" strokeWidth={1} />
          <line x1={1200} y1={0} x2={1200} y2={800} stroke="#00d4ff" strokeWidth={1} />
          <circle cx={200} cy={200} r={3} fill="#e8520a" />
          <circle cx={700} cy={200} r={3} fill="#e8520a" />
          <circle cx={1200} cy={200} r={3} fill="#00d4ff" />
          <circle cx={200} cy={600} r={3} fill="#e8520a" />
          <circle cx={700} cy={600} r={3} fill="#e8520a" />
          <circle cx={1200} cy={600} r={3} fill="#00d4ff" />
        </svg>
      </div>
      <div className="hero-orb" />

      <div className="hero-inner">
        <div className="hero-badge">
          <div className="hero-badge-dot" />
          <span className="hero-badge-txt">
            GATE CSE &bull; Adaptive Intelligence &bull; Closed Learning Loop
          </span>
        </div>

        <h1 className="hero-h1">
          <span className="line1">STUDY WITH</span>
          <span className="line2">
            A <span className="fire-word">PLAN.</span>
          </span>
        </h1>

        <p className="hero-sub">
          Most students prepare more. Fewer prepare smarter.
          <br />
          SmartExamPrep turns your weak areas into a roadmap.
        </p>

        <div className="hero-ctas">
          <Link href="/signup" className="bth">
            Start Preparing Free <span style={{ fontSize: 15, marginLeft: 4 }}>&rarr;</span>
          </Link>
          <Link href="#dashboard" className="bgh">
            See the Dashboard
          </Link>
        </div>

        <div className="hero-trust">
          <span className="hero-trust-item">
            <span className="hero-trust-mark">
              <svg viewBox="0 0 10 8">
                <polyline points="1,4 3.5,6.5 9,1" />
              </svg>
            </span>
            No credit card
          </span>
          <span className="hero-trust-dot" />
          <span className="hero-trust-item">
            <span className="hero-trust-mark">
              <svg viewBox="0 0 10 8">
                <polyline points="1,4 3.5,6.5 9,1" />
              </svg>
            </span>
            7-day Pro trial
          </span>
          <span className="hero-trust-dot" />
          <span className="hero-trust-item">
            <span className="hero-trust-mark">
              <svg viewBox="0 0 10 8">
                <polyline points="1,4 3.5,6.5 9,1" />
              </svg>
            </span>
            10yr PYQ database
          </span>
          <span className="hero-trust-dot" />
          <span className="hero-trust-item">
            <span className="hero-trust-mark">
              <svg viewBox="0 0 10 8">
                <polyline points="1,4 3.5,6.5 9,1" />
              </svg>
            </span>
            Cancel anytime
          </span>
        </div>

        <div className="hero-stats" id="hero-stats">
          <div className="hstat">
            <div className="hstat-n">
              <span className="counter" data-t={10}>
                0
              </span>
              yr
            </div>
            <div className="hstat-l">PYQ Data</div>
          </div>
          <div className="hstat">
            <div className="hstat-n">
              <span className="counter" data-t={94}>
                0
              </span>
              %
            </div>
            <div className="hstat-l">Prediction Accuracy</div>
          </div>
          <div className="hstat">
            <div className="hstat-n">
              <span className="counter" data-t={12}>
                0
              </span>
              +
            </div>
            <div className="hstat-l">GATE Subjects</div>
          </div>
          <div className="hstat">
            <div className="hstat-n">
              <span className="counter" data-t={100}>
                0
              </span>
              K+
            </div>
            <div className="hstat-l">Aspirants Active</div>
          </div>
        </div>
      </div>

      <div className="htick">
        <div className="ttr">
          <span className="ti">
            <span className="td" />GATE CSE 2026
          </span>
          <span className="ti">
            <span className="td" />DIAGNOSTIC QUIZ
          </span>
          <span className="ti">
            <span className="td" />ADAPTIVE ROADMAP
          </span>
          <span className="ti">
            <span className="td" />PYQ ANALYSIS
          </span>
          <span className="ti">
            <span className="td" />SPACED REPETITION
          </span>
          <span className="ti">
            <span className="td" />READINESS SCORE
          </span>
          <span className="ti">
            <span className="td" />DAILY PLANNER
          </span>
          <span className="ti">
            <span className="td" />STUDY CHAT
          </span>
          <span className="ti">
            <span className="td" />WEAKNESS DETECTION
          </span>
          <span className="ti">
            <span className="td" />GATE CSE 2026
          </span>
          <span className="ti">
            <span className="td" />DIAGNOSTIC QUIZ
          </span>
          <span className="ti">
            <span className="td" />ADAPTIVE ROADMAP
          </span>
          <span className="ti">
            <span className="td" />PYQ ANALYSIS
          </span>
          <span className="ti">
            <span className="td" />SPACED REPETITION
          </span>
          <span className="ti">
            <span className="td" />READINESS SCORE
          </span>
          <span className="ti">
            <span className="td" />DAILY PLANNER
          </span>
          <span className="ti">
            <span className="td" />STUDY CHAT
          </span>
          <span className="ti">
            <span className="td" />WEAKNESS DETECTION
          </span>
        </div>
      </div>
    </section>
  );
}

export function ProblemSection() {
  return (
    <section id="problem">
      <div className="w">
        <div className="rv">
          <div className="slb">The Gap</div>
          <div className="stx">
            MOST STUDENTS
            <br />
            STUDY <em>blind.</em>
          </div>
          <p className="ssb">
            Random chapters, no feedback, no plan. The platform closes that loop.
          </p>
        </div>

        <div className="prob-grid rv">
          <div className="prob-card bad">
            <div className="prob-card-label">
              <div className="prob-dot-bad" />
              Without SmartExamPrep
            </div>
            <div className="prob-item">
              <span className="prob-x">&#x2715;</span>
              <div>
                <strong>No baseline.</strong> You don&apos;t know which topics are weak
                until the actual exam.
              </div>
            </div>
            <div className="prob-item">
              <span className="prob-x">&#x2715;</span>
              <div>
                <strong>Random practice.</strong> Equal time on easy topics and
                neglected hard ones.
              </div>
            </div>
            <div className="prob-item">
              <span className="prob-x">&#x2715;</span>
              <div>
                <strong>No revision system.</strong> Studied something two months
                ago. Gone from memory by now.
              </div>
            </div>
            <div className="prob-item">
              <span className="prob-x">&#x2715;</span>
              <div>
                <strong>No signal.</strong> Are you ready? You genuinely don&apos;t
                know.
              </div>
            </div>
            <div className="prob-item">
              <span className="prob-x">&#x2715;</span>
              <div>
                <strong>Static PYQs.</strong> A list of questions &mdash; zero
                insight on what&apos;s likely to repeat.
              </div>
            </div>
          </div>

          <div className="prob-card good">
            <div className="prob-card-label">
              <div className="prob-dot-good" />
              With SmartExamPrep
            </div>
            <div className="prob-item">
              <span className="prob-chk">&#x2713;</span>
              <div>
                <strong>Diagnostic baseline</strong> on day one. Weak areas surface
                immediately.
              </div>
            </div>
            <div className="prob-item">
              <span className="prob-chk">&#x2713;</span>
              <div>
                <strong>Adaptive roadmap</strong> that prioritises what your exam
                actually tests, by week.
              </div>
            </div>
            <div className="prob-item">
              <span className="prob-chk">&#x2713;</span>
              <div>
                <strong>Spaced revision queue</strong> &mdash; the right topic,
                exactly when forgetting would happen.
              </div>
            </div>
            <div className="prob-item">
              <span className="prob-chk">&#x2713;</span>
              <div>
                <strong>Readiness score</strong> tracked daily so you walk in knowing
                where you stand.
              </div>
            </div>
            <div className="prob-item">
              <span className="prob-chk">&#x2713;</span>
              <div>
                <strong>10-year PYQ pattern</strong> with probability weights per
                topic, per exam.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LearningLoopSection() {
  return (
    <section id="loop">
      <div className="w">
        <div className="loop-wrap">
          <div className="rvl">
            <div className="slb">Architecture</div>
            <div className="stx">
              THE CLOSED
              <br />
              LEARNING
              <br />
              <em>Loop</em>
            </div>
            <p className="ssb">
              Five interconnected systems that feed each other. Every session makes
              the next one more targeted. This is what separates preparation from
              practice.
            </p>
            <div
              style={{
                marginTop: 40,
                padding: "20px 24px",
                background: "var(--paper)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid var(--fire)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "9.5px",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "var(--fire)",
                  marginBottom: 6,
                }}
              >
                How it compounds
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  lineHeight: "1.8",
                  fontWeight: 300,
                }}
              >
                Each quiz updates your weakness model. The roadmap recalculates. The
                revision queue reorders. The chat answers using your actual gaps.
                Every day is smarter than yesterday.
              </div>
            </div>
          </div>

          <div className="loop-visual rvr">
            <svg
              viewBox="0 0 400 400"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              style={{ maxWidth: 420, display: "block", margin: "0 auto" }}
            >
              <circle
                cx={200}
                cy={200}
                r={155}
                fill="none"
                stroke="#1e1c18"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <circle
                cx={200}
                cy={200}
                r={155}
                fill="none"
                stroke="url(#ring-grad)"
                strokeWidth={2}
                strokeDasharray="200 780"
                strokeLinecap="round"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 200 200"
                  to="360 200 200"
                  dur="12s"
                  repeatCount="indefinite"
                />
              </circle>

              <defs>
                <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#e8520a" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#e8520a" stopOpacity={0} />
                </radialGradient>
                <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e8520a" />
                  <stop offset="100%" stopColor="#00d4ff" />
                </linearGradient>
              </defs>

              <circle cx={200} cy={200} r={80} fill="url(#center-glow)" />
              <rect
                x={163}
                y={185}
                width={74}
                height={32}
                fill="#0d0d12"
                stroke="#1e1c18"
                strokeWidth={1}
              />
              <text
                x={200}
                y={198}
                fontFamily="'Bebas Neue',sans-serif"
                fontSize={13}
                fill="#f0e8da"
                textAnchor="middle"
                letterSpacing={2}
              >
                SMART
              </text>
              <text
                x={200}
                y={211}
                fontFamily="'Bebas Neue',sans-serif"
                fontSize={13}
                fill="#e8520a"
                textAnchor="middle"
                letterSpacing={2}
              >
                EXAM
              </text>

              <rect x={160} y={18} width={80} height={44} fill="#0d0d12" stroke="#1e1c18" strokeWidth={1} />
              <rect x={160} y={18} width={80} height={2} fill="#e8520a" />
              <text x={200} y={36} fontFamily="'IBM Plex Mono',monospace" fontSize={9} fill="#e8520a" textAnchor="middle" letterSpacing={1}>DIAGNOSTIC</text>
              <text x={200} y={50} fontFamily="'IBM Plex Mono',monospace" fontSize={9} fill="#5a5550" textAnchor="middle" letterSpacing={1}>QUIZ</text>
              <line x1={200} y1={62} x2={200} y2={80} stroke="#e8520a" strokeWidth="1.5" markerEnd="url(#arr-fire)" />

              <rect x={312} y={160} width={80} height={44} fill="#0d0d12" stroke="#1e1c18" strokeWidth={1} />
              <rect x={312} y={160} width={80} height={2} fill="#00d4ff" />
              <text x={352} y={178} fontFamily="'IBM Plex Mono',monospace" fontSize={9} fill="#00d4ff" textAnchor="middle" letterSpacing={1}>ADAPTIVE</text>
              <text x={352} y={192} fontFamily="'IBM Plex Mono',monospace" fontSize={9} fill="#5a5550" textAnchor="middle" letterSpacing={1}>ROADMAP</text>
              <line x1={312} y1={183} x2={298} y2={200} stroke="#00d4ff" strokeWidth="1.5" markerEnd="url(#arr-ice)" />

              <rect x={272} y={306} width={80} height={44} fill="#0d0d12" stroke="#1e1c18" strokeWidth={1} />
              <rect x={272} y={306} width={80} height={2} fill="#e8520a" />
              <text x={312} y={324} fontFamily="'IBM Plex Mono',monospace" fontSize={9} fill="#e8520a" textAnchor="middle" letterSpacing={1}>ADAPTIVE</text>
              <text x={312} y={338} fontFamily="'IBM Plex Mono',monospace" fontSize={9} fill="#5a5550" textAnchor="middle" letterSpacing={1}>PRACTICE</text>
              <line x1={290} y1={306} x2={240} y2={275} stroke="#e8520a" strokeWidth="1.5" markerEnd="url(#arr-fire)" />

              <rect x={48} y={306} width={80} height={44} fill="#0d0d12" stroke="#1e1c18" strokeWidth={1} />
              <rect x={48} y={306} width={80} height={2} fill="#00d4ff" />
              <text x={88} y={324} fontFamily="'IBM Plex Mono',monospace" fontSize={9} fill="#00d4ff" textAnchor="middle" letterSpacing={1}>REVISION</text>
              <text x={88} y={338} fontFamily="'IBM Plex Mono',monospace" fontSize={9} fill="#5a5550" textAnchor="middle" letterSpacing={1}>QUEUE</text>
              <line x1={128} y1={320} x2={163} y2={240} stroke="#00d4ff" strokeWidth="1.5" markerEnd="url(#arr-ice)" />

              <rect x={8} y={160} width={80} height={44} fill="#0d0d12" stroke="#1e1c18" strokeWidth={1} />
              <rect x={8} y={160} width={80} height={2} fill="#e8520a" />
              <text x={48} y={178} fontFamily="'IBM Plex Mono',monospace" fontSize={9} fill="#e8520a" textAnchor="middle" letterSpacing={1}>ANALYTICS</text>
              <text x={48} y={192} fontFamily="'IBM Plex Mono',monospace" fontSize={9} fill="#5a5550" textAnchor="middle" letterSpacing={1}>+ SCORE</text>
              <line x1={88} y1={183} x2={107} y2={197} stroke="#e8520a" strokeWidth="1.5" markerEnd="url(#arr-fire)" />

              <path d="M 240 40 Q 352 40 352 160" fill="none" stroke="#1e1c18" strokeWidth={1} strokeDasharray="3 3" />
              <path d="M 392 204 Q 392 312 312 312" fill="none" stroke="#1e1c18" strokeWidth={1} strokeDasharray="3 3" />
              <path d="M 272 328 H 128" fill="none" stroke="#1e1c18" strokeWidth={1} strokeDasharray="3 3" />
              <path d="M 48 306 Q 8 280 8 204" fill="none" stroke="#1e1c18" strokeWidth={1} strokeDasharray="3 3" />
              <path d="M 48 160 Q 48 40 160 40" fill="none" stroke="#1e1c18" strokeWidth={1} strokeDasharray="3 3" />

              <defs>
                <marker id="arr-fire" markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto">
                  <polygon points="0,0 6,3 0,6" fill="#e8520a" />
                </marker>
                <marker id="arr-ice" markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto">
                  <polygon points="0,0 6,3 0,6" fill="#00d4ff" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features">
      <div className="w">
        <div className="fhd rv">
          <div className="slb">Core Features</div>
          <div className="stx">
            BUILT FOR
            <br />
            <em>GATE CSE</em>
            <br />
            SPECIFICALLY
          </div>
          <p className="ssb">
            Not a generic question bank. Every feature is wired into the learning
            loop &mdash; measure, adapt, track, repeat.
          </p>
        </div>
      </div>

      <div className="w">
        <div className="feat-layout rv">
          <div className="feat-row cols2">
            <div className="fc">
              <div className="fn">01</div>
              <div className="fic">
                <svg viewBox="0 0 24 24">
                  <circle cx={12} cy={12} r={10} />
                  <path d="M12 8v4l3 3" />
                </svg>
              </div>
              <div className="ftt">DIAGNOSTIC QUIZ</div>
              <div className="fdsc">
                First session maps your baseline across all GATE subjects. Adaptive
                difficulty calibrates to your real level in under 30 minutes &mdash;
                not a self-reported score.
              </div>
              <div style={{ marginTop: 24 }}>
                <div className="diag-visual">
                  <div className="diag-title">OS &mdash; Virtual Memory &mdash; Q3 of 12</div>
                  <div className="diag-q">
                    In a demand-paged system, effective access time is 200ns normally
                    and 8ms on a page fault. With fault rate p, express effective
                    access time.
                  </div>
                  <div className="diag-opt neutral">
                    <div className="diag-radio" />200 + 8,000,000p
                  </div>
                  <div className="diag-opt correct">
                    <div className="diag-radio">
                      <div className="diag-radio-fill" />
                    </div>
                    200(1-p) + 8,000,000p
                  </div>
                  <div className="diag-opt wrong">
                    <div className="diag-radio" />200p + 8,000,000(1-p)
                  </div>
                  <div className="diag-result-bar">
                    <div className="diag-bar-label">Diagnostic progress &mdash; OS</div>
                    <div className="diag-bar-wrap">
                      <div
                        className="diag-bar-fill mid"
                        style={{ "--w": "61%", width: 0 } as CSSProperties}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="ftag">Baseline Detection</div>
            </div>

            <div className="fc">
              <div className="fn">02</div>
              <div className="fic">
                <svg viewBox="0 0 24 24">
                  <rect x={3} y={4} width={18} height={18} rx={2} />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                </svg>
              </div>
              <div className="ftt">ADAPTIVE ROADMAP</div>
              <div className="fdsc">
                Week-by-week plan generated from your diagnostic results, exam date,
                daily study hours, and PYQ topic weights. Regenerates when your
                performance shifts.
              </div>
              <div style={{ marginTop: 24 }}>
                <div
                  className="road-visual"
                  style={{ background: "var(--paper)", border: "1px solid var(--border)" }}
                >
                  <div
                    style={{
                      padding: "12px 20px",
                      borderBottom: "1px solid var(--border)",
                      fontFamily: "var(--mono)",
                      fontSize: "9.5px",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    Your 8-Week GATE Roadmap
                  </div>
                  <div className="road-week">
                    <div className="road-week-num" style={{ color: "var(--green)" }}>
                      W1
                    </div>
                    <div className="road-week-bar-wrap">
                      <div className="road-week-bar done" style={{ width: "100%" }} />
                    </div>
                    <div className="road-week-label done">DS + Algorithms</div>
                    <div className="road-week-pct" style={{ color: "var(--green)" }}>
                      100%
                    </div>
                  </div>
                  <div className="road-week">
                    <div className="road-week-num" style={{ color: "var(--green)" }}>
                      W2
                    </div>
                    <div className="road-week-bar-wrap">
                      <div className="road-week-bar done" style={{ width: "100%" }} />
                    </div>
                    <div className="road-week-label done">OS Fundamentals</div>
                    <div className="road-week-pct" style={{ color: "var(--green)" }}>
                      100%
                    </div>
                  </div>
                  <div className="road-week">
                    <div className="road-week-num" style={{ color: "var(--fire)" }}>
                      W3
                    </div>
                    <div className="road-week-bar-wrap">
                      <div className="road-week-bar act" style={{ width: "58%" }} />
                    </div>
                    <div className="road-week-label act">Networks + DBMS</div>
                    <div className="road-week-pct" style={{ color: "var(--fire)" }}>
                      58%
                    </div>
                  </div>
                  <div className="road-week">
                    <div className="road-week-num">W4</div>
                    <div className="road-week-bar-wrap">
                      <div className="road-week-bar future" style={{ width: "12%" }} />
                    </div>
                    <div className="road-week-label future">TOC + Compilers</div>
                    <div className="road-week-pct">&mdash;</div>
                  </div>
                  <div className="road-week">
                    <div className="road-week-num">W5-8</div>
                    <div className="road-week-bar-wrap">
                      <div className="road-week-bar future" style={{ width: "0%" }} />
                    </div>
                    <div className="road-week-label future">Mock + Revision</div>
                    <div className="road-week-pct">&mdash;</div>
                  </div>
                </div>
              </div>
              <div className="ftag">Week-wise Plan</div>
            </div>
          </div>

          <div className="feat-row cols2">
            <div className="fc">
              <div className="fn">03</div>
              <div className="fic">
                <svg viewBox="0 0 24 24">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </div>
              <div className="ftt">DAILY PLANNER</div>
              <div className="fdsc">
                Each morning your day is planned &mdash; sessions, topics, PYQ
                practice, revision blocks. Unfinished tasks carry forward
                automatically. Activity logged for streak tracking.
              </div>
              <div
                style={{
                  marginTop: 24,
                  background: "var(--paper)",
                  border: "1px solid var(--border)",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9.5px",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  Today &mdash; Day 21 of 90
                </div>
                <div className="dash-plan-row">
                  <div className="dash-plan-check done" />
                  <div className="dash-plan-text done">OS: Scheduling Algorithms</div>
                  <div className="dash-plan-time" style={{ color: "var(--green)" }}>
                    Done
                  </div>
                </div>
                <div className="dash-plan-row">
                  <div className="dash-plan-check done" />
                  <div className="dash-plan-text done">PYQ Session &mdash; Networks (2022-23)</div>
                  <div className="dash-plan-time" style={{ color: "var(--green)" }}>
                    Done
                  </div>
                </div>
                <div className="dash-plan-row">
                  <div className="dash-plan-check pending" />
                  <div className="dash-plan-text pending">Revision: Virtual Memory</div>
                  <div className="dash-plan-time">Due now</div>
                </div>
                <div className="dash-plan-row" style={{ borderBottom: "none" }}>
                  <div className="dash-plan-check pending" style={{ borderColor: "var(--border)" }} />
                  <div className="dash-plan-text" style={{ color: "var(--muted)" }}>
                    Adaptive Mock &mdash; OS + Networks
                  </div>
                  <div className="dash-plan-time">30m left</div>
                </div>
              </div>
              <div className="ftag">Carry-Forward Tasks</div>
            </div>

            <div className="fc">
              <div className="fn">04</div>
              <div className="fic">
                <svg viewBox="0 0 24 24">
                  <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
                </svg>
              </div>
              <div className="ftt">REVISION QUEUE</div>
              <div className="fdsc">
                Spaced repetition engine schedules topics exactly when memory decay is
                about to hit. Intervals adjust based on your quiz performance on that
                topic.
              </div>
              <div style={{ marginTop: 24 }}>
                <div className="srs-cards">
                  <div className="srs-title">Revision Due Today &mdash; 4 Topics</div>
                  <div className="srs-card">
                    <div>
                      <div className="srs-topic">Virtual Memory &mdash; Paging</div>
                      <div className="srs-interval">Studied 3 days ago &bull; Accuracy 42%</div>
                    </div>
                    <div className="srs-due now">Due Now</div>
                  </div>
                  <div className="srs-card">
                    <div>
                      <div className="srs-topic">Process Synchronization</div>
                      <div className="srs-interval">Studied 7 days ago &bull; Accuracy 68%</div>
                    </div>
                    <div className="srs-due now">Due Now</div>
                  </div>
                  <div className="srs-card">
                    <div>
                      <div className="srs-topic">TCP Congestion Control</div>
                      <div className="srs-interval">Studied 2 days ago &bull; Accuracy 71%</div>
                    </div>
                    <div className="srs-due soon">Tomorrow</div>
                  </div>
                  <div className="srs-card">
                    <div>
                      <div className="srs-topic">B+ Tree Indexing</div>
                      <div className="srs-interval">Studied 1 day ago &bull; Accuracy 89%</div>
                    </div>
                    <div className="srs-due later">In 4 days</div>
                  </div>
                </div>
              </div>
              <div className="ftag">Performance-Aware Intervals</div>
            </div>
          </div>

          <div className="feat-row single">
            <div className="fc">
              <div className="fn">05 &mdash; Intelligence Layer</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 48,
                  alignItems: "start",
                }}
              >
                <div>
                  <div className="fic">
                    <svg viewBox="0 0 24 24">
                      <path d="M2 20h.01M7 20v-4" />
                      <path d="M12 20V10M17 20V4M22 20h.01" />
                    </svg>
                  </div>
                  <div className="ftt">WEAKNESS DETECTION ENGINE</div>
                  <div className="fdsc">
                    Every quiz response feeds five signals: accuracy, repeated
                    mistakes, response time, difficulty sensitivity, and topic trend.
                    The AI builds a live weakness model &mdash; not a static score.
                    The roadmap and revision queue both read from this model.
                  </div>
                  <div className="ftag">5-Signal Analysis</div>
                </div>
                <div
                  style={{
                    background: "var(--paper)",
                    border: "1px solid var(--border)",
                    padding: 24,
                    fontFamily: "var(--mono)",
                    fontSize: "11.5px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "9.5px",
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    Weakness Profile &mdash; Detected Today
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ color: "var(--cream)" }}>OS &mdash; Virtual Memory</span>
                        <span style={{ color: "#ef4444" }}>Weak &darr;</span>
                      </div>
                      <div style={{ height: 3, background: "var(--border)", position: "relative" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "28%", background: "#ef4444" }} />
                      </div>
                      <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4 }}>
                        Accuracy: 28% &bull; Avg time: 4.2min &bull; Repeated errors: 3
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ color: "var(--cream)" }}>Networks &mdash; IP Routing</span>
                        <span style={{ color: "var(--amber)" }}>Avg &rarr;</span>
                      </div>
                      <div style={{ height: 3, background: "var(--border)", position: "relative" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "55%", background: "var(--amber)" }} />
                      </div>
                      <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4 }}>
                        Accuracy: 55% &bull; Avg time: 2.1min &bull; Improving
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ color: "var(--cream)" }}>Algorithms &mdash; Sorting</span>
                        <span style={{ color: "var(--green)" }}>Strong &uarr;</span>
                      </div>
                      <div style={{ height: 3, background: "var(--border)", position: "relative" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "88%", background: "var(--green)" }} />
                      </div>
                      <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4 }}>
                        Accuracy: 88% &bull; Fast responses &bull; Consistent
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 12,
                      borderTop: "1px solid var(--border)",
                      fontSize: "9.5px",
                      color: "var(--fire)",
                    }}
                  >
                    AI: Prioritising Virtual Memory in next 3 sessions &rarr;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DashboardPreviewSection() {
  return (
    <section id="dashboard">
      <div className="w">
        <div className="dash-wrap">
          <div className="dash-mockup rvl">
            <div className="dash-header">
              <div className="dash-header-logo">SMARTEXAMPREP</div>
              <div className="dash-header-meta">Day 21 of 90 &bull; GATE CSE 2026</div>
            </div>
            <div className="dash-body">
              <div className="dash-card">
                <div className="dash-card-label">Readiness Score</div>
                <div className="readiness-ring">
                  <svg viewBox="0 0 80 80">
                    <circle className="readiness-circle-bg" cx={40} cy={40} r={35} />
                    <circle className="readiness-circle-fill" cx={40} cy={40} r={35} />
                  </svg>
                  <div className="readiness-text">75</div>
                </div>
                <div className="dash-card-sub" style={{ textAlign: "center", fontSize: "9.5px" }}>
                  Up 4 pts this week
                </div>
              </div>

              <div className="dash-card">
                <div className="dash-card-label">Study Streak</div>
                <div className="dash-card-value" style={{ color: "var(--amber)", fontSize: 26 }}>
                  21 days
                </div>
                <div className="dash-streak">
                  <div className="dash-streak-day done" />
                  <div className="dash-streak-day done" />
                  <div className="dash-streak-day done" />
                  <div className="dash-streak-day done" />
                  <div className="dash-streak-day done" />
                  <div className="dash-streak-day done" />
                  <div className="dash-streak-day today" />
                </div>
                <div className="dash-card-sub">Last 7 days</div>
              </div>

              <div className="dash-focus">
                <div className="dash-focus-label">AI Focus Hint for Today</div>
                <div className="dash-focus-text">
                  &quot;Your Virtual Memory accuracy dropped 14 points across last 3
                  sessions. Front-load it today before Networks practice &mdash;
                  recovery window is narrow.&quot;
                </div>
              </div>

              <div className="dash-card">
                <div className="dash-card-label">Roadmap</div>
                <div className="dash-card-value" style={{ color: "var(--fire)" }}>
                  38%
                </div>
                <div className="dash-card-sub">Week 3 of 8 active</div>
              </div>

              <div className="dash-card">
                <div className="dash-card-label">Revision Due</div>
                <div className="dash-card-value" style={{ color: "var(--ice)" }}>
                  4
                </div>
                <div className="dash-card-sub">Topics need review</div>
              </div>

              <div className="dash-card dash-plan-col">
                <div className="dash-card-label" style={{ marginBottom: 12 }}>
                  Today&apos;s Plan
                </div>
                <div className="dash-plan-row">
                  <div className="dash-plan-check done" />
                  <div className="dash-plan-text done">OS: Scheduling Algorithms</div>
                  <div className="dash-plan-time" style={{ color: "var(--green)" }}>
                    Done
                  </div>
                </div>
                <div className="dash-plan-row">
                  <div className="dash-plan-check pending" />
                  <div className="dash-plan-text pending">Revision: Virtual Memory</div>
                  <div className="dash-plan-time">Now</div>
                </div>
                <div className="dash-plan-row" style={{ borderBottom: "none" }}>
                  <div className="dash-plan-check pending" style={{ borderColor: "var(--border)" }} />
                  <div className="dash-plan-text" style={{ color: "var(--muted)" }}>
                    Adaptive Mock &mdash; OS
                  </div>
                  <div className="dash-plan-time">Later</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rvr">
            <div className="slb">Live Dashboard</div>
            <div className="stx">
              YOUR EXAM
              <br />
              READINESS
              <br />
              <em>Visible.</em>
            </div>
            <p className="ssb">
              The dashboard is your single source of truth. Readiness score,
              streak, daily plan, AI focus hint, and roadmap progress &mdash; all in
              one view. No guessing where you stand.
            </p>

            <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: 16,
                  background: "var(--paper)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 2,
                    height: "100%",
                    background: "var(--fire)",
                    alignSelf: "stretch",
                    minHeight: 40,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "var(--fire)",
                      marginBottom: 4,
                    }}
                  >
                    Readiness Score
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 300, lineHeight: "1.7" }}>
                    A composite of accuracy trend, topic coverage, revision
                    compliance, and mock performance. Updated after every session.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: 16,
                  background: "var(--paper)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 2,
                    height: "100%",
                    background: "var(--ice)",
                    alignSelf: "stretch",
                    minHeight: 40,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "var(--ice)",
                      marginBottom: 4,
                    }}
                  >
                    AI Focus Hint
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 300, lineHeight: "1.7" }}>
                    Each morning the AI reads your roadmap, planner, and weakness
                    model to surface the single most important thing to work on
                    today.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 32 }}>
              <Link href="/signup" className="bth">
                Start Your Dashboard <span style={{ fontSize: 15, marginLeft: 4 }}>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PYQSection() {
  const [activeFilter, setActiveFilter] = useState("All Years");

  return (
    <section id="pyq">
      <div className="w">
        <div className="rv" style={{ marginBottom: 64 }}>
          <div className="slb">PYQ Bank</div>
          <div className="stx">
            TEN YEARS.
            <br />
            EVERY QUESTION.
            <br />
            <em>Weighted.</em>
          </div>
          <p className="ssb">
            Browse, filter by subject, topic, year, or difficulty. Every question
            shows its probability of appearing again &mdash; ranked by 10yr pattern
            analysis.
          </p>
        </div>
      </div>

      <div className="w">
        <div className="pyq-layout rv">
          <div className="pyq-browser">
            <div className="pyq-bar">
              {pyqFilters.map((filter) => {
                const isActive = activeFilter === filter.label;
                return (
                  <span
                    key={filter.label}
                    className={`pyq-filter${isActive ? " active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveFilter(filter.label)}
                    onKeyDown={(event) =>
                      activateOnKey(event, () => setActiveFilter(filter.label))
                    }
                    style={
                      filter.defaultHighlight
                        ? {
                            borderColor: "rgba(232,82,10,.3)",
                            color: "var(--fire)",
                          }
                        : undefined
                    }
                  >
                    {filter.label}
                  </span>
                );
              })}
            </div>

            <div className="pyq-list">
              <div className="pyq-item">
                <div className="pyq-year">2024</div>
                <div className="pyq-content">
                  <div className="pyq-topic">OS &mdash; Virtual Memory</div>
                  <div className="pyq-text">
                    Which page replacement algorithm suffers from Belady&apos;s anomaly
                    in FIFO but not in optimal?
                  </div>
                  <div className="pyq-tags">
                    <span className="pyq-tag medium">Medium</span>
                    <span className="pyq-tag" style={{ borderColor: "rgba(232,82,10,.25)", color: "var(--fire)" }}>
                      3rd year in a row
                    </span>
                  </div>
                </div>
                <div className="pyq-prob">78%</div>
              </div>

              <div className="pyq-item">
                <div className="pyq-year">2023</div>
                <div className="pyq-content">
                  <div className="pyq-topic">Networks &mdash; Transport Layer</div>
                  <div className="pyq-text">
                    In TCP slow start, the congestion window doubles every RTT until
                    it reaches the ssthresh. After a timeout, ssthresh is set to...
                  </div>
                  <div className="pyq-tags">
                    <span className="pyq-tag hard">Hard</span>
                    <span className="pyq-tag">Repeated pattern</span>
                  </div>
                </div>
                <div className="pyq-prob" style={{ color: "var(--ice)" }}>
                  65%
                </div>
              </div>

              <div className="pyq-item" style={{ borderBottom: "none" }}>
                <div className="pyq-year">2022</div>
                <div className="pyq-content">
                  <div className="pyq-topic">Algorithms &mdash; Sorting</div>
                  <div className="pyq-text">
                    What is the minimum number of comparisons required to find the
                    minimum and maximum of n numbers simultaneously?
                  </div>
                  <div className="pyq-tags">
                    <span className="pyq-tag medium">Medium</span>
                    <span className="pyq-tag">Classic</span>
                  </div>
                </div>
                <div className="pyq-prob">51%</div>
              </div>
            </div>
          </div>

          <div className="pyq-info">
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 28 }}>
              Why it matters
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ fontFamily: "var(--display)", fontSize: 36, color: "var(--fire)", letterSpacing: 1, lineHeight: 1, flexShrink: 0 }}>
                  78%
                </div>
                <div style={{ fontSize: "13.5px", color: "var(--muted)", lineHeight: "1.8", fontWeight: 300 }}>
                  Of questions in a typical GATE paper come from topics that have
                  appeared at least once in the past 10 years.
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ fontFamily: "var(--display)", fontSize: 36, color: "var(--ice)", letterSpacing: 1, lineHeight: 1, flexShrink: 0 }}>
                  3x
                </div>
                <div style={{ fontSize: "13.5px", color: "var(--muted)", lineHeight: "1.8", fontWeight: 300 }}>
                  Students who practice PYQs with pattern awareness score 3x higher
                  than those who only read theory.
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ fontFamily: "var(--display)", fontSize: 36, color: "var(--cream)", letterSpacing: 1, lineHeight: 1, flexShrink: 0 }}>
                  5400+
                </div>
                <div style={{ fontSize: "13.5px", color: "var(--muted)", lineHeight: "1.8", fontWeight: 300 }}>
                  Verified PYQs tagged by topic, subtopic, difficulty, and year
                  &mdash; all feeding directly into the roadmap weightage model.
                </div>
              </div>
            </div>
            <div style={{ marginTop: 32 }}>
              <Link
                href="/signup"
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10.5px",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "var(--fire)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  borderBottom: "1px solid rgba(232,82,10,.3)",
                  paddingBottom: 2,
                }}
              >
                Browse Full PYQ Bank &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StudyChatSection() {
  return (
    <section id="chat">
      <div className="w">
        <div className="chat-layout">
          <div className="rvl">
            <div className="slb">Study Chat</div>
            <div className="stx">
              ASK THE AI
              <br />
              THAT KNOWS
              <br />
              <em>Your gaps.</em>
            </div>
            <p className="ssb">
              The study chat is grounded in your actual roadmap, planner state, and
              weakness model. It doesn&apos;t give generic answers &mdash; it answers
              for your specific situation.
            </p>

            <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
                Grounded on
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: 1, textTransform: "uppercase", padding: "5px 12px", border: "1px solid rgba(0,212,255,.2)", color: "var(--ice)" }}>
                  Your Roadmap
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: 1, textTransform: "uppercase", padding: "5px 12px", border: "1px solid rgba(0,212,255,.2)", color: "var(--ice)" }}>
                  Today&apos;s Plan
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: 1, textTransform: "uppercase", padding: "5px 12px", border: "1px solid rgba(0,212,255,.2)", color: "var(--ice)" }}>
                  Weakness Model
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "9.5px", letterSpacing: 1, textTransform: "uppercase", padding: "5px 12px", border: "1px solid rgba(0,212,255,.2)", color: "var(--ice)" }}>
                  PYQ Patterns
                </span>
              </div>
            </div>
          </div>

          <div className="chat-window rvr">
            <div className="chat-top">
              <div className="chat-dot" />
              <div className="chat-dot" />
              <div className="chat-dot" />
              <span className="chat-title">Study Chat &mdash; GATE CSE Mode</span>
              <span className="chat-context-pill">Roadmap context active</span>
            </div>

            <div className="chat-body">
              <div className="chat-msg">
                <div className="chat-avatar ai">AI</div>
                <div className="chat-bubble ai">
                  Your Virtual Memory score dropped to <strong className="highlight">28%</strong> in today&apos;s diagnostic. Your roadmap shows Week 3 covers Networks &mdash; but given the drop, I&apos;d recommend a short re-session on paging before you move forward. Want a quick explainer on Belady&apos;s anomaly?
                </div>
              </div>

              <div className="chat-msg user">
                <div className="chat-avatar user">U</div>
                <div className="chat-bubble user">
                  Yes, explain Belady&apos;s anomaly. Also what&apos;s the GATE weightage for this topic?
                </div>
              </div>

              <div className="chat-msg">
                <div className="chat-avatar ai">AI</div>
                <div className="chat-bubble ai">
                  <strong>Belady&apos;s Anomaly:</strong> In FIFO page replacement,
                  adding more frames can sometimes increase page faults. It&apos;s
                  counter-intuitive &mdash; more memory, worse performance.
                  <br />
                  <br />
                  <strong>GATE Weightage:</strong> Virtual Memory has appeared in <span className="highlight">8 of last 10 papers</span>, with 1&ndash;2 marks per paper. Probability for 2026: <span className="highlight">78%</span>. High priority &mdash; your roadmap already flagged it.
                  <br />
                  <br />
                  Shall I generate 3 practice questions from this topic?
                </div>
              </div>
            </div>

            <div className="chat-inp-bar">
              <input className="chat-inp" placeholder="Ask about any GATE topic..." readOnly />
              <button className="chat-send" type="button">
                SEND &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section id="testimonials">
      <div className="w">
        <div className="rv" style={{ marginBottom: 0 }}>
          <div className="slb">Results</div>
          <div className="stx">
            WHAT HAPPENS
            <br />
            WHEN YOU <em>Close</em>
            <br />
            THE LOOP
          </div>
        </div>

        <div className="tgrid rv">
          <div className="tc">
            <div className="tc-quote">
              &quot;The weakness detection actually worked. It flagged my OS gaps in week
              two. I thought I was fine. By exam day I had 91% accuracy in OS. It
              knew before I did.&quot;
            </div>
            <div className="tc-meta">
              <div className="tc-av" style={{ background: "var(--fire)" }}>
                AR
              </div>
              <div>
                <div className="tc-name">Arjun Reddy</div>
                <div className="tc-rank">GATE CSE 2024 &mdash; AIR 47</div>
              </div>
            </div>
          </div>

          <div className="tc">
            <div className="tc-quote">
              &quot;I had 3 months. The roadmap gave me exactly what to cover each week.
              I stopped second-guessing the plan and just executed. Readiness score
              went from 41 to 88.&quot;
            </div>
            <div className="tc-meta">
              <div className="tc-av" style={{ background: "var(--ice2)" }}>
                SK
              </div>
              <div>
                <div className="tc-name">Swati Kulkarni</div>
                <div className="tc-rank">GATE CSE 2024 &mdash; AIR 112</div>
              </div>
            </div>
          </div>

          <div className="tc">
            <div className="tc-quote">
              &quot;The spaced revision queue is underrated. I stopped forgetting things
              I studied in month one. By the end my retention was consistent across
              the entire syllabus.&quot;
            </div>
            <div className="tc-meta">
              <div className="tc-av" style={{ background: "var(--ember)" }}>
                MK
              </div>
              <div>
                <div className="tc-name">Mohammed Khalid</div>
                <div className="tc-rank">GATE CSE 2024 &mdash; AIR 234</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CompareSection() {
  return (
    <section id="compare">
      <div className="w">
        <div className="rv" style={{ textAlign: "center", marginBottom: 0 }}>
          <div className="slb" style={{ justifyContent: "center" }}>
            Comparison
          </div>
          <div className="stx" style={{ textAlign: "center" }}>
            WHY NOT
            <br />
            JUST COACHING?
          </div>
        </div>

        <div className="cmp rv">
          <div className="cs us">
            <div className="cst">SmartExamPrep</div>
            <ul className="clist">
              <li>
                <span className="ci-y">&#x2713;</span>Diagnostic baseline on day one
              </li>
              <li>
                <span className="ci-y">&#x2713;</span>Adaptive roadmap &mdash;
                regenerates as you improve
              </li>
              <li>
                <span className="ci-y">&#x2713;</span>Spaced revision queue based on
                your performance
              </li>
              <li>
                <span className="ci-y">&#x2713;</span>10-year PYQ analysis with
                probability weights
              </li>
              <li>
                <span className="ci-y">&#x2713;</span>Study chat grounded in your
                actual weak areas
              </li>
              <li>
                <span className="ci-y">&#x2713;</span>Daily planner with carry-forward
                task tracking
              </li>
              <li>
                <span className="ci-y">&#x2713;</span>From 499/mo &mdash; transparent,
                cancel anytime
              </li>
            </ul>
          </div>

          <div className="cs th">
            <div className="cst">Traditional Coaching</div>
            <ul className="clist">
              <li>
                <span className="ci-n">&#x2715;</span>Batch lectures, no
                personalisation
              </li>
              <li>
                <span className="ci-n">&#x2715;</span>Fixed syllabus schedule for
                everyone
              </li>
              <li>
                <span className="ci-n">&#x2715;</span>No revision scheduling system
              </li>
              <li>
                <span className="ci-n">&#x2715;</span>PYQs as PDFs, no pattern
                analysis
              </li>
              <li>
                <span className="ci-n">&#x2715;</span>Generic doubt clearing &mdash;
                not your gaps
              </li>
              <li>
                <span className="ci-n">&#x2715;</span>No tracking of daily completion
              </li>
              <li>
                <span className="ci-n">&#x2715;</span>10,000 &mdash; 50,000/yr with no
                refunds
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section id="pricing">
      <div className="w">
        <div className="rv" style={{ textAlign: "center" }}>
          <div className="slb" style={{ justifyContent: "center" }}>
            Pricing
          </div>
          <div className="stx" style={{ textAlign: "center" }}>
            FAIR PRICE.
            <br />
            FULL <em>Access.</em>
          </div>
          <p className="ssb" style={{ marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
            No hidden tiers. Every plan includes the core learning loop. Pro unlocks
            the full AI stack.
          </p>
        </div>

        <div className="pgrid">
          <div className="pc">
            <div className="ptier">Free</div>
            <div className="pamt">
              0<span className="per">/mo</span>
            </div>
            <div className="ptag">
              Start your diagnostic and explore the platform. No time limit on free
              features.
            </div>
            <ul className="pfeats">
              <li>
                <span className="pck">&#x2713;</span>Diagnostic quiz (one time)
              </li>
              <li>
                <span className="pck">&#x2713;</span>Basic roadmap view
              </li>
              <li>
                <span className="pck">&#x2713;</span>50 PYQs per month
              </li>
              <li>
                <span className="pck">&#x2713;</span>Daily planner (basic)
              </li>
              <li>
                <span className="pck-n">&mdash;</span>Adaptive quizzes
              </li>
              <li>
                <span className="pck-n">&mdash;</span>Spaced revision queue
              </li>
              <li>
                <span className="pck-n">&mdash;</span>AI Study Chat
              </li>
              <li>
                <span className="pck-n">&mdash;</span>Readiness analytics
              </li>
            </ul>
            <Link href="/signup" className="pbtn free">
              Get Started
            </Link>
          </div>

          <div className="pc feat">
            <div className="ptier">Pro &mdash; Most Popular</div>
            <div className="pamt">
              <span className="cur">&#x20B9;</span>499<span className="per">/month</span>
            </div>
            <div className="ptag">
              Everything in the closed loop. Recommended for serious GATE aspirants.
            </div>
            <ul className="pfeats">
              <li>
                <span className="pck">&#x2713;</span>Unlimited diagnostic quizzes
              </li>
              <li>
                <span className="pck">&#x2713;</span>Full adaptive roadmap + daily
                planner
              </li>
              <li>
                <span className="pck">&#x2713;</span>Unlimited PYQ access + pattern
                analysis
              </li>
              <li>
                <span className="pck">&#x2713;</span>Spaced revision queue
              </li>
              <li>
                <span className="pck">&#x2713;</span>Adaptive mock tests (IRT-based)
              </li>
              <li>
                <span className="pck">&#x2713;</span>AI Study Chat (grounded)
              </li>
              <li>
                <span className="pck">&#x2713;</span>Readiness score + analytics
              </li>
              <li>
                <span className="pck">&#x2713;</span>Weakness detection engine
              </li>
            </ul>
            <Link href="/signup" className="pbtn main">
              <span>Start 7-Day Free Trial &rarr;</span>
            </Link>
          </div>

          <div className="pc">
            <div className="ptier">Annual Pro</div>
            <div className="pamt">
              <span className="cur">&#x20B9;</span>3499<span className="per">/year</span>
            </div>
            <div className="ptag">
              Save 42% vs monthly. Full Pro access for your entire GATE prep cycle.
            </div>
            <ul className="pfeats">
              <li>
                <span className="pck">&#x2713;</span>Everything in Pro
              </li>
              <li>
                <span className="pck">&#x2713;</span>Priority AI Chat responses
              </li>
              <li>
                <span className="pck">&#x2713;</span>Up to 3 exam profiles
              </li>
              <li>
                <span className="pck">&#x2713;</span>Early access to new features
              </li>
              <li>
                <span className="pck">&#x2713;</span>Export progress reports
              </li>
              <li>
                <span className="pck">&#x2713;</span>Research-grade analytics access
              </li>
              <li>
                <span className="pck-n">&mdash;</span>Cohort benchmarking (coming)
              </li>
              <li>
                <span className="pck-n">&mdash;</span>Mentor sessions (coming)
              </li>
            </ul>
            <Link href="/signup" className="pbtn prem">
              Get Annual Pro
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const answerRefs = useRef<Array<HTMLDivElement | null>>([]);

  const handleToggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq">
      <div className="w">
        <div className="fql">
          <div className="rvl">
            <div className="slb">FAQ</div>
            <div className="stx" style={{ fontSize: "clamp(40px,5vw,68px)" }}>
              QUESTIONS
              <br />
              ANSWERED
            </div>
            <p className="ssb">If something isn&apos;t covered here, reach out directly.</p>
            <div style={{ marginTop: 36 }}>
              <Link
                href="#"
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10.5px",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "var(--fire)",
                  borderBottom: "1px solid rgba(232,82,10,.3)",
                  paddingBottom: 2,
                }}
              >
                Contact Support &rarr;
              </Link>
            </div>
          </div>

          <div className="flist rvr">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index;
              const maxHeight = isOpen
                ? `${answerRefs.current[index]?.scrollHeight ?? 0}px`
                : undefined;

              return (
                <div key={item.question} className={`fi${isOpen ? " op" : ""}`}>
                  <button
                    className="fq"
                    type="button"
                    onClick={() => handleToggleFaq(index)}
                  >
                    {item.question}
                    <span className="fqi">+</span>
                  </button>
                  <div className="fa" style={{ maxHeight }}>
                    <div
                      className="fai"
                      ref={(element) => {
                        answerRefs.current[index] = element;
                      }}
                    >
                      {item.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section id="cta">
      <div className="w">
        <div className="ctai rv">
          <div className="ctabg">PREPARE</div>
          <div className="ctal">&mdash; The loop starts here &mdash;</div>
          <div className="ctat">
            KNOW WHERE
            <br />
            YOU STAND.
            <br />
            <em>Every single day.</em>
          </div>
          <p className="ctas">
            Your diagnostic, roadmap, and first day plan are ready in under 3
            minutes. No setup. No credit card.
          </p>
          <div className="ctact">
            <Link href="/signup" className="bth">
              Start Free &mdash; No Card Needed
              <span style={{ fontSize: 15, marginLeft: 4 }}>&rarr;</span>
            </Link>
            <Link href="#dashboard" className="bgh">
              See the Dashboard
            </Link>
          </div>
          <div className="ctanote">
            7-day Pro trial &bull; Cancel anytime &bull; Built for GATE CSE 2026
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="w">
        <div className="ft">
          <div>
            <span className="fbn">
              SMART<span>EXAM</span>PREP
            </span>
            <p className="ftag2">
              AI-powered adaptive exam preparation for GATE CSE. Built on a closed
              learning loop &mdash; not a question bank.
            </p>
            <div className="soc">
              <Link href="#" className="soci" style={{ fontSize: 13 }}>
                X
              </Link>
              <Link href="#" className="soci" style={{ fontSize: 11 }}>
                in
              </Link>
              <Link href="#" className="soci" style={{ fontSize: 11 }}>
                YT
              </Link>
            </div>
          </div>

          <div className="fch">
            <h5>Features</h5>
            <ul>
              <li>
                <Link href="#">Diagnostic Quiz</Link>
              </li>
              <li>
                <Link href="#">Adaptive Roadmap</Link>
              </li>
              <li>
                <Link href="#">Daily Planner</Link>
              </li>
              <li>
                <Link href="#">PYQ Bank</Link>
              </li>
              <li>
                <Link href="#">Revision Queue</Link>
              </li>
              <li>
                <Link href="#">Study Chat</Link>
              </li>
            </ul>
          </div>

          <div className="fch">
            <h5>Platform</h5>
            <ul>
              <li>
                <Link href="#">Dashboard</Link>
              </li>
              <li>
                <Link href="#">Pricing</Link>
              </li>
              <li>
                <Link href="#">Analytics</Link>
              </li>
              <li>
                <Link href="#">API Docs</Link>
              </li>
            </ul>
          </div>

          <div className="fch">
            <h5>Company</h5>
            <ul>
              <li>
                <Link href="#">About</Link>
              </li>
              <li>
                <Link href="#">Blog</Link>
              </li>
              <li>
                <Link href="#">Contact</Link>
              </li>
              <li>
                <Link href="#">Privacy Policy</Link>
              </li>
              <li>
                <Link href="#">Terms</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="fb">
          <span className="fbc">&copy; 2025 SmartExamPrep. All rights reserved.</span>
          <span className="fbe">
            <a href="mailto:hello@smartexamprep.com">hello@smartexamprep.com</a>
          </span>
          <span className="fbbd">Built for India&apos;s GATE aspirants</span>
        </div>
      </div>
    </footer>
  );
}
