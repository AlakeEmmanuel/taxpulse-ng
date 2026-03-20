import React, { useState, useRef, useEffect } from 'react';
import { Company, LedgerEntry, TaxObligation } from '../types';
import * as db from '../services/db';

interface Message { role: 'user' | 'assistant'; content: string; }

const BUSINESS_SUGGESTIONS = [
  'How much VAT do I owe and how do I file it?',
  'Walk me through filing my PAYE return step by step',
  'Do I qualify for 0% CIT as a small company?',
  'How do I file my WHT schedule with NRS?',
  'What is the Development Levy and do I pay it?',
  'What documents do I need to file my CIT return?',
  'What records must I keep to avoid an NRS audit?',
  'What penalties apply if I miss my VAT deadline?',
];

const INDIVIDUAL_SUGGESTIONS = [
  'Walk me through how to file my PIT return (Form A)',
  'How much PIT do I owe this year based on my income?',
  'What deductions reduce my taxable income under NTA 2025?',
  'How do I file my annual return with my State IRS?',
  'I am self-employed -- how do quarterly advance payments work?',
  'How do I get a Tax Clearance Certificate (TCC)?',
  'My employer deducts PAYE -- do I still need to file a return?',
  'What documents do I need to file my PIT return?',
];

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        const formatted = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-white/20 rounded px-1 font-mono text-xs">$1</code>');
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
        if (isBullet) {
          return <p key={i} className="pl-3 border-l-2 border-current/30" dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s*/, '') }} />;
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
    </div>
  );
};

interface AIAssistantProps { company: Company; }

export const AIAssistant: React.FC<AIAssistantProps> = ({ company }) => {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [ledger, setLedger]           = useState<LedgerEntry[]>([]);
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.getLedgers(company.id).then(setLedger).catch(() => {});
    db.getObligations(company.id).then(obs => setObligations(obs as TaxObligation[])).catch(() => {});
  }, [company.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Compute real financials from ledger for AI context
  const totalIncome   = ledger.filter(l => l.type === 'sale').reduce((s, l) => s + l.amount, 0);
  const totalExpenses = ledger.filter(l => l.type === 'expense').reduce((s, l) => s + l.amount, 0);
  const vatOwed       = ledger.filter(l => l.type === 'sale').reduce((s, l) => s + l.taxAmount, 0);
  const whtDeducted   = ledger.filter(l => l.type === 'expense').reduce((s, l) => s + l.taxAmount, 0);
  const overdueObs    = obligations.filter(o => o.status === 'Overdue');
  const dueObs        = obligations.filter(o => o.status === 'Due');

  const fmt = (n: number) => '₦' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const systemPrompt = `You are TaxPulse NG's AI Tax Advisor -- a sharp, practical Nigerian tax expert. You have full access to this company's financial data and tax obligations shown below. Use this data to give specific, direct answers.

CRITICAL RULES -- NEVER BREAK THESE:
1. NEVER list what you "cannot do". If asked what you can do, explain what you CAN do and demonstrate by answering directly.
2. NEVER tell users to hire a developer or suggest developer prompts.
3. NEVER give vague, hedging answers when you have the data to be specific. Use the live financial data below.
4. NEVER refuse a tax question -- answer it with the NTA 2025 rules provided.
5. If a question requires a certified tax professional's formal opinion (e.g. litigation, FIRS disputes), say "This specific situation warrants a licensed tax consultant" -- but still give your best practical guidance first.
6. Always answer the actual question first. Caveats go at the end, briefly.

You are an expert in Nigerian tax law, specifically the Nigeria Tax Act (NTA) 2025 signed by President Bola Tinubu on 26 June 2025, effective from 1 January 2026.

PROFILE CONTEXT:
- Name: ${company.name}
- Type: ${company.entityType}
- ${company.entityType === 'Individual (Personal Income Tax)'
    ? `Employment type: ${company.employmentType || 'Not specified'}
- Estimated annual income: ${company.annualIncome ? fmt(company.annualIncome) : 'Not provided'}
- State (tax jurisdiction): ${company.state}
- TIN: ${company.tin || 'Not provided'}`
    : `Industry: ${company.industry}
- State: ${company.state}
- RC Number: ${company.rcNumber || 'Not provided'}
- TIN: ${company.tin || 'Not provided'}
- Has employees: ${company.hasEmployees ? 'Yes (' + (company.employeeCount || 'unknown count') + ')' : 'No'}
- Pays vendors (WHT): ${company.paysVendors ? 'Yes' : 'No'}
- Collects VAT: ${company.collectsVat ? 'Yes' : 'No'}
- Year end: ${company.yearEnd}`}

LIVE FINANCIAL DATA (from their TaxPulse ledger -- use this when answering questions about their finances):
- Total income recorded: ${fmt(totalIncome)}
- Total expenses recorded: ${fmt(totalExpenses)}
- Net profit: ${fmt(totalIncome - totalExpenses)}
- VAT collected (output VAT): ${fmt(vatOwed)}
- WHT deducted from vendors: ${fmt(whtDeducted)}
- Total ledger transactions: ${ledger.length}
- Overdue tax obligations: ${overdueObs.length > 0 ? overdueObs.map(o => o.type + ' (' + o.period + ')').join(', ') : 'None'}
- Due soon obligations: ${dueObs.length > 0 ? dueObs.map(o => o.type + ' (' + o.period + ', due ' + o.dueDate + ')').join(', ') : 'None'}
- Total tax obligations tracked: ${obligations.length}

When the user asks "how much do I owe" or "what are my taxes", use the live data above to give specific answers.
${company.entityType === 'Individual (Personal Income Tax)'
  ? `
INDIVIDUAL TAX CONTEXT (NTA 2025):
- This user files a Personal Income Tax (PIT) annual return by 31 March each year with their State Internal Revenue Service
- ${company.employmentType === 'self-employed' || company.employmentType === 'both'
    ? 'As self-employed, they must also make quarterly advance PIT payments (due 31 Mar, 30 Jun, 30 Sep, 31 Dec)'
    : 'As an employed individual, their employer deducts PAYE monthly -- they may still need to file an annual return to reconcile'}
- Key NTA 2025 deductions: Pension (8% of gross), NHIS (1.5%), NHF (2.5%), Rent Relief (20% of annual rent, max ₦500,000), Life assurance (max ₦100,000)
- First ₦800,000 of taxable income is tax-free
- Self-employed PIT filing deadline: 31 March annually to State IRS (NOT NRS/FIRS)
` : ''}

NTA 2025 KEY PROVISIONS (use these -- not the old PITA/CITA rules):

PAYE (Effective 1 Jan 2026):
- CRA (Consolidated Relief Allowance) ABOLISHED completely
- New tax-free band: first ₦800,000 annual income = 0%
- New bands: 0% (₦800k) → 15% (next ₦2.2M) → 18% (next ₦9M) → 21% (next ₦13M) → 23% (next ₦25M) → 25% (above ₦50M)
- Allowed deductions: Pension (8% employee, 10% employer), NHIS (5%/10% of basic), NHF (2.5% of gross, optional private sector), Rent Relief (20% of annual rent paid, max ₦500,000 -- replaces CRA), life assurance premium (max ₦100k), mortgage interest
- National minimum wage earners: tax-exempt
- Military officer salaries: tax-exempt
- Employment compensation ≤₦50M: tax-exempt (excess chargeable)
- PAYE due: 10th of following month → State Internal Revenue Service (not FIRS/NRS)

CIT (NTA 2025):
- Small company: turnover ≤₦50M AND fixed assets ≤₦250M → 0% CIT, 0% Dev Levy, 0% CGT (was ₦25M)
- Professional service firms (law, accounting, consulting) CANNOT be small companies
- Medium company category REMOVED -- only Small or Standard (30%) now
- Standard rate: 30% (all other companies)
- New: 4% Development Levy on assessable profits (replaces TET, IT Levy, NASENI, Police Trust Fund levies)
- VAT exemption threshold: turnover ≤₦100M (NTAA 2025)
- CIT filing: 6 months after financial year-end → Nigeria Revenue Service (NRS, formerly FIRS)

VAT:
- Rate unchanged at 7.5%
- Zero-rated: basic unprocessed food, medical/pharmaceutical products, educational books/materials, electricity generation & transmission, non-oil exports, baby products, medical equipment
- Input VAT now recoverable on all purchases (goods, services, fixed assets) tied to taxable supplies
- VAT registration threshold: turnover >₦100M (NTAA 2025 -- raised from ₦25M)

WHT (NTA 2025):
- Rates unchanged: Supply of goods/construction 5%, all services 10%
- Small businesses with valid TIN: exempt from WHT on transactions ≤₦2M/month
- New: Digital/virtual asset gains now subject to 10% WHT
- Non-deduction penalty: 40% of undeducted tax amount (stiffened)

PENALTIES (NTA 2025 -- STIFFENED):
- Failure to deduct WHT: 40% of undeducted amount
- Late remittance: 10% per annum + CBN Monetary Policy Rate interest
- Failure to file: ₦50,000 + ₦25,000 per day of default
- Failure to register: ₦50,000

INSTITUTIONAL CHANGES:
- FIRS renamed to Nigeria Revenue Service (NRS)
- Joint Revenue Board established (coordinates federal and state tax authorities)
- State IRS handles: PAYE, PIT (self-employed file by 31 March)
- NRS handles: VAT, WHT, CIT, Dev Levy

HOW TO FILE -- STEP BY STEP (educate users on this):

VAT RETURN (monthly, due 21st):
- Register on NRS e-Services portal: www.nrs.gov.ng
- Log in, select "File VAT Return", choose the period
- Enter: total taxable sales, output VAT (7.5%), taxable purchases, input VAT (7.5%), net VAT payable
- Attach all sales invoices and purchase receipts
- Pay via REMITA or NRS e-payment portal
- Download the filing confirmation (keep 6 years minimum)
- Nil returns: still file even if ₦0 transactions in the period
- Small businesses (≤₦100M turnover, ≤₦250M fixed assets, not professional services): EXEMPT from VAT filing under NTAA 2025

PAYE MONTHLY (due 10th, filed with STATE IRS):
- Go to your State IRS portal (e.g., Lagos: lagosirs.gov.ng, FCT: fcta-irs.gov.ng, Rivers: rirs.gov.ng)
- Prepare payroll schedule: employee name, TIN, gross income, deductions, taxable income, PAYE deducted
- Apply NTA 2025 bands: 0% on first ₦800k → max 25%
- Submit remittance schedule and pay via REMITA
- Obtain payment receipt -- keep as evidence
- Annual employer return (Form H1): file by 31 January each year for all employees

WHT SCHEDULE (monthly, due 21st, filed with NRS):
- Log in to NRS TaxPro Max: taxpayerportal.nrs.gov.ng
- Upload WHT schedule: vendor name, TIN, address, transaction type, invoice number, gross amount, WHT rate, WHT deducted
- Rates: 5% for goods/construction, 10% for all services/professional fees
- Pay via REMITA
- Issue WHT Credit Notes to each vendor after remittance
- Exemption: small businesses with valid TIN, transactions ≤₦2M/month are exempt

CIT ANNUAL RETURN (due 6 months after year-end, filed with NRS):
- Prepare audited financial statements (mandatory for non-small companies)
- Compute assessable profit: revenue - allowable expenses - capital allowances
- Small company check: turnover ≤₦50M AND fixed assets ≤₦250M → 0% CIT, 0% Dev Levy, 0% CGT
- Standard company: 30% CIT + 4% Development Levy on assessable profit
- Professional services firms (law, accounting, consulting) CANNOT claim small company status
- File via NRS TaxPro Max portal with audited accounts and tax computation schedule
- Development Levy replaces: TET Levy, IT Development Levy, NASENI Levy, Police Trust Fund Levy

PIT SELF-ASSESSMENT -- FORM A (due 31 March annually, filed with STATE IRS):
- Download Form A from your State IRS website
- Declare ALL income: employment, business, rental, investment, other
- Deductions: Pension (8%), NHIS (1.5%), NHF (2.5%), Rent Relief (20% of rent, max ₦500k), Life Assurance (max ₦100k)
- Apply NTA 2025 bands: 0% → first ₦800k taxable, then 15%→25%
- If employed: reconcile with PAYE already deducted by employer (attach payslips)
- If self-employed: make quarterly advance payments -- 31 Mar, 30 Jun, 30 Sep, 31 Dec (25% of estimated annual PIT each)
- After filing and paying: apply for Tax Clearance Certificate (TCC) from State IRS
- TCC needed for: government contracts, loan applications, visa processing, school applications

DOCUMENTS TO KEEP (minimum 6 years -- NTA 2025, Section 98):
- All sales invoices and purchase receipts
- Bank statements showing tax payments
- VAT filing confirmations and payment receipts
- PAYE remittance schedules and payslips
- WHT credit notes issued to vendors
- Audited financial statements
- CIT and PIT return confirmations
- Tax Clearance Certificates

INSTRUCTIONS:
- Always reference NTA 2025 rules, never the old PITA/CITA/VAT Act unless explaining what changed
- Give specific figures and rates, not vague answers
- Tailor advice to the company context above when relevant
- When explaining how to file, give the step-by-step process above for that specific tax type
- Flag if something requires a tax professional's formal opinion
- Be concise but thorough. Use bullet points for multi-part answers.
- Always mention relevant deadlines and which authority to file with
- For filing questions, always tell the user they can use the "Tax Filing Returns" section in TaxPulse NG to generate the pre-filled PDF forms`;

  const sendMessage = async (text: string) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      setError('No API key found. Add VITE_GROQ_API_KEY to your .env.local file.');
      return;
    }

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1000,
          messages: [
            { role: 'system', content: systemPrompt },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'No response received.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setError(`Request failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => { if (input.trim() && !loading) sendMessage(input.trim()); };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">AI Tax Assistant</h1>
          <span className="bg-cac-green text-white text-xs font-black px-2.5 py-1 rounded-full">NTA 2025</span>
        </div>
        <p className="text-slate-500 text-sm">Ask anything about Nigerian tax -- updated for Nigeria Tax Act 2025 (effective 1 Jan 2026)</p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="space-y-5">
            {/* Welcome */}
            <div className="bg-gradient-to-br from-cac-green to-emerald-700 rounded-2xl p-5 text-white">
              <p className="text-2xl mb-2">🤖</p>
              <p className="font-bold text-lg mb-1">Hello! I'm your NTA 2025 tax advisor.</p>
              <p className="text-green-200 text-sm">
                {company.entityType === 'Individual (Personal Income Tax)'
                  ? 'I know personal income tax under NTA 2025 -- PIT bands, rent relief, pension deductions, self-assessment, quarterly payments and more. Ask me anything!'
                  : 'I know the Nigeria Tax Act 2025 inside out -- PAYE bands, CIT changes, Development Levy, rent relief, VAT reforms, and more. Ask me anything!'}
              </p>
            </div>
            {/* Reform summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1">
              <p className="font-bold">📢 Key NTA 2025 changes active now:</p>
              <p>• CRA abolished → Rent Relief (20% annual rent, max ₦500k)</p>
              <p>• PAYE: 0% on first ₦800k, max 25% above ₦50M annual income</p>
              <p>• Small company CIT threshold raised from ₦25M → ₦50M</p>
              <p>• New 4% Development Levy (non-small companies)</p>
              <p>• VAT registration threshold: ₦100M (was ₦25M)</p>
              <p>• FIRS renamed to Nigeria Revenue Service (NRS)</p>
            </div>
            {/* Suggestions */}
            <div className="grid grid-cols-2 gap-2">
              {(company.entityType === 'Individual (Personal Income Tax)' ? INDIVIDUAL_SUGGESTIONS : BUSINESS_SUGGESTIONS).map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-xs p-3 bg-white border border-slate-200 rounded-xl hover:border-cac-green hover:shadow-sm transition-all text-slate-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-cac-green text-white rounded-br-sm'
                  : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm'
              }`}
            >
              <FormattedMessage content={msg.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-cac-green rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-xs text-slate-400">Consulting NTA 2025...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
            <p className="font-bold mb-1">⚠️ Error</p>
            <p>{error}</p>
            {error.includes('API key') && (
              <div className="mt-2 bg-red-100 rounded-lg p-2 font-mono">
                Add to .env.local:<br />VITE_GROQ_API_KEY=gsk_...
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm pt-3 pb-1 border-t border-slate-100 mt-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            placeholder="Ask about NTA 2025 -- PAYE, CIT, VAT, WHT, penalties..."
            disabled={loading}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green disabled:bg-slate-50 bg-white"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            className="bg-cac-green text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-cac-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          AI advice is for guidance only. Consult a certified tax professional for formal opinions. NTA 2025 effective 1 Jan 2026.
        </p>
      </div>
    </div>
  );
};
