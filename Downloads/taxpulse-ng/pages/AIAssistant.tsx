import React, { useState, useRef, useEffect } from 'react';
import { Company } from '../types';

interface Message { role: 'user' | 'assistant'; content: string; }

const SUGGESTIONS = [
  'What are the NTA 2025 PAYE bands?',
  'How is rent relief calculated under NTA 2025?',
  'What changed for CIT under the tax reform?',
  'Is my company exempt from VAT under NTA 2025?',
  'What is the Development Levy and who pays it?',
  'When is PAYE due to the State IRS?',
  'Explain WHT exemption for small businesses',
  'What penalties apply for late filing under NTA 2025?',
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const systemPrompt = `You are TaxPulse NG's AI Tax Advisor — an expert in Nigerian tax law, specifically the Nigeria Tax Act (NTA) 2025 signed by President Bola Tinubu on 26 June 2025, effective from 1 January 2026.

COMPANY CONTEXT:
- Name: ${company.name}
- Type: ${company.entityType}
- Industry: ${company.industry}
- State: ${company.state}
- Has employees: ${company.hasEmployees ? 'Yes (' + (company.employeeCount || 'unknown count') + ')' : 'No'}
- Pays vendors (WHT): ${company.paysVendors ? 'Yes' : 'No'}
- Collects VAT: ${company.collectsVat ? 'Yes' : 'No'}
- Year end: ${company.yearEnd}

NTA 2025 KEY PROVISIONS (use these — not the old PITA/CITA rules):

PAYE (Effective 1 Jan 2026):
- CRA (Consolidated Relief Allowance) ABOLISHED completely
- New tax-free band: first ₦800,000 annual income = 0%
- New bands: 0% (₦800k) → 15% (next ₦2.2M) → 18% (next ₦9M) → 21% (next ₦13M) → 23% (next ₦25M) → 25% (above ₦50M)
- Allowed deductions: Pension (8% employee, 10% employer), NHIS (5%/10% of basic), NHF (2.5% of gross, optional private sector), Rent Relief (20% of annual rent paid, max ₦500,000 — replaces CRA), life assurance premium (max ₦100k), mortgage interest
- National minimum wage earners: tax-exempt
- Military officer salaries: tax-exempt
- Employment compensation ≤₦50M: tax-exempt (excess chargeable)
- PAYE due: 10th of following month → State Internal Revenue Service (not FIRS/NRS)

CIT (NTA 2025):
- Small company: turnover ≤₦50M AND fixed assets ≤₦250M → 0% CIT, 0% Dev Levy, 0% CGT (was ₦25M)
- Professional service firms (law, accounting, consulting) CANNOT be small companies
- Medium company category REMOVED — only Small or Standard (30%) now
- Standard rate: 30% (all other companies)
- New: 4% Development Levy on assessable profits (replaces TET, IT Levy, NASENI, Police Trust Fund levies)
- VAT exemption threshold: turnover ≤₦100M (NTAA 2025)
- CIT filing: 6 months after financial year-end → Nigeria Revenue Service (NRS, formerly FIRS)

VAT:
- Rate unchanged at 7.5%
- Zero-rated: basic unprocessed food, medical/pharmaceutical products, educational books/materials, electricity generation & transmission, non-oil exports, baby products, medical equipment
- Input VAT now recoverable on all purchases (goods, services, fixed assets) tied to taxable supplies
- VAT registration threshold: turnover >₦100M (NTAA 2025 — raised from ₦25M)

WHT (NTA 2025):
- Rates unchanged: Supply of goods/construction 5%, all services 10%
- Small businesses with valid TIN: exempt from WHT on transactions ≤₦2M/month
- New: Digital/virtual asset gains now subject to 10% WHT
- Non-deduction penalty: 40% of undeducted tax amount (stiffened)

PENALTIES (NTA 2025 — STIFFENED):
- Failure to deduct WHT: 40% of undeducted amount
- Late remittance: 10% per annum + CBN Monetary Policy Rate interest
- Failure to file: ₦50,000 + ₦25,000 per day of default
- Failure to register: ₦50,000

INSTITUTIONAL CHANGES:
- FIRS renamed to Nigeria Revenue Service (NRS)
- Joint Revenue Board established (coordinates federal and state tax authorities)
- State IRS handles: PAYE, PIT (self-employed file by 31 March)
- NRS handles: VAT, WHT, CIT, Dev Levy

INSTRUCTIONS:
- Always reference NTA 2025 rules, never the old PITA/CITA/VAT Act unless explaining what changed
- Give specific figures and rates, not vague answers
- Tailor advice to the company's context above when relevant
- Flag if something requires a tax professional's formal opinion
- Be concise but thorough. Use bullet points for multi-part answers.
- Always mention relevant deadlines and which authority to file with`;

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
        <p className="text-slate-500 text-sm">Ask anything about Nigerian tax — updated for Nigeria Tax Act 2025 (effective 1 Jan 2026)</p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="space-y-5">
            {/* Welcome */}
            <div className="bg-gradient-to-br from-cac-green to-emerald-700 rounded-2xl p-5 text-white">
              <p className="text-2xl mb-2">🤖</p>
              <p className="font-bold text-lg mb-1">Hello! I'm your NTA 2025 tax advisor.</p>
              <p className="text-green-200 text-sm">I know the Nigeria Tax Act 2025 inside out — new PAYE bands, CIT changes, Development Levy, rent relief, VAT reforms, and more. Ask me anything!</p>
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
              {SUGGESTIONS.map(s => (
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
            placeholder="Ask about NTA 2025 — PAYE, CIT, VAT, WHT, penalties..."
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
