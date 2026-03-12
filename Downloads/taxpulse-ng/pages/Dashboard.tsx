import React, { useState } from 'react';
import { Company, TaxStatus, TaxType, LedgerEntry } from '../types';
import { Card, Badge, Button, Input } from '../components/Shared';
import * as db from '../services/db';
import { calcPAYE, calcCIT, calcVAT, WHT_RATES, VAT_RATE } from '../utils/taxEngine';
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
const AddSaleModal: React.FC<{ company: Company; onClose: () => void }> = ({ company, onClose }) => {
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
    db.addLedgerEntry(entry).catch(e => console.error('Ledger error:', e));
    setSaved(true);
    setTimeout(onClose, 1200);
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
          <Input label="Description" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g., Consulting services — April" />
          <Input label="Amount (₦)" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="accent-cac-green" checked={vatIncl} onChange={e => setVatIncl(e.target.checked)} />
              Amount is VAT-inclusive
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" className="accent-cac-green" checked={zeroRated} onChange={e => setZeroRated(e.target.checked)} />
              Zero-rated supply (NTA 2025 — food/medical/education/electricity)
            </label>
          </div>

          {raw > 0 && (
            <div className="bg-cac-light rounded-xl p-4 space-y-2 text-sm border border-cac-green/10">
              <p className="font-bold text-cac-green text-xs uppercase tracking-wider">VAT Breakdown (NTA 2025 — 7.5%)</p>
              <div className="flex justify-between"><span className="text-slate-600">Net Amount</span><span className="font-bold">{fmt(net)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">VAT {zeroRated ? '(0% — zero-rated)' : '(7.5%)'}</span><span className={`font-bold ${zeroRated ? 'text-slate-400' : 'text-cac-green'}`}>{fmt(vat)}</span></div>
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
const AddExpenseModal: React.FC<{ company: Company; onClose: () => void }> = ({ company, onClose }) => {
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
      description: `${vendor} — ${category}`,
      amount: raw,
      taxAmount: wht,
    };
    db.addLedgerEntry(entry).catch(e => console.error('Ledger error:', e));
    setSaved(true);
    setTimeout(onClose, 1200);
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

  // NTA 2025 PAYE — no CRA, use calcPAYE from taxEngine
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
            <strong>NTA 2025:</strong> CRA abolished. New bands: 0% on first ₦800k, then 15%–25%. Pension 8% employee / 10% employer. NHIS 5% / 10%.
          </div>

          <Input
            label="Annual Rent Paid per Employee (₦) — for Rent Relief"
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
            <strong>NTA 2025 changes:</strong> Small company threshold raised to <strong>₦50M turnover</strong> (was ₦25M). Medium category removed — it's now Small (0%) or Standard (30%). New <strong>4% Development Levy</strong> on profits for non-small companies.
          </div>

          <Input label="Annual Turnover (₦)" type="number" value={annualTurnover} onChange={e => setAnnualTurnover(e.target.value)} placeholder="Total annual revenue" />
          <Input label="Taxable Profit (₦)" type="number" value={annualProfit} onChange={e => setAnnualProfit(e.target.value)} placeholder="Revenue minus allowable expenses" />

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" className="accent-cac-green" checked={isProSvc} onChange={e => setIsProSvc(e.target.checked)} />
            Professional services firm (law, accounting, consulting — cannot be small co.)
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
const MarkFiledModal: React.FC<{ company: Company; onClose: () => void }> = ({ company, onClose }) => {
  const [unfiled, setUnfiled] = React.useState<any[]>([]);
  React.useEffect(() => {
    db.getObligations(company.id).then(obs => setUnfiled(obs.filter(o =>
      o.status === TaxStatus.DUE || o.status === TaxStatus.OVERDUE || o.status === TaxStatus.UPCOMING
    ))).catch(() => {});
  }, [company.id]);
  const [selectedId, setSelectedId] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptRef, setReceiptRef] = useState('');
  const [saved, setSaved] = useState(false);

  const handleFile = () => {
    if (!selectedId) return;
    db.updateObligation(selectedId, {
      status: TaxStatus.FILED,
      actualAmount: parseFloat(actualAmount) || undefined,
      paymentDate,
    }).catch(e => console.error('Update error:', e));
    setSaved(true);
    setTimeout(onClose, 1200);
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
                <option key={o.id} value={o.id}>{o.type} — {o.period} (due {o.dueDate})</option>
              ))}
            </select>
          </div>
          <Input label="Actual Amount Paid (₦)" type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)} placeholder="Leave blank to use estimate" />
          <Input label="Payment Date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          <Input label="Receipt / Reference No." value={receiptRef} onChange={e => setReceiptRef(e.target.value)} placeholder="e.g., FIRS-20260310-XXXXX" />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleFile} className="flex-1">Confirm Filing</Button>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
};

// ─── Bank Import Modal ────────────────────────────────────────────────────────
const BankImportModal: React.FC<{ company: Company; onClose: () => void }> = ({ company, onClose }) => {
  const [tab, setTab] = useState<'csv' | 'manual'>('csv');
  const [rows, setRows] = useState<{ date: string; desc: string; amount: string }[]>([]);
  const [saved, setSaved] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = (ev.target?.result as string).split('\n').filter(Boolean);
      const parsed = lines.slice(1).map(line => {
        const cols = line.split(',');
        return { date: cols[0]?.trim() || '', desc: cols[1]?.trim() || '', amount: cols[2]?.trim() || '' };
      }).filter(r => r.desc && r.amount);
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const saveAll = () => {
    rows.forEach(r => {
      const amount = Math.abs(parseFloat(r.amount) || 0);
      if (!amount) return;
      db.addLedgerEntry({
        id: Date.now().toString() + Math.random(),
        companyId: company.id,
        date: r.date || new Date().toISOString().split('T')[0],
        type: parseFloat(r.amount) > 0 ? 'sale' : 'expense',
        description: r.desc,
        amount,
        taxAmount: 0,
      });
    });
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  return (
    <ModalWrapper title="Import Bank Statement" onClose={onClose}>
      {saved ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-bold text-cac-green">{rows.length} transactions imported!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['csv', 'manual'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                {t === 'csv' ? '📄 CSV Upload' : '✏️ Manual Entry'}
              </button>
            ))}
          </div>

          {tab === 'csv' ? (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                <p className="text-2xl mb-2">📂</p>
                <p className="text-sm font-bold text-slate-700 mb-1">Upload CSV</p>
                <p className="text-xs text-slate-400 mb-3">Expected columns: Date, Description, Amount</p>
                <input type="file" accept=".csv" onChange={handleFile} className="text-xs" />
              </div>
              {rows.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {rows.map((r, i) => (
                    <div key={i} className="flex justify-between text-xs p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-600 truncate flex-1">{r.desc}</span>
                      <span className={`font-bold ml-2 ${parseFloat(r.amount) >= 0 ? 'text-cac-green' : 'text-red-500'}`}>{fmt(Math.abs(parseFloat(r.amount) || 0))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {[0].map(i => (
                <div key={i} className="space-y-2">
                  <Input label="Date" type="date" value={rows[0]?.date || ''} onChange={e => setRows([{ ...rows[0] || { desc: '', amount: '' }, date: e.target.value }])} />
                  <Input label="Description" value={rows[0]?.desc || ''} onChange={e => setRows([{ ...rows[0] || { date: '', amount: '' }, desc: e.target.value }])} placeholder="Transaction description" />
                  <Input label="Amount (₦, negative for expense)" type="number" value={rows[0]?.amount || ''} onChange={e => setRows([{ ...rows[0] || { date: '', desc: '' }, amount: e.target.value }])} placeholder="-50000 or 200000" />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={saveAll} className="flex-1" disabled={rows.length === 0}>Import {rows.length > 0 ? `(${rows.length})` : ''}</Button>
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
      <ResponsiveContainer width="100%" height="100%">
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
type ModalType = 'sale' | 'expense' | 'payroll' | 'filed' | 'import' | null;

import { AppView } from '../App';

interface DashboardProps {
  company: Company;
  onNavigate: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ company, onNavigate }) => {
  const [modal, setModal] = useState<ModalType>(null);
  const [obligations, setObligations] = useState<any[]>([]);

  React.useEffect(() => {
    db.getObligations(company.id).then(setObligations).catch(() => setObligations([]));
  }, [company.id]);

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

      {/* NTA 2025 Reform Banner */}
      <div className="bg-gradient-to-r from-cac-green to-emerald-600 rounded-2xl p-4 text-white flex items-center gap-4">
        <span className="text-3xl shrink-0">📋</span>
        <div>
          <p className="font-bold text-sm">Nigeria Tax Act 2025 — Active from 1 Jan 2026</p>
          <p className="text-xs text-green-200 mt-0.5">All calculations use new PAYE bands (0%–25%), CIT ≤₦50M exempt, 4% Dev Levy. FIRS → NRS.</p>
        </div>
      </div>

      {/* Score + Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="col-span-2 md:col-span-1 flex items-center gap-4 p-4">
          <ScoreRing score={company.complianceScore} />
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
            { icon: '🏠', title: 'Rent Relief (replaces CRA)', body: '20% of annual rent paid, max ₦500,000. CRA is fully abolished from 1 Jan 2026.' },
            { icon: '📅', title: 'Filing Deadlines', body: 'VAT: 21st monthly · PAYE: 10th monthly · WHT: 21st monthly · CIT: 6 months after year-end · PIT: 31 March' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="bg-slate-50 rounded-xl p-3 space-y-1">
              <p className="font-bold text-slate-800">{icon} {title}</p>
              <p className="text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Modals */}
      {modal === 'sale'    && <AddSaleModal    company={company} onClose={() => setModal(null)} />}
      {modal === 'expense' && <AddExpenseModal company={company} onClose={() => setModal(null)} />}
      {modal === 'payroll' && <PayrollModal    company={company} onClose={() => setModal(null)} />}
      {modal === 'filed'   && <MarkFiledModal  company={company} onClose={() => setModal(null)} />}
      {modal === 'import'  && <BankImportModal company={company} onClose={() => setModal(null)} />}
    </div>
  );
};

export default Dashboard;
