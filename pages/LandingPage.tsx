import React, { useState, useEffect, useRef } from 'react';

const LOGO_SRC = "data:image/png;base64,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";

interface LandingPageProps {
  onGetStarted: () => void;
}

// Minimal fade-in hook using IntersectionObserver
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", background: '#F7F7F5', color: '#1a1a1a', overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ?? NAV ?? */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #e8e8e4' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center", justifyContent: 'space-between" }}>
          <img src={LOGO_SRC} alt="TaxPulse NG" style={{ height: 32, objectFit: 'contain' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden-mobile">
            {['Features', 'How it works', 'Pricing'].map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`}
                style={{ fontSize: 14, fontWeight: 600, color: '#444', textDecoration: 'none', letterSpacing: '-0.01em' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#00843D')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}
              >{link}</a>
            ))}
          </div>
          <button
            onClick={onGetStarted}
            style={{ background: '#00843D', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#006B32')}
            onMouseLeave={e => (e.currentTarget.style.background = '#00843D')}
          >Get Started Free</button>
        </div>
      </nav>

      {/* ?? HERO ?? */}
      <section style={{ paddingTop: 120, paddingBottom: 80, padding: '120px 24px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="hero-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#e8f5ee', border: '1px solid #b8dfc8', borderRadius: 100, padding: '6px 14px', marginBottom: 24 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00843D', display: 'block', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#00843D', letterSpacing: '0.06em', textTransform: 'uppercase' }}>NTA 2025 Compliant ? Updated Jan 2026</span>
            </div>

            <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-0.03em', color: '#0d0d0d', marginBottom: 20 }}>
              Tax compliance for<br />
              <span style={{ color: '#00843D' }}>Nigerian businesses,</span><br />
              finally sorted.
            </h1>

            <p style={{ fontSize: 18, lineHeight: 1.7, color: '#555', marginBottom: 36, maxWidth: 480, fontWeight: 400 }}>
              Auto-generate your VAT, PAYE, WHT and CIT deadlines. Import bank statements. Stay audit-ready. Built for how Nigerian SMEs actually work.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={onGetStarted}
                style={{ background: '#00843D', color: '#ffffff', border: 'none', padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em', boxShadow: '0 4px 20px rgba(0,132,61,0.25)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#006B32')}
                onMouseLeave={e => (e.currentTarget.style.background = '#00843D')}
              >Start Free -- No Card Needed</button>
              <a href="#how-it-works"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#222', border: '1.5px solid #ddd', padding: '14px 22px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', letterSpacing: '-0.01em' }}
              >See how it works ?</a>
            </div>

            <div style={{ marginTop: 36, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {['Free to start', 'No credit card', 'NRS audit-ready'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#666', fontWeight: 500 }}>
                  <span style={{ color: '#00843D', fontSize: 15, fontWeight: 800 }}>?</span> {t}
                </div>
              ))}
            </div>
          </div>

          {/* Hero image - Nigerian professional */}
          <div style={{ position: 'relative' }}>
            <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.12)', lineHeight: 0 }}>
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=640&q=80&fit=crop"
                alt="Nigerian business professional working on tax compliance"
                style={{ width: '100%', height: 420, objectFit: 'cover', display: 'block' }}
              />
            </div>
            {/* Floating stat card */}
            <div style={{
              position: 'absolute', bottom: -20, left: -20,
              background: '#fff', borderRadius: 14, padding: '16px 20px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0'
            }}>
              <p style={{ fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Next VAT deadline</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#0d0d0d', letterSpacing: '-0.02em' }}>21 days <span style={{ color: '#00843D' }}>?</span></p>
              <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>You're on track</p>
            </div>
            {/* Floating compliance badge */}
            <div style={{
              position: 'absolute', top: -16, right: -16,
              background: '#00843D', borderRadius: 14, padding: '12px 18px',
              boxShadow: '0 8px 24px rgba(0,132,61,0.3)'
            }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Compliance</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>100% ?</p>
            </div>
          </div>
        </div>
      </section>

      {/* ?? PAIN POINTS ?? */}
      <section style={{ background: '#fff', padding: '80px 24px', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#00843D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Sound familiar?</p>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#0d0d0d', lineHeight: 1.15 }}>
                Running a Nigerian business is hard enough.<br />
                <span style={{ color: '#888', fontWeight: 500 }}>Tax stress shouldn't be part of it.</span>
              </h2>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="pain-grid">
            {[
              {
                img: "https://images.unsplash.com/photo-1586473219010-2ffc57b0d282?w=480&q=80&fit=crop",
                quote: "I missed my VAT deadline again. Now I'm paying a N50,000 penalty I can't afford.",
                name: "Bello A.",
                role: "Retail shop owner, Kano",
              },
              {
                img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=480&q=80&fit=crop",
                quote: "\"The NRS sent an audit notice. I spent three days trying to find old receipts. Found half.\"",
                name: "Chidinma O.",
                role: "Boutique owner, Lagos",
              },
              {
                img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=480&q=80&fit=crop",
                quote: "\"I honestly don't know how much tax I owe each month. My accountant charges ?80k to tell me.\"",
                name: "Emeka T.",
                role: "Tech consultant, Abuja",
              }
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div style={{ background: '#F7F7F5', borderRadius: 16, overflow: 'hidden', border: '1px solid #ebebeb' }}>
                  <div style={{ height: 200, overflow: 'hidden', lineHeight: 0 }}>
                    <img src={item.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(20%)' }} />
                  </div>
                  <div style={{ padding: '24px' }}>
                    <p style={{ fontSize: 15, lineHeight: 1.65, color: '#333', fontStyle: 'italic', marginBottom: 16, fontWeight: 400 }}>{item.quote}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#00843D' }}>
                        {item.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0d0d0d' }}>{item.name}</p>
                        <p style={{ fontSize: 12, color: '#999' }}>{item.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={400}>
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#00843D' }}>TaxPulse NG solves all three. Setup takes 2 minutes.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ?? FEATURES ?? */}
      <section id="features" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ marginBottom: 56 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#00843D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Everything included</p>
              <div style={{ display: 'flex", justifyContent: 'space-between", alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, color: '#0d0d0d', maxWidth: 560 }}>
                  Built around how Nigerian businesses actually operate.
                </h2>
                <p style={{ fontSize: 15, color: '#666', maxWidth: 320, lineHeight: 1.6 }}>
                  Not a generic accounting tool. Every feature is aligned to NTA 2025, NRS deadlines, and Nigerian tax reality.
                </p>
              </div>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="features-grid">
            {[
              { icon: '?', title: 'Auto Tax Calendar', desc: 'Sign up once. Get 12 months of VAT, PAYE, WHT and CIT deadlines generated based on your company profile.', tag: 'Core' },
              { icon: '?', title: 'Bank Statement Import', desc: 'Upload your PDF, Excel or CSV. AI reads every transaction, categorises it and fills your ledger in seconds.', tag: 'Pro' },
              { icon: '?', title: 'AI Tax Assistant', desc: 'Ask "How much VAT do I owe this month?" Get an answer based on your actual ledger -- not generic advice.', tag: 'Pro' },
              { icon: '??', title: 'Evidence Vault', desc: 'Store receipts and invoices securely. NTA 2025 requires 6-year retention. Be audit-ready in minutes.', tag: 'Pro' },
              { icon: '?', title: 'PDF Tax Reports', desc: 'Generate professional reports ready to send your accountant or submit to the Nigeria Revenue Service.', tag: 'Pro' },
              { icon: '?', title: 'Deadline Reminders', desc: 'Push notifications 7 days and 1 day before every obligation. Never miss a VAT return or PAYE filing again.', tag: 'Core' },
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{
                  background: '#fff', borderRadius: 16, padding: '28px',
                  border: '1px solid #ebebeb',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex", justifyContent: 'space-between", alignItems: 'flex-start', marginBottom: 16 }}>
                    <span style={{ fontSize: 28 }}>{f.icon}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                      background: f.tag === 'Pro' ? '#e8f5ee' : '#f0f0f0',
                      color: f.tag === 'Pro' ? '#00843D' : '#666',
                      letterSpacing: '0.04em', textTransform: 'uppercase'
                    }}>{f.tag}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0d0d0d', marginBottom: 8, letterSpacing: '-0.01em' }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ?? DASHBOARD PREVIEW ?? */}
      <section style={{ background: '#0d0d0d', padding: '80px 24px', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>What it looks like</p>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                Your tax dashboard, always up to date.
              </h2>
              <p style={{ color: '#888', fontSize: 16, marginTop: 12 }}>Know exactly what's due, when -- before it becomes a problem.</p>
            </div>
          </FadeIn>

          {/* Mock dashboard UI */}
          <FadeIn delay={200}>
            <div style={{ background: '#1a1a1a', borderRadius: 20, border: '1px solid #333', overflow: 'hidden', boxShadow: '0 40px 120px rgba(0,0,0,0.4)' }}>
              {/* Browser chrome */}
              <div style={{ background: '#252525', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #333' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                <div style={{ flex: 1, background: '#333', borderRadius: 6, padding: '4px 12px', marginLeft: 8, fontSize: 12, color: '#888' }}>taxpulse-ng.vercel.app</div>
              </div>
              {/* Dashboard mockup */}
              <div style={{ padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Compliance Score', value: '94%', color: '#00843D', bg: '#0a2e1a' },
                    { label: 'Obligations Due', value: '3', color: '#fbbf24', bg: '#2a1e00' },
                    { label: 'Filed This Year', value: '11', color: '#60a5fa', bg: '#0a1a2e' },
                    { label: 'Est. VAT Owing', value: '?184k', color: '#f87171', bg: '#2e0a0a' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '16px 18px', border: `1px solid ${s.color}22` }}>
                      <p style={{ fontSize: 11, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                      <p style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#111', borderRadius: 12, border: '1px solid #2a2a2a', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 18px', borderBottom: '1px solid #222', display: 'flex", justifyContent: 'space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc' }}>Upcoming Tax Obligations</span>
                    <span style={{ fontSize: 12, color: '#666' }}>April 2026</span>
                  </div>
                  {[
                    { tax: 'VAT Return (March)', due: '21 Apr 2026', status: 'Due Soon', statusColor: '#fbbf24', statusBg: '#2a1e00' },
                    { tax: 'PAYE (March)', due: '10 Apr 2026', status: 'Overdue', statusColor: '#f87171', statusBg: '#2e0a0a' },
                    { tax: 'WHT (March)', due: '21 Apr 2026', status: 'On Track', statusColor: '#4ade80', statusBg: '#0a2e1a' },
                    { tax: 'CIT Annual Return', due: '30 Jun 2026', status: 'On Track', statusColor: '#4ade80', statusBg: '#0a2e1a' },
                  ].map(row => (
                    <div key={row.tax} style={{ padding: '12px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex", justifyContent: 'space-between", alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#bbb' }}>{row.tax}</span>
                      <span style={{ fontSize: 12, color: '#666' }}>{row.due}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: row.statusBg, color: row.statusColor }}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ?? HOW IT WORKS ?? */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#00843D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Simple process</p>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                From signup to compliant in 10 minutes.
              </h2>
            </div>
          </FadeIn>

          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: 28, top: 40, bottom: 40, width: 2, background: 'linear-gradient(to bottom, #00843D, #b8dfc8)', borderRadius: 2 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { n: '01', title: 'Create your company profile', desc: 'Tell us your business type, state, and whether you collect VAT or have employees. Takes under 2 minutes.' },
                { n: '02', title: 'Get your 12-month tax calendar', desc: 'VAT, PAYE, WHT, CIT -- all generated instantly with exact NRS due dates based on your profile.' },
                { n: '03', title: 'Import your bank statement', desc: "Upload last month's statement. AI extracts transactions, calculates taxes owed, and fills your ledger." },
                { n: '04', title: 'Stay compliant automatically', desc: 'Mark obligations as filed, track your compliance score, and get push reminders before every deadline.' },
              ].map((s, i) => (
                <FadeIn key={i} delay={i * 120}>
                  <div style={{ display: 'flex', gap: 24, paddingBottom: i < 3 ? 32 : 0, position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#00843D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 4px #fff, 0 0 0 6px #b8dfc8' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{s.n}</span>
                    </div>
                    <div style={{ paddingTop: 12 }}>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0d0d0d', marginBottom: 6, letterSpacing: '-0.01em' }}>{s.title}</h3>
                      <p style={{ fontSize: 15, color: '#666', lineHeight: 1.65 }}>{s.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ?? PRICING ?? */}
      <section id="pricing" style={{ padding: '80px 24px', background: '#F7F7F5' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#00843D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Pricing</p>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}>Less than what a single penalty costs you.</h2>
              <p style={{ color: '#888', fontSize: 16, marginTop: 12 }}>Late VAT filing attracts a minimum ?50,000 penalty. Pro plan is ?5,000/month.</p>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="pricing-grid">
            {/* Free */}
            <FadeIn>
              <div style={{ background: '#fff', borderRadius: 20, padding: '36px', border: '1.5px solid #e8e8e4' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Free Forever</p>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.04em', color: '#0d0d0d' }}>?0</span>
                </div>
                <p style={{ fontSize: 14, color: '#999', marginBottom: 28 }}>Get started, no card needed</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {['1 company', 'Tax obligation calendar', 'All tax calculators', 'Tax ledger', 'Penalty calculator'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: '#333' }}>
                      <span style={{ color: '#00843D', fontWeight: 800, fontSize: 15 }}>?</span> {f}
                    </div>
                  ))}
                  {['AI Tax Assistant', 'PDF Export', 'Evidence Vault', 'Bank Import'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: '#bbb' }}>
                      <span style={{ fontSize: 14 }}>--</span> {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={onGetStarted}
                  style={{ width: '100%', background: '#fff', color: '#00843D', border: '2px solid #00843D', padding: '13px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#e8f5ee')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >Start Free</button>
              </div>
            </FadeIn>

            {/* Pro */}
            <FadeIn delay={120}>
              <div style={{ background: '#00843D', borderRadius: 20, padding: '36px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', borderRadius: 100, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Most popular</div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Pro</p>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff' }}>?5,000</span>
                  <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>/month</span>
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>or <strong style={{ color: '#fff' }}>?50,000/year</strong> -- save 2 months</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 28 }}>Cheaper than one late-filing penalty</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {['Everything in Free', 'Unlimited companies', '? AI Tax Assistant', '? Bank Statement Import', '? PDF Export & Reports', '?? Evidence Vault', 'Push deadline reminders', 'Priority support'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 800, fontSize: 15 }}>?</span> {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={onGetStarted}
                  style={{ width: '100%', background: '#fff', color: '#00843D', border: 'none', padding: '13px', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >Get Pro Access</button>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={200}>
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#999' }}>
              Have a promo code? Enter it after signing up to unlock Pro free.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ?? FINAL CTA ?? */}
      <section style={{ padding: '80px 24px', background: '#fff', borderTop: '1px solid #eee' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <img src={LOGO_SRC} alt="TaxPulse NG" style={{ height: 40, objectFit: 'contain', marginBottom: 28 }} />
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>
              Stop guessing. Start complying.
            </h2>
            <p style={{ fontSize: 17, color: '#666', lineHeight: 1.7, marginBottom: 36 }}>
              Join Nigerian business owners who replaced tax panic with tax confidence. Your first obligation calendar is ready in under 2 minutes.
            </p>
            <button
              onClick={onGetStarted}
              style={{ background: '#00843D', color: '#fff', border: 'none', padding: '16px 36px', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em', boxShadow: '0 4px 20px rgba(0,132,61,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#006B32')}
              onMouseLeave={e => (e.currentTarget.style.background = '#00843D')}
            >Create Free Account ?</button>
            <p style={{ fontSize: 13, color: '#bbb', marginTop: 16 }}>No credit card required ? Cancel anytime</p>
          </FadeIn>
        </div>
      </section>

      {/* ?? FOOTER ?? */}
      <footer style={{ background: '#0d0d0d', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex", justifyContent: 'space-between", alignItems: 'flex-start', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
            <div style={{ maxWidth: 280 }}>
              <img src={LOGO_SRC} alt="TaxPulse NG" style={{ height: 28, filter: 'brightness(0) invert(1)', objectFit: 'contain', marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>Making Nigerian tax compliance simple and stress-free for small businesses. NTA 2025 compliant.</p>
            </div>
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Product</p>
                {['Features', 'Pricing', 'How it works'].map(l => (
                  <p key={l} style={{ fontSize: 14, color: '#777', marginBottom: 8 }}>
                    <a href="#" style={{ color: '#777', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#777')}
                    >{l}</a>
                  </p>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Support</p>
                {['Contact Us', 'Promo Code', 'Privacy Policy'].map(l => (
                  <p key={l} style={{ fontSize: 14, color: '#777', marginBottom: 8 }}>
                    <a href={l === 'Contact Us' ? 'mailto:support@taxpulse.ng' : '#'} style={{ color: '#777', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#777')}
                    >{l}</a>
                  </p>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #222', paddingTop: 24, display: 'flex", justifyContent: 'space-between", flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#555' }}>? 2026 TaxPulse NG. All rights reserved.</p>
            <p style={{ fontSize: 13, color: '#444' }}>Built for Nigerian SMEs ? NTA 2025 ? Powered by Supabase & AI</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .pain-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .hidden-mobile { display: none !important; }
        }
        @media (max-width: 480px) {
          .features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
