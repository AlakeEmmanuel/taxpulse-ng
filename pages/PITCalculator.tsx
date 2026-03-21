import React, { useState } from 'react';
import { Card, Input } from '../components/Shared';
import { NTA_2026_BANDS, calcPAYE } from '../utils/taxEngine';

const fmt = (n: number) => '₦' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });

interface PITInputs {
  employmentIncome: string;
  businessIncome: string;
  rentalIncome: string;
  dividends: string;
  otherIncome: string;
  annualRent: string;
  nhf: string;
  lifeAssurance: string;
}

const empty: PITInputs = {
  employmentIncome: '', businessIncome: '', rentalIncome: '',
  dividends: '', otherIncome: '', annualRent: '', nhf: '', lifeAssurance: '',
};

export const PITCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<PITInputs>(empty);
  const [showDeductions, setShowDeductions] = useState(false);

  const update = (field: keyof PITInputs, val: string) =>
    setInputs(prev => ({ ...prev, [field]: val }));

  const employment = parseFloat(inputs.employmentIncome) || 0;
  const business   = parseFloat(inputs.businessIncome)   || 0;
  const rental     = parseFloat(inputs.rentalIncome)     || 0;
  const dividends  = parseFloat(inputs.dividends)        || 0;
  const other      = parseFloat(inputs.otherIncome)      || 0;
  const grossIncome = employment + business + rental + dividends + other;

  const result = calcPAYE({
    grossAnnual: grossIncome,
    annualRent: parseFloat(inputs.annualRent) || 0,
    nhf: parseFloat(inputs.nhf) || 0,
    lifeAssurance: parseFloat(inputs.lifeAssurance) || 0,
  });

  const hasIncome = grossIncome > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Personal Income Tax</h1>
          <span className="bg-cac-green text-white text-xs font-black px-2.5 py-1 rounded-full">NTA 2025</span>
        </div>
        <p className="text-slate-500 text-sm">Nigeria Tax Act 2025 · Effective 1 January 2026 · New progressive bands, no CRA</p>
      </header>

      {/* Reform notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <span className="text-xl shrink-0"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg></span></span>
        <div className="text-xs text-blue-800 space-y-1">
          <p className="font-bold">Updated for Nigeria Tax Reform 2026 (NTA 2025)</p>
          <p>Key changes: <strong>CRA abolished</strong> → replaced with Rent Relief (20% of annual rent, max ₦500k). New bands: 0% on first ₦800k, then 15%-25%. Minimum tax abolished.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Income sources */}
        <Card className="space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 mb-0.5">Income Sources (Annual ₦)</h3>
            <p className="text-xs text-slate-400">All figures should be annual amounts</p>
          </div>
          <Input label="Employment / Salary"        type="number" value={inputs.employmentIncome} onChange={e => update("employmentIncome", e.target.value)} placeholder="0" />
          <Input label="Business / Self-Employment" type="number" value={inputs.businessIncome}   onChange={e => update("businessIncome", e.target.value)}   placeholder="0" />
          <Input label="Rental Income"              type="number" value={inputs.rentalIncome}     onChange={e => update("rentalIncome", e.target.value)}     placeholder="0" />
          <Input label="Dividends / Interest"       type="number" value={inputs.dividends}        onChange={e => update("dividends", e.target.value)}        placeholder="0" />
          <Input label="Other Income"               type="number" value={inputs.otherIncome}      onChange={e => update("otherIncome", e.target.value)}      placeholder="0" />

          <div className="border-t border-slate-100 pt-3">
            <button onClick={() => setShowDeductions(v => !v)} className="text-xs font-bold text-cac-green flex items-center gap-1 hover:underline">
              {showDeductions ? '▾' : '▸'} Deductions & Reliefs (NTA 2025)
            </button>
          </div>

          {showDeductions && (
            <div className="space-y-3">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">These reduce your taxable income</p>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 mb-2">🆕 Rent Relief (replaces CRA)</p>
                <Input label="Annual Rent Paid (₦)" type="number" value={inputs.annualRent} onChange={e => update("annualRent", e.target.value)} placeholder="e.g. 600,000" />
                {parseFloat(inputs.annualRent) > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Relief = ₦{Math.min(parseFloat(inputs.annualRent) * 0.2, 500_000).toLocaleString()} (20% of rent, max ₦500k)
                  </p>
                )}
              </div>

              <Input label="NHF Contribution (default: 2.5% of basic)" type="number" value={inputs.nhf} onChange={e => update("nhf", e.target.value)} placeholder="Auto-calculated if blank" />
              <Input label="Life Assurance Premium (max ₦100,000)" type="number" value={inputs.lifeAssurance} onChange={e => update("lifeAssurance", e.target.value)} placeholder="0" />

              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">Auto-deducted:</p>
                <p>• Pension: 8% of gross = {hasIncome ? fmt(grossIncome * 0.08) : '₦0'}</p>
                <p>• NHIS: 1.5% of gross = {hasIncome ? fmt(grossIncome * 0.015) : '₦0'}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <div className={`rounded-2xl p-5 border transition-all ${hasIncome ? 'bg-cac-green text-white border-cac-green' : 'bg-slate-50 border-slate-100'}`}>
            <p className={`text-xs font-black uppercase tracking-wider mb-3 ${hasIncome ? 'text-green-200' : 'text-slate-400'}`}>NTA 2025 Tax Summary</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Gross Income',    val: fmt(grossIncome),           highlight: false },
                { label: 'Tax Payable',     val: fmt(result.annual),         highlight: true  },
                { label: 'Monthly Tax',     val: fmt(result.monthly),        highlight: false },
                { label: 'Effective Rate',  val: `${result.effectiveRate?.toFixed(1) || 0}%`, highlight: false },
              ].map(({ label, val, highlight }) => (
                <div key={label} className={`rounded-xl p-3 ${hasIncome ? (highlight ? 'bg-white/20' : 'bg-white/10') : 'bg-white border border-slate-100'}`}>
                  <p className={`text-[10px] font-bold uppercase ${hasIncome ? 'text-green-200' : 'text-slate-400'}`}>{label}</p>
                  <p className={`font-extrabold text-sm mt-0.5 ${hasIncome ? 'text-white' : 'text-slate-700'}`}>{val}</p>
                </div>
              ))}
            </div>
            {hasIncome && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-xs text-green-200">Estimated monthly take-home</p>
                <p className="text-xl font-extrabold">{fmt(result.netAnnual / 12)} <span className="text-sm font-normal text-green-200">/ month</span></p>
              </div>
            )}
          </div>

          {/* Deductions breakdown */}
          {hasIncome && (
            <Card className="space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Deductions (NTA 2025)</h4>
              {[
                { label: `Rent Relief (20% of rent, max ₦500k)`, val: result.rentRelief || 0, color: 'text-amber-600', badge: result.rentRelief! > 0 ? '' : 'Not applicable (no rent entered)' },
                { label: "Pension (8%)",    val: result.pension,  color: 'text-purple-600' },
                { label: "NHIS (1.5%)",    val: result.nhis!,    color: 'text-indigo-600' },
                { label: "NHF (2.5%)",     val: result.nhf!,     color: 'text-blue-600' },
              ].map(({ label, val, color, badge }) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{label}{badge ? <span className="ml-1 text-[10px] text-slate-400">({badge})</span> : ""}</span>
                  <span className={`font-bold ${color}`}>{fmt(val)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm font-bold">
                <span className="text-slate-700">Taxable Income</span>
                <span className="text-slate-900">{fmt(result.taxable)}</span>
              </div>
            </Card>
          )}

          {/* Tax band breakdown */}
          {hasIncome && result.breakdown.length > 0 && (
            <Card className="space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">NTA 2025 Band Breakdown</h4>
              {result.breakdown.map((b, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{b.label} @ {(b.rate * 100).toFixed(0)}%</span>
                    <span className="font-bold text-slate-700">{fmt(b.tax)}</span>
                  </div>
                  {b.rate > 0 && (
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-cac-green rounded-full" style={{ width: `${result.annual > 0 ? (b.tax / result.annual) * 100 : 0}%` }} />
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-sm">
                <span className="text-slate-800">Total Annual Tax</span>
                <span className="text-cac-green">{fmt(result.annual)}</span>
              </div>
            </Card>
          )}

          {/* NTA band reference */}
          <Card className="space-y-2">
            <h4 className="font-bold text-slate-800 text-sm">2026 Tax Bands (NTA 2025)</h4>
            {NTA_2026_BANDS.map((b, i) => (
              <div key={i} className={`flex justify-between items-center px-3 py-1.5 rounded-lg text-xs ${b.rate === 0 ? 'bg-green-50 text-cac-green font-bold' : 'bg-slate-50 text-slate-600'}`}>
                <span>{b.label}</span>
                <span className="font-bold">{(b.rate * 100).toFixed(0)}%</span>
              </div>
            ))}
          </Card>

          {!hasIncome && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
              <p className="text-3xl mb-2"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg></span></p>
              <p className="text-sm font-bold text-slate-700">Enter your income above</p>
              <p className="text-xs text-slate-400 mt-1">Using NTA 2025 bands effective 1 Jan 2026</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <span className="text-xl shrink-0"><span style={{display:"inline-flex",alignItems:"center",verticalAlign:"middle"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span></span>
        <div className="text-xs text-amber-800 space-y-1">
          <p><strong>NTA 2025 changes from PITA:</strong> CRA abolished → Rent Relief introduced. New bands start at 0% up to ₦800k taxable income (after deductions). Max rate 25% (was 24%). Minimum tax abolished. FIRS renamed to Nigeria Revenue Service (NRS).</p>
          <p>Self-employed individuals file directly with their State Internal Revenue Service by 31 March annually.</p>
        </div>
      </div>
    </div>
  );
};
