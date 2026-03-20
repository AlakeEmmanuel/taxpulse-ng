import React, { useState, useEffect } from 'react';
import { Company, TaxStatus, TaxType, LedgerEntry } from '../types';
import { Card, Badge, Button, Input } from '../components/Shared';
import * as db from '../services/db';
import { sendDueReminders } from '../services/notifications';
import { calcPAYE, calcCIT, calcVAT, WHT_RATES, VAT_RATE, generateObligations, getStateIRS, NRS_PORTALS } from '../utils/taxEngine';
import { StateIRSPanel } from './Phase2Tools';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const fmt = (n: number) => '₦' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });

// ─── Quick Action Button ──────────────────────────────────────────────────────
const QuickActionButton: React.FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-100 hover:border-cac-green hover:shadow-md transition-all group w-full"
  >
    <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
    <span className="text-xs font-semibold text-slate-600 text-center leading-tight">{label}</span>
  </button>
);

// ─── Add Sale Modal (NTA 2025: VAT 7.5%, unchanged) ──────────────────────────
const AddSaleModal: React.FC<{ company: Company; onClose: () => void; onSaved?: () => void }> = ({ company, onClose, onSaved }) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [vatIncl, setVatIncl] = useState(false);
  const [zeroRated, setZeroRated] = useState(false);
  const [saved, setSaved] = useState(false);

  const raw = parseFloat(amount) || 0;
  const net = vatIncl ? raw / (1 + VAT_RATE) : raw;
  const vat = zeroRated ? 0 : net * VAT_RATE;
  const total = net + vat;

  const handleSave = () => {
    if (!desc || !raw) return;
    const entry: LedgerEntry = {
      id: Date.now().toString(),
      companyId: company.id,
      date: new Date().toISOString().split('T')[0],
      type: 'sale',
      description: desc,
      amount: net,
      taxAmount: vat,
    };
    db.addLedgerEntry({ ...entry, id: Date.now().toString() }).then(() => {
      setSaved(true);
      onSaved?.();
      setTimeout(onClose, 1200);
    }).catch(e => { console.error('Ledger error:', e); alert('Failed to save. Please try again.'); });
  };

  return (
    <ModalWrapper title="Record Sale" onClose={onClose}>
      {saved ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-bold text-cac-green">Sale recorded!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Input label="Description" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g., Consulting services -- April" />
          <Input label="Amount (₦)" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="accent-cac-green" checked={vatIncl} onChange={e => setVatIncl(e.target.checked)} />
              Amount is VAT-inclusive
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="accent-cac-green" checked={zeroRated} onChange={e => setZeroRated(e.target.checked)} />
              Zero-rated supply (NTA 2025 -- food/medical/education/electricity)
            </label>
          </div>

          {raw > 0 && (
            <div className="bg-cac-light rounded-xl p-4 space-y-2 text-sm border border-cac-green/10">
              <p className="font-bold text-cac-green text-xs uppercase tracking-wider">VAT Breakdown (NTA 2025 -- 7.5%)</p>
              <div className="flex justify-between"><span className="text-slate-600">Net Amount</span><span className="font-bold">{fmt(net)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">VAT {zeroRated ? '(0% -- zero-rated)' : '(7.5%)'}</span><span className={`font-bold ${zeroRated ? 'text-slate-400' : 'text-cac-green'}`}>{fmt(vat)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="font-bold text-slate-800">Total</span><span className="font-extrabold text-cac-green">{fmt(total)}</span></div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1" disabled={!desc || !raw}>Save Sale</Button>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
};

// ─── Add Expense Modal (WHT per NTA 2025) ────────────────────────────────────
const AddExpenseModal: React.FC<{ company: Company; onClose: () => void; onSaved?: () => void }> = ({ company, onClose, onSaved }) => {
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Supply of Goods');
  const [saved, setSaved] = useState(false);

  const raw = parseFloat(amount) || 0;
  const whtRate = WHT_RATES[category]?.rate ?? 0.05;
  const wht = raw * whtRate;
  const net = raw - wht;

  const handleSave = () => {
    if (!vendor || !raw) return;
    const entry: LedgerEntry = {
      id: Date.now().toString(),
      companyId: company.id,
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      description: `${vendor} -- ${category}`,
      amount: raw,
      taxAmount: wht,
    };
    db.addLedgerEntry({ ...entry, id: Date.now().toString() }).then(() => {
      setSaved(true);
      onSaved?.();
      setTimeout(onClose, 1200);
    }).catch(e => { console.error('Ledger error:', e); alert('Failed to save. Please try again.'); });
  };

  return (
    <ModalWrapper title="Record Expense" onClose={onClose}>
      {saved ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-bold text-cac-green">Expense saved!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Input label="Vendor / Payee" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g., TechSoft Ltd" />
          <Input label="Gross Amount (₦)" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">WHT Category (NTA 2025)</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
            >
              {Object.keys(WHT_RATES).map(k => (
                <option key={k} value={k}>{k} ({(WHT_RATES[k].rate * 100).toFixed(0)}%){WHT_RATES[k].note ? ' 🆕' : ''}</option>
              ))}
            </select>
          </div>

          {raw > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-bold text-amber-700 text-xs uppercase tracking-wider">WHT Deduction (NTA 2025)</p>
              <div className="flex justify-between"><span className="text-slate-600">Gross Invoice</span><span className="font-bold">{fmt(raw)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">WHT ({(whtRate * 100).toFixed(0)}%)</span><span className="font-bold text-amber-700">-{fmt(wht)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="font-bold text-slate-800">Net Payable to Vendor</span><span className="font-extrabold">{fmt(net)}</span></div>
              <p className="text-[10px] text-amber-600 pt-1">Remit {fmt(wht)} to NRS by 21st of next month. Non-deduction penalty = 40% (NTA 2025).</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1" disabled={!vendor || !raw}>Save Expense</Button>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
};

// ─── Payroll Modal (NTA 2025 PAYE + CIT) ─────────────────────────────────────
const PayrollModal: React.FC<{ company: Company; onClose: () => void }> = ({ company, onClose }) => {
  const [tab, setTab] = useState<'paye' | 'cit'>('paye');

  // PAYE state
  const [employees, setEmployees] = useState([
    { name: 'Employee 1', grossMonthly: '' },
  ]);
  const [annualRent, setAnnualRent] = useState('');

  // CIT state
  const [annualTurnover, setAnnualTurnover] = useState('');
  const [annualProfit, setAnnualProfit] = useState('');
  const [isProSvc, setIsProSvc] = useState(false);

  const addEmployee = () =>
    setEmployees(prev => [...prev, { name: `Employee ${prev.length + 1}`, grossMonthly: '' }]);

  const updateEmployee = (i: number, field: 'name' | 'grossMonthly', val: string) => {
    setEmployees(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  };

  // NTA 2025 PAYE -- no CRA, use calcPAYE from taxEngine
  const payeResults = employees.map(emp => {
    const grossAnnual = (parseFloat(emp.grossMonthly) || 0) * 12;
    const result = calcPAYE({
      grossAnnual,
      annualRent: parseFloat(annualRent) || 0,
    });
    return { ...emp, grossAnnual, ...result };
  });

  const totalMonthlyPAYE = payeResults.reduce((s, r) => s + r.monthly, 0);

  // NTA 2025 CIT
  const profit = parseFloat(annualProfit) || 0;
  const turnover = parseFloat(annualTurnover) || 0;
  const citResult = calcCIT(profit, turnover, isProSvc);

  return (
    <ModalWrapper title="Payroll & Company Tax" onClose={onClose}>
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
        {(['paye', 'cit'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t === 'paye' ? '👥 PAYE (Salaries)' : '🏢 CIT + Dev Levy'}
          </button>
        ))}
      </div>

      {tab === 'paye' && (
        <div className="space-y-4">
          {/* NTA 2025 notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
            <strong>NTA 2025:</strong> CRA abolished. New bands: 0% on first ₦800k, then 15%-25%. Pension 8% employee / 10% employer. NHIS 5% / 10%.
          </div>

          <Input
            label="Annual Rent Paid per Employee (₦) -- for Rent Relief"
            type="number"
            value={annualRent}
            onChange={e => setAnnualRent(e.target.value)}
            placeholder="e.g. 600,000 (20% deducted, max ₦500k)"
          />

          <div className="space-y-3">
            {employees.map((emp, i) => {
              const r = payeResults[i];
              const grossM = parseFloat(emp.grossMonthly) || 0;
              return (
                <div key={i} className="border border-slate-100 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      label="Name"
                      value={emp.name}
                      onChange={e => updateEmployee(i, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      label="Monthly Gross (₦)"
                      type="number"
                      value={emp.grossMonthly}
                      onChange={e => updateEmployee(i, 'grossMonthly', e.target.value)}
                      placeholder="0"
                      className="flex-1"
                    />
                  </div>
                  {grossM > 0 && (
                    <div className="grid grid-cols-4 gap-2 text-xs bg-slate-50 rounded-lg p-2">
                      <div><p className="text-slate-400">Monthly PAYE</p><p className="font-bold text-cac-green">{fmt(r.monthly)}</p></div>
                      <div><p className="text-slate-400">Pension (8%)</p><p className="font-bold text-purple-600">{fmt(r.pension / 12)}</p></div>
                      <div><p className="text-slate-400">NHIS (5%)</p><p className="font-bold text-indigo-600">{fmt((r.nhis ?? 0) / 12)}</p></div>
                      <div><p className="text-slate-400">Effective Rate</p><p className="font-bold text-slate-700">{r.effectiveRate?.toFixed(1)}%</p></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={addEmployee} className="text-xs font-bold text-cac-green hover:underline">+ Add Employee</button>

          {totalMonthlyPAYE > 0 && (
            <div className="bg-cac-green text-white rounded-xl p-4">
              <p className="text-xs text-green-200 font-bold uppercase mb-1">Total Monthly PAYE to Remit</p>
              <p className="text-2xl font-extrabold">{fmt(totalMonthlyPAYE)}</p>
              <p className="text-xs text-green-200 mt-1">Due: 10th of next month → State IRS (NTA 2025)</p>
            </div>
          )}
        </div>
      )}

      {tab === 'cit' && (
        <div className="space-y-4">
          {/* NTA 2025 CIT notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
            <strong>NTA 2025 changes:</strong> Small company threshold raised to <strong>₦50M turnover</strong> (was ₦25M). Medium category removed -- it's now Small (0%) or Standard (30%). New <strong>4% Development Levy</strong> on profits for non-small companies.
          </div>

          <Input label="Annual Turnover (₦)" type="number" value={annualTurnover} onChange={e => setAnnualTurnover(e.target.value)} placeholder="Total annual revenue" />
          <Input label="Taxable Profit (₦)" type="number" value={annualProfit} onChange={e => setAnnualProfit(e.target.value)} placeholder="Revenue minus allowable expenses" />

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" className="accent-cac-green" checked={isProSvc} onChange={e => setIsProSvc(e.target.checked)} />
            Professional services firm (law, accounting, consulting -- cannot be small co.)
          </label>

          {turnover > 0 && profit >= 0 && (
            <div className="space-y-3">
              <div className={`rounded-xl p-4 border ${citResult.rate === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${citResult.rate === 0 ? 'text-cac-green' : 'text-amber-700'}`}>{citResult.label}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><p className="text-slate-500 text-xs">CIT ({(citResult.rate * 100).toFixed(0)}%)</p><p className="font-bold">{fmt(citResult.tax)}</p></div>
                  <div><p className="text-slate-500 text-xs">Dev Levy (4%)</p><p className="font-bold text-amber-600">{fmt(citResult.devLevy)}</p></div>
                  <div><p className="text-slate-500 text-xs">Total Liability</p><p className="font-extrabold text-cac-green">{fmt(citResult.total)}</p></div>
                </div>
                {citResult.vatExempt && (
                  <p className="text-xs text-cac-green mt-2 font-semibold">✓ Also VAT-exempt (turnover ≤₦100M under NTAA 2025)</p>
                )}
              </div>
              <p className="text-[11px] text-slate-500">{citResult.note}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </ModalWrapper>
  );
};

// ─── Mark Filed Modal ─────────────────────────────────────────────────────────
const MarkFiledModal: React.FC<{ company: Company; onClose: () => void; onSaved?: () => void }> = ({ company, onClose, onSaved }) => {
  const [unfiled, setUnfiled] = React.useState<any[]>([]);
  React.useEffect(() => {
    db.getObligations(company.id).then(obs => setUnfiled(obs.filter(o =>
      o.status === TaxStatus.DUE || o.status === TaxStatus.OVERDUE || o.status === TaxStatus.UPCOMING
    ))).catch(() => {});
  }, [company.id]);
  // Default to first unfiled item once loaded -- avoids silent no-op on Confirm
  const [selectedId, setSelectedId] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptRef, setReceiptRef] = useState('');
  const [saved, setSaved] = useState(false);

  // Pre-select first obligation once list loads
  React.useEffect(() => {
    if (unfiled.length > 0 && !selectedId) setSelectedId(unfiled[0].id);
  }, [unfiled]);

  const handleFile = async () => {
    if (!selectedId) return;
    const ob = unfiled.find(o => o.id === selectedId);
    try {
      await db.updateObligation(selectedId, {
        status: TaxStatus.FILED,
        actualAmount: parseFloat(actualAmount) || undefined,
        paymentDate,
        proofUrl: receiptRef || undefined,
      });
      // Send confirmation email (fire-and-forget -- never blocks filing)
      if (ob) {
        // Get user email from Supabase auth
        import('../services/supabaseClient').then(({ supabase }) => {
          supabase.auth.getUser().then(({ data }) => {
            const email = data.user?.email;
            if (!email) return;
            fetch('/api/send-filing-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to:           email,
                companyName:  company.name,
                taxType:      ob.type,
                period:       ob.period,
                dueDate:      ob.dueDate,
                actualAmount: parseFloat(actualAmount) || ob.estimatedAmount,
                paymentDate,
                receiptRef:   receiptRef || undefined,
              }),
            }).catch(() => {}); // silent -- email failure must never affect filing
          });
        });
      }
      onSaved?.();
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch (e: any) {
      console.error('Update error:', e);
      alert('Failed to update. Please try again.');
    }
  };

  if (unfiled.length === 0) {
    return (
      <ModalWrapper title="Mark as Filed" onClose={onClose}>
        <div className="text-center py-8">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-bold text-cac-green">All obligations are filed!</p>
        </div>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper title="Mark as Filed" onClose={onClose}>
      {saved ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-bold text-cac-green">Obligation marked as filed!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Select Obligation</label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white"
            >
              {unfiled.map(o => (
                <option key={o.id} value={o.id}>{o.type} -- {o.period} (due {o.dueDate})</option>
              ))}
            </select>
          </div>
          <Input label="Actual Amount Paid (₦)" type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)} placeholder="Leave blank to use estimate" />
          <Input label="Payment Date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          <Input label="Receipt / Reference No." value={receiptRef} onChange={e => setReceiptRef(e.target.value)} placeholder="e.g., NRS-20260310-XXXXX" />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleFile} className="flex-1">Confirm Filing</Button>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
};


// ─── Modal Wrapper ────────────────────────────────────────────────────────────
const ModalWrapper: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
        <h2 className="font-bold text-slate-900">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

// ─── Compliance Score Ring ────────────────────────────────────────────────────
const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const data = [{ value: score }, { value: 100 - score }];
  const color = score >= 80 ? '#00843D' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-32 h-32">
      <ResponsiveContainer width={128} height={128}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={44} outerRadius={60} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="#f1f5f9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-slate-900">{score}</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase">Score</span>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
type ModalType = 'sale' | 'expense' | 'payroll' | 'filed' | null;

import { AppView } from '../App';

interface DashboardProps {
  company: Company;
  onNavigate: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ company, onNavigate }) => {
  const [modal, setModal]             = useState<ModalType>(null);
  const [obligations, setObligations] = useState<any[]>([]);
  const [ledger, setLedger]           = useState<LedgerEntry[]>([]);
  const [evidence, setEvidence]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [seeding, setSeeding]           = useState(false);

  const refreshData = () => {
    db.refreshObligationStatuses(company.id).catch(() => {}).finally(() => {
      Promise.all([
        db.getObligations(company.id),
        db.getLedgers(company.id),
        db.getEvidence(company.id),
      ]).then(([obs, led, ev]) => {
        setObligations(obs);
        setLedger(led);
        setEvidence(ev);
      }).catch(() => {});
    });
  };

  useEffect(() => {
    setLoading(true);
    // First refresh stale statuses silently, then load everything
    db.refreshObligationStatuses(company.id)
      .catch(() => {}) // never block the UI
      .finally(() => {
        Promise.all([
          db.getObligations(company.id),
          db.getLedgers(company.id),
          db.getEvidence(company.id),
        ]).then(([obs, led, ev]) => {
          setObligations(obs);
          setLedger(led);
          setEvidence(ev);
          // Auto-send WhatsApp reminders once per day if opted in
          if (company.whatsappOptin && company.phone) {
            const sentKey = `taxpulse_wa_${company.id}_${new Date().toDateString()}`;
            if (!localStorage.getItem(sentKey)) {
              sendDueReminders(obs, company.name, company.phone, true)
                .then(n => { if (n > 0) localStorage.setItem(sentKey, '1'); })
                .catch(() => {});
            }
          }
        }).catch(() => {}).finally(() => setLoading(false));
      });
  }, [company.id]);

  // Compute real compliance score
  const computeScore = () => {
    if (obligations.length === 0) return company.complianceScore;
    const total = obligations.length;
    const filedCount = obligations.filter(o => o.status === TaxStatus.FILED).length;
    const overdueCount = obligations.filter(o => o.status === TaxStatus.OVERDUE).length;
    const base = Math.round((filedCount / total) * 80);
    const penalty = Math.min(overdueCount * 8, 40);
    const profileBonus = company.tin ? 10 : 0;
    const vaultBonus = evidence.length > 0 ? 10 : 0;
    return Math.min(100, Math.max(0, base + profileBonus + vaultBonus - penalty));
  };
  const score = computeScore();

  // Getting started checklist
  const gettingStarted = [
    { id: 'profile',  label: 'Complete company profile',       done: !!(company.tin && company.rcNumber),  action: () => onNavigate('settings'), actionLabel: 'Go to Settings' },
    { id: 'ledger',   label: 'Record your first transaction',  done: ledger.length > 0,                    action: () => setModal('sale'),       actionLabel: 'Add Sale' },
    { id: 'import',   label: 'Import a bank statement',        done: ledger.some(l => l.sourceId),         action: () => onNavigate('import'),   actionLabel: 'Import Now' },
    { id: 'vault',    label: 'Upload a receipt or invoice',    done: evidence.length > 0,                  action: () => onNavigate('vault'),    actionLabel: 'Open Vault' },
    { id: 'export',   label: 'Generate your first PDF report', done: !!localStorage.getItem('taxpulse_pdf_generated_' + company.id), action: () => onNavigate('export'),   actionLabel: 'Export PDF' },
  ];
  const completedSteps = gettingStarted.filter(s => s.done).length;
  const allDone = completedSteps === gettingStarted.length;
  const showChecklist = completedSteps < gettingStarted.length;

  const overdue  = obligations.filter(o => o.status === TaxStatus.OVERDUE);
  const due      = obligations.filter(o => o.status === TaxStatus.DUE);
  const upcoming = obligations.filter(o => o.status === TaxStatus.UPCOMING);
  const filed    = obligations.filter(o => o.status === TaxStatus.FILED);

  const statusColor = {
    [TaxStatus.OVERDUE]:  'bg-red-50 border-red-200 text-red-700',
    [TaxStatus.DUE]:      'bg-amber-50 border-amber-200 text-amber-700',
    [TaxStatus.UPCOMING]: 'bg-blue-50 border-blue-200 text-blue-700',
    [TaxStatus.FILED]:    'bg-green-50 border-green-200 text-cac-green',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <span className="bg-cac-green text-white text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide">NTA 2025 ✓</span>
        </div>
        <p className="text-slate-500 text-sm">{company.entityType} · {company.state} · {company.industry}</p>
      </header>

      {/* Empty Obligations Banner -- shown to existing users who have no schedule yet */}
      {!loading && obligations.length === 0 && !seeding && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl shrink-0">📅</div>
            <div>
              <h2 className="font-extrabold text-slate-900">Your tax schedule is empty</h2>
              <p className="text-sm text-slate-600 mt-1">
                TaxPulse needs to generate your 12-month tax obligation calendar based on your company profile -- VAT, PAYE, WHT, and CIT deadlines.
              </p>
            </div>
          </div>
          <div className="bg-white/70 rounded-xl p-4 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800 mb-2">Based on your profile, you need:</p>
            {company.collectsVat  && <p>✅ <strong>VAT</strong> -- Monthly returns, due 21st of each month → NRS</p>}
            {company.hasEmployees && <p>✅ <strong>PAYE</strong> -- Monthly payroll tax, due 10th of each month → State IRS</p>}
            {company.paysVendors  && <p>✅ <strong>WHT</strong> -- Monthly withholding, due 21st of each month → NRS</p>}
            <p>✅ <strong>CIT</strong> -- Annual filing, 6 months after your {company.yearEnd} year-end</p>
          </div>
          <button
            onClick={async () => {
              setSeeding(true);
              try {
                const obs = generateObligations(company);
                for (const ob of obs) {
                  await db.addObligation({ ...ob, id: '' }).catch(() => {});
                }
                await db.refreshObligationStatuses(company.id).catch(() => {});
                const fresh = await db.getObligations(company.id);
                setObligations(fresh);
              } catch (e) {
                console.error('Seeding failed:', e);
              } finally {
                setSeeding(false);
              }
            }}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            🚀 Generate My Tax Schedule Now
          </button>
        </div>
      )}

      {/* Seeding overlay */}
      {seeding && (
        <div className="bg-cac-green/5 border border-cac-green/20 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 border-4 border-cac-green border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-bold text-slate-800">Building your tax calendar...</p>
          <p className="text-sm text-slate-500">Creating 12 months of obligations based on your profile</p>
        </div>
      )}

      {/* Getting Started Checklist -- shown until all done */}
      {showChecklist && (
        <div className="bg-gradient-to-br from-cac-green/5 to-emerald-50 border border-cac-green/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-900">🚀 Get started with TaxPulse</h2>
              <p className="text-xs text-slate-500 mt-0.5">{completedSteps} of {gettingStarted.length} steps complete</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-cac-green">{Math.round((completedSteps / gettingStarted.length) * 100)}%</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-cac-green/20">
            <div
              className="h-full bg-cac-green rounded-full transition-all duration-500"
              style={{ width: (completedSteps / gettingStarted.length * 100) + '%' }}
            />
          </div>
          <div className="space-y-2">
            {gettingStarted.map((step, i) => (
              <div key={step.id} className={"flex items-center gap-3 p-3 rounded-xl transition-all " + (step.done ? 'bg-white/60 opacity-60' : 'bg-white border border-slate-100 shadow-sm')}>
                <div className={"w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 " + (step.done ? 'bg-cac-green text-white' : 'bg-slate-100 text-slate-400')}>
                  {step.done ? '✓' : i + 1}
                </div>
                <p className={"flex-1 text-sm font-semibold " + (step.done ? 'line-through text-slate-400' : 'text-slate-800')}>{step.label}</p>
                {!step.done && (
                  <button
                    onClick={step.action}
                    className="text-xs font-bold text-cac-green bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                  >
                    {step.actionLabel} →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NTA 2025 Reform Banner */}
      <div className="bg-gradient-to-r from-cac-green to-emerald-600 rounded-2xl p-4 text-white flex items-center gap-4">
        <span className="text-3xl shrink-0">📋</span>
        <div>
          <p className="font-bold text-sm">Nigeria Tax Act 2025 -- Active from 1 Jan 2026</p>
          <p className="text-xs text-green-200 mt-0.5">All calculations use new PAYE bands (0%-25%), CIT ≤₦50M exempt, 4% Dev Levy. Now: Nigeria Revenue Service (NRS).</p>
        </div>
      </div>

      {/* Score + Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="col-span-2 md:col-span-1 flex items-center gap-4 p-4">
          <ScoreRing score={score} />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Compliance</p>
            <p className="text-sm font-bold text-slate-700 mt-0.5">
              {company.complianceScore >= 80 ? 'Excellent' : company.complianceScore >= 50 ? 'Needs Work' : 'At Risk'}
            </p>
          </div>
        </Card>
        {[
          { label: 'Overdue', count: overdue.length, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Due Soon', count: due.length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Filed', count: filed.length, color: 'text-cac-green', bg: 'bg-green-50' },
        ].map(s => (
          <Card key={s.label} className={`${s.bg} border-0 flex flex-col justify-center items-center p-5`}>
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.count}</p>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="space-y-3">
        <h2 className="font-bold text-slate-800">Quick Actions</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          <QuickActionButton icon="🧾" label="Record Sale"    onClick={() => setModal('sale')} />
          <QuickActionButton icon="💳" label="Add Expense"   onClick={() => setModal('expense')} />
          <QuickActionButton icon="👥" label="Run Payroll"   onClick={() => setModal('payroll')} />
          <QuickActionButton icon="✅" label="Mark Filed"    onClick={() => setModal('filed')} />
          <QuickActionButton icon="🏦" label="Import Bank"   onClick={() => onNavigate('import')} />
        </div>
      </Card>

      {/* Obligations List */}
      <Card className="space-y-3">
        <h2 className="font-bold text-slate-800">Tax Obligations</h2>
        {obligations.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">No obligations found for this company.</p>
        ) : (
          <div className="space-y-2">
            {obligations.map(ob => (
              <div key={ob.id} className={`flex items-center justify-between p-3 rounded-xl border text-sm ${statusColor[ob.status]}`}>
                <div className="flex items-center gap-3">
                  <span className="font-black text-xs">{ob.type}</span>
                  <span className="text-xs opacity-80">{ob.period}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{fmt(ob.estimatedAmount)}</span>
                  <Badge
                    text={ob.status}
                    variant={ob.status === TaxStatus.FILED ? 'success' : ob.status === TaxStatus.OVERDUE ? 'danger' : 'warning'}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* NTA 2025 Key Changes Reference */}
      <Card className="space-y-3">
        <h2 className="font-bold text-slate-800 text-sm">NTA 2025 Quick Reference</h2>
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          {[
            { icon: '📊', title: 'PAYE Bands 2026', body: '0% first ₦800k · 15% next ₦2.2M · 18% next ₦9M · 21% next ₦13M · 23% next ₦25M · 25% above ₦50M' },
            { icon: '🏢', title: 'CIT (NTA 2025)', body: 'Small cos (≤₦50M turnover): 0% CIT + 0% Dev Levy. Standard: 30% CIT + 4% Dev Levy. Medium category removed.' },
            { icon: '🛡️', title: 'NSITF + Pension', body: 'NSITF: 1% payroll → NSITF (due 16th). Pension: 8% employee + 10% employer → PFAs (due within 7 days of payday). CAC annual returns: 30 June.' },
            { icon: '📆', title: 'Plan Ahead', body: 'Use Salary Simulator to see PAYE impact before a raise. Use Annual Tax Planner to forecast 12 months of obligations. Track TCC expiry in TCC Tracker.' },
            { icon: '🏠', title: 'Rent Relief (replaces CRA)', body: '20% of annual rent paid, max ₦500,000. CRA is fully abolished from 1 Jan 2026.' },
            { icon: '📅', title: 'Filing Deadlines', body: 'VAT: 21st · PAYE: 10th · WHT: 21st · CIT: 6 months after year-end · PIT: 31 March · NSITF: 16th · Pension: 7 days after payday · CAC: 30 June · ITF: 1 April' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="bg-slate-50 rounded-xl p-3 space-y-1">
              <p className="font-bold text-slate-800">{icon} {title}</p>
              <p className="text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Modals */}
      {modal === 'sale'    && <AddSaleModal    company={company} onClose={() => setModal(null)} onSaved={refreshData} />}
      {modal === 'expense' && <AddExpenseModal company={company} onClose={() => setModal(null)} onSaved={refreshData} />}
      {modal === 'payroll' && <PayrollModal    company={company} onClose={() => setModal(null)} />}
      {modal === 'filed'   && <MarkFiledModal  company={company} onClose={() => setModal(null)} onSaved={refreshData} />}
    </div>
  );
};

export default Dashboard;
