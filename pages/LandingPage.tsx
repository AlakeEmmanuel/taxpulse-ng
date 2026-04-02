import React, { useState, useEffect, useRef } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const { ref, visible } = useFadeIn();
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms` }}>
      {children}
    </div>
  );
};

// NTA 2026 tax bands
const BANDS = [
  { limit: 800000,    rate: 0.00 },
  { limit: 2200000,   rate: 0.15 },
  { limit: 9000000,   rate: 0.18 },
  { limit: 13000000,  rate: 0.21 },
  { limit: 25000000,  rate: 0.23 },
  { limit: Infinity,  rate: 0.25 },
];

function calcPIT(gross: number): number {
  const pension = gross * 0.08;
  const nhis    = gross * 0.015;
  const nhf     = gross * 0.025;
  const taxable = Math.max(0, gross - pension - nhis - nhf);
  let rem = taxable, tax = 0;
  for (const b of BANDS) {
    if (rem <= 0) break;
    const chunk = isFinite(b.limit) ? Math.min(rem, b.limit) : rem;
    tax += chunk * b.rate;
    rem -= chunk;
  }
  return tax;
}

const fmt = (n: number) => '\u20a6' + Math.round(n).toLocaleString('en-NG');

const I = {
  calendar:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  brain:       <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.84A2.5 2.5 0 0 1 9.5 2"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.84A2.5 2.5 0 0 0 14.5 2"/></svg>,
  bank:        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="22" width="22" height="1"/><rect x="2" y="10" width="20" height="12"/><polygon points="12 2 2 10 22 10"/></svg>,
  shield:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  file:        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  invoice:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>,
  globe:       <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  dollar:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  trend:       <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  users:       <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  bell:        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  vault:       <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M12 9v-1M12 16v-1M9 12H8M16 12h-1"/></svg>,
  calc:        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="18"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="16" y1="14" x2="16" y2="18"/></svg>,
  payslip:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><circle cx="12" cy="14" r="2"/><path d="M6 14h.01M18 14h.01"/></svg>,
  share:       <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  cert:        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  alert:       <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  chat:        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  laptop:      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  building:    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  check16:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrowR:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  arrowDown:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  star:        <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  plus:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
};

const FEATURES = [
  { icon: I.calendar, color: '#00843D', bg: '#F0FDF4', title: 'Automated Tax Calendar',   tag: 'Core',     desc: 'VAT, PAYE, WHT, CIT, PIT, NSITF, Pension, CAC — all 12 months auto-generated from your profile with exact NRS deadlines.' },
  { icon: I.brain,    color: '#6366F1', bg: '#EEF2FF', title: 'AI Tax Assistant',         tag: 'Pro',      desc: 'Ask any Nigerian tax question. Answers are based on NTA 2025 and your actual ledger data — not generic internet advice.' },
  { icon: I.bank,     color: '#0EA5E9', bg: '#F0F9FF', title: 'Bank Statement Import',    tag: 'Pro',      desc: 'Upload your PDF, Excel or CSV statement. Transactions auto-categorised and ledger filled in seconds.' },
  { icon: I.vault,    color: '#F59E0B', bg: '#FFFBEB', title: 'Evidence Vault',           tag: 'Pro',      desc: 'Store receipts, invoices and payment proofs. NTA 2025 requires 6-year document retention. Be audit-ready at any time.' },
  { icon: I.file,     color: '#E4002B', bg: '#FFF1F2', title: 'PDF Tax Reports',          tag: 'Pro',      desc: 'Generate professional VAT, PAYE, WHT and CIT reports ready to submit to NRS or share with your accountant.' },
  { icon: I.invoice,  color: '#00843D', bg: '#F0FDF4', title: 'VAT Invoice Generator',    tag: 'Core',     desc: 'NRS-compliant invoices with your TIN, client TIN, itemised tax amounts and zero-rated toggle. PDF in one click.' },
  { icon: I.globe,    color: '#8B5CF6', bg: '#F5F3FF', title: 'Foreign Income Tracker',   tag: 'Core',     desc: 'Log income in USD, GBP, EUR, CAD, AUD or USDT. Live exchange rates auto-convert to NGN with tax set-aside per payment.' },
  { icon: I.dollar,   color: '#10B981', bg: '#ECFDF5', title: 'PIT Calculator',           tag: 'Core',     desc: '2026 NTA bands with full breakdown of pension, NHIS, NHF, rent relief deductions and quarterly instalment schedule.' },
  { icon: I.trend,    color: '#00843D', bg: '#F0FDF4', title: 'Salary Simulator',         tag: 'Core',     desc: 'Compare current vs proposed salary. See PAYE, pension, NHIS, NHF deductions and exact net pay before making a decision.' },
  { icon: I.payslip,  color: '#0EA5E9', bg: '#F0F9FF', title: 'Payslip Generator',        tag: 'Pro',      desc: 'Generate multi-employee payslips with all statutory deductions — PAYE, pension, NHIS, NHF, NSITF — formatted for distribution.' },
  { icon: I.users,    color: '#6366F1', bg: '#EEF2FF', title: 'Payroll CSV Export',       tag: 'Pro',      desc: 'Export payroll in the exact State IRS submission format. All NTA 2025 statutory deductions calculated correctly.' },
  { icon: I.alert,    color: '#E4002B', bg: '#FFF1F2', title: 'Penalty Calculator',       tag: 'Core',     desc: 'Know exactly what you owe in NRS penalties before they contact you — late filing, late payment and audit penalties.' },
  { icon: I.cert,     color: '#00843D', bg: '#F0FDF4', title: 'TCC Tracker',              tag: 'Core',     desc: 'Track your Tax Clearance Certificate expiry date. Links to NRS TaxPro Max and your State IRS portal included.' },
  { icon: I.bell,     color: '#E4002B', bg: '#FFF1F2', title: 'Deadline Reminders',       tag: 'Core',     desc: 'Push notifications and WhatsApp alerts 7 days and 1 day before every single obligation. Zero missed deadlines.' },
  { icon: I.share,    color: '#8B5CF6', bg: '#F5F3FF', title: 'Accountant Share Link',    tag: 'Pro',      desc: 'Secure 30-day read-only access link for your accountant. No login required. Revoke at any time from your settings.' },
  { icon: I.chat,     color: '#25D366', bg: '#F0FDF4', title: 'WhatsApp Reminders',       tag: 'Core',     desc: 'Opt in to receive tax deadline alerts directly on WhatsApp — works on any phone, no app install needed.' },
];

const FAQS = [
  { q: 'How much income tax do I pay in Nigeria in 2026?', a: 'Under the Nigeria Tax Act 2025, the first \u20a6800,000 of annual income is completely tax-free. Above that, progressive rates apply: 15% on income from \u20a6800,001 to \u20a63,000,000; 18% from \u20a63M to \u20a612M; 21% from \u20a612M to \u20a625M; 23% from \u20a625M to \u20a650M; and 25% above \u20a650M. You can use TaxPulse NG\'s free PIT calculator to see your exact liability instantly.' },
  { q: 'Do freelancers and content creators pay tax in Nigeria?', a: 'Yes. All income earned by Nigerian residents is taxable — including AdSense, Fiverr, Upwork, brand deals, and foreign employer salaries. Freelancers must self-assess and file an annual PIT return by March 31 each year. If your annual income exceeds \u20a6800,000, you owe tax and must pay in quarterly instalments.' },
  { q: 'What is rent relief under the Nigeria Tax Act 2025?', a: 'Rent relief replaced the old Consolidated Relief Allowance (CRA). You can deduct 20% of your annual rent payment from taxable income, up to a maximum of \u20a6500,000. For example, if you pay \u20a62,400,000/year in rent, you can deduct \u20a6480,000 from your taxable income. This significantly reduces your PIT liability.' },
  { q: 'When must I file my Nigerian tax returns?', a: 'Individuals must file annual PIT returns by March 31 each year (covering the previous year\'s income). Self-employed individuals also pay quarterly advance instalments — 25% of estimated annual PIT due in March, June, September and December. Companies file CIT returns within 6 months of their financial year end. VAT returns are due by the 21st of each following month.' },
  { q: 'What is WHT and how does it work for freelancers?', a: 'Withholding Tax (WHT) is deducted at source by your clients — typically 5% for individuals and 10% for companies — when they pay you for services. This WHT is a credit against your annual PIT liability. TaxPulse NG tracks every WHT deduction automatically and subtracts it from your total PIT owed, so you are never taxed twice.' },
  { q: 'Do I need to register my business before using TaxPulse NG?', a: 'No. You can use TaxPulse NG whether your business is CAC-registered or not. For individuals and sole proprietors, you just need a TIN (Tax Identification Number) from the Nigeria Revenue Service. TaxPulse NG helps you stay compliant regardless of your registration status.' },
  { q: 'What taxes does a Nigerian business need to pay?', a: 'A typical Nigerian company must handle: Companies Income Tax (CIT) at 30% of profit; Value Added Tax (VAT) at 7.5% collected monthly; Withholding Tax (WHT) on vendor payments; PAYE for employees; NSITF (1% of gross payroll); Pension (8% employee + 10% employer); NHF (2.5% of basic salary); and CAC Annual Returns. TaxPulse NG generates your full obligation calendar automatically.' },
  { q: 'Is my data safe on TaxPulse NG?', a: 'Yes. TaxPulse NG uses 256-bit SSL encryption for all data in transit and at rest. We are fully compliant with the Nigeria Data Protection Act (NDPA). Your financial data is never sold, shared with advertisers, or used for any purpose beyond providing you the service.' },
];

const GUIDES = [
  { icon: I.laptop, color: '#6366F1', bg: '#EEF2FF', title: 'Tax for Freelancers',        desc: 'How to calculate, set aside and file your PIT if you work with clients online — whether local or foreign.' },
  { icon: I.globe,  color: '#8B5CF6', bg: '#F5F3FF', title: 'Tax for Content Creators',   desc: 'YouTube, TikTok, Instagram, brand deals and affiliate income — how each source is taxed under NTA 2025.' },
  { icon: I.trend,  color: '#0EA5E9', bg: '#F0F9FF', title: 'Tax for Remote Workers',     desc: 'Earning a salary in USD, GBP or EUR from a foreign employer? Here is your Nigerian tax obligation explained.' },
  { icon: I.users,  color: '#10B981', bg: '#ECFDF5', title: 'Tax for Employees',          desc: 'How PAYE works, how to verify your employer is remitting, and how to claim rent relief to reduce your bill.' },
  { icon: I.building, color: '#00843D', bg: '#F0FDF4', title: 'Tax for Small Businesses', desc: 'VAT, PAYE, WHT, CIT, CAC returns — everything a Nigerian SME needs to know to stay compliant all year.' },
  { icon: I.share,  color: '#E4002B', bg: '#FFF1F2', title: 'Tax for Accountants',        desc: 'Use TaxPulse NG to manage multiple clients. The accountant share link gives you secure read-only access.' },
];

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [scrolled, setScrolled]         = useState(false);
  const [income, setIncome]             = useState('');
  const [workTab, setWorkTab]           = useState<'individual' | 'business'>('individual');
  const [openFaq, setOpenFaq]           = useState<number | null>(null);
  const [featureTab, setFeatureTab]     = useState<'all' | 'individual' | 'business'>('all');
  const [journeyTab, setJourneyTab]     = useState(0);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const grossVal    = parseFloat(income.replace(/,/g, '')) || 0;
  const pitAnnual   = calcPIT(grossVal);
  const pitMonthly  = pitAnnual / 12;
  const pitQ        = pitAnnual / 4;
  const effective   = grossVal > 0 ? (pitAnnual / grossVal * 100) : 0;
  const youKeep     = grossVal - pitAnnual;

  const JOURNEYS = [
    {
      tab: 'Content Creator',
      name: 'Amaka — YouTuber & TikToker',
      location: 'Lagos, 350K subscribers',
      situation: 'Earns from AdSense, brand deals and affiliate links in USD and NGN.',
      challenge: 'No idea which income source gets taxed and at what rate. Worried about underpaying.',
      solution: 'TaxPulse NG logs every income source, converts USD to NGN at live rates, calculates PIT on combined earnings and shows quarterly set-aside.',
      result: 'Saved over \u20a6200,000 in deductions she did not know she could claim.',
      steps: ['Logs AdSense income in USD', 'Records brand deal payments in NGN', 'AI assistant explains rent relief deduction', 'Downloads quarterly tax summary for filing'],
    },
    {
      tab: 'Freelancer',
      name: 'Emeka — Software Developer',
      location: 'Abuja, Upwork Top Rated',
      situation: 'Earns from multiple foreign clients in USD and GBP through Upwork and direct contracts.',
      challenge: 'Clients deduct WHT — he did not know how to offset it against his PIT. Almost double-paid.',
      solution: 'TaxPulse NG tracks every WHT deduction as a credit, calculates exact net PIT owed, and generates the quarterly payment schedule.',
      result: 'Avoided \u20a6180,000 in overpaid tax by correctly crediting WHT deductions.',
      steps: ['Adds foreign income with actual exchange rate received', 'Logs WHT deducted by each client', 'System auto-calculates net PIT after WHT credit', 'Files quarterly instalments on the right date'],
    },
    {
      tab: 'Business Owner',
      name: 'Tunde — Director, SwiftLogistics Ltd',
      location: 'Lagos, 22 employees',
      situation: 'Running a registered Ltd company with monthly VAT, PAYE for 22 staff and vendor WHT.',
      challenge: 'Missed two VAT deadlines in one year because obligations were tracked on a spreadsheet.',
      solution: 'TaxPulse NG generated the full 12-month obligation calendar, sends WhatsApp reminders and generates PDF reports for NRS submission.',
      result: 'Zero missed deadlines. Compliance score went from 60% to 96% in 3 months.',
      steps: ['Onboarded company in under 5 minutes', 'Got full VAT, PAYE, WHT, CIT calendar instantly', 'Imported bank statement — ledger auto-filled', 'Generates payslips and PDF reports each month'],
    },
    {
      tab: 'Employee',
      name: 'Fatima — Marketing Manager',
      location: 'Port Harcourt',
      situation: 'Earns a salary plus freelance consulting income on the side.',
      challenge: 'Did not know she had to file a personal return even with PAYE. Had no idea about rent relief.',
      solution: 'TaxPulse NG calculated her combined income, applied rent relief, showed her net PIT owed after employer PAYE and reminded her of the March 31 deadline.',
      result: 'Claimed \u20a6420,000 rent relief she had never applied for before.',
      steps: ['Entered annual salary and rental payments', 'System applied rent relief deduction automatically', 'Added side income from consulting', 'Generated self-assessment return summary'],
    },
  ];

  const s: React.CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif", background: '#FAFAFA', color: '#0f172a' };

  return (
    <div style={s}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: scrolled ? 'rgba(255,255,255,0.97)' : '#fff', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${scrolled ? '#e2e8f0' : 'transparent'}`, padding: '0 28px', transition: 'all 0.25s' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 66 }}>
          <img src="/logo-full.png" alt="TaxPulse NG" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={onGetStarted} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: '8px 16px', borderRadius: 8 }}>
              Sign In
            </button>
            <button onClick={onGetStarted} style={{ background: '#00843D', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: '10px 22px' }}>
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: '76px 28px 56px', background: 'linear-gradient(155deg,#F0FDF4 0%,#FAFAFA 55%)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <FadeIn>
              <h1 style={{ fontSize: 'clamp(34px,5vw,56px)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 20px', letterSpacing: '-1.5px' }}>
                Know exactly what<br />you owe in tax.
                <br /><span style={{ color: '#00843D' }}>File it correctly.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={100}>
              <p style={{ fontSize: 18, color: '#475569', lineHeight: 1.7, margin: '0 0 32px', maxWidth: 480 }}>
                TaxPulse NG keeps every Nigerian earner compliant — freelancers, creators, remote workers and businesses. Built on NTA 2025.
              </p>
            </FadeIn>
            <FadeIn delay={200}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
                <button onClick={onGetStarted} style={{ background: '#00843D', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Start Free Today {I.arrowR}
                </button>
                <button onClick={onGetStarted} style={{ background: '#fff', color: '#0f172a', border: '1.5px solid #e2e8f0', borderRadius: 12, fontWeight: 600, fontSize: 16, cursor: 'pointer', padding: '14px 28px' }}>
                  See How It Works
                </button>
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>Free forever plan. No credit card. Takes 2 minutes to set up.</p>
            </FadeIn>
            <FadeIn delay={300}>
              <div style={{ display: 'flex', gap: 32, marginTop: 40, flexWrap: 'wrap' }}>
                {[['NTA 2025', 'Fully compliant'], ['36 States', 'IRS covered'], ['6 Currencies', 'USD GBP EUR +'], ['Free Plan', 'No card needed']].map(([v, l]) => (
                  <div key={v}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#00843D', margin: 0 }}>{v}</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>{l}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* LIVE PIT CALCULATOR */}
          <FadeIn delay={150}>
            <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #e2e8f0', padding: 32, boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#00843D', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 8px' }}>Free PIT Calculator</p>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 20px', color: '#0f172a' }}>How much tax do you owe?</h3>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Annual income (NGN)</label>
                <input
                  value={income}
                  onChange={e => setIncome(e.target.value)}
                  placeholder="e.g. 6000000"
                  type="number"
                  style={{ width: '100%', padding: '12px 16px', fontSize: 16, fontWeight: 600, border: '1.5px solid #e2e8f0', borderRadius: 12, outline: 'none', boxSizing: 'border-box', color: '#0f172a', background: '#FAFAFA' }}
                />
              </div>
              {grossVal > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                      <span>Annual PIT</span>
                      <span style={{ fontWeight: 700, color: '#E4002B', fontSize: 15 }}>{fmt(pitAnnual)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                      <span>Quarterly instalment</span>
                      <span style={{ fontWeight: 600 }}>{fmt(pitQ)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                      <span>Monthly set-aside</span>
                      <span style={{ fontWeight: 600 }}>{fmt(pitMonthly)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}>
                      <span>Effective rate</span>
                      <span style={{ fontWeight: 600 }}>{effective.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div style={{ background: '#00843D', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>You keep</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{fmt(youKeep)}</span>
                  </div>
                  <button onClick={onGetStarted} style={{ width: '100%', padding: '12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    Track this all year — free
                  </button>
                </div>
              ) : (
                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Enter your income above to see your exact tax liability</p>
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[['Under \u20a6800,000', '\u20a60 — tax free'], ['\u20a63,000,000', '\u20a6220,000/yr'], ['\u20a612,000,000', '\u20a62,124,000/yr'], ['\u20a624,000,000', '\u20a64,716,000/yr']].map(([inc, tax]) => (
                      <div key={inc} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#64748b' }}>{inc}</span>
                        <span style={{ fontWeight: 600, color: '#00843D' }}>{tax}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '12px 0 0', textAlign: 'center' }}>Based on NTA 2025. Includes pension, NHIS and NHF deductions.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* APP MOCKUP */}
      <section style={{ padding: '64px 28px', background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ color: '#00843D', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px' }}>The App</p>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Everything in one clean dashboard</h2>
              <p style={{ color: '#94a3b8', fontSize: 16, margin: 0 }}>Your compliance score, upcoming obligations and tools — all visible at a glance</p>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[
              { title: 'Tax Calendar', color: '#00843D', items: [{ label: 'VAT Return — Nov 2026', status: 'Due in 3 days', red: true }, { label: 'PAYE — Nov 2026', status: 'Due in 10 days', red: false }, { label: 'WHT — Nov 2026', status: 'Upcoming', red: false }] },
              { title: 'PIT Dashboard', color: '#6366F1', items: [{ label: 'Annual PIT liability', status: '\u20a61,824,000', red: false }, { label: 'WHT credit offset', status: '- \u20a6320,000', red: false }, { label: 'Net PIT payable', status: '\u20a61,504,000', red: true }] },
              { title: 'Foreign Income', color: '#8B5CF6', items: [{ label: 'Upwork — $500 USD', status: '\u20a6820,000 | Set aside \u20a698k', red: false }, { label: 'YouTube AdSense', status: '\u20a6285,000 | Set aside \u20a634k', red: false }, { label: 'Fiverr — $200', status: '\u20a6328,000 | Set aside \u20a639k', red: false }] },
            ].map(card => (
              <FadeIn key={card.title}>
                <div style={{ background: '#1e293b', borderRadius: 16, padding: 22, border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: card.color }} />
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0', margin: 0 }}>{card.title}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {card.items.map(item => (
                      <div key={item.label} style={{ background: '#0f172a', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: item.red ? '#ef4444' : '#00843D' }}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={200}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
              {[['97%', 'Compliance score'], ['\u20a61.2M', 'Tax tracked today'], ['3 days', 'Next obligation'], ['Zero', 'Missed deadlines']].map(([v, l]) => (
                <div key={l} style={{ background: '#1e293b', borderRadius: 12, padding: '16px 18px', border: '1px solid #334155', textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#00843D', margin: '0 0 4px' }}>{v}</p>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{l}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* NTA 2025 EDUCATION */}
      <section style={{ padding: '80px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FEF3C7', color: '#92400E', padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
              Effective January 1, 2026
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px' }}>The Nigeria Tax Act 2025 Changed Everything</h2>
            <p style={{ color: '#64748b', fontSize: 17, margin: '0 0 48px', maxWidth: 600 }}>New brackets, new thresholds, new rules. Here is what actually changed for you.</p>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20, marginBottom: 48 }}>
            {[
              { color: '#00843D', bg: '#F0FDF4', border: '#bbf7d0', title: 'New \u20a6800,000 Tax-Free Threshold', desc: 'Earn under \u20a6800,000/year? You pay zero PIT. This was previously around \u20a6300,000 under the old CRA system.' },
              { color: '#6366F1', bg: '#EEF2FF', border: '#c7d2fe', title: 'New Progressive Tax Brackets', desc: 'Rates now range from 15% to 25% above the threshold — replacing the old 7% to 24% system. Most earners pay less.' },
              { color: '#0EA5E9', bg: '#F0F9FF', border: '#bae6fd', title: 'Rent Relief Up to \u20a6500,000', desc: 'Deduct 20% of your annual rent from taxable income. Maximum \u20a6500,000 reduction. Replaces the old CRA deduction.' },
              { color: '#E4002B', bg: '#FFF1F2', border: '#fecdd3', title: 'Mandatory Filing for All', desc: 'Even employees with PAYE must now file an annual personal return. Non-compliance penalties start at \u20a650,000.' },
            ].map(c => (
              <FadeIn key={c.title}>
                <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, marginBottom: 14 }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>{c.title}</h3>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{c.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          {/* Tax bands table */}
          <FadeIn>
            <div style={{ background: '#F8FAFC', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>2026 Personal Income Tax Bands</h3>
                <span style={{ background: '#00843D', color: '#fff', padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>NTA 2025</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      {['Income range', 'Rate', 'Tax on band', 'Cumulative tax'].map(h => (
                        <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { range: 'First \u20a6800,000', rate: '0%',  tax: '\u20a60',          cum: '\u20a60' },
                      { range: '\u20a6800,001 \u2014 \u20a63,000,000',  rate: '15%', tax: '\u20a6330,000',     cum: '\u20a6330,000' },
                      { range: '\u20a63,000,001 \u2014 \u20a612,000,000', rate: '18%', tax: '\u20a61,620,000', cum: '\u20a61,950,000' },
                      { range: '\u20a612,000,001 \u2014 \u20a625,000,000', rate: '21%', tax: '\u20a62,730,000', cum: '\u20a64,680,000' },
                      { range: '\u20a625,000,001 \u2014 \u20a650,000,000', rate: '23%', tax: '\u20a65,750,000', cum: '\u20a610,430,000' },
                      { range: 'Above \u20a650,000,000', rate: '25%', tax: 'Variable', cum: '\u20a610,430,000+' },
                    ].map((r, i) => (
                      <tr key={r.range} style={{ borderBottom: '1px solid #f1f5f9', background: i === 0 ? '#F0FDF4' : '#fff' }}>
                        <td style={{ padding: '13px 20px', fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#15803D' : '#0f172a' }}>{r.range}</td>
                        <td style={{ padding: '13px 20px' }}><span style={{ background: i === 0 ? '#DCFCE7' : '#f1f5f9', color: i === 0 ? '#15803D' : '#374151', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>{r.rate}</span></td>
                        <td style={{ padding: '13px 20px', fontWeight: 600 }}>{r.tax}</td>
                        <td style={{ padding: '13px 20px', color: '#64748b' }}>{r.cum}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section style={{ padding: '80px 28px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px' }}>Built for Every Nigerian Earner</h2>
              <p style={{ color: '#64748b', fontSize: 17, margin: 0 }}>Whether you freelance or run a company — we have you covered.</p>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {[
              { icon: I.laptop, color: '#6366F1', bg: '#EEF2FF', border: '#a5b4fc', textColor: '#312E81', subColor: '#4338CA', title: 'Freelancers, Creators & Remote Workers', desc: 'You earn from Fiverr, YouTube, Upwork, brand deals or a foreign employer. TaxPulse NG tracks every source, converts currencies, shows your quarterly PIT schedule and tracks WHT your clients deduct.', points: ['Personal Income Tax (PIT) calculator', 'USD, GBP, EUR, USDT income tracking', 'WHT credit tracker — offset against PIT', 'Quarterly remittance calendar', 'Tax Clearance Certificate tracker', 'Invoice generator for your clients'] },
              { icon: I.building, color: '#00843D', bg: '#F0FDF4', border: '#86efac', textColor: '#14532D', subColor: '#166534', title: 'Business Owners & SMEs', desc: 'From sole proprietorship to Ltd. TaxPulse NG generates your full 12-month calendar, tracks VAT, PAYE, WHT and CIT, manages payroll deductions, and keeps you NRS-compliant all year without an accountant on call.', points: ['VAT, PAYE, WHT and CIT obligations', 'NSITF, Pension, ITF, NHF and CAC tracking', 'Bank statement import and auto-ledger', 'Payslip generator for your team', 'PDF tax reports for NRS submission', 'Accountant share link — read-only access'] },
            ].map(c => (
              <FadeIn key={c.title}>
                <div style={{ background: c.bg, border: `1.5px solid ${c.border}40`, borderRadius: 20, padding: 32 }}>
                  <div style={{ width: 58, height: 58, background: '#fff', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>{c.icon}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: c.textColor }}>{c.title}</h3>
                  <p style={{ fontSize: 14, color: c.subColor, margin: '0 0 20px', lineHeight: 1.7 }}>{c.desc}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {c.points.map(p => (
                      <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: '#374151' }}>
                        <span style={{ color: c.color, flexShrink: 0 }}>{I.check16}</span>{p}
                      </div>
                    ))}
                  </div>
                  <button onClick={onGetStarted} style={{ marginTop: 24, background: c.color, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: '11px 22px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Get started free {I.arrowR}
                  </button>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px' }}>Every Tool You Need</h2>
              <p style={{ color: '#64748b', fontSize: 16, margin: '0 0 24px' }}>All built in — no spreadsheets, no guessing, no missed deadlines.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {([['all', 'All Features'], ['individual', 'Individuals'], ['business', 'Businesses']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setFeatureTab(v)} style={{ padding: '8px 20px', borderRadius: 100, border: `1px solid ${featureTab === v ? '#00843D' : '#e2e8f0'}`, fontWeight: 600, fontSize: 14, cursor: 'pointer', background: featureTab === v ? '#00843D' : '#fff', color: featureTab === v ? '#fff' : '#64748b' }}>{l}</button>
                ))}
              </div>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14 }}>
            {FEATURES.filter(f => featureTab === 'all' || (featureTab === 'individual' && ['Automated Tax Calendar','AI Tax Assistant','Foreign Income Tracker','PIT Calculator','Salary Simulator','Penalty Calculator','TCC Tracker','Deadline Reminders','WhatsApp Reminders','VAT Invoice Generator'].includes(f.title)) || (featureTab === 'business' && !['Foreign Income Tracker','PIT Calculator'].includes(f.title))).map((f, i) => (
              <FadeIn key={f.title} delay={i * 30}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 22, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = f.color + '60'; e.currentTarget.style.boxShadow = `0 4px 24px rgba(0,0,0,0.06)`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ width: 46, height: 46, background: f.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: 14 }}>{f.icon}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a', lineHeight: 1.3, flex: 1, paddingRight: 8 }}>{f.title}</h3>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: f.tag === 'Pro' ? '#FEF3C7' : '#DCFCE7', color: f.tag === 'Pro' ? '#92400E' : '#15803D', flexShrink: 0 }}>{f.tag}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* USER JOURNEYS */}
      <section style={{ padding: '80px 28px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px' }}>Real Nigerian Earners, Real Results</h2>
              <p style={{ color: '#64748b', fontSize: 16, margin: '0 0 28px' }}>See how different types of earners use TaxPulse NG.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {JOURNEYS.map((j, i) => (
                  <button key={j.tab} onClick={() => setJourneyTab(i)} style={{ padding: '8px 18px', borderRadius: 100, border: `1px solid ${journeyTab === i ? '#00843D' : '#e2e8f0'}`, fontWeight: 600, fontSize: 13, cursor: 'pointer', background: journeyTab === i ? '#00843D' : '#fff', color: journeyTab === i ? '#fff' : '#64748b' }}>{j.tab}</button>
                ))}
              </div>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <FadeIn>
              <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 28 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>{JOURNEYS[journeyTab].name}</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px' }}>{JOURNEYS[journeyTab].location}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[['The Situation', JOURNEYS[journeyTab].situation, '#F8FAFC', '#64748b'], ['The Challenge', JOURNEYS[journeyTab].challenge, '#FFF1F2', '#E4002B'], ['The Solution', JOURNEYS[journeyTab].solution, '#F0FDF4', '#00843D']].map(([label, text, bg, tc]) => (
                    <div key={String(label)} style={{ background: String(bg), borderRadius: 12, padding: '14px 16px' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: String(tc), textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 5px' }}>{String(label)}</p>
                      <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.6 }}>{String(text)}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, background: '#F0FDF4', borderRadius: 12, padding: '14px 16px', border: '1px solid #bbf7d0' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#00843D', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 5px' }}>Result</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#14532D', margin: 0 }}>{JOURNEYS[journeyTab].result}</p>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={100}>
              <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 20px', color: '#0f172a' }}>Their TaxPulse NG journey</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {JOURNEYS[journeyTab].steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, background: '#00843D', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <p style={{ fontSize: 14, color: '#374151', margin: '6px 0 0', lineHeight: 1.5 }}>{step}</p>
                    </div>
                  ))}
                </div>
                <button onClick={onGetStarted} style={{ marginTop: 24, width: '100%', padding: '12px', background: '#00843D', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  Start your journey {I.arrowR}
                </button>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px' }}>From Signup to Compliant</h2>
              <p style={{ color: '#64748b', fontSize: 16, margin: '0 0 24px' }}>Different paths for different earners. Both take under 5 minutes.</p>
              <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: 12, padding: 4 }}>
                {(['individual', 'business'] as const).map(t => (
                  <button key={t} onClick={() => setWorkTab(t)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: workTab === t ? '#fff' : 'transparent', color: workTab === t ? '#00843D' : '#64748b', boxShadow: workTab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
                    {t === 'individual' ? 'Freelancer / Individual' : 'Business Owner'}
                  </button>
                ))}
              </div>
            </div>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(workTab === 'individual' ? [
              { n: '01', t: 'Create your personal profile', d: 'Enter your name, state and how you earn — employed, self-employed or both. No CAC number or business registration needed. Done in under 2 minutes.' },
              { n: '02', t: 'See your PIT liability instantly', d: 'Your estimated personal income tax shown immediately with full NTA 2025 breakdown — pension (8%), NHIS (1.5%), NHF (2.5%), rent relief and tax bands applied step by step.' },
              { n: '03', t: 'Track all your income sources', d: 'Log payments from YouTube, Fiverr, Upwork, brand deals or foreign employers. Live USD, GBP and EUR rates auto-convert to NGN with your tax set-aside shown per payment.' },
              { n: '04', t: 'File quarterly and stay clear', d: 'Follow your personal remittance calendar — 25% of estimated PIT due each quarter. The AI assistant answers questions. Apply for TCC directly from the app.' },
            ] : [
              { n: '01', t: 'Register your business profile', d: 'Enter your company type, state and TIN. Select which taxes apply — VAT, PAYE, WHT, CIT, NSITF, Pension, ITF, NHF and CAC annual returns. Done in 5 minutes.' },
              { n: '02', t: 'Get your 12-month obligation calendar', d: 'Every obligation generated instantly with exact NRS due dates. Overdue items shown in red, upcoming in amber, completed in green. Your compliance score calculated automatically.' },
              { n: '03', t: 'Import your bank statement', d: 'Upload last month\'s statement as PDF, Excel or CSV. The system reads every transaction, categorises income and expenses, calculates VAT and WHT owed, and fills your ledger.' },
              { n: '04', t: 'Stay compliant all year', d: 'Mark obligations as filed. Generate payslips, VAT invoices and PDF reports. Share secure read-only access with your accountant. WhatsApp and push reminders before every deadline.' },
            ]).map(step => (
              <FadeIn key={step.n}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', background: '#F8FAFC', borderRadius: 16, padding: '22px 24px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: 46, height: 46, background: '#00843D', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{step.n}</div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>{step.t}</h3>
                    <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{step.d}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* TAX GUIDES */}
      <section style={{ padding: '80px 28px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px' }}>Tax Guides for Every Nigerian</h2>
              <p style={{ color: '#64748b', fontSize: 16, margin: 0 }}>Plain-English guides on how Nigerian taxation works for your specific situation.</p>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 16 }}>
            {GUIDES.map((g, i) => (
              <FadeIn key={g.title} delay={i * 50}>
                <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={onGetStarted}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = g.color + '60'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}>
                  <div style={{ width: 46, height: 46, background: g.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: g.color, marginBottom: 14 }}>{g.icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>{g.title}</h3>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.6 }}>{g.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: g.color, fontSize: 13, fontWeight: 700 }}>
                    Read guide {I.arrowR}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px' }}>Nigerian Tax Questions Answered</h2>
              <p style={{ color: '#64748b', fontSize: 16, margin: 0 }}>Accurate answers based on the Nigeria Tax Act 2025.</p>
            </div>
          </FadeIn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQS.map((f, i) => (
              <FadeIn key={i}>
                <div style={{ border: `1px solid ${openFaq === i ? '#00843D' : '#e2e8f0'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: '100%', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: openFaq === i ? '#F0FDF4' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: '#0f172a', lineHeight: 1.4 }}>{f.q}</span>
                    <span style={{ color: '#00843D', flexShrink: 0, transform: openFaq === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', display: 'flex' }}>{I.plus}</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 22px 18px', background: '#F0FDF4' }}>
                      <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.7 }}>{f.a}</p>
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: '80px 28px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', margin: '0 0 48px' }}>What Nigerian Earners Are Saying</h2>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            {[
              { initials: 'AO', name: 'Adaeze O.', role: 'Freelance Designer, Lagos', text: 'I earn in USD from Fiverr and had no idea what tax I owed. TaxPulse NG converted everything, showed me my PIT quarterly schedule and I actually paid less than I feared.', stars: 5 },
              { initials: 'ET', name: 'Emeka T.', role: 'Director, Swift Logistics Ltd, Abuja', text: 'Managing VAT, PAYE and WHT for 18 staff used to take days. Now the calendar tells us what is due and the payslip generator runs in minutes. Compliance score went from 64% to 97%.', stars: 5 },
              { initials: 'CA', name: 'Chisom A.', role: 'Content Creator, Port Harcourt', text: 'I had AdSense in dollars and brand deals in naira. TaxPulse tracked everything together. The AI assistant explained rent relief in plain English and saved me over N300,000.', stars: 5 },
            ].map(t => (
              <FadeIn key={t.name}>
                <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>{Array(t.stars).fill(null).map((_, i) => <span key={i}>{I.star}</span>)}</div>
                  <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>&ldquo;{t.text}&rdquo;</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#00843D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>{t.initials}</div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{t.name}</p>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '80px 28px', background: '#fff' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px' }}>Simple, Transparent Pricing</h2>
              <p style={{ color: '#64748b', fontSize: 16, margin: 0 }}>Start free forever. Upgrade when your needs grow.</p>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { name: 'Free', price: '\u20a60', period: 'forever', desc: 'For individuals and small businesses getting started with compliance.', features: ['Tax obligation calendar', 'PIT, PAYE, VAT, WHT calculators', 'Foreign income tracker', 'Penalty calculator', 'TCC tracker', 'Deadline push reminders', 'Salary simulator', 'VAT invoice generator'], cta: 'Get Started Free', highlight: false },
              { name: 'Pro', price: '\u20a65,000', period: 'per month', desc: 'For businesses and professionals who need all tools and automation.', features: ['Everything in Free', 'AI Tax Assistant', 'Bank statement import', 'Evidence Vault', 'PDF tax reports', 'Payslip generator', 'Payroll CSV export', 'Accountant share link', 'WhatsApp reminders', 'Multi-company support'], cta: 'Start Pro', highlight: true },
            ].map(plan => (
              <FadeIn key={plan.name}>
                <div style={{ borderRadius: 20, padding: 32, border: plan.highlight ? '2px solid #00843D' : '1.5px solid #e2e8f0', background: plan.highlight ? '#F0FDF4' : '#fff', position: 'relative' }}>
                  {plan.highlight && <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#00843D', color: '#fff', padding: '4px 16px', borderRadius: 100, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>Most Popular</div>}
                  <p style={{ fontWeight: 700, fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px' }}>{plan.name}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 42, fontWeight: 900, color: '#0f172a' }}>{plan.price}</span>
                    <span style={{ color: '#94a3b8', fontSize: 14 }}>/{plan.period}</span>
                  </div>
                  <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 22px', lineHeight: 1.5 }}>{plan.desc}</p>
                  <button onClick={onGetStarted} style={{ width: '100%', padding: '13px', background: plan.highlight ? '#00843D' : '#fff', color: plan.highlight ? '#fff' : '#00843D', border: '2px solid #00843D', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 22 }}>
                    {plan.cta}
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151' }}>
                        <span style={{ color: '#00843D', flexShrink: 0 }}>{I.check16}</span>{f}
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — striking design */}
      <section style={{ padding: '96px 28px', background: 'linear-gradient(135deg,#064E3B 0%,#00843D 50%,#059669 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <FadeIn>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 40, flexWrap: 'wrap' }}>
              {[['Stop guessing', 'what you owe'], ['Stop worrying', 'about penalties'], ['Start knowing', 'exactly where you stand']].map(([top, bottom]) => (
                <div key={top} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>{top}</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>{bottom}</p>
                </div>
              ))}
            </div>
            <h2 style={{ fontSize: 'clamp(32px,5vw,48px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
              Every Nigerian earner deserves<br />to know their tax. Exactly.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 18, margin: '0 0 40px', lineHeight: 1.6 }}>
              Join freelancers, creators and business owners who file correctly, claim every deduction they are owed, and never miss a deadline again.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={onGetStarted} style={{ background: '#fff', color: '#00843D', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 18, cursor: 'pointer', padding: '18px 44px', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                Create Free Account {I.arrowR}
              </button>
              <button onClick={onGetStarted} style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 14, fontWeight: 700, fontSize: 16, cursor: 'pointer', padding: '18px 32px' }}>
                Calculate my tax first
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 16 }}>No credit card. Free forever plan. Takes 2 minutes.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 40, flexWrap: 'wrap' }}>
              {[I.shield, I.cert, I.vault].map((ic, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>
                  <span style={{ opacity: 0.7 }}>{ic}</span>
                  {i === 0 ? 'NTA 2025 Compliant' : i === 1 ? 'NRS Verified' : '256-bit SSL'}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0a0a0a', padding: '56px 28px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 36, marginBottom: 48 }}>
            <div style={{ maxWidth: 280 }}>
              <img src="/logo-white.png" alt="TaxPulse NG" style={{ height: 30, width: 'auto', objectFit: 'contain', marginBottom: 16 }} />
              <p style={{ color: '#525252', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
                Nigeria Revenue Service compliant tax platform. Built on the Nigeria Tax Act 2025. Helping every Nigerian earner know what they owe.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#525252' }}>
                  <span style={{ color: '#00843D' }}>{I.check16}</span> NTA 2025 Compliant
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#525252' }}>
                  <span style={{ color: '#00843D' }}>{I.check16}</span> NDPA Data Privacy Compliant
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap' }}>
              {[
                { h: 'Product', links: ['Tax Calculator', 'PIT Calculator', 'VAT Calculator', 'Salary Simulator', 'Penalty Calculator', 'Pricing'] },
                { h: 'For You', links: ['Freelancers', 'Content Creators', 'Remote Workers', 'Employees', 'Business Owners', 'Accountants'] },
                { h: 'Tax Guides', links: ['Nigeria Tax Guide 2026', 'Tax for Freelancers', 'Tax for Creators', 'Tax for Remote Workers', 'Tax Brackets 2026', 'VAT Guide Nigeria'] },
                { h: 'Company', links: ['About', 'Blog', 'Help Center', 'Privacy Policy', 'Terms of Service', 'Contact'] },
              ].map(col => (
                <div key={col.h}>
                  <p style={{ color: '#525252', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px' }}>{col.h}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {col.links.map(l => (
                      <a key={l} href="#" onClick={e => { e.preventDefault(); onGetStarted(); }} style={{ color: '#737373', fontSize: 14, textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#00843D')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#737373')}>
                        {l}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: '#404040', fontSize: 13, margin: 0 }}>2026 TaxPulse NG. All rights reserved. Built in Nigeria.</p>
            <p style={{ color: '#404040', fontSize: 13, margin: 0 }}>Nigeria Tax Act 2025 compliant. Rates verified against NRS guidelines.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
