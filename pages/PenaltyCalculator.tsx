import React, { useState } from 'react';
import { Card, Input } from '../components/Shared';

const fmt = (n: number) => '₦' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });

// ─── NTA 2025 Penalty Rules ───────────────────────────────────────────────────
const CBN_MPR = 0.2725; // CBN Monetary Policy Rate (27.25%)
const LATE_REMITTANCE_RATE = 0.10 + CBN_MPR; // 10% p.a. + MPR = 37.25%

const TAX_TYPES = [
  { value: 'vat',    label: "VAT",  authority: 'NRS (formerly FIRS)', dueDay: '21st of following month' },
  { value: 'paye',   label: "PAYE", authority: 'State IRS',           dueDay: '10th of following month' },
  { value: 'wht',    label: "WHT",  authority: 'NRS (formerly FIRS)', dueDay: '21st of following month' },
  { value: 'cit',    label: "CIT",  authority: 'NRS (formerly FIRS)', dueDay: '6 months after year-end' },
  { value: 'pit',    label: "PIT",  authority: 'State IRS',           dueDay: '31st March annually' },
  { value: 'devlevy',label: "Development Levy", authority: 'NRS',   dueDay: 'Same as CIT filing' },
];

const PENALTY_SCENARIOS = [
  {
    id: 'failure_to_file',
    label: 'Failure to File (Late Filing)',
    icon: '📋',
    color: 'bg-orange-50 border-orange-200 text-orange-800',
    badgeColor: 'bg-orange-100 text-orange-700',
    description: 'Tax return not submitted by the due date',
    calc: (_taxAmount: number, daysLate: number) => {
      const fixed = 50_000;
      const daily = 25_000 * daysLate;
      return { fixed, variable: daily, total: fixed + daily, breakdown: [
        { label: 'Fixed penalty', amount: fixed },
        { label: `Daily penalty (₦25,000 × ${daysLate} days)`, amount: daily },
      ]};
    }
  },
  {
    id: 'late_remittance',
    label: 'Late Remittance (Tax Paid Late)',
    icon: '⏰',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    badgeColor: 'bg-amber-100 text-amber-700',
    description: 'Tax assessed but payment remitted after the due date',
    calc: (taxAmount: number, daysLate: number) => {
      const yearsLate = daysLate / 365;
      const interest = taxAmount * LATE_REMITTANCE_RATE * yearsLate;
      return { fixed: 0, variable: interest, total: interest, breakdown: [
        { label: `Interest (${(LATE_REMITTANCE_RATE * 100).toFixed(2)}% p.a. = 10% + CBN MPR ${(CBN_MPR * 100).toFixed(2)}%)`, amount: interest },
      ]};
    }
  },
  {
    id: 'failure_to_deduct',
    label: 'Failure to Deduct WHT',
    icon: '🔒',
    color: 'bg-red-50 border-red-200 text-red-800',
    badgeColor: 'bg-red-100 text-red-700',
    description: 'WHT not deducted at source from vendor payments',
    calc: (taxAmount: number, _daysLate: number) => {
      const penalty = taxAmount * 0.40;
      return { fixed: 0, variable: penalty, total: penalty, breakdown: [
        { label: '40% of undeducted WHT amount', amount: penalty },
      ]};
    }
  },
  {
    id: 'failure_to_register',
    label: 'Failure to Register / Obtain TIN',
    icon: '🪪',
    color: 'bg-purple-50 border-purple-200 text-purple-800',
    badgeColor: 'bg-purple-100 text-purple-700',
    description: 'Not registering for tax or obtaining TIN as required',
    calc: (_taxAmount: number, _daysLate: number) => {
      return { fixed: 50_000, variable: 0, total: 50_000, breakdown: [
        { label: 'Fixed registration penalty (NTA 2025, Section 122)', amount: 50_000 },
      ]};
    }
  },
];

// ─── Penalty Result Card ──────────────────────────────────────────────────────
const PenaltyCard: React.FC<{
  scenario: typeof PENALTY_SCENARIOS[0];
  taxAmount: number;
  daysLate: number;
  active: boolean;
  onClick: () => void;
}> = ({ scenario, taxAmount, daysLate, active, onClick }) => {
  const result = scenario.calc(taxAmount, daysLate);
  const hasInputs = taxAmount > 0 || scenario.id === 'failure_to_file' || scenario.id === 'failure_to_register';

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-4 cursor-pointer transition-all ${active ? scenario.color + ' ring-2 ring-current shadow-md' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{scenario.icon}</span>
        <div className="flex-1">
          <p className="font-bold text-sm">{scenario.label}</p>
          <p className="text-xs opacity-70 mt-0.5">{scenario.description}</p>
        </div>
      </div>
      {hasInputs && taxAmount > 0 || daysLate > 0 ? (
        <div className="mt-3 pt-3 border-t border-current/10">
          <p className="text-xs font-bold opacity-60 uppercase tracking-wider mb-1">Estimated Penalty</p>
          <p className="text-xl font-extrabold">{fmt(result.total)}</p>
          {result.breakdown.map((b, i) => (
            <p key={i} className="text-xs opacity-70 mt-0.5">{b.label}: {fmt(b.amount)}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
};

// ─── Main Penalty Calculator ──────────────────────────────────────────────────
export const PenaltyCalculator: React.FC = () => {
  const [taxType, setTaxType] = useState('vat');
  const [taxAmount, setTaxAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [filingDate, setFilingDate] = useState(new Date().toISOString().split('T')[0]);
  const [notFiled, setNotFiled] = useState(false);
  const [activeScenario, setActiveScenario] = useState('failure_to_file');

  const tax = parseFloat(taxAmount) || 0;
  const due = dueDate ? new Date(dueDate) : null;
  const filed = notFiled ? new Date() : (filingDate ? new Date(filingDate) : null);
  const daysLate = due && filed ? Math.max(0, Math.floor((filed.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const selectedTaxType = TAX_TYPES.find(t => t.value === taxType)!;
  const activeScenarioData = PENALTY_SCENARIOS.find(s => s.id === activeScenario)!;
  const activeResult = activeScenarioData.calc(tax, daysLate);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Penalty Calculator</h1>
          <span className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full">NTA 2025</span>
        </div>
        <p className="text-slate-500 text-sm">Calculate penalties and interest under Nigeria Tax Act 2025 (stiffened enforcement)</p>
      </header>

      {/* NTA 2025 penalty notice */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
        <span className="text-xl shrink-0">⚠️</span>
        <div className="text-xs text-red-800 space-y-1">
          <p className="font-bold">NTA 2025 -- Significantly Stiffened Penalties (effective 1 Jan 2026)</p>
          <p>• Failure to file: ₦50,000 fixed + <strong>₦25,000 per day of default</strong></p>
          <p>• Late remittance: <strong>10% per annum + CBN MPR ({(CBN_MPR * 100).toFixed(2)}%)</strong> = {(LATE_REMITTANCE_RATE * 100).toFixed(2)}% total p.a.</p>
          <p>• Failure to deduct WHT: <strong>40%</strong> of undeducted amount (increased from 10%)</p>
          <p>• NRS can now seal business premises and freeze accounts for tax default</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card className="space-y-4">
          <h2 className="font-bold text-slate-800">Filing Details</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Tax Type</label>
            <select
              value={taxType}
              onChange={e => setTaxType(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
            >
              {TAX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">Due: {selectedTaxType.dueDay} → {selectedTaxType.authority}</p>
          </div>

          <Input
            label="Tax Amount (₦)"
            type="number"
            value={taxAmount}
            onChange={e => setTaxAmount(e.target.value)}
            placeholder="Amount of tax that was due"
          />

          <Input
            label="Original Due Date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                className="accent-red-500"
                checked={notFiled}
                onChange={e => setNotFiled(e.target.checked)}
              />
              Not yet filed / paid (calculate to today)
            </label>

            {!notFiled && (
              <Input
                label="Actual Filing / Payment Date"
                type="date"
                value={filingDate}
                onChange={e => setFilingDate(e.target.value)}
              />
            )}
          </div>

          {due && (
            <div className={`rounded-xl p-3 text-center ${daysLate > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              {daysLate > 0 ? (
                <>
                  <p className="text-2xl font-extrabold text-red-600">{daysLate} days late</p>
                  <p className="text-xs text-red-500 mt-0.5">Penalties apply from {dueDate}</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-cac-green">✓ On time</p>
                  <p className="text-xs text-cac-green mt-0.5">Filed on or before due date -- no penalties</p>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Summary result */}
        <div className="space-y-4">
          <Card className={`${activeScenarioData.color} border space-y-3`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{activeScenarioData.icon}</span>
              <div>
                <p className="font-bold text-sm">{activeScenarioData.label}</p>
                <p className="text-xs opacity-70">{activeScenarioData.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {activeResult.breakdown.map((b, i) => (
                <div key={i} className="bg-white/60 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase opacity-60 mb-0.5">{b.label}</p>
                  <p className="font-extrabold text-lg">{fmt(b.amount)}</p>
                </div>
              ))}
            </div>

            <div className="bg-white/70 rounded-xl p-4 text-center">
              <p className="text-xs font-bold uppercase opacity-60 mb-1">Total Penalty / Interest</p>
              <p className="text-3xl font-extrabold">{fmt(activeResult.total)}</p>
              {tax > 0 && activeResult.total > 0 && (
                <p className="text-xs opacity-70 mt-1">
                  {((activeResult.total / tax) * 100).toFixed(1)}% of original tax due
                </p>
              )}
            </div>

            {tax > 0 && (
              <div className="bg-white/70 rounded-xl p-3 text-sm">
                <div className="flex justify-between"><span className="opacity-70">Original Tax</span><span className="font-bold">{fmt(tax)}</span></div>
                <div className="flex justify-between mt-1"><span className="opacity-70">Penalty / Interest</span><span className="font-bold text-red-600">{fmt(activeResult.total)}</span></div>
                <div className="flex justify-between mt-2 pt-2 border-t border-current/20 font-extrabold"><span>Total to Pay</span><span>{fmt(tax + activeResult.total)}</span></div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* All scenario cards */}
      <div>
        <h2 className="font-bold text-slate-800 mb-3">All Penalty Scenarios (NTA 2025)</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {PENALTY_SCENARIOS.map(s => (
            <PenaltyCard
              key={s.id}
              scenario={s}
              taxAmount={tax}
              daysLate={daysLate}
              active={activeScenario === s.id}
              onClick={() => setActiveScenario(s.id)}
            />
          ))}
        </div>
      </div>

      {/* How to avoid */}
      <Card className="space-y-3">
        <h2 className="font-bold text-slate-800 text-sm">How to Avoid Penalties (NTA 2025)</h2>
        <div className="grid md:grid-cols-2 gap-3 text-xs text-slate-600">
          {[
            { icon: '📅', tip: 'Set calendar reminders -- VAT & WHT due 21st monthly, PAYE due 10th monthly' },
            { icon: '🏦', tip: 'Always deduct WHT before paying vendors. Non-deduction = 40% penalty, no exceptions' },
            { icon: '📝', tip: 'File a nil return if you have no transactions for the period -- late nil returns still attract ₦50k + ₦25k/day' },
            { icon: '🤝', tip: 'NTA 2025 allows voluntary disclosure -- come forward before NRS discovers underpayment to reduce penalties' },
            { icon: '📁', tip: 'Keep all records for 6 years. NRS audits can go back 6 years under NTAA 2025' },
            { icon: '✅', tip: 'Small businesses (TIN holders, ≤₦2M/month transactions) are exempt from WHT -- register your TIN now' },
          ].map(({ icon, tip }) => (
            <div key={tip} className="flex gap-2 p-3 bg-slate-50 rounded-xl">
              <span className="shrink-0">{icon}</span>
              <p>{tip}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-slate-400 text-center">
        This calculator is for estimation purposes only. Actual penalties may vary based on NRS discretion and voluntary disclosure arrangements. Consult a tax professional for formal assessments.
      </p>
    </div>
  );
};
