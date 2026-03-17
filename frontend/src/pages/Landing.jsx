import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { ClipboardList, Smartphone, CheckCircle, Pill, Calendar, FileText, Eye, Bot, Link2 } from 'lucide-react';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const [countsVisible, setCountsVisible] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setCountsVisible(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing page-enter">
      <div className="hero-wrap">
        <div className="hero-inner w-full max-w-[1200px] mx-auto px-4">
          <section className="hero">
            <div className="hero-content">
              <div className="hero-logo-lockup">
                <img src="/medguard.png" alt="MedGuard" className="hero-logo-large" />
              </div>
              <h1 className="hero-headline">
                Your medications, <em>proactively</em> managed.
              </h1>
              <p className="hero-sub">
                MedGuard reaches out to you at the exact moment side effects are likely — not after. Powered by agentic AI, built for Canadians.
              </p>
              <div className="hero-ctas">
                <button type="button" className="btn btn-primary" onClick={() => navigate('/signup')}>
                  Get Started Free
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/signup')}>
                  For Doctors
                </button>
              </div>
            </div>
            <div className="hero-mockup">
              <div className="mockup-card mockup-float">
                <div className="mockup-header">Check-in</div>
                <div className="mockup-message">
                  <span className="mockup-avatar">AI</span>
                  <p>Hi Maria, how are you feeling today? Any dizziness, fatigue, or other changes since starting your medications?</p>
                </div>
                <div className="mockup-tools">
                  <span className="tool-badge">PharmacyMCP</span>
                  <span className="tool-badge">SideEffectWindow</span>
                  <span className="tool-badge">ReportGen</span>
                </div>
              </div>
              <div className="stat-badge stat-badge-1">58% miss side effects</div>
              <div className="stat-badge stat-badge-2">3 tool calls</div>
            </div>
          </section>
        </div>
      </div>

      <div className="landing-below-hero">
      <div className="landing-container">
      <section className="stats-strip" ref={statsRef}>
        <div className="stats-inner">
          <div className="stat-item">
            <span className="stat-num">{countsVisible ? '58' : '0'}%</span>
            <span className="stat-label">of Canadians miss side effects</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{countsVisible ? '3' : '0'}</span>
            <span className="stat-label">tool calls per check-in</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">&lt; {countsVisible ? '90' : '0'}</span>
            <span className="stat-label">sec demo</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{countsVisible ? '0' : '0'}</span>
            <span className="stat-label">manual steps</span>
          </div>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step-card" style={{ animationDelay: '0.1s' }}>
            <span className="step-num">01</span>
            <ClipboardList className="step-icon" />
            <h3>Load Your Profile</h3>
            <p>Enter medications once. PharmacyMCP pulls the full clinical profile including side effect windows.</p>
          </div>
          <div className="step-card" style={{ animationDelay: '0.2s' }}>
            <span className="step-num">02</span>
            <Smartphone className="step-icon" />
            <h3>Agent Reaches Out</h3>
            <p>At peak side-effect windows, the AI initiates the check-in. You don&apos;t have to remember.</p>
          </div>
          <div className="step-card" style={{ animationDelay: '0.3s' }}>
            <span className="step-num">03</span>
            <CheckCircle className="step-icon" />
            <h3>Smart Action Taken</h3>
            <p>Minor symptoms get OTC suggestions. Severe ones trigger an auto-generated doctor report.</p>
          </div>
        </div>
      </section>

      <section className="dual-view" id="features">
        <h2>Patient vs Doctor View</h2>
        <div className="dual-cards">
          <div className="view-card view-patient">
            <div className="view-card-header">Patient View</div>
            <ul>
              <li><Pill className="view-icon" /> Track medications & side effects</li>
              <li><Calendar className="view-icon" /> Proactive check-ins at the right time</li>
              <li><FileText className="view-icon" /> Share reports with your doctor</li>
            </ul>
          </div>
          <div className="view-card view-doctor">
            <div className="view-card-header">Doctor View</div>
            <ul>
              <li><Eye className="view-icon" /> See patient summaries & trends</li>
              <li><Bot className="view-icon" /> AI-generated reports ready to review</li>
              <li><Link2 className="view-icon" /> One portal for all chronic patients</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <h2>What People Say</h2>
        <div className="testimonial-cards">
          <div className="testimonial-card">
            <blockquote>&ldquo;I finally stopped forgetting to report my dizziness. MedGuard asked me at the right time.&rdquo;</blockquote>
            <cite>— Maria C., Toronto</cite>
          </div>
          <div className="testimonial-card">
            <blockquote>&ldquo;The doctor report feature saves me 10 minutes per patient. Game changer.&rdquo;</blockquote>
            <cite>— Dr. James L., Vancouver</cite>
          </div>
          <div className="testimonial-card">
            <blockquote>&ldquo;Built for Canadians. Works with my pharmacy and my clinic.&rdquo;</blockquote>
            <cite>— Sarah M., Montreal</cite>
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <div className="cta-inner">
          <h2>Three tool calls. Zero manual work. One Canadian who doesn&apos;t fall through the cracks.</h2>
          <div className="cta-buttons">
            <button type="button" className="btn btn-white" onClick={() => navigate('/signup')}>
              Get Started Free
            </button>
            <Link to="/signup" className="btn btn-outline-white">For Doctors</Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <Link to="/" className="footer-logo">
          <img className="nav-logo-icon" src="/medguard.png" alt="MedGuard logo" />
          <span className="nav-logo-wordmark">MedGuard</span>
        </Link>
        <p className="footer-copy">© {new Date().getFullYear()} MedGuard · Sun Life prize track</p>
        <span className="footer-badge">Built in 12 hours · GenAI Genesis</span>
      </footer>
      </div>
      </div>
    </div>
  );
}

