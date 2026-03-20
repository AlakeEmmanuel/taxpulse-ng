import React, { useState } from 'react';
import { Card, Input, Button } from '../components/Shared';
import { VAT_RATE, WHT_RATES, calcCIT, calcVAT, isWHTExempt, calcCGT, CGT_ASSET_TYPES, STATE_LEVIES, getStateLevies } from '../utils/taxEngine';

const fmt = (n: number) => '₦' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });

// ─── VAT CALCULATOR ───────────────────────────────────────────────────────────
const VATCalculator: React.FC = () => {
  const [amount, setAmount]       = useState('');
  const [inclusive, setInclusive] = useState(false);
  const [zeroRated, setZeroRated] = useState(false);

  const val = parseFloat(amount) || 0;
  const net   = inclusive ? val / (1 + VAT_RATE) : val;
  const vat   = zeroRated ? 0 : net * VAT_RATE;
  const total = net + vat;

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm">V</span>
        <div>
          <h3 className="font-bold text-slate-800">VAT Calculator</h3>
          <p className="text-xs text-slate-400">7.5% -- NTA 2025 (unchanged)</p>
        </div>
      </div>

      <Input label="Amount (₦)" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" />

      <div className="space-y-2">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={inclusive} onChange={e => setInclusive(e.target.checked)}
            className="w-4 h-4 accent-cac-green" />
          <span className="text-sm text-slate-700">Amount is VAT-inclusive</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={zeroRated} onChange={e => setZeroRated(e.target.checked)}
            className="w-4 h-4 accent-cac-green" />
          <span className="text-sm text-slate-700">Zero-rated supply (NTA 2025)</span>
        </label>
      </div>

      {zeroRated && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700">
          <p className="font-bold mb-1">Zero-rated under NTA 2025:</p>
          <p>Basic food, medicine, education, electricity, medical equipment, baby products, non-oil exports</p>
        </div>
      )}

      {val > 0 && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          {[
            { label: 'Net Amount',  val: fmt(net),   color: 'text-slate-700' },
            { label: `VAT (${zeroRated ? '0%' : '7.5%'})`, val: fmt(vat), color: 'text-blue-600' },
            { label: 'Total',       val: fmt(total), color: 'text-slate-900 font-extrabold' },
          ].map(r => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{r.label}</span>
              <span className={r.color}>{r.val}</span>
            </div>
          ))}
          {!zeroRated && (
            <div className="pt-2 border-t border-slate-200 text-xs text-slate-400">
              Remit VAT to NRS by 21st of following month via TaxPRO Max
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// ─── WHT CALCULATOR ───────────────────────────────────────────────────────────
const WHTCalculator: React.FC = () => {
  const [amount,   setAmount]   = useState('');
  const [category, setCategory] = useState(Object.keys(WHT_RATES)[0]);
  const [hasTIN,   setHasTIN]   = useState(true);
  const [monthlyTxn, setMonthlyTxn] = useState('');

  const val         = parseFloat(amount) || 0;
  const monthly     = parseFloat(monthlyTxn) || val;
  const whtInfo     = WHT_RATES[category];
  const exempt      = isWHTExempt(monthly, hasTIN);
  const wht         = exempt ? 0 : val * whtInfo.rate;
  const netPayable  = val - wht;

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-black text-sm">W</span>
        <div>
          <h3 className="font-bold text-slate-800">WHT Calculator</h3>
          <p className="text-xs text-slate-400">5% / 10% -- NTA 2025 + small biz exemption</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-600 mb-1.5 block">Transaction Type</label>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cac-green bg-white">
          {Object.entries(WHT_RATES).map(([k, v]) => (
            <option key={k} value={k}>{k} -- {(v.rate * 100).toFixed(0)}%{v.note ? ' 🆕' : ''}</option>
          ))}
        </select>
      </div>

      <Input label="Invoice / Payment Amount (₦)" type="number" value={amount}
        onChange={e => setAmount(e.target.value)} placeholder="Enter gross amount" />

      {/* NTA 2025 small biz exemption */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
        <p className="text-xs font-bold text-amber-700">🆕 NTA 2025 Small Business WHT Exemption</p>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={hasTIN} onChange={e => setHasTIN(e.target.checked)}
            className="w-4 h-4 accent-cac-green" />
          <span className="text-xs text-slate-700">Vendor has a valid TIN</span>
        </label>
        <Input label="Vendor's total monthly transactions with you (₦)" type="number"
          value={monthlyTxn} onChange={e => setMonthlyTxn(e.target.value)}
          placeholder={`Auto: using ${fmt(val)} if blank`} />
        {hasTIN && monthly <= 2_000_000 && monthly > 0 && (
          <p className="text-xs text-green-700 font-bold">✅ WHT exempt -- vendor qualifies (TIN + ≤₦2M/month)</p>
        )}
        {hasTIN && monthly > 2_000_000 && (
          <p className="text-xs text-amber-700">⚠️ Exceeds ₦2M threshold -- WHT applies</p>
        )}
        {!hasTIN && (
          <p className="text-xs text-red-600">❌ No TIN -- WHT must be deducted regardless of amount</p>
        )}
      </div>

      {val > 0 && (
        <div className={`rounded-xl p-4 space-y-2 ${exempt ? 'bg-green-50 border border-green-200' : 'bg-slate-50'}`}>
          {[
            { label: 'Gross Amount',   val: fmt(val),        color: 'text-slate-700' },
            { label: `WHT (${exempt ? '0% -- exempt' : (whtInfo.rate * 100).toFixed(0) + '%'})`, val: fmt(wht), color: exempt ? 'text-green-600 font-bold' : 'text-purple-600' },
            { label: 'Net to Vendor',  val: fmt(netPayable), color: 'text-slate-900 font-extrabold' },
          ].map(r => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{r.label}</span>
              <span className={r.color}>{r.val}</span>
            </div>
          ))}
          {!exempt && (
            <div className="pt-2 border-t border-slate-200 text-xs text-slate-400">
              Remit {fmt(wht)} to NRS by 21st of next month. Failure to deduct = 40% penalty (NTA 2025).
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// ─── CIT CALCULATOR ───────────────────────────────────────────────────────────
const CITCalculator: React.FC = () => {
  const [turnover,    setTurnover]    = useState('');
  const [profit,      setProfit]      = useState('');
  const [isProSvc,    setIsProSvc]    = useState(false);

  const t = parseFloat(turnover) || 0;
  const p = parseFloat(profit)   || 0;
  const result = calcCIT(p, t, isProSvc);

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-black text-sm">C</span>
        <div>
          <h3 className="font-bold text-slate-800">CIT + Dev Levy Calculator</h3>
          <p className="text-xs text-slate-400">NTA 2025 -- small ≤₦50M exempt, 30% + 4% Dev Levy</p>
        </div>
      </div>

      {/* NTA 2025 change notice */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
        <p className="font-bold mb-1">🆕 NTA 2025 changes:</p>
        <p>• <strong>Medium company category removed</strong> -- now Small (exempt) or Standard (30%)</p>
        <p>• <strong>Small threshold raised</strong>: ₦25M → ₦50M turnover</p>
        <p>• <strong>4% Development Levy</strong> on profits (replaces TET, IT Levy, NASENI, Police Trust Fund)</p>
      </div>

      <Input label="Annual Turnover (₦)" type="number" value={turnover}
        onChange={e => setTurnover(e.target.value)} placeholder="Total revenue" />
      <Input label="Taxable Profit (₦)" type="number" value={profit}
        onChange={e => setProfit(e.target.value)} placeholder="Profit before tax" />

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={isProSvc} onChange={e => setIsProSvc(e.target.checked)}
          className="w-4 h-4 accent-cac-green" />
        <span className="text-sm text-slate-700">Professional service company (law, accounting, consulting)</span>
      </label>
      {isProSvc && <p className="text-xs text-amber-600">⚠️ Pro service firms cannot qualify as small companies under NTA 2025</p>}

      {t > 0 && (
        <div className={`rounded-xl p-4 space-y-3 ${result.rate === 0 ? 'bg-green-50 border border-green-200' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-2 py-1 rounded-full ${result.rate === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {result.rate === 0 ? 'EXEMPT' : '30% CIT'}
            </span>
            <span className="text-xs text-slate-500">{result.label}</span>
          </div>

          {p > 0 && (
            <div className="space-y-2">
              {[
                { label: 'Taxable Profit',     val: fmt(p),             color: 'text-slate-700' },
                { label: `CIT (${(result.rate * 100).toFixed(0)}%)`,   val: fmt(result.tax),     color: 'text-orange-600' },
                { label: 'Dev Levy (4%)',       val: fmt(result.devLevy), color: 'text-red-500', hide: result.rate === 0 },
                { label: 'Total Tax Burden',    val: fmt(result.total),  color: 'text-slate-900 font-extrabold' },
              ].filter(r => !r.hide).map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className={r.color}>{r.val}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500 pt-1 border-t border-slate-200">{result.note}</p>
        </div>
      )}

      {/* Rate table */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">NTA 2025 CIT Structure</p>
        {[
          { label: 'Small Company', sub: 'Turnover ≤ ₦50M', cit: '0%', dev: '0%', badge: 'green' },
          { label: 'Standard Company', sub: 'Turnover > ₦50M', cit: '30%', dev: '4%', badge: 'orange' },
        ].map(r => (
          <div key={r.label} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${r.badge === 'green' ? 'bg-green-50' : 'bg-orange-50'}`}>
            <div>
              <p className={`text-xs font-bold ${r.badge === 'green' ? 'text-green-700' : 'text-orange-700'}`}>{r.label}</p>
              <p className="text-[10px] text-slate-500">{r.sub}</p>
            </div>
            <div className="text-right">
              <p className={`text-xs font-black ${r.badge === 'green' ? 'text-green-700' : 'text-orange-700'}`}>CIT: {r.cit}</p>
              <p className="text-[10px] text-slate-500">Dev Levy: {r.dev}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

// ─── CGT CALCULATOR ───────────────────────────────────────────────────────────
const CGTCalculator: React.FC = () => {
  const [assetType, setAssetType]   = useState(CGT_ASSET_TYPES[0]);
  const [proceeds, setProceeds]     = useState('');
  const [cost, setCost]             = useState('');
  const [improvements, setImprovements] = useState('');
  const [disposal, setDisposal]     = useState('');
  const [isSmallCo, setIsSmallCo]   = useState(false);
  const [yearsHeld, setYearsHeld]   = useState('');

  const p = parseFloat(proceeds)     || 0;
  const c = parseFloat(cost)         || 0;
  const i = parseFloat(improvements) || 0;
  const d = parseFloat(disposal)     || 0;

  const result = p > 0 || c > 0 ? calcCGT({
    assetType, saleProceeds: p, costOfAcquisition: c,
    improvementCosts: i, disposalCosts: d, isSmallCompany: isSmallCo,
    yearsHeld: parseFloat(yearsHeld) || undefined,
  }) : null;

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-black text-sm">G</span>
        <div>
          <h3 className="font-bold text-slate-800">Capital Gains Tax (CGT)</h3>
          <p className="text-xs text-slate-400">10% on chargeable gains · NTA 2025</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        <p className="font-bold mb-1">NTA 2025 CGT Rules</p>
        <p>• Rate: <strong>10%</strong> on all chargeable gains</p>
        <p>• Small companies (≤₦50M turnover): <strong>0% CGT</strong></p>
        <p>• Applies to: property, shares, business assets, goodwill, IP, foreign currency</p>
        <p>• File CGT return with NRS within 30 days of disposal</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Asset Type</label>
        <select value={assetType} onChange={e => setAssetType(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white">
          {CGT_ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Sale Proceeds (₦)" type="number" value={proceeds} onChange={e => setProceeds(e.target.value)} placeholder="0" />
        <Input label="Original Cost (₦)" type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />
        <Input label="Improvement Costs (₦)" type="number" value={improvements} onChange={e => setImprovements(e.target.value)} placeholder="0" />
        <Input label="Disposal Costs (₦)" type="number" value={disposal} onChange={e => setDisposal(e.target.value)} placeholder="Legal fees, agent fees, etc." />
        <Input label="Years Held (informational)" type="number" value={yearsHeld} onChange={e => setYearsHeld(e.target.value)} placeholder="e.g. 5" />
        <div className="flex items-center">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={isSmallCo} onChange={e => setIsSmallCo(e.target.checked)}
              className="w-4 h-4 accent-cac-green" />
            <span className="text-sm text-slate-700">Small company (≤₦50M turnover)</span>
          </label>
        </div>
      </div>

      {result && (
        <div className={`rounded-xl p-4 space-y-2 ${result.exempt ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-100'}`}>
          {result.exempt ? (
            <div className="text-center">
              <p className="text-2xl mb-1">🎉</p>
              <p className="font-bold text-cac-green text-sm">{result.exemptionReason}</p>
            </div>
          ) : (
            <>
              {[
                { label: 'Sale Proceeds',        val: fmt(p),                     color: 'text-slate-700' },
                { label: 'Total Allowable Costs', val: fmt(c + i + d),            color: 'text-slate-700' },
                { label: result.chargeableGain > 0 ? 'Chargeable Gain' : 'Capital Loss',
                  val: fmt(result.chargeableGain || result.loss),
                  color: result.chargeableGain > 0 ? 'text-amber-600 font-bold' : 'text-blue-600 font-bold' },
                { label: 'CGT @ 10%',            val: fmt(result.tax),            color: 'text-red-600 font-extrabold' },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className={r.color}>{r.val}</span>
                </div>
              ))}
              {result.loss > 0 && (
                <p className="text-xs text-blue-600 mt-1">Capital loss can be offset against future gains in the same year.</p>
              )}
            </>
          )}
        </div>
      )}

      <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">After disposal:</p>
        <p>• File CGT return with NRS within 30 days of disposal date</p>
        <p>• Pay CGT liability within 30 days or face 10% p.a. interest</p>
        <p>• Keep all sale documents, original purchase receipts, improvement receipts</p>
      </div>
    </Card>
  );
};

// ─── STATE LEVIES VIEWER ──────────────────────────────────────────────────────
const StateLeviesViewer: React.FC = () => {
  const availableStates = Object.keys(STATE_LEVIES);
  const [selectedState, setSelectedState] = useState(availableStates[0]);
  const levies = getStateLevies(selectedState);

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center font-black text-sm">S</span>
        <div>
          <h3 className="font-bold text-slate-800">State-Specific Levies</h3>
          <p className="text-xs text-slate-400">Beyond federal taxes -- what your state charges</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select State</label>
        <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cac-green bg-white">
          {availableStates.map(s => <option key={s}>{s}</option>)}
          <option disabled>──────────────</option>
          <option value="Other">Other states (generic)</option>
        </select>
        {!availableStates.includes(selectedState) && (
          <p className="text-xs text-slate-400 mt-1">Showing typical rates -- contact your State IRS for exact figures.</p>
        )}
      </div>

      <div className="space-y-3">
        {levies.map((levy, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-slate-800 text-sm">{levy.name}</p>
              <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">{levy.frequency}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 text-xs text-slate-500">
              <span><strong className="text-slate-700">Rate:</strong> {levy.rate}</span>
              <span><strong className="text-slate-700">Authority:</strong> {levy.authority}</span>
              <span className="col-span-2"><strong className="text-slate-700">Basis:</strong> {levy.basis}</span>
              {levy.notes && <span className="col-span-2 text-amber-600">{levy.notes}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        <p className="font-bold mb-1">📋 Important</p>
        <p>State levies are separate from federal taxes (NRS) and are collected by your State IRS. 
        Always verify current rates directly with your State IRS as rates change annually.</p>
      </div>
    </Card>
  );
};

export const CalculatorsPage: React.FC = () => {
  const [tab, setTab] = useState<'vat' | 'wht' | 'cit' | 'cgt' | 'state'>('vat');

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Tax Calculators</h1>
          <span className="bg-cac-green text-white text-xs font-black px-2.5 py-1 rounded-full">NTA 2025</span>
        </div>
        <p className="text-slate-500 text-sm">Nigeria Tax Act 2025 · Effective 1 January 2026</p>
      </header>

      <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {(['vat', 'wht', 'cit', 'cgt', 'state'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            {t === 'state' ? 'State Levies' : t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === 'vat' && <VATCalculator />}
      {tab === 'wht' && <WHTCalculator />}
      {tab === 'cit'   && <CITCalculator />}
      {tab === 'cgt'   && <CGTCalculator />}
      {tab === 'state' && <StateLeviesViewer />}
    </div>
  );
};
