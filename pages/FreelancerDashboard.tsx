import React, { useState, useEffect } from 'react';
import { Company, TaxObligation, LedgerEntry, TaxStatus } from '../types';
import { calcPAYE, getStateIRS, NRS_PORTALS } from '../utils/taxEngine';
import * as db from '../services/db';
import { AppView } from '../App';

interface Props {
  company: Company;
  onNavigate: (v: AppView) => void;
}

const fmt = (n: number) => '₦' + (n || 0).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Quarterly PIT dates for self-employed (NTA 2025)
const PIT_QUARTERS = [
  { q: 'Q1', label: '1st Instalment', due: 'March 31', month: 2,  desc: '25% of estimated annual PIT' },
  { q: 'Q2', label: '2nd Instalment', due: 'June 30',  month: 5,  desc: '25% of estimated annual PIT' },
  { q: 'Q3', label: '3rd Instalment', due: 'Sept 30',  month: 8,  desc: '25% of estimated annual PIT' },
  { q: 'Q4', label: 'Final + Return', due: 'Dec 31',   month: 11, desc: 'Balance + annual return filing' },
];

export const FreelancerDashboard: React.FC<Props> = ({ company, onNavigate }) => {
  const [obligations, setObligations] = useState<TaxObligation[]>([]);
  const [ledger, setLedger]           = useState<LedgerEntry[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      db.getObligations(company.id),
      db.getLedgers(company.id),
    ]).then(([obs, led]) => {
      setObligations(obs);
      setLedger(led);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [company.id]);

  const income   = ledger.filter(e => e.type === 'sale').reduce((s, e) => s + e.amount, 0);
  const expenses = ledger.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const whtPaid  = ledger.filter(e => e.type === 'expense').reduce((s, e) => s + (e.taxAmount || 0), 0);
  const annualIncome = company.annualIncome || income;

  // PIT calculation
  const pit = calcPAYE({ grossAnnual: annualIncome, annualRent: 0 });
  const quarterlyPIT = pit.annual / 4;
  const effectiveRate = pit.effectiveRate?.toFixed(1) || '0';

  // Monthly income/expense chart data
  const now = new Date();
  const monthlyData = MONTHS.map((m, idx) => {
    const inc = ledger.filter(e => e.type === 'sale' && new Date(e.date).getMonth() === idx && new Date(e.date).getFullYear() === now.getFullYear()).reduce((s, e) => s + e.amount, 0);
    const exp = ledger.filter(e => e.type === 'expense' && new Date(e.date).getMonth() === idx && new Date(e.date).getFullYear() === now.getFullYear()).reduce((s, e) => s + e.amount, 0);
    return { m, inc, exp };
  });

  const maxMonthly = Math.max(...monthlyData.map(d => Math.max(d.inc, d.exp)), 1);

  // Overdue and upcoming obligations
  const overdue   = obligations.filter(o => o.status === TaxStatus.OVERDUE);
  const upcoming  = obligations.filter(o => o.status === TaxStatus.DUE || o.status === TaxStatus.UPCOMING).slice(0, 3);

  // State IRS info
  const stateIRS = getStateIRS(company.state);

  const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string; onClick?: () => void }> =
    ({ label, value, sub, color = 'text-slate-900', onClick }) => (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm ${onClick ? 'cursor-pointer hover:border-cac-green/30 transition-all' : ''}`}
    >
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-cac-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome header */}
      <div className="bg-gradient-to-br from-cac-green to-cac-dark rounded-2xl p-6 text-white">
        <p className="text-green-200 text-sm font-semibold mb-1">Welcome back</p>
        <h1 className="text-2xl font-extrabold">{company.name}</h1>
        <p className="text-green-200 text-sm mt-1">
          {company.employmentType === 'self-employed' ? 'Self-Employed' : company.employmentType === 'both' ? 'Employed + Self-Employed' : 'Employed'} &middot; {company.state}
        </p>
        {overdue.length > 0 && (
          <div className="mt-4 bg-white/20 rounded-xl px-4 py-2 text-sm font-semibold">
            ⚠️ {overdue.length} overdue obligation{overdue.length > 1 ? 's' : ''} — act now
          </div>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Annual Income"
          value={fmt(annualIncome)}
          sub={annualIncome ? 'Estimated this year' : 'Set in Settings'}
          color="text-cac-green"
        />
        <StatCard
          label="PIT Liability"
          value={fmt(pit.annual)}
          sub={effectiveRate + '% effective rate'}
          color="text-slate-900"
          onClick={() => onNavigate('pit')}
        />
        <StatCard
          label="WHT Credit"
          value={fmt(whtPaid)}
          sub="Deducted by clients"
          color="text-blue-600"
        />
        <StatCard
          label="Net Position"
          value={fmt(income - expenses)}
          sub="Income minus expenses"
          color={income >= expenses ? 'text-cac-green' : 'text-red-600'}
        />
      </div>

      {/* PIT breakdown + quarterly calendar */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* PIT breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Tax Breakdown (NTA 2025)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Based on {fmt(annualIncome)} annual income</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gross Income</span>
              <span className="font-bold">{fmt(annualIncome)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Pension (8%)</span>
              <span className="text-red-500">- {fmt(pit.pension || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">NHIS (1.5%)</span>
              <span className="text-red-500">- {fmt(pit.nhis || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">NHF (2.5%)</span>
              <span className="text-red-500">- {fmt(pit.nhf || 0)}</span>
            </div>
            <div className="border-t border-slate-100 pt-3 flex justify-between text-sm">
              <span className="text-slate-500">Taxable Income</span>
              <span className="font-bold">{fmt(pit.taxable || 0)}</span>
            </div>
            <div className="bg-red-50 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-red-700">Annual PIT</span>
              <span className="font-extrabold text-red-600 text-lg">{fmt(pit.annual)}</span>
            </div>
            <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-amber-700">Less: WHT Credit</span>
              <span className="font-bold text-amber-600">- {fmt(whtPaid)}</span>
            </div>
            <div className="bg-cac-light rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-bold text-cac-green">Net PIT Payable</span>
              <span className="font-extrabold text-cac-green text-lg">{fmt(Math.max(0, pit.annual - whtPaid))}</span>
            </div>
          </div>
        </div>

        {/* Quarterly calendar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Quarterly PIT Calendar</h2>
            <p className="text-xs text-slate-400 mt-0.5">Self-employed pay PIT in 4 instalments</p>
          </div>
          <div className="p-5 space-y-3">
            {PIT_QUARTERS.map((q) => {
              const isPast = new Date().getMonth() > q.month;
              const isCurrent = new Date().getMonth() === q.month;
              const ob = obligations.find(o => o.type === 'PIT' as any && o.period?.includes(q.q));
              const filed = ob?.status === TaxStatus.FILED;
              return (
                <div key={q.q} className={`rounded-xl p-4 border ${
                  filed ? 'bg-green-50 border-green-200' :
                  isCurrent ? 'bg-amber-50 border-amber-300' :
                  isPast ? 'bg-red-50 border-red-200' :
                  'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{q.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Due: {q.due} &middot; {q.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-slate-900">{fmt(quarterlyPIT)}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        filed ? 'bg-green-200 text-green-800' :
                        isCurrent ? 'bg-amber-200 text-amber-800' :
                        isPast ? 'bg-red-200 text-red-800' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {filed ? 'Filed' : isCurrent ? 'Due now' : isPast ? 'Overdue' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700 border border-blue-200">
              Pay to: <span className="font-bold">{stateIRS?.name || company.state + ' IRS'}</span>
              {stateIRS?.url && (
                <a href={stateIRS.url} target="_blank" rel="noopener noreferrer"
                  className="block mt-1 text-blue-600 underline">{stateIRS.url}</a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Income vs Expenses ({now.getFullYear()})</h2>
            <p className="text-xs text-slate-400 mt-0.5">Monthly breakdown from your ledger</p>
          </div>
          <button onClick={() => onNavigate('ledger')} className="text-xs text-cac-green font-bold hover:underline">
            View Ledger
          </button>
        </div>
        <div className="p-5">
          {ledger.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-slate-500 text-sm">No transactions yet</p>
              <button onClick={() => onNavigate('ledger')} className="mt-3 text-cac-green text-sm font-bold hover:underline">
                Add your first transaction
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {monthlyData.map(({ m, inc, exp }) => (
                <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex items-end gap-0.5" style={{ height: '100px' }}>
                    <div className="flex-1 bg-cac-green rounded-t-sm transition-all"
                      style={{ height: maxMonthly > 0 ? (inc / maxMonthly * 100) + '%' : '2px', minHeight: inc > 0 ? '2px' : '0' }} />
                    <div className="flex-1 bg-red-300 rounded-t-sm transition-all"
                      style={{ height: maxMonthly > 0 ? (exp / maxMonthly * 100) + '%' : '2px', minHeight: exp > 0 ? '2px' : '0' }} />
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium">{m}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-cac-green" />
              <span className="text-xs text-slate-500">Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-300" />
              <span className="text-xs text-slate-500">Expenses</span>
            </div>
          </div>
        </div>
      </div>

      {/* WHT tracker + invoices */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* WHT deducted by clients */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">WHT Deducted by Clients</h2>
            <p className="text-xs text-slate-400 mt-0.5">Clients deduct 5% WHT — offset against your PIT</p>
          </div>
          <div className="p-5">
            {ledger.filter(e => e.taxAmount > 0).length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">🧾</p>
                <p className="text-slate-400 text-sm">No WHT recorded yet</p>
                <p className="text-slate-400 text-xs mt-1">Add transactions in your Ledger where clients deducted WHT</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ledger.filter(e => e.taxAmount > 0).slice(0, 5).map(e => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">{e.description}</p>
                      <p className="text-xs text-slate-400">{fmtDate(e.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">- {fmt(e.taxAmount)}</p>
                      <p className="text-xs text-slate-400">on {fmt(e.amount)}</p>
                    </div>
                  </div>
                ))}
                <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center mt-2">
                  <span className="text-sm font-bold text-blue-700">Total WHT Credit</span>
                  <span className="font-extrabold text-blue-600">{fmt(whtPaid)}</span>
                </div>
              </div>
            )}
            <button onClick={() => onNavigate('ledger')} className="w-full mt-4 py-2.5 border border-cac-green/30 text-cac-green rounded-xl text-sm font-bold hover:bg-cac-light transition-all">
              + Record Transaction
            </button>
          </div>
        </div>

        {/* Filing checklist */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">Annual Filing Checklist</h2>
            <p className="text-xs text-slate-400 mt-0.5">What you need to file each year</p>
          </div>
          <div className="p-5 space-y-2">
            {[
              { label: 'PIT Self-Assessment Return (Form A)',   sub: 'Due: 31 March annually · State IRS',   done: false },
              { label: 'Quarterly PIT instalments paid (x4)',   sub: '25% each quarter',                      done: whtPaid > 0 },
              { label: 'Development Levy',                      sub: '₦1,000 - ₦5,000/yr · Local govt',      done: false },
              { label: 'Business Premises Levy',                sub: 'If operating from premises · State',    done: false },
              { label: 'Tax Clearance Certificate (TCC)',       sub: 'Apply after filing return · State IRS', done: false },
              { label: 'WHT credit reconciliation',             sub: 'Match client WHT deductions to PIT',    done: whtPaid > 0 },
            ].map((item, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${item.done ? 'bg-green-50' : 'bg-slate-50'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.done ? 'bg-cac-green' : 'bg-slate-200'}`}>
                  {item.done && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${item.done ? 'text-cac-green line-through' : 'text-slate-800'}`}>{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: '📄', label: 'Create Invoice',    view: 'invoice'  as AppView },
          { icon: '🤖', label: 'Ask AI',            view: 'ai'       as AppView },
          { icon: '📊', label: 'PIT Calculator',    view: 'pit'      as AppView },
          { icon: '💱', label: 'Foreign Income',    view: 'fx'       as AppView },
          { icon: '📤', label: 'Export Reports',    view: 'export'   as AppView },
        ].map(({ icon, label, view }) => (
          <button key={label} onClick={() => onNavigate(view)}
            className="bg-white border border-slate-100 rounded-2xl p-4 text-left hover:border-cac-green/30 hover:shadow-sm transition-all shadow-sm">
            <p className="text-2xl mb-2">{icon}</p>
            <p className="text-sm font-bold text-slate-800">{label}</p>
          </button>
        ))}
      </div>

      {/* NRS + State IRS links */}
      <div className="bg-slate-800 rounded-2xl p-5 text-white">
        <h3 className="font-bold mb-3">Filing Portals</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <a href={NRS_PORTALS.taxProMax} target="_blank" rel="noopener noreferrer"
            className="bg-white/10 rounded-xl px-4 py-3 hover:bg-white/20 transition-all">
            <p className="text-sm font-bold">NRS TaxPro Max</p>
            <p className="text-xs text-slate-300 mt-0.5">File federal returns online</p>
          </a>
          {stateIRS?.url && (
            <a href={stateIRS.url} target="_blank" rel="noopener noreferrer"
              className="bg-white/10 rounded-xl px-4 py-3 hover:bg-white/20 transition-all">
              <p className="text-sm font-bold">{stateIRS.name}</p>
              <p className="text-xs text-slate-300 mt-0.5">File {company.state} state returns</p>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
